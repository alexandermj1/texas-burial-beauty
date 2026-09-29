// Seller Agent — reviews one seller's whole record against the TCB Seller
// Playbook and proposes the next step (reply, internal note, or hand to a
// human). Phase 1 runs in shadow/approval mode: nothing is sent to a customer
// until a staff member approves the proposed action.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { DEFAULT_SELLER_PLAYBOOK } from "../_shared/sellerPlaybook.ts";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("run"), submission_id: z.string().uuid(), trigger: z.string().max(60).optional() }),
  z.object({ action: z.literal("sweep"), limit: z.number().int().min(1).max(25).optional() }),
  z.object({ action: z.literal("execute"), action_id: z.string().uuid() }),
  z.object({ action: z.literal("reject"), action_id: z.string().uuid() }),
]);

type Sub = Record<string, any>;

const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
};
const stripQuoted = (t: string) => t.replace(/\nOn .{5,160}wrote:[\s\S]*$/, "").replace(/(^|\n)>.*(?=\n|$)/g, "");

/** Seller-only guard: buyers, general enquiries and partners never reach the AI. */
const isSeller = (s: Sub) => {
  const kind = String(s.customer_kind ?? "").toLowerCase();
  if (kind.includes("buyer") || kind.includes("general") || kind.includes("partner")) return false;
  return s.source === "seller_quote" || (s.source === "contact" && !!s.quote_sent_at) || kind.includes("seller");
};

async function staffUser(db: SupabaseClient, req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const { data } = await db.auth.getUser(auth.slice(7));
  if (!data.user) return null;
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).limit(1).maybeSingle();
  if (!role) return null;
  const { data: prof } = await db.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, name: prof?.full_name || data.user.email || "Staff" };
}

async function loadPlaybook(db: SupabaseClient) {
  const { data } = await db.from("ai_playbook").select("version,content").is("deleted_at", null).order("version", { ascending: false }).limit(1).maybeSingle();
  return data ? { version: data.version as number, content: data.content as string } : { version: 1, content: DEFAULT_SELLER_PLAYBOOK };
}

async function buildContext(db: SupabaseClient, sub: Sub) {
  const email = String(sub.email ?? "").toLowerCase();
  const [siblings, emails, notes, files, contracts, docs, reminders] = await Promise.all([
    db.from("contact_submissions").select("id,created_at,cemetery,property_type,spaces,quote_sent_at,quote_response,la_signed_at,archived_at").eq("email", sub.email).neq("id", sub.id).is("deleted_at", null).limit(10),
    db.from("email_messages").select("from_email,subject,body_text,snippet,received_at,gmail_thread_id,gmail_message_id").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(16),
    db.from("customer_notes").select("body,author_name,created_at").or(`submission_id.eq.${sub.id}${sub.customer_profile_id ? `,customer_profile_id.eq.${sub.customer_profile_id}` : ""}`).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
    sub.customer_profile_id
      ? db.from("customer_files").select("file_name,document_type,extracted_summary,created_at").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).limit(30)
      : Promise.resolve({ data: [] as any[] }),
    db.from("contracts").select("kind,status,sent_at,viewed_at,signed_at,sign_token_expires_at,principal_key").eq("submission_id", sub.id).is("deleted_at", null),
    db.from("submission_documents").select("label,person_name,status,why,needs_notary,received_at").eq("submission_id", sub.id).is("deleted_at", null).order("sort_order"),
    db.from("reminder_log").select("reminder_type,status,sent_at").eq("submission_id", sub.id).is("deleted_at", null).order("sent_at", { ascending: false }).limit(10),
  ]);

  const answers = (sub.ownership_answers ?? {}) as Record<string, any>;
  const record = {
    name: sub.name, email: sub.email, phone: sub.phone, submitted: sub.created_at,
    cemetery: sub.cemetery, cemetery_city: sub.cemetery_city, property_type: sub.property_type,
    plot_description: sub.plot_description, section: sub.section, lawn: sub.lawn, space_numbers: sub.space_numbers,
    plot_count: sub.plot_count ?? sub.spaces, deed_owner_names: sub.deed_owner_names, relationship_to_owner: sub.relationship_to_owner,
    seller_message: clip(sub.message, 1500), details: clip(sub.details, 800),
    quote_per_space_excl_transfer_fee: sub.quote_amount, accepted_per_space: sub.accepted_quote_amount,
    transfer_fee_once: sub.transfer_fee_amount, quote_sent_at: sub.quote_sent_at, quote_response: sub.quote_response,
    listing_tier: sub.listing_tier ?? sub.listing_option, listing_paid_at: sub.listing_paid_at,
    listing_agreement_signed_at: sub.la_signed_at, family_tree_sent_at: answers.questionsSentAt ?? null,
    family_tree_completed_at: answers.sellerConfirmedAt ?? null, documents_requested_at: sub.documents_requested_at,
    documents_completed_at: sub.documents_completed_at, listing_live_at: sub.listing_live_at, sold_at: sub.sold_at,
    stage: sub.texas_pipeline_stage ?? sub.pipeline_stage_override, ai_summary: sub.ai_summary,
  };

  const emailList = (emails.data ?? []).reverse().map((e) => ({
    when: e.received_at,
    from: String(e.from_email).toLowerCase().includes("texascemeterybrokers") ? "US (TCB)" : "SELLER",
    subject: e.subject,
    text: clip(stripQuoted(String(e.body_text ?? e.snippet ?? "")), 1400),
  }));

  const latestThread = (emails.data ?? []).find((e) => e.gmail_thread_id && !/^(packet|ownership|local)-/.test(e.gmail_thread_id));
  const latestSeller = (emails.data ?? []).find((e) => !String(e.from_email).toLowerCase().includes("texascemeterybrokers"));

  const context = [
    `TODAY: ${new Date().toISOString()}`,
    `SELLER RECORD:\n${JSON.stringify(record, null, 1)}`,
    `OTHER SUBMISSIONS FROM THIS PERSON:\n${JSON.stringify(siblings.data ?? [])}`,
    `CONTRACTS:\n${JSON.stringify(contracts.data ?? [])}`,
    `DOCUMENT REQUEST ITEMS (from our rules engine — authoritative):\n${JSON.stringify(docs.data ?? [])}`,
    `FILES ON FILE:\n${JSON.stringify((files.data ?? []).map((f: any) => ({ ...f, extracted_summary: clip(f.extracted_summary, 300) })))}`,
    `AUTOMATIC REMINDERS ALREADY SENT:\n${JSON.stringify(reminders.data ?? [])}`,
    `STAFF NOTES (newest first — newest overrides everything):\n${(notes.data ?? []).map((n) => `[${n.created_at}] ${n.author_name ?? "Staff"}: ${clip(n.body, 800)}`).join("\n") || "(none)"}`,
    `EMAIL THREAD (oldest to newest):\n${emailList.map((e) => `--- ${e.when} ${e.from} | ${e.subject}\n${e.text}`).join("\n") || "(no emails)"}`,
  ].join("\n\n");

  return { context, threadId: latestThread?.gmail_thread_id ?? null, lastSellerAt: latestSeller?.received_at ?? null, lastEmailFromUs: emailList.at(-1)?.from === "US (TCB)" };
}

const INSTRUCTIONS = (playbook: string) => `You are the TCB Seller Agent for Texas Cemetery Brokers. Your job: look at one seller's full record and decide the single best next step to move them through the selling process with as little staff time as possible, strictly following the playbook.

${playbook}

RULES FOR YOUR OUTPUT
- Only propose actions for this seller. Use only facts in the record; never invent prices, fees, documents or dates. Figures must match the record exactly.
- If the seller's latest email is unanswered, propose a reply_email that answers it fully per the playbook.
- If nothing needs saying (we already replied, waiting on them, a staff note says hold), propose no email; you may propose an add_note summarising status.
- Use flag_human for anything in "Hand to a human", or when confidence is below 0.7. Do not also draft a reply in that case unless it is a brief holding reply that is clearly safe.
- Emails: plain text, following the tone rules, greeting "Dear <First Name>," and the standard sign-off. No markdown.
- Return ONLY a JSON object, no code fences, with exactly these keys:
{"stage_summary": string, "next_step": string, "reasoning": string, "confidence": number, "needs_human": boolean, "human_reason": string|null,
 "actions": [{"type": "reply_email"|"add_note"|"flag_human", "reason": string, "confidence": number, "subject": string|null, "body": string|null, "note": string|null}]}`;

async function callModel(apiKey: string, instructions: string, input: string, effort: "low" | "medium" = "medium") {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input: [{ role: "user", content: input }],
      stream: true,
      store: false,
      reasoning: { effort, summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text();
    const err = new Error(`AI gateway ${res.status}: ${text.slice(0, 400)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "", failed = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const evt = JSON.parse(data);
        if (evt.type === "response.output_text.delta") out += evt.delta ?? "";
        if (evt.type === "response.failed" || evt.type === "error") failed = JSON.stringify(evt).slice(0, 400);
      } catch { /* partial */ }
    }
  }
  if (!out.trim()) throw new Error(failed ? `AI returned no answer: ${failed}` : "AI returned no answer");
  return out;
}

function parseDecision(raw: string) {
  const t = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  const obj = JSON.parse(t.slice(start, end + 1));
  const actions = Array.isArray(obj.actions) ? obj.actions : [];
  return {
    stage_summary: String(obj.stage_summary ?? ""),
    next_step: String(obj.next_step ?? ""),
    reasoning: String(obj.reasoning ?? ""),
    confidence: Math.max(0, Math.min(1, Number(obj.confidence) || 0)),
    needs_human: Boolean(obj.needs_human),
    human_reason: obj.human_reason ? String(obj.human_reason) : null,
    actions: actions
      .filter((a: any) => ["reply_email", "add_note", "flag_human"].includes(a?.type))
      .slice(0, 4)
      .map((a: any) => ({
        type: a.type as string,
        reason: String(a.reason ?? ""),
        confidence: Math.max(0, Math.min(1, Number(a.confidence) || 0)),
        subject: a.subject ? String(a.subject).slice(0, 300) : null,
        body: a.body ? String(a.body).slice(0, 12000) : null,
        note: a.note ? String(a.note).slice(0, 4000) : null,
      })),
  };
}

async function runForSubmission(db: SupabaseClient, apiKey: string, submissionId: string, trigger: string) {
  const { data: sub } = await db.from("contact_submissions").select("*").eq("id", submissionId).maybeSingle();
  if (!sub) return { status: "skipped", reason: "not found" };
  if (sub.deleted_at || sub.archived_at) return { status: "skipped", reason: "archived or deleted" };
  if (!isSeller(sub)) return { status: "skipped", reason: "not a seller — AI agent is sellers only" };
  if (sub.ai_paused_at) return { status: "skipped", reason: "AI paused for this seller" };
  if (sub.sold_at || sub.closed_at) return { status: "skipped", reason: "file closed" };

  // Cost control: skip automatic runs when nothing new has happened since the last run.
  const { data: lastRun } = await db.from("ai_agent_runs").select("created_at").eq("submission_id", sub.id).eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: lastMsg } = await db.from("email_messages").select("received_at,from_email").eq("matched_submission_id", sub.id).is("deleted_at", null).order("received_at", { ascending: false }).limit(1).maybeSingle();
  if (trigger !== "manual" && lastRun) {
    const { count: newNotes } = await db.from("customer_notes").select("id", { count: "exact", head: true }).eq("submission_id", sub.id).gt("created_at", lastRun.created_at).not("author_name", "ilike", "AI agent%");
    const newMail = lastMsg && lastMsg.received_at > lastRun.created_at;
    if (!newMail && !newNotes && (sub.updated_at ?? "") <= lastRun.created_at) return { status: "skipped", reason: "nothing new since last review" };
  }
  // Light reasoning for routine checks; deeper reasoning only when a customer is waiting on a reply.
  const customerWaiting = !!lastMsg && !/texascemeterybrokers/i.test(lastMsg.from_email ?? "");
  const effort: "low" | "medium" = customerWaiting ? "medium" : "low";

  const playbook = await loadPlaybook(db);
  const { data: run } = await db.from("ai_agent_runs").insert({ submission_id: sub.id, trigger, playbook_version: playbook.version }).select("id").single();
  try {
    const ctx = await buildContext(db, sub);
    const raw = await callModel(apiKey, INSTRUCTIONS(playbook.content), ctx.context, effort);
    const d = parseDecision(raw);
    const needsHuman = d.needs_human || d.confidence < 0.7 || d.actions.some((a) => a.type === "flag_human");
    await db.from("ai_agent_runs").update({
      status: "done", stage_summary: d.stage_summary, next_step: d.next_step, reasoning: d.reasoning,
      confidence: d.confidence, needs_human: needsHuman, human_reason: d.human_reason,
    }).eq("id", run!.id);

    // Supersede older undecided proposals for this seller so the queue stays current.
    await db.from("ai_agent_actions").update({ status: "superseded" }).eq("submission_id", sub.id).eq("status", "proposed");

    const rows = d.actions.map((a) => ({
      run_id: run!.id, submission_id: sub.id, action_type: a.type, reason: a.reason, confidence: a.confidence,
      email_to: a.type === "reply_email" ? sub.email : null,
      email_subject: a.subject, email_body: a.body, original_email_body: a.body,
      note_body: a.type === "flag_human" ? (a.note ?? d.human_reason ?? a.reason) : a.note,
      gmail_thread_id: ctx.threadId,
    }));
    if (needsHuman && !rows.some((r) => r.action_type === "flag_human")) {
      rows.push({ run_id: run!.id, submission_id: sub.id, action_type: "flag_human", reason: d.human_reason ?? "Low confidence", confidence: d.confidence, email_to: null, email_subject: null, email_body: null, original_email_body: null, note_body: d.human_reason ?? d.next_step, gmail_thread_id: ctx.threadId });
    }
    if (rows.length) await db.from("ai_agent_actions").insert(rows);
    return { status: "done", run_id: run!.id, effort, decision: d };
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    await db.from("ai_agent_runs").update({ status: "error", error: msg.slice(0, 1000) }).eq("id", run!.id);
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    const user = await staffUser(db, req);
    if (!user) return json({ error: "Admin or staff only" }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    if (body.action === "run") {
      try {
        return json(await runForSubmission(db, apiKey, body.submission_id, body.trigger ?? "manual"));
      } catch (e) {
        const status = (e as any).status;
        return json({ error: String((e as Error).message) }, status === 402 || status === 403 || status === 429 ? status : 500);
      }
    }

    if (body.action === "sweep") {
      // Sellers who wrote to us in the last 7 days and haven't had an agent run since.
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: recent } = await db.from("email_messages").select("matched_submission_id,received_at,from_email")
        .not("matched_submission_id", "is", null).gte("received_at", since).not("from_email", "ilike", "%texascemeterybrokers%")
        .is("deleted_at", null).order("received_at", { ascending: false }).limit(200);
      const latest = new Map<string, string>();
      for (const r of recent ?? []) if (!latest.has(r.matched_submission_id!)) latest.set(r.matched_submission_id!, r.received_at);
      const results: unknown[] = [];
      let processed = 0;
      for (const [sid, at] of latest) {
        if (processed >= (body.limit ?? 10)) break;
        const { data: lastRun } = await db.from("ai_agent_runs").select("created_at").eq("submission_id", sid).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (lastRun && lastRun.created_at > at) continue;
        try {
          const r = await runForSubmission(db, apiKey, sid, "sweep");
          if ((r as any).status === "done") processed++;
          results.push({ submission_id: sid, status: (r as any).status, reason: (r as any).reason });
        } catch (e) {
          const status = (e as any).status;
          results.push({ submission_id: sid, status: "error", error: String((e as Error).message).slice(0, 200) });
          if (status === 402 || status === 403) break; // pause the whole sweep
          processed++;
        }
      }
      return json({ ok: true, processed, results });
    }

    const { data: act } = await db.from("ai_agent_actions").select("*").eq("id", body.action_id).maybeSingle();
    if (!act) return json({ error: "Action not found" }, 404);
    if (act.status !== "proposed") return json({ error: `Action already ${act.status}` }, 409);

    if (body.action === "reject") {
      await db.from("ai_agent_actions").update({ status: "rejected", decided_by_name: user.name, decided_at: new Date().toISOString() }).eq("id", act.id);
      return json({ ok: true });
    }

    // execute (approve)
    const { data: sub } = await db.from("contact_submissions").select("id,email,customer_profile_id,source,customer_kind,quote_sent_at").eq("id", act.submission_id).maybeSingle();
    if (!sub || !isSeller(sub)) return json({ error: "Not a seller — refusing to act" }, 400);
    const now = new Date().toISOString();
    let error: string | null = null;

    if (act.action_type === "reply_email") {
      if (!act.email_body || !sub.email) return json({ error: "Email body or recipient missing" }, 400);
      const res = await fetch(`${url}/functions/v1/gmail-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("authorization")!, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
        body: JSON.stringify({
          action: "send", to: sub.email, subject: act.email_subject || "Your cemetery property", body: act.email_body,
          htmlBody: `<div data-tcb-email="ai_agent" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;">${act.email_body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>`,
          ...(act.gmail_thread_id ? { threadId: act.gmail_thread_id } : {}), submissionId: sub.id, actorName: `AI agent (approved by ${user.name})`,
        }),
      });
      const text = await res.text();
      if (!res.ok || /"error"/.test(text)) error = `Email failed (${res.status}): ${text.slice(0, 300)}`;
      else await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `Sent an email to the seller: "${act.email_subject || "Your cemetery property"}". Reason: ${act.reason}`, author_name: `AI agent (approved by ${user.name})` });
    } else if (act.action_type === "add_note") {
      const { error: e } = await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `${act.note_body ?? act.reason}`, author_name: `AI agent (approved by ${user.name})` });
      if (e) error = e.message;
    }

    await db.from("ai_agent_actions").update(error
      ? { error }
      : { status: act.action_type === "flag_human" ? "acknowledged" : "executed", decided_by_name: user.name, decided_at: now, executed_at: now, error: null }).eq("id", act.id);
    if (!error) {
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_user_id: user.id, actor_name: user.name, action_type: "ai_agent_action", action_summary: `Approved AI ${act.action_type.replace("_", " ")}`, details: { action_id: act.id, edited: act.email_body !== act.original_email_body } });
    }
    return error ? json({ error }, 502) : json({ ok: true });
  } catch (e) {
    console.error("seller-agent error", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
