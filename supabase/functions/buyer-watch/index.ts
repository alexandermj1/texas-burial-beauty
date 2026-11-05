import { aiFetch } from "../_shared/aiRunLabel.ts";
// Buyer watcher: (1) a cheap model reads each NEW buyer reply to us once and records what they
// are waiting for; (2) when new seller stock appears, code drops clear mismatches and the cheap
// model judges the rest loosely, surfacing the buyer with a plain reason. Never emails anyone.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { resolveBuyerCemetery, cemeteryNameKey } from "../_shared/cemeteryMatching.ts";
import { quoteFigures, normalizeBuyerFees } from "../_shared/quoteFigures.ts";
import { kindOf, looseCandidate, newestText, roundDown } from "./logic.ts";
import { runAgent } from "../_shared/recordAgent.ts";

// Deep checks use a stronger model with record tools; capped per hourly run to bound cost.
const MAX_INVESTIGATIONS_PER_RUN = 6;
const INVESTIGATE = `You are a careful senior salesperson at a Texas cemetery-plot broker. The cheap screener thinks a NEW seller plot
might suit a WAITING buyer. Check it properly before a colleague is interrupted, like a human would:
1. Read the buyer's emails (get_emails) and notes to confirm what they actually want now — specific cemetery only? type, number of spaces
   (a companion space = 2 burials stacked in one space = 2 regular spaces; two side-by-side regular spaces can substitute), budget, timing, anything they rejected.
2. Read the seller record (get_record): is it still available, what lawn/section, how many spaces, our buyer price for all and for one.
3. If spaces, lawn or count matter, read the seller's emails/notes and, only if still unclear, the deed (read_deed). Check the cemetery file (get_cemetery) for lawn type/price if useful.
Be loose about near-misses (a bit over budget, a nearby lawn, one space more or fewer) but strict about real contradictions
(buyer only wants a different cemetery, niche vs ground, plot no longer available, buyer said they bought elsewhere).
Final answer JSON only:
{"verdict":"show"|"hide","fit":"good"|"close","headline":"one short sentence for staff, third person, e.g. 'Restland has 2 side-by-side spaces in Garden of Peace at $9,800 — they wanted 2 there under $10k.'",
 "why":"2-4 plain sentences: what they want (with their words) and how this plot compares, including the gaps",
 "checked":["short bullet per thing you verified, e.g. 'Deed shows Lot 12 spaces 3 & 4'"],
 "concerns":["anything staff should double-check, or empty"],
 "suggested_next":"one sentence, e.g. 'Email her the 2 spaces with the price; mention they are side by side rather than a companion space.'"}
Never invent facts; if you could not verify something, say so in concerns. Prices you mention must come from get_record.`;

const MODEL = "google/gemini-3.1-flash-lite";
const OURS = "from_email.ilike.%texascemeterybrokers%,from_email.ilike.%bayercemeterybrokers%";
const BUYER_SOURCES = new Set(["buy_property_wizard", "buy_inquiry", "cemetery_page_buyer", "preneed_guide_form", "buyer"]);
const isBuyer = (s: any) => s.customer_kind === "buyer" || (!["seller", "partner"].includes(s.customer_kind) && BUYER_SOURCES.has(s.source));
const isOurs = (f: unknown) => /texascemeterybrokers|bayercemeterybrokers/i.test(String(f ?? ""));
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("tick") }),
  z.object({ action: z.literal("analyze"), submission_id: z.string().uuid() }),
  z.object({ action: z.literal("save_want"), submission_id: z.string().uuid(), status: z.enum(["waiting", "done", "none"]), summary: z.string().max(1000) }),
  z.object({ action: z.literal("recheck_alert"), alert_id: z.string().uuid() }),
  z.object({ action: z.literal("dismiss_alert"), alert_id: z.string().uuid(), verdict: z.enum(["useful", "not_suitable", "dismissed"]), feedback: z.string().max(500).nullable() }),
]);

async function ai(apiKey: string, system: string, user: string) {
  const r = await aiFetch("Buyer watch — checking new stock for buyers", "https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({ model: MODEL, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!r.ok) throw Object.assign(new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  const d = await r.json();
  const raw = String(d?.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim();
  return JSON.parse(raw);
}

const EXTRACT = `You track what a cemetery-plot BUYER is still waiting for, for a Texas cemetery plot broker.
You get: their original enquiry, the broker's last email to them, the buyer's newest reply, and the current note (if any).
Return JSON only:
{"status":"waiting"|"done"|"none","summary":"one or two plain sentences a salesperson reads, e.g. 'Wants 2 side-by-side burial spaces at Restland or nearby, ideally under $5,000; happy to wait.'",
 "cemeteries":["names they would accept"],"area":"city/region if they named one or null","anywhere_nearby":true|false (true ONLY if they said nearby/other cemeteries are fine; false if they want a specific cemetery),
 "type":"burial"|"niche"|"crypt"|"any","spaces":number|null,"max_price":number|null,"price_firm":true|false,
 "timing":"short text or null","avoid":"what they rejected and why, or null","buyer_words":"short exact quote from their reply that shows this","confidence":"high"|"low"}
status: "waiting" = they want something we did not have or they want us to tell them when something comes up / are open to other options later.
"done" = bought elsewhere, no longer interested, or asked us to stop. "none" = nothing to wait for (e.g. they are going ahead with what we offered, or just a thank-you).
If the reply adds nothing new, keep the current note's meaning. A companion space = 2 spaces. If they said an offer was too expensive, max_price must be BELOW that offered price (use their stated figure if they gave one). Be accurate; never invent a budget or count.`;

const JUDGE = `You are a cemetery-plot broker deciding which NEW plots are worth mentioning to a buyer who is waiting.
Be LOOSE and generous like a good salesperson: exact matches will rarely exist. Show a plot if a reasonable broker would
pick up the phone about it — e.g. up to ~35% over a soft budget (~15% over a firm one), one or two spaces fewer/more,
a different but nearby cemetery, a crypt instead of ground burial if they did not rule it out. Hide only clear mismatches
(things they explicitly rejected, niche vs ground burial, far too expensive, or wrong area entirely).
Return JSON only: {"picks":[{"id":"candidate id","fit":"good"|"close","reason":"one short sentence comparing it to what they wanted, third person, mention the gap, e.g. '2 spaces at Restland at $5,400 — about 8% over their $5,000 budget.'"}]}. Empty picks if none.`;

async function directory(db: any) {
  const { data, error } = await db.from("texas_cemeteries").select("name,city,region,latitude,longitude,transfer_fee").is("deleted_at", null).limit(3000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function extract(db: any, apiKey: string, buyer: any, inbound: any, existing: any) {
  const { data: lastOut } = await db.from("email_messages").select("body_text,snippet,received_at")
    .eq("matched_submission_id", buyer.id).or(OURS).lt("received_at", inbound.received_at).is("deleted_at", null)
    .order("received_at", { ascending: false }).limit(1);
  const user = [
    `ORIGINAL ENQUIRY: cemetery=${buyer.cemetery ?? "-"}; city=${buyer.cemetery_city ?? "-"}; type=${buyer.property_type ?? "-"}; spaces=${buyer.spaces ?? "-"}; budget=${buyer.budget ?? "-"}; timeline=${buyer.timeline ?? "-"}; message=${String(buyer.message ?? "").slice(0, 600)}`,
    `OUR LAST EMAIL: ${newestText(lastOut?.[0]?.body_text || lastOut?.[0]?.snippet, 1500) || "(none found)"}`,
    `BUYER'S NEWEST REPLY: ${newestText(inbound.body_text || inbound.snippet)}`,
    `CURRENT NOTE: ${existing ? `${existing.status}: ${existing.summary}` : "(none)"}`,
  ].join("\n\n");
  const out = await ai(apiKey, EXTRACT, user);
  const status = ["waiting", "done", "none"].includes(out.status) ? out.status : "none";
  const row = {
    submission_id: buyer.id, status, summary: String(out.summary ?? "").slice(0, 1000),
    criteria: { cemeteries: Array.isArray(out.cemeteries) ? out.cemeteries.slice(0, 6).map(String) : [], area: out.area ?? null, anywhere_nearby: !!out.anywhere_nearby, type: out.type ?? "any", spaces: Number(out.spaces) || null, max_price: Number(out.max_price) || null, price_firm: !!out.price_firm, timing: out.timing ?? null, avoid: out.avoid ?? null },
    buyer_words: out.buyer_words ? String(out.buyer_words).slice(0, 400) : null, confidence: out.confidence === "low" ? "low" : "high",
    source_email_id: inbound.id, source_at: inbound.received_at, updated_at: new Date().toISOString(),
  };
  if (existing) await db.from("buyer_wants").update(row).eq("id", existing.id);
  // New notes only look at stock that appears from now on (they were just told what we have).
  else await db.from("buyer_wants").insert({ ...row, checked_until: new Date().toISOString() });
  return row;
}

/** Step 1: new buyer replies (after we emailed them) that have not been read yet. */
async function readReplies(db: any, apiKey: string, limit = 15, onlyId?: string) {
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  let q = db.from("email_messages").select("id,matched_submission_id,from_email,body_text,snippet,received_at")
    .not("matched_submission_id", "is", null).gte("received_at", since).is("deleted_at", null).order("received_at", { ascending: false }).limit(600);
  if (onlyId) q = db.from("email_messages").select("id,matched_submission_id,from_email,body_text,snippet,received_at").eq("matched_submission_id", onlyId).is("deleted_at", null).order("received_at", { ascending: false }).limit(50);
  const { data: mails, error } = await q;
  if (error) throw new Error(error.message);
  const bySub = new Map<string, any[]>();
  for (const m of mails ?? []) { const a = bySub.get(m.matched_submission_id) ?? []; a.push(m); bySub.set(m.matched_submission_id, a); }
  const ids = [...bySub.keys()];
  if (!ids.length) return 0;
  const subs: any[] = [], wants: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const [{ data: s }, { data: w }] = await Promise.all([
      db.from("contact_submissions").select("id,name,email,cemetery,cemetery_city,property_type,spaces,budget,timeline,message,customer_kind,source,sold_at,deleted_at").in("id", part).is("deleted_at", null),
      db.from("buyer_wants").select("*").in("submission_id", part).is("deleted_at", null),
    ]);
    subs.push(...(s ?? [])); wants.push(...(w ?? []));
  }
  let done = 0;
  for (const buyer of subs) {
    if (done >= limit) break;
    if (!isBuyer(buyer)) continue;
    const list = (bySub.get(buyer.id) ?? []).sort((a, b) => b.received_at.localeCompare(a.received_at));
    const inbound = list.find(m => !isOurs(m.from_email));
    if (!inbound) continue;
    const want = wants.find(w => w.submission_id === buyer.id);
    if (want && (want.source_email_id === inbound.id || (want.source_at && want.source_at >= inbound.received_at))) continue;
    if (want?.staff_edited) continue; // staff wording wins; the normal "needs reply" shows the new email
    // Only replies to something we sent: first enquiries are handled by the buyer AI first reply.
    const { data: before } = await db.from("email_messages").select("id").eq("matched_submission_id", buyer.id).or(OURS).lt("received_at", inbound.received_at).is("deleted_at", null).limit(1);
    if (!before?.length) continue;
    await extract(db, apiKey, buyer, inbound, want);
    done++;
  }
  return done;
}

/** Step 2: compare new stock against every open note. */
async function matchStock(db: any, apiKey: string) {
  const { data: wants, error } = await db.from("buyer_wants").select("*").eq("status", "waiting").is("deleted_at", null).limit(500);
  if (error) throw new Error(error.message);
  if (!wants?.length) return 0;
  const oldest = wants.map((w: any) => w.checked_until).sort()[0];
  const stock: any[] = [];
  for (let off = 0; ; off += 1000) {
    const { data, error: e } = await db.from("contact_submissions").select("id,cemetery,cemetery_city,region,property_type,section,lawn,plot_count,spaces,quote_amount,accepted_quote_amount,transfer_fee_amount,buyer_fees,la_signed_at,quote_response,quote_responded_at,created_at,reserved_until,customer_kind,source")
      .is("deleted_at", null).is("archived_at", null).is("closed_at", null).is("sold_at", null)
      .or("la_signed_at.not.is.null,quote_response.eq.accepted").order("id").range(off, off + 999);
    if (e) throw new Error(e.message);
    stock.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const since = (s: any) => [s.quote_responded_at, s.la_signed_at].filter(Boolean).sort()[0] ?? s.created_at;
  const fresh = stock.filter(s => !isBuyer(s) && since(s) > oldest && (!s.reserved_until || new Date(s.reserved_until) < new Date()));
  const now = new Date().toISOString();
  if (!fresh.length) { await db.from("buyer_wants").update({ checked_until: now }).eq("status", "waiting").is("deleted_at", null); return 0; }
  const dir = await directory(db);
  const pt = (c: any) => c && c.latitude != null && c.longitude != null ? { lat: Number(c.latitude), lng: Number(c.longitude) } : null;
  const place = (v: unknown) => cemeteryNameKey(String(v ?? "").replace(/^greater\s+/i, "").replace(/[,.]?\s*(tx|texas)\b.*$/i, ""));
  const sellers = fresh.map(s => {
    const c = resolveBuyerCemetery(s.cemetery, dir, s.cemetery_city);
    const count = Math.max(1, Number(s.plot_count) || Number(s.spaces) || 1);
    const fee = c?.transfer_fee ?? s.transfer_fee_amount;
    const f = quoteFigures({ quoteAmount: s.quote_amount, acceptedAmount: s.accepted_quote_amount, transferFee: fee, buyerFees: normalizeBuyerFees(s.buyer_fees), plotCount: count });
    const per = f.hasQuote && fee != null ? quoteFigures({ quoteAmount: s.quote_amount, acceptedAmount: s.accepted_quote_amount, transferFee: fee, buyerFees: normalizeBuyerFees(s.buyer_fees), plotCount: 1 }) : null;
    const total = f.hasQuote && fee != null ? roundDown(f.buyerPriceTotal) : null;
    return { s, since: since(s), name: c?.name ?? s.cemetery ?? "", cemeteryKey: cemeteryNameKey(c?.name ?? s.cemetery), point: pt(c), place: [place(c?.city ?? s.cemetery_city), place(c?.region ?? s.region)].filter(Boolean), kind: kindOf(s.property_type),
      text: `${c?.name ?? s.cemetery}${c?.city ? ` (${c.city})` : ""}; ${kindOf(s.property_type)}; ${count} space${count > 1 ? "s" : ""}; ${total != null ? `our price ${money(total)} for all${count > 1 && per?.hasQuote ? `, about ${money(roundDown(per.buyerPriceTotal))} for one` : ""}` : "price not set yet"}` };
  });
  const { data: existingAlerts } = await db.from("buyer_want_alerts").select("submission_id,seller_id").in("submission_id", wants.map((w: any) => w.submission_id)).is("deleted_at", null);
  const seen = new Set((existingAlerts ?? []).map((a: any) => `${a.submission_id}:${a.seller_id}`));
  let alerts = 0;
  const budget = { left: MAX_INVESTIGATIONS_PER_RUN };
  for (const w of wants) {
    const c = w.criteria ?? {};
    const wanted = (c.cemeteries ?? []).map((n: string) => resolveBuyerCemetery(n, dir, c.area)).filter(Boolean);
    const spec = { cemeteryKeys: [...wanted.map((x: any) => cemeteryNameKey(x.name)), ...(c.cemeteries ?? []).map(cemeteryNameKey)], points: wanted.map(pt).filter(Boolean), places: [place(c.area)].filter(Boolean), anywhere: !!c.anywhere_nearby && !wanted.length && !c.area, kind: c.type ?? "any", onlyNamed: (c.cemeteries ?? []).length > 0 && !c.anywhere_nearby && !c.area };
    const cands = sellers.filter(x => x.since > w.checked_until && !seen.has(`${w.submission_id}:${x.s.id}`))
      .map(x => ({ x, r: looseCandidate(spec, x) })).filter(o => o.r.keep)
      .sort((a, b) => (a.r.miles ?? 99) - (b.r.miles ?? 99)).slice(0, 8);
    if (cands.length) {
      const user = `BUYER WANTS: ${w.summary}\nDetails: ${JSON.stringify(c)}\n\nNEW PLOTS:\n${cands.map(o => `- id=${o.x.s.id}: ${o.x.text}${o.r.miles ? `; ~${Math.round(o.r.miles)} miles from what they asked for` : ""}`).join("\n")}`;
      const out = await ai(apiKey, JUDGE, user);
      let deferred = false;
      for (const p of (out.picks ?? []) as any[]) {
        const o = cands.find(k => k.x.s.id === p.id);
        if (!o || !p.reason) continue;
        // Out of deep-check budget: leave checked_until so this buyer is retried next run.
        if (budget.left <= 0) { deferred = true; continue; }
        budget.left--;
        const inv = await investigate(db, apiKey, dir, w, o.x.s.id, p.reason).catch(e => { if ([402, 429].includes((e as any).status)) throw e; console.error("investigate", e); return null; });
        if (!inv) { deferred = true; continue; }
        const show = inv.answer?.verdict !== "hide";
        const { error: insErr } = await db.from("buyer_want_alerts").insert({
          submission_id: w.submission_id, want_id: w.id, seller_id: o.x.s.id,
          fit: (inv.answer?.fit ?? p.fit) === "good" ? "good" : "close",
          reason: String(inv.answer?.headline || p.reason).slice(0, 400), offer_summary: o.x.text,
          ai_verdict: show ? "show" : "hidden", investigation: { ...inv.answer, screener_reason: p.reason, tools_used: inv.trace }, investigated_at: new Date().toISOString(),
          ...(show ? {} : { dismissed_at: new Date().toISOString(), dismissed_by_name: "AI check", feedback_verdict: "ai_rejected" }),
        });
        if (!insErr && show) alerts++;
      }
      if (deferred) continue;
    }
    await db.from("buyer_wants").update({ checked_until: now }).eq("id", w.id);
  }
  return alerts;
}

/** Deep check of one buyer × seller pair with read-only record tools. */
async function investigate(db: any, apiKey: string, dir: any[], want: any, sellerId: string, screener: string) {
  const task = `WAITING BUYER record id: ${want.submission_id}\nOur note on what they want: ${want.summary}\nTheir words: ${want.buyer_words ?? "-"}\n\nNEW SELLER PLOT record id: ${sellerId}\nScreener said: ${screener}\n\nInvestigate and give your verdict.`;
  return await runAgent({ db, apiKey, dir, deedReads: 0 }, INVESTIGATE, task);
}

async function staff(db: any, req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await db.auth.getUser(token);
  if (!data.user) return null;
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).limit(1).maybeSingle();
  return role ? { id: data.user.id, name: data.user.email ?? "Staff" } : null;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (b.action === "tick") {
      if (!apiKey) return json({ status: "skipped", reason: "AI is not configured" });
      const run = crypto.randomUUID();
      const { data: locked } = await db.rpc("claim_automation_job", { _job_name: "buyer-watch", _run_id: run, _lease_seconds: 600 });
      if (!locked) return json({ status: "skipped", reason: "Another run is in progress" });
      try { const read = await readReplies(db, apiKey); const alerts = await matchStock(db, apiKey); return json({ ok: true, read, alerts }); }
      finally { await db.rpc("release_automation_job", { _job_name: "buyer-watch", _run_id: run, _completed: true }); }
    }
    const user = await staff(db, req);
    if (!user) return json({ error: "Admin or staff only" }, 403);
    if (b.action === "analyze") {
      if (!apiKey) return json({ error: "AI is not configured" }, 500);
      const { data: w } = await db.from("buyer_wants").select("id,staff_edited").eq("submission_id", b.submission_id).is("deleted_at", null).maybeSingle();
      if (w) await db.from("buyer_wants").update({ source_email_id: null, source_at: null, staff_edited: false }).eq("id", w.id);
      const n = await readReplies(db, apiKey, 1, b.submission_id);
      const { data: fresh } = await db.from("buyer_wants").select("*").eq("submission_id", b.submission_id).is("deleted_at", null).maybeSingle();
      return json({ ok: true, read: n, want: fresh, note: n ? null : "No buyer reply to one of our emails was found to read." });
    }
    if (b.action === "save_want") {
      const row = { status: b.status, summary: b.summary, staff_edited: true, edited_by_name: user.name, updated_at: new Date().toISOString() };
      const { data: w } = await db.from("buyer_wants").select("id").eq("submission_id", b.submission_id).is("deleted_at", null).maybeSingle();
      const r = w ? await db.from("buyer_wants").update(row).eq("id", w.id) : await db.from("buyer_wants").insert({ ...row, submission_id: b.submission_id });
      if (r.error) throw new Error(r.error.message);
      return json({ ok: true });
    }
    if (b.action === "recheck_alert") {
      if (!apiKey) return json({ error: "AI is not configured" }, 500);
      const { data: a } = await db.from("buyer_want_alerts").select("*").eq("id", b.alert_id).maybeSingle();
      const { data: w } = a ? await db.from("buyer_wants").select("*").eq("submission_id", a.submission_id).is("deleted_at", null).maybeSingle() : { data: null };
      if (!a || !w) return json({ error: "Alert not found" }, 404);
      const inv = await investigate(db, apiKey, await directory(db), w, a.seller_id, a.reason);
      const show = inv.answer?.verdict !== "hide";
      await db.from("buyer_want_alerts").update({ ai_verdict: show ? "show" : "hidden", investigation: { ...inv.answer, screener_reason: a.investigation?.screener_reason ?? a.reason, tools_used: inv.trace }, investigated_at: new Date().toISOString(), reason: String(inv.answer?.headline || a.reason).slice(0, 400) }).eq("id", a.id);
      return json({ ok: true, note: show ? "Checked — still looks worth a look" : "Checked — the AI now thinks this doesn't suit them (see why)" });
    }
    const { error } = await db.from("buyer_want_alerts").update({ dismissed_at: new Date().toISOString(), dismissed_by_name: user.name, feedback_verdict: b.verdict, feedback: b.feedback }).eq("id", b.alert_id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    const status = (e as any).status;
    return json({ error: String((e as Error).message) }, [402, 429].includes(status) ? status : 500);
  }
});
