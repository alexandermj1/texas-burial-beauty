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
  z.object({ action: z.literal("run"), submission_id: z.string().uuid(), trigger: z.string().max(60).optional(), instruction: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("sweep"), limit: z.number().int().min(1).max(25).optional() }),
  z.object({ action: z.literal("execute"), action_id: z.string().uuid() }),
  z.object({ action: z.literal("reject"), action_id: z.string().uuid(), reason: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("prepare_packet"), submission_id: z.string().uuid(), items: z.array(z.object({ label: z.string().max(300), person: z.string().max(200).nullable().optional(), needsNotary: z.boolean().optional() })).max(40).optional() }),
  z.object({ action: z.literal("verify_deed"), submission_id: z.string().uuid() }),
  // Staff ask the AI to do one step now (still runs the exact staff code path).
  z.object({ action: z.literal("do"), submission_id: z.string().uuid(), type: z.enum(["send_listing_agreement", "resend_signing_link", "send_family_tree"]), deed_owner_names: z.string().trim().min(2).max(300).optional() }),
  // Staff tell the AI what to change on a document request; the panel applies it with the staff code.
  z.object({ action: z.literal("plan_packet"), submission_id: z.string().uuid(), instruction: z.string().trim().min(3).max(2000), items: z.array(z.object({ key: z.string().max(300), label: z.string().max(300), person: z.string().max(200).nullable().optional() })).max(60) }),
  // Replay old vs lean design on a few sellers (nothing saved as a suggestion).
  z.object({ action: z.literal("compare"), submission_ids: z.array(z.string().uuid()).min(1).max(4), batch_id: z.string().uuid().optional() }),
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

const AI_HIDDEN_USER_IDS = new Set(["e07b4a4c-56d1-4b2f-bc27-7989314d008f"]);

async function staffUser(db: SupabaseClient, req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const { data } = await db.auth.getUser(auth.slice(7));
  if (!data.user) return null;
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).limit(1).maybeSingle();
  if (!role) return null;
  // Staff who can't use AI suggestions yet (still see AI-made notes/emails).
  if (AI_HIDDEN_USER_IDS.has(data.user.id)) return null;
  const { data: prof } = await db.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, name: prof?.full_name || data.user.email || "Staff" };
}

async function loadPlaybook(db: SupabaseClient) {
  const { data } = await db.from("ai_playbook").select("version,content").is("deleted_at", null).order("version", { ascending: false }).limit(1).maybeSingle();
  return data ? { version: data.version as number, content: data.content as string } : { version: 1, content: DEFAULT_SELLER_PLAYBOOK };
}

async function buildContext(db: SupabaseClient, sub: Sub, summarizeKey: string | null = null) {
  const email = String(sub.email ?? "").toLowerCase();
  const [siblings, emails, notes, files, contracts, docs, reminders] = await Promise.all([
    db.from("contact_submissions").select("id,created_at,cemetery,property_type,spaces,quote_sent_at,quote_response,la_signed_at,archived_at").eq("email", sub.email).neq("id", sub.id).is("deleted_at", null).limit(10),
    db.from("email_messages").select("from_email,subject,body_text,snippet,received_at,gmail_thread_id,gmail_message_id").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(16),
    db.from("customer_notes").select("body,author_name,created_at").or(`submission_id.eq.${sub.id}${sub.customer_profile_id ? `,customer_profile_id.eq.${sub.customer_profile_id}` : ""}`).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
    sub.customer_profile_id
      ? db.from("customer_files").select("id,file_name,document_type,extracted_summary,created_at").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).limit(30)
      : Promise.resolve({ data: [] as any[] }),
    db.from("contracts").select("id,kind,status,sent_at,viewed_at,signed_at,sign_token,sign_token_expires_at,principal_key").eq("submission_id", sub.id).is("deleted_at", null),
    db.from("submission_documents").select("id,doc_code,label,person_name,status,required_state,why,needs_notary,received_at,notes,file_url,file_urls").eq("submission_id", sub.id).is("deleted_at", null).order("sort_order"),
    db.from("reminder_log").select("reminder_type,status,sent_at").eq("submission_id", sub.id).is("deleted_at", null).order("sent_at", { ascending: false }).limit(10),
  ]);

  const answers = (sub.ownership_answers ?? {}) as Record<string, any>;
  const record = {
    name: sub.name, email: sub.email, phone: sub.phone, submitted: sub.created_at,
    cemetery: sub.cemetery, cemetery_city: sub.cemetery_city, property_type: sub.property_type,
    plot_description: sub.plot_description, section: sub.section, lawn: sub.lawn, space_numbers: sub.space_numbers,
    plot_count: sub.plot_count ?? sub.spaces, deed_owner_names: sub.deed_owner_names, relationship_to_owner: sub.relationship_to_owner,
    seller_message: clip(sub.message, 1500), details: clip(sub.details, 800),
    quote_per_space_excl_transfer_fee: sub.quote_amount, cemetery_retail_per_space: sub.cemetery_retail, accepted_per_space: sub.accepted_quote_amount,
    transfer_fee_once: sub.transfer_fee_amount, quote_sent_at: sub.quote_sent_at, quote_response: sub.quote_response,
    listing_tier: sub.listing_tier ?? sub.listing_option, listing_paid_at: sub.listing_paid_at,
    listing_agreement_signed_at: sub.la_signed_at, family_tree_sent_at: answers.questionsSentAt ?? null,
    family_tree_completed_at: answers.sellerConfirmedAt ?? null, documents_requested_at: sub.documents_requested_at,
    documents_completed_at: sub.documents_completed_at, listing_live_at: sub.listing_live_at, sold_at: sub.sold_at,
    stage: sub.texas_pipeline_stage ?? sub.pipeline_stage_override, ai_summary: sub.ai_summary,
    family_tree_answers: (() => { const { autopilot: _a, ...rest } = answers; return clip(JSON.stringify(rest), 4000); })(),
  };

  const emailList = (emails.data ?? []).reverse().map((e) => ({
    when: e.received_at,
    from: String(e.from_email).toLowerCase().includes("texascemeterybrokers") ? "US (TCB)" : "SELLER",
    subject: e.subject,
    text: clip(stripQuoted(String(e.body_text ?? e.snippet ?? "")), 1400),
  }));
  const fmt = (e: (typeof emailList)[number]) => `--- ${e.when} ${e.from} | ${e.subject}\n${e.text}`;
  let threadText = emailList.map(fmt).join("\n");
  // Lean mode: older emails are summarised once (cheap model) and the summary reused until more mail ages out.
  if (summarizeKey && emailList.length > 6) {
    const older = emailList.slice(0, -6), recent = emailList.slice(-6);
    const lastOld = String(older.at(-1)!.when);
    let summary = (sub.ai_history_summary as string | null) ?? null;
    const through = sub.ai_history_summary_through ? new Date(sub.ai_history_summary_through).getTime() : 0;
    if (!summary || new Date(lastOld).getTime() > through) {
      try {
        const r = await callCheap(summarizeKey, HISTORY_SYS, `${summary ? `PREVIOUS SUMMARY:\n${summary}\n\n` : ""}OLDER EMAILS:\n${older.map(fmt).join("\n")}`);
        summary = String(r.summary ?? "").slice(0, 2500) || null;
        if (summary) await db.from("contact_submissions").update({ ai_history_summary: summary, ai_history_summary_through: lastOld }).eq("id", sub.id);
      } catch { summary = null; }
    }
    if (summary) threadText = `EARLIER EMAILS (summary of ${older.length} older messages):\n${summary}\n\nLATEST EMAILS (word for word):\n${recent.map(fmt).join("\n")}`;
  }

  const latestThread = (emails.data ?? []).find((e) => e.gmail_thread_id && !/^(packet|ownership|local)-/.test(e.gmail_thread_id));
  const latestSeller = (emails.data ?? []).find((e) => !String(e.from_email).toLowerCase().includes("texascemeterybrokers"));

  const context = [
    `TODAY: ${new Date().toISOString()}`,
    `SELLER RECORD:\n${JSON.stringify(record, null, 1)}`,
    `OTHER SUBMISSIONS FROM THIS PERSON:\n${JSON.stringify(siblings.data ?? [])}`,
    `CONTRACTS:\n${JSON.stringify((contracts.data ?? []).map(({ id: _i, sign_token: _t, ...c }: any) => c))}`,
    `DOCUMENT REQUEST ITEMS (from our rules engine — authoritative):\n${JSON.stringify((docs.data ?? []).filter((d: any) => d.doc_code !== "LA" && !/listing agreement/i.test(String(d.label))).map(({ doc_code: _c, file_url, file_urls, notes, ...d }: any) => ({ ...d, files_attached: (file_urls?.length ?? 0) || (file_url ? 1 : 0), notes: clip(notes, 200) })))}\n(The listing agreement is NOT part of the document review — its status comes only from CONTRACTS / listing_agreement_signed_at.)`,
    `SELLER'S DOCUMENT PAGE (include in replies about downloads, uploads or outstanding documents ONLY if a document request has been sent): ${sub.documents_requested_at ? `https://www.texascemeterybrokers.com/documents?s=${sub.id}` : "Not yet available"}`,
    `EXAMPLE AVAILABLE PROPERTY LIST (not this seller's live listing): https://www.texascemeterybrokers.com/sample-listing-sheet.html`,
    `FILES ON FILE:\n${JSON.stringify((files.data ?? []).map((f: any) => ({ ...f, extracted_summary: clip(f.extracted_summary, 300) })))}`,
    `AUTOMATIC REMINDERS ALREADY SENT:\n${JSON.stringify(reminders.data ?? [])}`,
    `STAFF NOTES (newest first — newest overrides everything):\n${(notes.data ?? []).map((n) => `[${n.created_at}] ${n.author_name ?? "Staff"}: ${clip(n.body, 800)}`).join("\n") || "(none)"}`,
    `EMAIL THREAD (oldest to newest):\n${threadText || "(no emails)"}`,
  ].join("\n\n");

  // Short view of the file for the cheap screening step and topic picking.
  const focus = [
    `STAGE: ${record.stage ?? "?"}; quote sent: ${!!sub.quote_sent_at}; quote response: ${sub.quote_response ?? "none"}; agreement signed: ${!!sub.la_signed_at}; family tree done: ${!!answers.sellerConfirmedAt}; documents requested: ${!!sub.documents_requested_at}`,
    `NEWEST STAFF NOTES:\n${(notes.data ?? []).slice(0, 3).map((n) => `${n.author_name ?? "Staff"} (${n.created_at}): ${clip(n.body, 300)}`).join("\n") || "(none)"}`,
    `LATEST EMAILS:\n${emailList.slice(-2).map((e) => `${e.from} (${e.when}): ${clip(e.text, 700)}`).join("\n") || "(none)"}`,
  ].join("\n\n");

  return { contracts: (contracts.data ?? []) as any[], context, focus, threadId: latestThread?.gmail_thread_id ?? null, lastSellerAt: latestSeller?.received_at ?? null, lastEmailFromUs: emailList.at(-1)?.from === "US (TCB)" };
}

const first = (sub: Sub) => String(sub.name ?? "The seller").trim().split(/\s+/)[0] || "The seller";
const SITE = "https://www.texascemeterybrokers.com";
const FIX_FIELDS = ["plot_description", "section", "lawn", "space_numbers"];
const DOC_STATES = ["needed", "received", "notarized", "not_needed", "issued"];
const FIELD_LABEL: Record<string, string> = { phone: "phone number", section: "section", lawn: "lawn/garden", space_numbers: "space numbers", deed_owner_names: "deed owner names", relationship_to_owner: "relationship to the owner", plot_description: "plot description", cemetery_city: "cemetery city" };
const EDITABLE_FIELDS = ["phone", "section", "lawn", "space_numbers", "deed_owner_names", "relationship_to_owner", "plot_description", "cemetery_city", "plot_count"];
// The quote stores the authorised sale price per space excluding one transfer fee.
// Match the admin quote ceiling: buyer pays 115% of (price + transfer fee).
function higherQuote(sub: Sub) {
  if (sub.quote_amount == null || sub.cemetery_retail == null || sub.transfer_fee_amount == null) return null;
  const current = Number(sub.quote_amount);
  const retail = Number(sub.cemetery_retail);
  const fee = Number(sub.transfer_fee_amount);
  if (!(Number.isFinite(current) && current > 0 && Number.isFinite(retail) && retail > 0 && Number.isFinite(fee) && fee >= 0)) return null;
  const proposed = Math.round(current * 1.1 * 100) / 100;
  return (proposed + fee) * 1.15 <= retail * 0.70 + 0.005 ? proposed : null;
}

/** Which admin-panel actions are valid on this record RIGHT NOW — computed with the same milestones the panel uses. */
function allowedActions(sub: Sub, contracts: any[]) {
  const answers = (sub.ownership_answers ?? {}) as Record<string, any>;
  const la = contracts.filter((c) => c.kind === "listing_agreement" && c.status !== "void");
  const signed = !!sub.la_signed_at || la.some((c) => ["signed", "notarized", "completed"].includes(c.status));
  const accepted = sub.quote_response === "accepted" || Number(sub.accepted_quote_amount) > 0;
  const liveLink = la.find((c) => ["sent", "viewed"].includes(c.status) && c.sign_token && (!c.sign_token_expires_at || c.sign_token_expires_at > new Date().toISOString()));
  const out = new Set(["reply_email", "add_note", "flag_human", "update_fields"]);
  // All customer-facing quote changes still require staff approval.
  if (accepted && !signed && !la.some((c) => ["sent", "viewed"].includes(c.status))) out.add("send_listing_agreement");
  if (accepted && !signed && liveLink) out.add("resend_signing_link");
  if (signed && !answers.questionsSentAt && !answers.sellerConfirmedAt) out.add("send_family_tree");
  // Document requests are never proposed automatically — staff trigger them
  // ("Fill with AI" on the Check the request screen).
  if (sub.documents_requested_at && !sub.documents_completed_at) { out.add("fix_document_request"); out.add("update_document_items"); }
  if (sub.quote_sent_at && !accepted && !signed) { out.add("resend_quote_free_listing"); if (Number(sub.quote_amount) > 0) out.add("update_quote_spaces"); if (higherQuote(sub) !== null) out.add("increase_quote_ten_percent"); }
  if (sub.quote_sent_at && !accepted && !signed && quoteExpired(sub)) out.add("resend_expired_quote");
  return { allowed: out, liveLink };
}

// Quotes are valid for ten days from the sent date unless a later expiry was saved.
function quoteExpired(sub: Sub) {
  const now = Date.now();
  if (sub.quote_expires_at) return new Date(String(sub.quote_expires_at)).getTime() < now;
  return !!sub.quote_sent_at && new Date(String(sub.quote_sent_at)).getTime() + 10 * 86_400_000 < now;
}

const TOOLS_DOC = `ADMIN PANEL ACTIONS YOU CAN PROPOSE (a staff member approves each one; each runs the exact same code staff use, so records, email tags, milestones and notifications are identical to a human doing it):
- reply_email: plain-text reply in the seller's thread. Fields: subject, body.
- add_note: internal team note on the profile. Field: note.
- flag_human: hand to a person (phone, complaints, legal, refunds, cancellations, price changes, payment links, death/probate edge cases). Field: note.
- update_fields: correct descriptive record fields ONLY from facts the seller or a document clearly states. Field: fields = object with keys from ${EDITABLE_FIELDS.join(", ")}. Never prices, stages, dates or names from guesses.
- send_listing_agreement: generates the listing agreement from the ACCEPTED quote and emails the signing link (autopilot). Only when the quote is accepted and no agreement has been sent. Do not also write a reply_email saying the same thing.
- resend_signing_link: re-emails the existing, still-valid signing link. Use when the seller says they can't find it. Do not resend if they said they will sign later.
- send_family_tree: emails the family tree / ownership questions. Only after the agreement is signed.
- resend_quote_free_listing: ONLY when a staff note or email shows we agreed the seller's listing fee is waived / free listing (e.g. "Pro with its listing fee waived"). Re-sends their ORIGINAL quote email in the same thread (same figures and buttons) with a short intro asking them to use the existing explicitly waived Starter option (never the current paid Starter button); we record it internally as Pro, so no payment is taken. Fields: subject, body = the short plain intro (e.g. "As agreed, your listing fee is waived. To continue, simply click the explicitly waived option in your original quote below — we will record it on our side as the Pro listing, so there is nothing to pay."). Use this instead of flag_human for fee waivers.
- update_quote_spaces: quote corrections, ONLY when the seller (or the deed scan) shows the quote has the wrong spaces in the SAME section/lawn/garden — they want to add a space, take one out, swap to DIFFERENT spaces in that same area, or we copied the space numbers/count from the deed wrongly. Spaces in the same area are valued at the same per-space price. The per-space price stays EXACTLY the same; only the count / space numbers change. Fields: fields = {spaces (required, the new number of spaces as digits), space_numbers?, section?, lawn?}. On approval it saves the new spaces and opens the normal Send quote screen prefilled, so staff send it exactly like any quote (listing agreement and family tree follow as usual). Put a one-line summary in reason (e.g. "Adds space 5 in Section 12 at the same $2,100 per space"). Do NOT also write a reply_email.
 - increase_quote_ten_percent: ONLY when a seller clearly asks for a higher quote, an existing unaccepted quote is on file, and this action is ALLOWED NOW. Propose it with one short reason and body as a SHORT introductory paragraph above the quote explaining we revisited their request. The server calculates the exact 10% increase and strictly checks the 70%-of-retail buyer total including the transfer fee and 15% buyer fee. Staff approval opens the normal seller quote packet; it is not emailed until staff checks the price, deed owners, property description and presses Send. Never propose for a plain decline, an existing accepted quote, a demand for a specific different figure, a price dispute/complaint, or a plot-count discrepancy. Never pair it with reply_email.
 - resend_expired_quote: ONLY when the seller's unaccepted quote has EXPIRED (ALLOWED NOW) and they want to go ahead, ask about it, or ask for more time. Same price per space, same spaces — nothing changes except a fresh 10-day window. Field: body = a SHORT friendly intro shown above the quote (e.g. "Your earlier quote has expired, so we've renewed it at the same figures for another ten days."). On approval it opens the normal quote email generator prefilled; staff press Send. Never pair it with reply_email. Use this instead of flag_human for expired quotes.
 - PRICE DISPUTES / FEE QUESTIONS: answer them yourself with reply_email from the SAVED QUOTE FIGURES (quote_amount = per space excluding the transfer fee, plot count, transfer_fee_amount charged once and paid from the sale, separate 15% buyer fee paid by the buyer) and the quote email actually sent in the thread. Explain calmly how the numbers fit together and correct any misunderstanding. If an earlier email from us gave a different figure, acknowledge it honestly and say which figure is current. Do not invent a new price; if they want more, use increase_quote_ten_percent when allowed.
 - STARTER CANCELLATION FEE: quote whatever fee the seller's own quote email states (read it in the thread). Only if their quote email is not visible use the playbook figure.
 - Quotes: apart from resend_quote_free_listing, update_quote_spaces, increase_quote_ten_percent and resend_expired_quote you NEVER send or propose quotes or valuations. New valuations, a different garden/lawn (different area) or a different cemetery, an unverified retail/transfer fee, or a price change beyond the standard 10%: flag_human with the reason.
- fix_document_request: ONLY for wrong PROPERTY DETAILS on a document request that has already gone out (wrong section, lot, space numbers or plot wording). Fields: fields = {plot_description (required, the full corrected "locations being sold" wording), section?, lawn?, space_numbers?}; subject + body = a short email telling the seller it has been corrected and their documents page is updated (do not ask them to re-do anything already signed). On approval it saves the corrected location everywhere, rebuilds every unsigned prepared document (POA, affidavit etc.) so the live documents page shows the new wording, and emails the seller. Signed documents are never changed. Only propose this when the DEED SCAN and/or the email record clearly support the correction — quote the evidence in reason.
- update_document_items: work the document checklist exactly like staff do on the Documents panel. Field: items = array of {id (the item id from DOCUMENT REQUEST ITEMS), state?: one of ${DOC_STATES.join(" | ")}, attach_file_ids?: [ids from FILES ON FILE], note?: short plain note}. Use it to tick items received when the seller has sent them (check the file/scan actually is that document, for that person), attach the seller's emailed file to the right item, mark notarized when a notarised original is confirmed, or mark not_needed when the rules/staff note clearly say so. Items that need a wet-ink notarised original (needs_notary) are only "received"/"notarized" once staff notes confirm the original arrived — a photo alone means attach the file but leave the state. Pair with a short reply_email thanking them / saying what's still outstanding when they are waiting.
Only use actions listed as ALLOWED NOW. Anything else will be discarded.`;

// Ownership / document questions — the AI answers these itself from the same
// rules the document-request generator uses, instead of handing them to staff.
const OWNERSHIP_GUIDE = `OWNERSHIP AND DOCUMENT QUESTIONS — ANSWER THESE YOURSELF (do NOT flag a human for them)
You know the exact rules our document-request generator uses. Use them to answer "what documents will I need / who has to sign / my parent passed away / I have a will" questions confidently and in general terms:
- The current deed (or an affidavit of lost deed that matches cemetery records) is always needed.
- Anyone alive named on the deed signs. For anyone named on the deed who has died: their surviving legal spouse at the time of death, plus their heirs at law, take their place.
- Heirs at law: surviving children, then children of a deceased child, then children of a deceased grandchild. If there are none: surviving siblings, then surviving parents.
- Affidavit of heirship whenever the heirs-at-law rule is used. Death certificate for any deceased person who would have signed. Marriage certificate when a surviving spouse is not named on the deed. Name-change documents when a deed name no longer matches the ID.
- Every signer: photo ID. Limited POA to TCB (single if not married, joint if a married couple both sign). If someone signs for another person, their existing durable POA.
- A probated will: "A certified copy of the probated will and the order admitting it to probate." We review wills as part of the file — you may say so; you do not need to interpret it.
HOW TO RESPOND, BY STAGE:
- Before the family tree is complete (no quote yet, quote sent, quote accepted, agreement unsigned): reassure them briefly and in general terms using the rules above, then explain that we work with the cemeteries and internally to work out exactly which documents their case needs, and we do that from our short ownership questionnaire (family tree). Gently point them to their one next step toward it: if there is no quote yet, the quote (we need cemetery, section/lot/space and the deed photo); if a quote is out, accepting it; if accepted, signing the listing agreement, which takes them straight to the questionnaire. Do not list a full document checklist before the family tree — say the exact list comes after the questionnaire.
- After the family tree is complete: answer from DOCUMENT REQUEST ITEMS (authoritative) — explain what each item is and why, exactly as listed.
- A deed in a deceased person's name is STANDARD and never a reason to flag, at any cemetery (including Dignity-owned ones like Laurel Land or Forest Park). We process it the normal way: the person who enquired accepts the quote and signs the listing agreement, then the family tree works out who must sign and which documents are needed.
- Only flag a human for ownership matters when: the seller wants a call, a will actually needs to be read against the ownership AFTER the family tree, deed holders who were not spouses of each other have died, or the rules truly cannot resolve it. A deceased owner, heirs, probate or a will being mentioned is NOT on its own a reason to flag — answer it.
- Never tell the seller "our team will review and get back to you" for a question you can answer from these rules.`;

const DOC_CHECK_GUIDE = `CHECKING A DOCUMENT REQUEST WHEN THE SELLER SAYS SOMETHING IS WRONG
You can see the scans on file (deed, intake uploads, email attachments) attached below the record. Use them.
- The document-request generator's rules are almost always right. When a request is wrong it is nearly always because the INPUT was wrong: (1) staff typed the wrong plot details (section/lot/spaces), (2) the family tree started from the wrong person — e.g. the deed had already been transferred to someone else, so the tree was answered about the previous owner, or (3) the seller misunderstood the family-tree questions about holding a POA for someone else. Known quirk: at Restland it can sometimes list more documents than needed.
- Wrong plots: compare the deed scan, the seller's emails (did they tell us something different?) and the record. If the deed and/or their email clearly support the correction, propose fix_document_request with the corrected wording and a short confirmation email. If the deed contradicts the seller, reply politely quoting what the deed shows and ask them to confirm. If there is no readable deed, ask for a clear photo of it.
- Deed in someone else's name / tree started from the wrong person, or POA confusion: the family tree answers must be corrected — flag_human with exactly what you found (who the deed names vs who the tree was answered about). No holding reply.
- Restland extra documents: flag_human noting which items look unnecessary; don't tell the seller to ignore items yourself.
- Never guess from a blurry scan — say what you could and couldn't read.`;

const INSTRUCTIONS = (playbook: string) => `You are the TCB Seller Agent for Texas Cemetery Brokers. Your job: look at one seller's full record and decide the single best next step to move them through the selling process with as little staff time as possible, strictly following the playbook.

${playbook}

${TOOLS_DOC}

TONE FOR NEXT STEPS: move the seller forward gently. Mention only the one next step, once, softly ("Whenever you're ready…", "When it suits you…"). Never stack several steps, never use urgency ("please make sure", "as soon as possible", "you must"). If we already suggested a step and they have not replied, do not repeat it — reminders are handled automatically.

${OWNERSHIP_GUIDE}

${DOC_CHECK_GUIDE}

RULES FOR YOUR OUTPUT
- Only propose actions for this seller. Use only facts in the record; never invent prices, fees, documents or dates. Figures must match the record exactly.
- If the seller's latest email is unanswered, propose a reply_email that answers it fully per the playbook.
- If nothing needs saying (we already replied, waiting on them, a staff note says hold), propose no email; you may propose an add_note summarising status.
- Use flag_human for anything in "Hand to a human", or when confidence is below 0.7. When you flag a human, propose NOTHING else — no reply, no holding email ("we'll call you back"), no note. The seller must stay in Needs reply so staff can see it.
- DEED ALREADY SENT, NO QUOTE YET: if the seller has sent the deed (and any other paperwork, e.g. an affidavit) as attachments and no quote has gone out, reply that we have everything we need for now and are completing their valuation and coordinating with the cemetery. Do not ask for more, do not flag.
- LONG LISTS OF QUESTIONS: if a seller sends a very long list of clearly AI-generated or template questions (many numbered questions, legal/contract style), politely decline in a short reply_email: thank them, say we are not able to answer a questionnaire of that length, and that if they need that level of detail they may prefer to work with another company. Do not answer the questions, do not flag.
- SELLER DECLINES THE QUOTE (decided to sell elsewhere, keeping them, does not request a revision): reply_email politely — thank them, say we understand, and wish them the best of luck selling. Keep the door open in one line ("if anything changes, we're happy to help"). Do not argue or push. A direct request for a higher revised quote is handled separately below; a plain decline alone does not trigger it.
- WANTS MORE FOR THE PROPERTY: If they clearly ask us to improve their existing quote and increase_quote_ten_percent is ALLOWED NOW, propose that action alone. If it is not allowed, flag staff to decide whether the quote can change; never invent or promise a new number. A plain decline with no request for a revised offer gets a courteous reply, not a new quote. A disputed price, changed plots or a requested exact amount needs staff. Do not confuse this with a simple same-area space correction, which uses update_quote_spaces.
- DOCUMENTS: If answering about a prepared POA, say it can be downloaded on the document page, signed IN FRONT of a notary, then mailed as a wet-ink original to the address on the page. An uploaded scan for review is optional; do NOT ask for one before mailing or imply they must wait for scan approval. If they ask about digital documents or BOTH emailing and posting them, include their personal document-page link for computer uploads or its QR code / "Use my phone" photos (tagged to checklist items), with email attachments as an alternative. If they are ALSO posting originals, give the mailing address, making clear uploads are optional and NOT required before posting. For posting-only questions, simply give mailing instructions without adding a scan-upload step. Do not introduce unmentioned services such as FedEx sending email. Never suggest we are waiting on a buyer or transfer when we are actually waiting on a POA original to make the LISTING live. Only include the case-specific document page when SELLER'S DOCUMENT PAGE says it is available.
- LISTING VISIBILITY: if asked where an individual listing is, explain that we use searchable cemetery pages instead of individual plot pages; buyers who enquire are matched with our internal property list, also shared with mortuaries. Link the EXAMPLE AVAILABLE PROPERTY LIST; clearly label it as an example, not live inventory. This ordinary question needs no human review unless the seller disputes their actual marketing status.
- REQUIRED DOCUMENTS: we cannot market or sell without the required ownership/transfer paperwork. We can keep the seller's details on file. If a refund, cancellation, hold or conflicting staff instruction is on the file, leave it to staff to decide whether the file can resume; no customer email from the AI until staff decides.
- SPACE CORRECTIONS on a sent quote (add/remove a space in the same area, space numbers copied wrong): use update_quote_spaces, don't flag.
- PHYSICAL ORIGINALS: whenever an email mentions mailing/posting original documents we have not logged as received, word it softly in case they are already on their way or have arrived and our team hasn't logged them yet, e.g. "If you've already posted it, thank you — our team will add it to your file as soon as it's logged." Never imply the seller hasn't sent something.
- WAITING ON A MAILED POA: be warm and patient — thank them, say we look forward to receiving it, and that once it arrives we'll add it to their file and their listing will go live. No pressure, no blame.
- POA PHOTO/SCAN NOT YET MAILED: if the seller sends a photo or scan of a power of attorney, check it in the scans: signed by the right person(s) named on the POA, notary block completed (notary signature, seal/stamp, date, commission), and no blank required fields. If it looks right, tell them it looks good and to mail the original. If something is missing or wrong, explain exactly what, kindly, and how to fix it. If unreadable, say so.
- "IS ANYTHING ELSE NEEDED?" / FILE COMPLETE: only say nothing else is needed when every DOCUMENT REQUEST ITEM is received/notarized/not_needed, or staff explicitly confirmed it in a note/email. For wet-ink originals, staff must have confirmed arrival. If staff confirmed by email but the checklist items still read pending, say so in reasoning and propose update_document_items for the items the evidence supports.
- CHECK FILING (only when relevant — the seller asks if anything else is needed, says they sent something, or you are reviewing that part of the request): check that the files emailed/uploaded match the checklist item they belong to (right document, right person, e.g. each death certificate under the right deceased person). Propose update_document_items to attach unfiled files to the right item; mention mismatches in reasoning.
- COUNTER-SIGNED LISTING AGREEMENT: if asked, explain the broker counter-signs the listing agreement once we have all the documents required to sell the property, and they will receive the counter-signed copy by email at that point.
- NOTES (add_note and every note field): write like a colleague in one plain sentence, e.g. "Robert sent us his phone number: 281-788-6197." Never "Updated the record:", arrows, quotes around values or "Reason:".
- Emails: plain text, following the tone rules, greeting "Dear <First Name>," and the standard sign-off. No markdown.
- KEEP EVERY EXPLANATION SHORT AND PLAIN. Staff skim these on a busy panel:
  - stage_summary: one line, max 12 words, e.g. "Quote accepted, agreement signed, waiting on the deed."
  - next_step: max 10 words, e.g. "Reply confirming we received the deed."
  - reasoning: 1-2 short sentences, plain words, no jargon, no restating the whole record.
  - each action's reason: one short sentence, e.g. "She asked where to send the deed — reply with the address."
  - human_reason: one short sentence saying exactly what a person must decide.
- VISUALS (helps staff see what you mean at a glance; add only when they genuinely help, max 3):
  - When your reasoning or an action relies on a SCAN, add {"kind":"scan","scan":<SCAN number>,"caption":"one short line","marks":[{"x":0-1,"y":0-1,"w":0-1,"h":0-1,"label":"2-4 words"}]} — marks are boxes around the exact spot (fractions of the image width/height from the top-left), e.g. the grantee names, the plot wording, a missing notary seal. Max 4 marks; omit marks if unsure of the position or the scan is a PDF.
  - When family, heirs, signers or POAs matter, add {"kind":"family_tree","people":[{"name":string,"relation":string,"parent":string|null (name of the person above them, null for the deed owner),"deceased":boolean,"signs":boolean,"note":string|null}]} (max 12 people).
  - Use visuals anywhere they make your point quicker to check: deed or POA checks, which file sits under which checklist item, quote figures vs what an email said, plot/space corrections, who must sign.
  - When the record and the evidence disagree or need checking, add {"kind":"compare","title":string,"rows":[{"label":string,"record":string,"evidence":string,"match":boolean}]} (max 8 rows).
- FIX THE RECORD FROM EVIDENCE: whenever a compare row shows a record field that is blank or wrong and the deed/scan/seller email clearly shows the right value, ALSO propose update_fields with those values (e.g. space_numbers "3 & 4", plot_count "2", section, lawn, deed_owner_names, plot_description) and a note like "Filled in the space numbers (3 & 4) and plot count (2) from the deed." Include the compare visual on that action. Never change prices, stages or dates. If a document request has already gone out and the plot wording itself is wrong, use fix_document_request instead, with a compare visual (old wording vs the deed/email) and the deed scan so staff see exactly what is changing and why.
- Return ONLY a JSON object, no code fences, with exactly these keys:
{"stage_summary": string, "next_step": string, "reasoning": string, "confidence": number, "needs_human": boolean, "human_reason": string|null,
 "visuals": array (may be empty),
 "actions": [{"type": string, "reason": string, "confidence": number, "subject": string|null, "body": string|null, "note": string|null, "fields": object|null, "items": array|null}]}`;

// ───────────── Lean mode: same rules, sent only when relevant ─────────────
// Static part (identical for every seller → cached): role, core playbook chapters,
// tone, general output rules and JSON format. Per-case part: the playbook chapters,
// topic rules, ownership/document guides and only the actions ALLOWED NOW.
const CHEAP_MODEL = "google/gemini-3.1-flash-lite";
const TOPICS = ["documents", "quote", "signing", "listing", "cash", "standard"];

async function leanMode(db: SupabaseClient) {
  const { data } = await db.from("ai_agent_settings").select("value").eq("key", "lean_mode").maybeSingle();
  return data?.value === true || data?.value === "true";
}

async function callCheap(apiKey: string, system: string, user: string): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: CHEAP_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: `${user}\n\nReply with JSON only.` }], response_format: { type: "json_object" } }),
  });
  if (!res.ok) { const e = new Error(`cheap model ${res.status}`) as Error & { status?: number }; e.status = res.status; throw e; }
  const j = await res.json();
  const t = String(j.choices?.[0]?.message?.content ?? "{}").replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
}

const TRIAGE_SYS = `You screen a cemetery-plot SELLER's file for Texas Cemetery Brokers before an expensive full review.
needs_review = true if: the seller's latest email is unanswered, a staff note asks for something, the change may need a reply / record fix / document update, or you are at all unsure.
needs_review = false ONLY when clearly nothing is needed right now (we already replied and are waiting on them, the seller only said thanks/ok, a staff note says hold or don't chase).
topics = every area the next step might touch, from: documents (deeds, POAs, heirs, family tree, uploads, mailing originals), quote (prices, fees, spaces, expired, declined, wants more), signing (listing agreement / links not working), listing (where is my listing, marketing), cash (asks us to buy directly), standard (common questions). Include a topic when in doubt.
Return {"needs_review": boolean, "topics": string[], "stage_summary": string (max 12 words)}.`;

const HISTORY_SYS = `Summarise these older emails between Texas Cemetery Brokers ("US (TCB)") and a cemetery-plot seller for a colleague who will read only this summary.
Keep every fact that may matter later: figures quoted, fees mentioned, documents sent / received / promised and for whom, dates, names, plot details, promises we made, seller requests, refusals, refunds, holds, cancellations. If a PREVIOUS SUMMARY is given, merge it in. Plain sentences, max 200 words. Return {"summary": string}.`;

const FULL_TEMPLATE = INSTRUCTIONS("@@PLAYBOOK@@");
const ROLE_LINE = FULL_TEMPLATE.split("\n")[0];
const TONE_LINE = (FULL_TEMPLATE.match(/TONE FOR NEXT STEPS[^\n]*/) ?? [""])[0];
const RULE_BULLETS = FULL_TEMPLATE.split("RULES FOR YOUR OUTPUT\n")[1].split(/\n(?=- )/);
const ruleTopic = (b: string) =>
  /^- (DOCUMENTS|PHYSICAL ORIGINALS|WAITING ON A MAILED POA|POA PHOTO|"IS ANYTHING ELSE|CHECK FILING|COUNTER-SIGNED|REQUIRED DOCUMENTS)/.test(b) ? "documents"
  : /^- (SELLER DECLINES|WANTS MORE|SPACE CORRECTIONS)/.test(b) ? "quote"
  : /^- LISTING VISIBILITY/.test(b) ? "listing" : "core";

function playbookSections(content: string) {
  return content.split(/\n(?=#{2,3} )/).map((text, i) => {
    const t = i === 0 ? "" : text.split("\n")[0].replace(/^#+\s*/, "").toLowerCase();
    const topics = /^direct cash/.test(t) ? ["cash"]
      : /^documents and why|^the documents page|^the family tree/.test(t) ? ["documents"]
      : /^document-page and listing/.test(t) ? ["documents", "listing"]
      : /^owner clarification: posting originals/.test(t) ? ["documents", "quote"]
      : /^standard answers/.test(t) ? ["standard"]
      : /^the quote email|^declined quotes|^simple quote corrections/.test(t) ? ["quote"]
      : /^signing the listing agreement/.test(t) ? ["signing"]
      : []; // core (and any new chapter, to stay safe)
    return { text, topics };
  });
}

function keywordTopics(sub: Sub, text: string) {
  const t = text.toLowerCase();
  const out = new Set<string>();
  if (/deed|document|paperwork|poa|power of attorney|notar|death|certificate|affidavit|heir|\bwill\b|probate|signer|signature|\bid\b|mail|post(ed|ing)?\b|upload|original|passed|deceased|died|spouse|wife|husband|family tree|questionnaire|ownership/.test(t)) out.add("documents");
  if (/quote|price|offer|money|worth|valu|fee|commission|transfer|expire|space|plot|lower|higher|starter|\bpro\b|featured|cancel|declin|accept|elsewhere|refund/.test(t)) out.add("quote");
  if (/sign|agreement|contract|link|won.?t|can.?t|doesn.?t|not working|error|button|scroll|laptop/.test(t)) out.add("signing");
  if (/listing|listed|website|where can i|market|advertis/.test(t)) out.add("listing");
  if (/cash|buy (it|them|the plots?) (yourself|directly)|purchase (it |them )?directly|outright/.test(t)) out.add("cash");
  // Stage-based: the chapters for the step the seller is on are always included.
  const accepted = sub.quote_response === "accepted" || Number(sub.accepted_quote_amount) > 0;
  // Quote/tier chapters are always included once a quote exists (tier and fee mismatches matter at every later stage).
  if (sub.quote_sent_at) out.add("quote");
  if (accepted && !sub.la_signed_at) out.add("signing");
  if (sub.la_signed_at || sub.documents_requested_at) out.add("documents");
  return out;
}

function toolsFor(allowed: Set<string>, topics: Set<string>) {
  return TOOLS_DOC.split("\n").filter((l) => {
    const m = l.match(/^\s*-\s*([a-z_]+):/);
    if (m) return allowed.has(m[1]);
    if (/^\s*-\s*(PRICE DISPUTES|STARTER CANCELLATION|Quotes:)/.test(l)) return topics.has("quote");
    return true;
  }).join("\n");
}

const LEAN_STATIC = (playbook: string) => [
  ROLE_LINE,
  playbookSections(playbook).filter((s) => !s.topics.length).map((s) => s.text).join("\n"),
  "Extra rulebook chapters, rules and the admin actions available for THIS seller are given at the top of the input under CASE RULES. Follow them exactly as if they were written here.",
  TONE_LINE,
  "RULES FOR YOUR OUTPUT\n" + RULE_BULLETS.filter((b) => ruleTopic(b) === "core").join("\n"),
].join("\n\n");

function leanCaseRules(playbook: string, allowed: Set<string>, topics: Set<string>) {
  const has = (ts: string[]) => ts.some((t) => topics.has(t));
  return [
    `CASE RULES (topics: ${[...topics].join(", ") || "none"})`,
    playbookSections(playbook).filter((s) => s.topics.length && has(s.topics)).map((s) => s.text).join("\n"),
    RULE_BULLETS.filter((b) => { const k = ruleTopic(b); return k !== "core" && topics.has(k); }).join("\n"),
    topics.has("documents") ? `${OWNERSHIP_GUIDE}\n\n${DOC_CHECK_GUIDE}` : "",
    toolsFor(allowed, topics),
  ].filter(Boolean).join("\n\n");
}

type Prep = { instructions: string; input: string; scans: { parts: any[]; names: string[]; refs: any[] }; skip?: { stage_summary: string; next_step: string } };

async function preparePrompt(db: SupabaseClient, apiKey: string, sub: Sub, ctx: any, allowed: Set<string>, playbook: string, o: { lean: boolean; instruction: string; customerWaiting: boolean; trigger: string }): Promise<Prep> {
  const noScans = { parts: [], names: [], refs: [] as any[] };
  let topics = new Set<string>();
  if (o.lean) {
    topics = keywordTopics(sub, `${ctx.focus}\n${o.instruction}`);
    if (o.customerWaiting || o.instruction) topics.add("standard");
    if (!o.instruction) {
      try {
        const t = await callCheap(apiKey, TRIAGE_SYS, ctx.focus);
        for (const x of Array.isArray(t.topics) ? t.topics : []) if (TOPICS.includes(x)) topics.add(x);
        const automatic = !["manual", "refresh"].includes(o.trigger);
        if (automatic && !o.customerWaiting && t.needs_review === false) return { instructions: "", input: "", scans: noScans, skip: { stage_summary: String(t.stage_summary ?? "").slice(0, 120) || "No action needed", next_step: "No action needed" } };
      } catch { /* keyword topics only */ }
    }
  }
  // Only read the scans when there is something to check: the seller's latest message
  // questions the documents/plots/details, or staff asked for a manual review.
  const lastText = String(ctx.context).slice(-3500).toLowerCase();
  const wantsCheck = /wrong|mistake|incorrect|not (right|correct)|deed|document|paperwork|plot|section|lot|space|name is|spelled|transfer|notar|power of attorney|poa|death cert|anything else|need anything|mailed|posted|sent (it|them|the)/.test(lastText);
  const scans = ((o.customerWaiting && wantsCheck) || o.instruction) ? await loadScans(db, sub) : noScans;
  if (scans.names.length) topics.add("documents");
  const directive = o.instruction ? `STAFF INSTRUCTION — a staff member reviewing this file is telling you what to do: "${o.instruction}"\nFollow it. Facts the staff member states (e.g. what the seller told them by phone, the correct plot wording) count as evidence — use them. A person is already reviewing, so do NOT use flag_human and set needs_human false. Produce exactly what they asked (e.g. a reply_email draft). Only if it is truly impossible, say why in reasoning and propose an add_note instead.\n\n` : "";
  const head = `${directive}ALLOWED NOW: ${[...allowed].join(", ")}\n\nSCANS ATTACHED: ${scans.names.length ? scans.names.join("; ") : "(none readable)"}\n\n`;
  if (!o.lean) return { instructions: INSTRUCTIONS(playbook), input: head + ctx.context, scans };
  return { instructions: LEAN_STATIC(playbook), input: `${leanCaseRules(playbook, allowed, topics)}\n\n${head}${ctx.context}`, scans };
}

/** Replay helper: one decision, nothing saved. */
async function decideOnly(db: SupabaseClient, apiKey: string, sub: Sub, lean: boolean) {
  try {
    const playbook = await loadPlaybook(db);
    const { data: lastMsg } = await db.from("email_messages").select("from_email").eq("matched_submission_id", sub.id).is("deleted_at", null).order("received_at", { ascending: false }).limit(1).maybeSingle();
    const customerWaiting = !!lastMsg && !/texascemeterybrokers/i.test(lastMsg.from_email ?? "");
    const ctx = await buildContext(db, sub, lean ? apiKey : null);
    const { allowed } = allowedActions(sub, ctx.contracts);
    const prep = await preparePrompt(db, apiKey, sub, ctx, allowed, playbook.content, { lean, instruction: "", customerWaiting, trigger: "manual" });
    const raw = await callModel(apiKey, prep.instructions, prep.input, customerWaiting ? "medium" : "low", prep.scans.parts);
    const d = parseDecision(raw, allowed);
    return { input_chars: prep.instructions.length + prep.input.length, decision: { stage_summary: d.stage_summary, next_step: d.next_step, reasoning: d.reasoning, needs_human: d.needs_human, confidence: d.confidence, actions: d.actions.map((a) => ({ type: a.type, reason: a.reason, subject: a.subject, body: a.body, note: a.note, fields: a.fields })) } };
  } catch (e) {
    return { error: String((e as Error).message).slice(0, 300) };
  }
}

/** Scans on file (deed first) as image/PDF parts so the AI can read them. Kept small for cost. */
async function loadScans(db: SupabaseClient, sub: Sub) {
  if (!sub.customer_profile_id) return { parts: [] as any[], names: [] as string[], refs: [] as any[] };
  const { data } = await db.from("customer_files").select("file_name,file_path,mime_type,document_type,file_size,created_at")
    .eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(40);
  const ok = (f: any) => /^image\/(jpeg|png|webp)$/.test(f.mime_type ?? "") ? (f.file_size ?? 0) < 12_000_000 : f.mime_type === "application/pdf" && (f.file_size ?? 0) < 5_000_000;
  const rank = (f: any) => /deed|certificate of ownership/i.test(f.document_type ?? "") ? 0 : /power of attorney|poa|death|affidavit|photo id|will/i.test(`${f.document_type} ${f.file_name}`) ? 1 : /intake/i.test(f.document_type ?? "") ? 2 : /attachment/i.test(f.document_type ?? "") ? 2 : 9;
  const seen = new Set<number>();
  const picked = (data ?? []).filter(ok).filter((f) => !seen.has(f.file_size) && seen.add(f.file_size)).filter((f) => rank(f) < 9).sort((a, b) => rank(a) - rank(b)).slice(0, 6);
  const parts: any[] = [], names: string[] = [], refs: any[] = [];
  for (const f of picked) {
    // Phone photos are large: ask storage for a resized copy first, fall back to the original.
    let blob: Blob | null = null;
    if (f.mime_type !== "application/pdf") {
      const { data: su } = await db.storage.from("customer-files").createSignedUrl(f.file_path, 120, { transform: { width: 1600, quality: 70 } });
      if (su?.signedUrl) { const r = await fetch(su.signedUrl).catch(() => null); if (r?.ok) blob = await r.blob(); }
    }
    if (!blob && (f.file_size ?? 0) < 5_000_000) blob = (await db.storage.from("customer-files").download(f.file_path)).data;
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const b64 = btoa(bin);
    if (!b64) continue;
    names.push(`${f.document_type}: ${f.file_name}`);
    refs.push({ file_path: f.file_path, file_name: f.file_name, mime_type: f.mime_type, document_type: f.document_type });
    parts.push({ type: "input_text", text: `SCAN ${names.length} — ${f.document_type}: ${f.file_name} (uploaded ${f.created_at})` });
    parts.push(f.mime_type === "application/pdf"
      ? { type: "input_file", filename: f.file_name || "scan.pdf", file_data: `data:application/pdf;base64,${b64}` }
      : { type: "input_image", image_url: `data:${blob.type && blob.type.startsWith("image/") ? blob.type : f.mime_type};base64,${b64}` });
  }
  return { parts, names, refs };
}

async function callModel(apiKey: string, instructions: string, input: string, effort: "low" | "medium" = "medium", media: any[] = []) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input: [{ role: "user", content: media.length ? [{ type: "input_text", text: input }, ...media] : input }],
      stream: true,
      store: false,
      // Same key for every seller so the fixed playbook instructions are reused from cache instead of re-written.
      prompt_cache_key: "seller-agent-playbook",
      reasoning: { effort },
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

function parseDecision(raw: string, allowed: Set<string>) {
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
    visuals: parseVisuals(obj.visuals),
    actions: actions
      .filter((a: any) => allowed.has(a?.type) && (a?.type !== "increase_quote_ten_percent" || (typeof a.body === "string" && a.body.trim().length > 0)))
      .slice(0, 4)
      .map((a: any) => ({
        type: a.type as string,
        reason: String(a.reason ?? ""),
        confidence: Math.max(0, Math.min(1, Number(a.confidence) || 0)),
        subject: a.subject ? String(a.subject).slice(0, 300) : null,
        body: a.body ? String(a.body).slice(0, 12000) : null,
        note: a.note ? String(a.note).slice(0, 4000) : null,
        fields: ["update_fields", "fix_document_request", "update_quote_spaces"].includes(a.type) && a.fields && typeof a.fields === "object"
          ? Object.fromEntries(Object.entries(a.fields).filter(([k, v]) => (a.type === "fix_document_request" ? FIX_FIELDS : a.type === "update_quote_spaces" ? ["spaces", "space_numbers", "section", "lawn"] : EDITABLE_FIELDS).includes(k) && v != null && String(v).trim()).map(([k, v]) => [k, String(v).slice(0, 500)]))
          : null,
        items: a.type === "update_document_items" && Array.isArray(a.items)
          ? a.items.filter((i: any) => i && typeof i.id === "string").slice(0, 30).map((i: any) => ({
              id: String(i.id), state: DOC_STATES.includes(i.state) ? i.state : null,
              attach_file_ids: Array.isArray(i.attach_file_ids) ? i.attach_file_ids.map(String).slice(0, 6) : [],
              note: i.note ? String(i.note).slice(0, 300) : null,
            })).filter((i: any) => i.state || i.attach_file_ids.length)
          : null,
      }))
      .filter((a: any) => a.type !== "update_document_items" || a.items?.length)
      .filter((a: any) => a.type !== "update_fields" || (a.fields && Object.keys(a.fields).length))
      .filter((a: any) => a.type !== "fix_document_request" || (a.fields?.plot_description && a.body))
      .filter((a: any) => a.type !== "resend_quote_free_listing" || a.body)
      .filter((a: any) => a.type !== "update_quote_spaces" || (Number(a.fields?.spaces) >= 1 && Number(a.fields?.spaces) <= 20)),
  };
}

function parseVisuals(v: unknown) {
  const str = (x: unknown, n: number) => (x == null ? "" : String(x)).slice(0, n);
  const frac = (x: unknown) => Math.max(0, Math.min(1, Number(x) || 0));
  if (!Array.isArray(v)) return [] as any[];
  return v.slice(0, 3).map((x: any) => {
    if (x?.kind === "scan" && Number(x.scan) >= 1) return { kind: "scan", scan: Math.floor(Number(x.scan)), caption: str(x.caption, 200),
      marks: Array.isArray(x.marks) ? x.marks.slice(0, 4).map((m: any) => ({ x: frac(m.x), y: frac(m.y), w: frac(m.w), h: frac(m.h), label: str(m.label, 40) })).filter((m: any) => m.w > 0.005 && m.h > 0.005) : [] };
    if (x?.kind === "family_tree" && Array.isArray(x.people)) return { kind: "family_tree", people: x.people.slice(0, 12).map((p: any) => ({ name: str(p.name, 80), relation: str(p.relation, 60), parent: p.parent ? str(p.parent, 80) : null, deceased: !!p.deceased, signs: !!p.signs, note: p.note ? str(p.note, 120) : null })).filter((p: any) => p.name) };
    if (x?.kind === "compare" && Array.isArray(x.rows)) return { kind: "compare", title: str(x.title, 80), rows: x.rows.slice(0, 8).map((r: any) => ({ label: str(r.label, 60), record: str(r.record, 200), evidence: str(r.evidence, 200), match: !!r.match })) };
    return null;
  }).filter(Boolean) as any[];
}

const DOC_KIND_LABEL: Record<string, string> = { listing_agreement: "Listing agreement", poa: "Power of attorney", affidavit_heirship: "Affidavit of heirship", spousal_consent: "Spousal consent" };
/** What approving a change will do, worked out up front so staff can see it before approving. */
async function changePreview(db: SupabaseClient, sub: Sub, a: any) {
  if (a.type === "fix_document_request" || a.type === "update_fields" || a.type === "update_quote_spaces") {
    const fields = Object.entries(a.fields ?? {}).map(([k, v]) => ({ label: (FIELD_LABEL as any)[k] ?? k.replace(/_/g, " "), before: String(sub[k] ?? "").trim() || "(blank)", after: String(v) }))
      .filter((f) => f.before !== f.after);
    if (a.type !== "fix_document_request") return { fields };
    const next = String(a.fields?.plot_description ?? "").trim();
    const { data: live } = await db.from("contracts").select("kind,status,fill_data,signed_at,notarized_at,completed_at").eq("submission_id", sub.id).is("deleted_at", null).neq("status", "void");
    const rebuild: string[] = [], untouched: string[] = [];
    for (const c of live ?? []) {
      const fd = (c.fill_data ?? {}) as Record<string, any>;
      const who = fd.joint_names || fd.seller_name || fd.principal_name || fd.signer_name || "";
      const name = `${DOC_KIND_LABEL[c.kind] ?? c.kind}${who ? ` — ${who}` : ""}`;
      if (c.signed_at || c.notarized_at || c.completed_at || ["signed", "notarized", "completed"].includes(String(c.status))) untouched.push(`${name} (already signed)`);
      else if (String(fd.plot_description ?? "").trim() !== next) rebuild.push(name);
      else untouched.push(`${name} (already correct)`);
    }
    return { fields, rebuild, untouched };
  }
  if (a.type === "update_document_items" && a.items?.length) {
    const { data: rows } = await db.from("submission_documents").select("id,label,person_name,status").eq("submission_id", sub.id).in("id", a.items.map((i: any) => i.id));
    const ids = a.items.flatMap((i: any) => i.attach_file_ids);
    const { data: files } = ids.length ? await db.from("customer_files").select("id,file_name").in("id", ids) : { data: [] as any[] };
    const fname = new Map((files ?? []).map((f: any) => [f.id, f.file_name]));
    return { items: a.items.map((i: any) => { const r = (rows ?? []).find((x: any) => x.id === i.id); return {
      label: r ? `${r.label}${r.person_name ? ` — ${r.person_name}` : ""}` : (i.note ?? "Checklist item"),
      before: String(r?.status ?? "").replace(/_/g, " ") || "pending", after: i.state ? i.state.replace(/_/g, " ") : null,
      attach: i.attach_file_ids.map((id: string) => fname.get(id) ?? "file"), note: i.note }; }) };
  }
  return null;
}

async function runForSubmission(db: SupabaseClient, apiKey: string, submissionId: string, trigger: string, staffInstruction?: string) {
  const { data: sub } = await db.from("contact_submissions").select("*").eq("id", submissionId).maybeSingle();
  if (!sub) return { status: "skipped", reason: "not found" };
  if (sub.deleted_at || sub.archived_at) return { status: "skipped", reason: "archived or deleted" };
  if (!isSeller(sub)) return { status: "skipped", reason: "not a seller — AI agent is sellers only" };
  if (sub.ai_paused_at) return { status: "skipped", reason: "AI paused for this seller" };
  if (sub.sold_at || sub.closed_at) return { status: "skipped", reason: "file closed" };

  // Cost control: skip automatic runs when nothing new has happened since the last run.
  const { data: lastRun } = await db.from("ai_agent_runs").select("created_at").eq("submission_id", sub.id).eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: lastMsg } = await db.from("email_messages").select("received_at,from_email").eq("matched_submission_id", sub.id).is("deleted_at", null).order("received_at", { ascending: false }).limit(1).maybeSingle();
  if (trigger !== "manual" && trigger !== "refresh" && lastRun) {
    const { count: newNotes } = await db.from("customer_notes").select("id", { count: "exact", head: true }).eq("submission_id", sub.id).gt("created_at", lastRun.created_at).not("author_name", "ilike", "AI agent%");
    // Only a seller's email counts as new mail; our own outgoing replies (incl. approved AI replies) don't need a re-review.
    const { count: newInbound } = await db.from("email_messages").select("id", { count: "exact", head: true }).eq("matched_submission_id", sub.id).is("deleted_at", null).gt("received_at", lastRun.created_at).not("from_email", "ilike", "%texascemeterybrokers%");
    // Record edits made by carrying out an AI suggestion don't count as a new change.
    const { data: lastExec } = await db.from("ai_agent_actions").select("executed_at").eq("submission_id", sub.id).not("executed_at", "is", null).order("executed_at", { ascending: false }).limit(1).maybeSingle();
    const upd = sub.updated_at ?? "";
    const aiCausedUpdate = !!lastExec?.executed_at && upd >= lastExec.executed_at && Date.parse(upd) - Date.parse(lastExec.executed_at) < 5 * 60_000;
    const recordChanged = upd > lastRun.created_at && !aiCausedUpdate;
    if (!newInbound && !newNotes && !recordChanged) return { status: "skipped", reason: "nothing new since last review" };
  }
  // Light reasoning for routine checks; deeper reasoning only when a customer is waiting on a reply.
  const customerWaiting = !!lastMsg && !/texascemeterybrokers/i.test(lastMsg.from_email ?? "");
  const effort: "low" | "medium" = customerWaiting ? "medium" : "low";

  const playbook = await loadPlaybook(db);
  const lean = await leanMode(db);
  // A staff instruction (typed now, or an "Instruction for AI" note since the last review) means a person is directing the AI.
  let instruction = staffInstruction?.trim() || "";
  if (!instruction) {
    const { data: inote } = await db.from("customer_notes").select("body,created_at").eq("submission_id", sub.id).ilike("body", "Instruction for AI:%").is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (inote && (!lastRun || inote.created_at > lastRun.created_at)) instruction = String(inote.body).replace(/^Instruction for AI:\s*/i, "");
  }
  // Context is built before the run row so a saved history summary never looks like a "new change" next time.
  const ctx = await buildContext(db, sub, lean ? apiKey : null);
  const { data: run } = await db.from("ai_agent_runs").insert({ submission_id: sub.id, trigger, playbook_version: playbook.version }).select("id").single();
  try {
    const { allowed } = allowedActions(sub, ctx.contracts);
    const prep = await preparePrompt(db, apiKey, sub, ctx, allowed, playbook.content, { lean, instruction, customerWaiting, trigger });
    if (prep.skip) {
      await db.from("ai_agent_runs").update({ status: "done", stage_summary: prep.skip.stage_summary, next_step: prep.skip.next_step || "No action needed", reasoning: "Quick check: nothing new needs doing on this file.", confidence: 1, needs_human: false }).eq("id", run!.id);
      return { status: "done", run_id: run!.id, effort: "triage", decision: { actions: [], ...prep.skip } };
    }
    const scans = prep.scans;
    const raw = await callModel(apiKey, prep.instructions, prep.input, instruction ? "medium" : effort, scans.parts);
    const d = parseDecision(raw, allowed);
    if (instruction) {
      // Staff-directed: never bounce the work back to a human.
      const kept = d.actions.filter((a) => a.type !== "flag_human");
      d.actions = kept.length ? kept : d.actions.map((a) => a.type === "flag_human" ? { ...a, type: "add_note", note: a.note ?? d.human_reason ?? a.reason } : a);
      d.needs_human = false; d.confidence = Math.max(d.confidence, 0.7);
    }
    // Handing to staff = nothing else. The seller stays in Needs reply.
    if (d.needs_human || d.confidence < 0.7 || d.actions.some((a) => a.type === "flag_human")) d.actions = d.actions.filter((a) => a.type === "flag_human");
    const needsHuman = d.needs_human || d.confidence < 0.7 || d.actions.some((a) => a.type === "flag_human");
    await db.from("ai_agent_runs").update({
      status: "done", stage_summary: d.stage_summary, next_step: d.next_step, reasoning: d.reasoning,
      confidence: d.confidence, needs_human: needsHuman, human_reason: d.human_reason,
    }).eq("id", run!.id);

    // Supersede older undecided proposals for this seller so the queue stays current.
    await db.from("ai_agent_actions").update({ status: "superseded" }).eq("submission_id", sub.id).eq("status", "proposed");

    // Visual aids: resolve scan numbers to the stored file so the panel can show the actual document.
    const visuals = d.visuals.map((v: any) => v.kind === "scan" ? (scans.refs[v.scan - 1] ? { ...v, ...scans.refs[v.scan - 1], marks: /pdf/.test(scans.refs[v.scan - 1].mime_type ?? "") ? [] : v.marks } : null) : v).filter(Boolean);
    const previews = await Promise.all(d.actions.map((a) => changePreview(db, sub, a).catch(() => null)));
    const rows = d.actions.map((a, ai) => ({
      run_id: run!.id, submission_id: sub.id, action_type: a.type, reason: a.reason, confidence: a.confidence,
      email_to: ["reply_email", "fix_document_request", "resend_quote_free_listing", "increase_quote_ten_percent", "resend_expired_quote"].includes(a.type) ? sub.email : null,
      email_subject: a.subject, email_body: a.body, original_email_body: a.body,
      note_body: a.type === "flag_human" ? (a.note ?? d.human_reason ?? a.reason) : a.note,
      gmail_thread_id: ctx.threadId,
      payload: { ...(a.fields ? { fields: a.fields } : a.items ? { items: a.items } : {}), ...(visuals.length ? { visuals } : {}), ...(previews[ai] ? { changes: previews[ai] } : {}) },
    }));
    if (needsHuman && !rows.some((r) => r.action_type === "flag_human")) {
      rows.push({ run_id: run!.id, submission_id: sub.id, action_type: "flag_human", reason: d.human_reason ?? "Low confidence", confidence: d.confidence, email_to: null, email_subject: null, email_body: null, original_email_body: null, note_body: d.human_reason ?? d.next_step, gmail_thread_id: ctx.threadId, payload: visuals.length ? { visuals } : null });
    }
    if (rows.length) await db.from("ai_agent_actions").insert(rows);
    return { status: "done", run_id: run!.id, effort, decision: d };
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    await db.from("ai_agent_runs").update({ status: "error", error: msg.slice(0, 1000) }).eq("id", run!.id);
    throw e;
  }
}

/** Reads the deed scan and checks it against the names/plot wording the family tree
 *  starts from. Fills empty fields from a clearly readable deed; reports conflicts. */
async function checkDeed(db: SupabaseClient, apiKey: string, sub: Sub) {
  const scans = await loadScans(db, sub);
  if (!scans.parts.length) return { status: "no_deed" as const, summary: "No readable deed scan on file." };
  const raw = await callModel(apiKey,
    `You read a Texas cemetery deed / certificate of ownership and compare it with our record. Return ONLY JSON: {"readable": boolean, "is_deed": boolean, "owners": string[] (each grantee exactly as written, e.g. "Edward or Patricia Behne" is ONE entry), "plot_wording": string (e.g. "Section Garden of David · Lot 108 · Space 3 & 4"), "owners_match": boolean, "plot_match": boolean, "later_transfer": boolean (the scans show the rights were later transferred to someone else), "summary": string (one plain sentence for staff)}. Matching ignores case, punctuation, "and"/"or"/"&" and middle initials. If the record field is empty, set its match to true. Never guess from a blurry scan: set readable false.`,
    `RECORD deed_owner_names: ${sub.deed_owner_names ?? "(empty)"}\nRECORD plot_description: ${sub.plot_description ?? "(empty)"}\nSCANS: ${scans.names.join("; ")}`,
    "low", scans.parts);
  const t = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "");
  const r = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  if (!r.readable || !r.is_deed) return { status: "no_deed" as const, summary: String(r.summary ?? "The deed scan could not be read.") };
  if (r.later_transfer || !r.owners_match || !r.plot_match) return { status: "conflict" as const, summary: String(r.summary ?? "The deed does not match the record.") };
  const patch: Record<string, string> = {};
  const owners = Array.isArray(r.owners) ? r.owners.map(String).filter(Boolean).join(" & ") : "";
  if (!String(sub.deed_owner_names ?? "").trim() && owners) patch.deed_owner_names = owners;
  if (!String(sub.plot_description ?? "").trim() && r.plot_wording) patch.plot_description = String(r.plot_wording);
  if (Object.keys(patch).length) await db.from("contact_submissions").update(patch).eq("id", sub.id);
  return { status: Object.keys(patch).length ? "filled" as const : "match" as const, summary: String(r.summary ?? ""), patch };
}

const PLAN_GUIDE = `A staff member tells you, in plain words, what to change on a seller's document request. Turn it into changes our admin screen applies with its normal tools. Return ONLY JSON:
{"add_docs": [{"kind": "poa"|"joint_poa"|"affidavit_heirship"|"custom", "label": string ("" = standard name), "person": string (poa: who signs it; joint_poa: first signer), "person2": string (joint_poa second signer, else ""), "why": string (one plain sentence the seller sees), "needsNotary": boolean}],
  "remove_keys": string[] (exact keys from CURRENT CHECKLIST to take off), "cemetery": string (new cemetery name ONLY when staff explicitly asks to change the cemetery, otherwise ""), "plot_description": string (new exact locations-being-sold wording ONLY when staff asks to change the plot/lot/space, "" = no change, e.g. "Garden of Memories · Lot 12 · Spaces 3 & 4"),
 "greeting_name": string, "email_note": string, "page_note": string, "reason": string (one short sentence for staff)}
Kinds: poa = Limited POA to Texas Cemetery Brokers (we prepare it, notarised); joint_poa = one POA two spouses sign; affidavit_heirship = Affidavit of Heirship we prepare; custom = anything else the seller sends us (death certificate, marriage certificate, will, letters testamentary, divorce decree, photo ID, small estate affidavit, etc.) - give it a clear label and set needsNotary only if it must be notarised.
 A cemetery is NOT a plot description. "Forest Lawn Hollywood Hills" and "Bluebonnet Hills Memorial Park" are cemetery names: return them in cemetery, never plot_description. If staff asks to change the cemetery but gives no new lot/space wording, return plot_description as "". Never infer a cemetery change from a seller's request to change the plot wording; staff must explicitly ask for it. Only do what staff asked; never add documents on your own. Never add a duplicate of an item already listed. When the request changes, email_note briefly says what changed since the last email (e.g. "We have added ... and updated the plot wording to ...").`;

const PACKET_GUIDE = `You fill in the three fields on our "Check the request" screen before a document request email goes to a seller.
- greeting_name: the first name used after "Dear". Use the enquirer's real first name (from their own email sign-off if it differs from the record, e.g. "Don" for Donald). Never a surname, never "there" unless no name exists.
- email_note: OPTIONAL short paragraph shown above the button in the email. Leave "" for a routine request. Only write 1-3 plain sentences when something needs explaining, e.g. a prepared Limited POA that must be signed in front of a notary and posted as a wet-ink original, a joint POA both spouses sign together, or a correction since an earlier request. Warm, not personal-sounding, no invented anecdotes, no urgency.
- page_note: OPTIONAL note at the top of their document page. Leave "" when nothing special. Otherwise one or two sentences of practical guidance, e.g. "Please sign the power of attorney in front of a notary, not beforehand, then post the original to the address below."
Follow the playbook tone. Never mention prices, fees you are unsure of, legal advice, or anything not in the record. Return ONLY JSON {"greeting_name": string, "email_note": string, "page_note": string, "reason": string (one short sentence for staff)}.`;

/** Call another edge function as the system — the same functions staff buttons call. */
async function callInternal(url: string, name: string, body: unknown): Promise<Record<string, any>> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/functions/v1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key }, body: JSON.stringify(body) });
  const text = await res.text();
  let parsed: Record<string, any> = {};
  try { parsed = JSON.parse(text); } catch { /* */ }
  if (!res.ok || parsed.error) throw new Error(`${name} failed (${res.status}): ${parsed.error ? JSON.stringify(parsed.error) : text.slice(0, 300)}`);
  return parsed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    // Database triggers (new seller email / staff note) may request a review — proposals only, never sends.
    const cronTok = req.headers.get("x-agent-cron");
    let user = cronTok ? null : await staffUser(db, req);
    if (cronTok && ["run", "sweep"].includes(parsed.data.action)) {
      const { data: t } = await db.from("ai_agent_settings").select("value").eq("key", "cron_token").maybeSingle();
      if (t && String(t.value) === cronTok) user = { id: null as any, name: "AI agent (automatic)" };
    }
    if (!user) return json({ error: "Admin or staff only" }, 403);
    let body = parsed.data as any;
    let staffRequested = false;

    if (body.action === "run") {
      try {
        // Merge bursts: automatic wake-ups (email, note, record change) wait a minute;
        // if another wake-up for the same seller arrives meanwhile, only the last one reviews.
        if (cronTok && ["email_messages", "customer_notes", "record_change"].includes(String(body.trigger))) {
          const stamp = new Date().toISOString();
          await db.from("ai_review_queue").upsert({ submission_id: body.submission_id, requested_at: stamp, trigger: body.trigger });
          await new Promise((r) => setTimeout(r, 60_000));
          const { data: q } = await db.from("ai_review_queue").select("requested_at").eq("submission_id", body.submission_id).maybeSingle();
          if (q && new Date(q.requested_at).getTime() !== new Date(stamp).getTime()) return json({ status: "skipped", reason: "merged into a later review" });
        }
        return json(await runForSubmission(db, apiKey, body.submission_id, body.trigger ?? "manual", body.instruction));
      } catch (e) {
        const status = (e as any).status;
        return json({ error: String((e as Error).message) }, status === 402 || status === 403 || status === 429 ? status : 500);
      }
    }

    if (body.action === "compare") {
      // Replay: run the full and the lean design side by side on the same sellers. Nothing is saved as a suggestion.
      const batch = body.batch_id ?? crypto.randomUUID();
      const out = await Promise.all(body.submission_ids.map(async (sid: string) => {
        const { data: sub } = await db.from("contact_submissions").select("*").eq("id", sid).maybeSingle();
        if (!sub || !isSeller(sub)) return { submission_id: sid, skipped: true };
        const [a, b] = await Promise.all([decideOnly(db, apiKey, sub, false), decideOnly(db, apiKey, sub, true)]);
        const types = (d: any) => (d?.decision?.actions ?? []).map((x: any) => x.type).sort().join(",");
        const row = {
          batch_id: batch, submission_id: sid, seller_name: sub.name,
          old_result: a, new_result: b, old_input_chars: a.input_chars ?? null, new_input_chars: b.input_chars ?? null,
          same_actions: !a.error && !b.error && types(a) === types(b),
        };
        await db.from("ai_agent_compare").insert(row);
        return { submission_id: sid, name: sub.name, same: row.same_actions, old: types(a), new: types(b), old_chars: row.old_input_chars, new_chars: row.new_input_chars };
      }));
      return json({ ok: true, batch_id: batch, results: out });
    }

    if (body.action === "verify_deed") {
      const { data: sub } = await db.from("contact_submissions").select("*").eq("id", body.submission_id).maybeSingle();
      if (!sub) return json({ error: "Seller not found" }, 404);
      return json(await checkDeed(db, apiKey, sub));
    }

    if (body.action === "prepare_packet") {
      const { data: sub } = await db.from("contact_submissions").select("*").eq("id", body.submission_id).maybeSingle();
      if (!sub || !isSeller(sub)) return json({ error: "Not a seller" }, 400);
      const playbook = await loadPlaybook(db);
      const ctx = await buildContext(db, sub);
      const raw = await callModel(apiKey, `${PACKET_GUIDE}\n\nPLAYBOOK:\n${playbook.content}`, `ITEMS THIS REQUEST WILL ASK FOR:\n${JSON.stringify(body.items ?? [])}\n\n${ctx.context}`, "low");
      const t = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "");
      const r = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
      const out = { greeting_name: clip(r.greeting_name, 60), email_note: String(r.email_note ?? "").trim().slice(0, 1500), page_note: String(r.page_note ?? "").trim().slice(0, 1000), reason: clip(r.reason, 200) };
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_user_id: user.id, actor_name: user.name, action_type: "ai_agent_action", action_summary: "AI filled in the document request greeting and notes", details: out });
      return json(out);
    }

    if (body.action === "plan_packet") {
      const { data: sub } = await db.from("contact_submissions").select("*").eq("id", body.submission_id).maybeSingle();
      if (!sub || !isSeller(sub)) return json({ error: "Not a seller" }, 400);
      const playbook = await loadPlaybook(db);
      const ctx = await buildContext(db, sub);
      const raw = await callModel(apiKey, `${PLAN_GUIDE}\n\n${PACKET_GUIDE.split("Return ONLY JSON")[0]}\n\nPLAYBOOK:\n${playbook.content}`,
        `STAFF INSTRUCTION: ${body.instruction}\n\nCURRENT CHECKLIST (key | label | person):\n${body.items.map((i: any) => `${i.key} | ${i.label} | ${i.person ?? ""}`).join("\n")}\n\nCURRENT CEMETERY: ${sub.cemetery ?? "(empty)"}\nCURRENT LOCATIONS BEING SOLD: ${sub.plot_description ?? "(empty)"}\n\n${ctx.context}`, "low");
      const t = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "");
      const r = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
      const kinds = ["poa", "joint_poa", "affidavit_heirship", "custom"];
      const keys = new Set(body.items.map((i: any) => i.key));
      const out = {
        add_docs: (Array.isArray(r.add_docs) ? r.add_docs : []).filter((d: any) => kinds.includes(d?.kind)).slice(0, 15).map((d: any) => ({
          kind: d.kind, label: clip(d.label ?? "", 200), why: clip(d.why ?? "", 400), person: clip(d.person ?? "", 120), person2: clip(d.person2 ?? "", 120), needsNotary: !!d.needsNotary,
        })).filter((d: any) => (d.kind !== "poa" || d.person) && (d.kind !== "joint_poa" || (d.person && d.person2)) && (d.kind !== "custom" || d.label)),
        remove_keys: (Array.isArray(r.remove_keys) ? r.remove_keys : []).map(String).filter((k: string) => keys.has(k)),
        cemetery: clip(r.cemetery ?? "", 200),
        plot_description: clip(r.plot_description ?? "", 300),
        greeting_name: clip(r.greeting_name, 60), email_note: String(r.email_note ?? "").trim().slice(0, 1500), page_note: String(r.page_note ?? "").trim().slice(0, 1000),
        reason: clip(r.reason, 300),
      };
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_user_id: user.id, actor_name: user.name, action_type: "ai_agent_action", action_summary: `AI planned document request changes: ${body.instruction.slice(0, 200)}`, details: out });
      return json(out);
    }

    if (body.action === "sweep") {
      // Needs-reply sellers only: the latest email on the record is FROM the customer
      // (unanswered). Fetch recent mail both directions and keep only those.
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data: recent } = await db.from("email_messages").select("matched_submission_id,received_at,from_email")
        .not("matched_submission_id", "is", null).gte("received_at", since)
        .is("deleted_at", null).order("received_at", { ascending: false }).limit(300);
      const latest = new Map<string, string>();
      for (const r of recent ?? []) {
        if (latest.has(r.matched_submission_id!)) continue; // rows are newest-first
        if (/texascemeterybrokers/i.test(r.from_email ?? "")) latest.set(r.matched_submission_id!, ""); // we replied — not needs-reply
        else latest.set(r.matched_submission_id!, r.received_at);
      }
      for (const [sid, at] of [...latest]) if (!at) latest.delete(sid);
      const results: unknown[] = [];
      let processed = 0;
      for (const [sid, at] of latest) {
        if (processed >= (body.limit ?? 10)) break;
        const { data: lastRun } = await db.from("ai_agent_runs").select("created_at").eq("submission_id", sid).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (lastRun && lastRun.created_at > at) {
          const { count } = await db.from("ai_agent_actions").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "proposed");
          if (count) continue; // still has a current suggestion
        }
        try {
          const { count: live } = await db.from("ai_agent_actions").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "proposed");
          // Every Needs-reply seller should carry a current suggestion: re-review if theirs went stale.
          const r = await runForSubmission(db, apiKey, sid, live ? "sweep" : "refresh");
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

    if (body.action === "do") {
      const { data: sub } = await db.from("contact_submissions").select("*").eq("id", body.submission_id).maybeSingle();
      if (!sub) return json({ error: "Seller not found" }, 404);
      const { data: cs } = await db.from("contracts").select("id,kind,status,sign_token,sign_token_expires_at").eq("submission_id", sub.id).is("deleted_at", null);
      const { allowed } = allowedActions(sub, cs ?? []);
      const signed = !!sub.la_signed_at;
      if (!allowed.has(body.type) && !(body.type === "send_family_tree" && signed)) return json({ error: `That step doesn't apply to this record right now (${body.type.replace(/_/g, " ")}).` }, 409);
      const { data: run } = await db.from("ai_agent_runs").insert({ submission_id: sub.id, trigger: "staff_request", status: "done", stage_summary: `Staff asked the AI to ${body.type.replace(/_/g, " ")}`, confidence: 1 }).select("id").single();
      const { data: row, error: insErr } = await db.from("ai_agent_actions").insert({ run_id: run!.id, submission_id: sub.id, action_type: body.type, reason: `Requested by ${user.name}`, confidence: 1 }).select("id").single();
      if (insErr) return json({ error: insErr.message }, 500);
      staffRequested = true;
      // Staff told the AI who the deed is in — the family tree starts from these names.
      if (body.deed_owner_names && body.type !== "resend_signing_link") {
        await db.from("contact_submissions").update({ deed_owner_names: body.deed_owner_names }).eq("id", sub.id);
        await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `Set the deed owner names to ${body.deed_owner_names} (the family tree starts from them), as ${user.name} asked.`, author_name: `AI agent (asked by ${user.name})` });
      }
      body = { action: "execute", action_id: row!.id };
    }

    const { data: act } = await db.from("ai_agent_actions").select("*").eq("id", body.action_id).maybeSingle();
    if (!act) return json({ error: "Action not found" }, 404);
    if (act.status !== "proposed") return json({ error: `Action already ${act.status}` }, 409);

    if (body.action === "reject") {
      const reason = (body as any).reason?.trim() || null;
      await db.from("ai_agent_actions").update({ status: "rejected", decided_by_name: user.name, decided_by_user_id: user.id ?? null, decision_reason: reason, decided_at: new Date().toISOString() }).eq("id", act.id);
      // Saved as a staff note so the AI re-thinks with this feedback (note trigger re-runs it).
      if (reason) await db.from("customer_notes").insert({ submission_id: act.submission_id, body: `Declined AI suggestion (${String(act.action_type).replace(/_/g, " ")}): ${reason}`, author_name: user.name, author_user_id: user.id ?? null });
      return json({ ok: true });
    }

    // execute (approve)
    const { data: sub } = await db.from("contact_submissions").select("*").eq("id", act.submission_id).maybeSingle();
    if (!sub || !isSeller(sub)) return json({ error: "Not a seller — refusing to act" }, 400);
    if (sub.archived_at || sub.deleted_at || sub.closed_at || sub.sold_at || sub.ai_paused_at) return json({ error: "This seller record is closed, archived or paused" }, 409);
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
      else await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `Emailed ${first(sub)}: ${act.reason}`, author_name: `AI agent (approved by ${user.name})` });
    } else if (act.action_type === "add_note") {
      const { error: e } = await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `${act.note_body ?? act.reason}`, author_name: `AI agent (approved by ${user.name})` });
      if (e) error = e.message;
    } else if (act.action_type !== "flag_human") {
      // Re-check against the record as it is NOW — it may have moved on since the proposal.
      const { data: contracts } = await db.from("contracts").select("id,kind,status,sign_token,sign_token_expires_at").eq("submission_id", sub.id).is("deleted_at", null);
      const { allowed, liveLink } = allowedActions(sub, contracts ?? []);
      if (!allowed.has(act.action_type) && !(staffRequested && act.action_type === "send_family_tree")) return json({ error: "This step no longer applies — the record has moved on. Reject it or re-run the AI." }, 409);
      const aiNote = async (body: string) => { await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body, author_name: `AI agent (approved by ${user.name})` }); };
      try {
        if (act.action_type === "send_listing_agreement" || act.action_type === "send_family_tree") {
          // The family tree starts from the deed owners — make sure they are right first.
          const chk = await checkDeed(db, apiKey, sub);
          if (chk.status === "conflict") throw new Error(`Deed check stopped this: ${chk.summary} Fix the deed owner names / plot wording, then approve again.`);
          const { data: fresh } = await db.from("contact_submissions").select("deed_owner_names,plot_description").eq("id", sub.id).maybeSingle();
          if (!String(fresh?.deed_owner_names ?? "").trim() || !String(fresh?.plot_description ?? "").trim()) throw new Error("Deed owner names and the exact plot wording must be filled in before the agreement or family tree goes out.");
          if (chk.status === "filled") await aiNote(`Read the deed and filled in ${Object.keys(chk.patch ?? {}).map((k) => FIELD_LABEL[k] ?? k).join(" and ")}: ${chk.summary}`);
          else if (chk.status === "match") await aiNote(`Checked the deed against the record before sending — ${chk.summary}`);
        }
        if (act.action_type === "send_listing_agreement") {
          const r = await callInternal(url, "autopilot", { submission_id: sub.id, step: "listing_agreement" });
          if (r.status !== "sent") throw new Error(`Listing agreement not sent: ${r.reason ?? r.status}`);
          await aiNote(`Sent ${first(sub)} the listing agreement to sign.`);
        } else if (act.action_type === "resend_signing_link") {
          await callInternal(url, "send-contract-link", { contract_id: liveLink.id, sign_url: `${SITE}/sign/${liveLink.sign_token}` });
          await aiNote(`Re-sent ${first(sub)} the link to sign the listing agreement.`);
        } else if (act.action_type === "send_family_tree") {
          const r = await callInternal(url, "autopilot", { submission_id: sub.id, step: "family_tree", ...(staffRequested ? { force: true } : {}) });
          if (r.status !== "sent") throw new Error(`Family tree not sent: ${r.reason ?? r.status}`);
          await aiNote(`Sent ${first(sub)} the family tree questionnaire.`);
        } else if (act.action_type === "update_fields") {
          const fields = (act.payload?.fields ?? {}) as Record<string, string>;
          const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => EDITABLE_FIELDS.includes(k)));
          if (!Object.keys(patch).length) throw new Error("No valid fields to update");
          const before = Object.fromEntries(Object.keys(patch).map((k) => [k, sub[k] ?? "—"]));
          const { error: e } = await db.from("contact_submissions").update(patch).eq("id", sub.id);
          if (e) throw new Error(e.message);
          if (act.note_body) await aiNote(String(act.note_body)); else await aiNote(Object.entries(patch).map(([k, v]) => before[k] === "—" || !String(before[k]).trim()
            ? `${first(sub)} sent us their ${FIELD_LABEL[k] ?? k}: ${v}.`
            : `Changed the ${FIELD_LABEL[k] ?? k} from ${before[k]} to ${v}.`).join(" "));
        } else if (act.action_type === "update_document_items") {
          const items = (act.payload?.items ?? []) as { id: string; state: string | null; attach_file_ids: string[]; note: string | null }[];
          const { data: rows } = await db.from("submission_documents").select("id,label,person_name,notes,file_url,file_urls").eq("submission_id", sub.id).is("deleted_at", null).in("id", items.map((i) => i.id));
          const done: string[] = [];
          for (const it of items) {
            const row = (rows ?? []).find((x) => x.id === it.id);
            if (!row) continue;
            const patch: Record<string, unknown> = {};
            if (it.state) {
              patch.manual_override = it.state; patch.required_state = it.state;
              patch.status = ["received", "notarized"].includes(it.state) ? "received" : "pending";
              if (patch.status === "received") patch.received_at = now;
            }
            const added: string[] = [];
            if (it.attach_file_ids.length && sub.customer_profile_id) {
              const { data: files } = await db.from("customer_files").select("id,file_name,file_path,mime_type").eq("customer_profile_id", sub.customer_profile_id).in("id", it.attach_file_ids).is("deleted_at", null);
              const paths = [...(row.file_urls ?? [])];
              for (const f of files ?? []) {
                const { data: blob } = await db.storage.from("customer-files").download(f.file_path);
                if (!blob) continue;
                const path = `${sub.id}/ai-${Date.now()}-${String(f.file_name).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                const { error: ue } = await db.storage.from("portal-uploads").upload(path, blob, { contentType: f.mime_type || "application/octet-stream" });
                if (ue) throw new Error(`Couldn't attach ${f.file_name}: ${ue.message}`);
                paths.push(path); added.push(f.file_name);
              }
              if (added.length) { patch.file_urls = paths; patch.file_url = paths.at(-1); }
            }
            if (it.note) patch.notes = [row.notes, it.note].filter(Boolean).join(" · ");
            if (!Object.keys(patch).length) continue;
            const { error: e } = await db.from("submission_documents").update(patch).eq("id", row.id);
            if (e) throw new Error(e.message);
            const who = row.person_name ? ` for ${row.person_name}` : "";
            const stateWord: Record<string, string> = { received: "received", notarized: "notarised original received", not_needed: "not needed", needed: "still needed", issued: "issued" };
            done.push(`${row.label}${who}${it.state ? ` marked ${stateWord[it.state]}` : ""}${added.length ? `${it.state ? "," : ""} attached ${added.join(", ")}` : ""}`);
          }
          if (!done.length) throw new Error("None of those checklist items could be updated");
          await aiNote(`Updated the document checklist: ${done.join("; ")}.`);
        } else if (act.action_type === "fix_document_request") {
          const fields = (act.payload?.fields ?? {}) as Record<string, string>;
          const next = String(fields.plot_description ?? "").trim();
          if (!next || !act.email_body || !sub.email) throw new Error("Corrected location or email missing");
          const before = sub.plot_description ?? "—";
          // 1) Save the corrected location everywhere — same shape as the staff "Locations being sold" editor.
          const answers = { ...(sub.ownership_answers ?? {}) } as Record<string, any>;
          answers.autopilot = { ...(answers.autopilot ?? {}), plotDescription: next, plotDescriptionUpdatedAt: now };
          const patch: Record<string, unknown> = { plot_description: next, ownership_answers: answers };
          for (const k of ["section", "lawn", "space_numbers"]) if (fields[k]) patch[k] = fields[k];
          const { error: e } = await db.from("contact_submissions").update(patch).eq("id", sub.id);
          if (e) throw new Error(e.message);
          // 2) Rebuild every unsigned prepared document so the live documents page shows it.
          const { data: live } = await db.from("contracts").select("id,kind,status,fill_data,signed_at,notarized_at,completed_at").eq("submission_id", sub.id).is("deleted_at", null).neq("status", "void");
          let rebuilt = 0;
          for (const c of live ?? []) {
            if (c.signed_at || c.notarized_at || c.completed_at || ["signed", "notarized", "completed"].includes(String(c.status))) continue;
            const fd = (c.fill_data ?? {}) as Record<string, unknown>;
            if (String(fd.plot_description ?? "").trim() === next) continue;
            await callInternal(url, "generate-contract", { submission_id: sub.id, kind: c.kind, overrides: { ...fd, plot_description: next, supersede_contract_id: c.id } });
            rebuilt++;
          }
          // 3) Tell the seller in their thread.
          const res = await fetch(`${url}/functions/v1/gmail-action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: req.headers.get("authorization")!, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
            body: JSON.stringify({
              action: "send", to: sub.email, subject: act.email_subject || "Your document request has been updated", body: act.email_body,
              htmlBody: `<div data-tcb-email="ai_agent" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;">${act.email_body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>`,
              ...(act.gmail_thread_id ? { threadId: act.gmail_thread_id } : {}), submissionId: sub.id, actorName: `AI agent (approved by ${user.name})`,
            }),
          });
          const text = await res.text();
          const mailNote = !res.ok || /"error"/.test(text) ? ` The confirmation email FAILED (${res.status}) — please email the seller.` : ` Emailed the seller: "${act.email_subject || "Your document request has been updated"}".`;
          await aiNote(`Fixed the plots on ${first(sub)}'s document request: was ${before}, now ${next}. Updated ${rebuilt} unsigned document${rebuilt === 1 ? "" : "s"} on their documents page.${mailNote}`);
          if (mailNote.includes("FAILED")) throw new Error(`Record fixed and documents rebuilt, but the email failed: ${text.slice(0, 200)}`);
        } else if (act.action_type === "resend_quote_free_listing") {
          if (!act.email_body || !sub.email) throw new Error("Intro text or recipient missing");
          const { data: q } = await db.from("email_messages").select("body_html,subject,gmail_thread_id").eq("matched_submission_id", sub.id).ilike("from_email", "%texascemeterybrokers%").ilike("body_html", "%starter%").is("deleted_at", null).order("received_at", { ascending: false }).limit(1).maybeSingle();
          if (!q?.body_html) throw new Error("Couldn't find the original quote email to resend");
          const esc = act.email_body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
          const html = `<div data-tcb-email="ai_agent" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;margin-bottom:18px;">${esc}</div>${q.body_html}`;
          // Mark first, so the Starter click is recorded as Pro (no cancellation fee, nothing to pay).
          const answers = { ...(sub.ownership_answers ?? {}) } as Record<string, any>;
          answers.autopilot = { ...(answers.autopilot ?? {}), freeListingAsPro: true, freeListingAsProAt: now };
          const { error: e } = await db.from("contact_submissions").update({ ownership_answers: answers }).eq("id", sub.id);
          if (e) throw new Error(e.message);
          const res = await fetch(`${url}/functions/v1/gmail-action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: req.headers.get("authorization")!, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
            body: JSON.stringify({ action: "send", to: sub.email, subject: act.email_subject || (q.subject?.startsWith("Re:") ? q.subject : `Re: ${q.subject}`), body: `${act.email_body}\n\n${q.body_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}`, htmlBody: html,
              ...((q.gmail_thread_id ?? act.gmail_thread_id) ? { threadId: q.gmail_thread_id ?? act.gmail_thread_id } : {}), submissionId: sub.id, actorName: `AI agent (approved by ${user.name})` }),
          });
          const text = await res.text();
          if (!res.ok || /"error"/.test(text)) throw new Error(`Email failed (${res.status}): ${text.slice(0, 200)}`);
          await aiNote(`Re-sent ${first(sub)}'s quote with the listing fee waived — they click the free Starter option and we record it as Pro.`);
        } else if (act.action_type === "update_quote_spaces") {
          const f = (act.payload?.fields ?? {}) as Record<string, string>;
          const n = Math.round(Number(f.spaces));
          if (!(n >= 1 && n <= 20)) throw new Error("Number of spaces missing");
          const beforeN = sub.plot_count ?? sub.spaces ?? "?";
          const beforeNums = sub.space_numbers ?? "";
          const patch: Record<string, unknown> = { plot_count: n, spaces: String(n) };
          for (const k of ["space_numbers", "section", "lawn"]) if (f[k]) patch[k] = f[k];
          const { error: e } = await db.from("contact_submissions").update(patch).eq("id", sub.id);
          if (e) throw new Error(e.message);
          await aiNote(`Changed ${first(sub)}'s quote from ${beforeN} to ${n} space${n === 1 ? "" : "s"}${f.space_numbers ? ` (spaces ${beforeNums || "—"} → ${f.space_numbers})` : ""}, same price per space. ${user.name} opened the quote to send.`);
        } else if (act.action_type === "increase_quote_ten_percent") {
          const increased = higherQuote(sub);
          if (increased === null || !sub.email) throw new Error("The quote no longer qualifies for a 10% increase below the buyer-price ceiling. Review it manually.");
          const answers = { ...(sub.ownership_answers ?? {}) } as Record<string, any>;
          const prep = { ...(answers.autopilot ?? {}) };
          // Save a draft only. The normal staff seller-pack builder confirms the
          // deed and makes the acceptance links; no quote is sent here.
          const { error: e } = await db.from("contact_submissions").update({
            quote_amount: increased,
            quote_message: String(act.email_body ?? "").slice(0, 1500) || null,
            ownership_answers: { ...answers, autopilot: { ...prep, netPerPlot: increased, authorizedMinTotal: increased * Math.max(1, Number(sub.plot_count ?? sub.spaces) || 1) } },
          }).eq("id", sub.id).eq("quote_amount", sub.quote_amount).or("quote_response.is.null,quote_response.neq.accepted").is("accepted_quote_amount", null).is("la_signed_at", null).is("archived_at", null).is("deleted_at", null).is("closed_at", null).is("sold_at", null).is("ai_paused_at", null).select("id").single();
          if (e) throw new Error(e.message);
          await aiNote(`Prepared a revised quote for ${first(sub)} at $${increased.toLocaleString()} per space (10% above $${Number(sub.quote_amount).toLocaleString()}). ${user.name} will review and send the seller pack.`);
        } else if (act.action_type === "resend_expired_quote") {
          if (!quoteExpired(sub) || !sub.email || !(Number(sub.quote_amount) > 0)) throw new Error("This quote is no longer expired or has no saved price. Review it manually.");
          const { error: e } = await db.from("contact_submissions").update({ quote_message: String(act.email_body ?? "").slice(0, 1500) || null, quote_expires_at: null }).eq("id", sub.id).is("accepted_quote_amount", null).is("la_signed_at", null);
          if (e) throw new Error(e.message);
          await aiNote(`${first(sub)}'s quote had expired — renewed at the same $${Number(sub.quote_amount).toLocaleString()} per space. ${user.name} opened the quote email to send.`);
        } else if (act.action_type === "open_quote_dialog" || act.action_type === "open_document_request") {
          await aiNote(`${act.action_type === "open_quote_dialog" ? "Suggested sending the quote" : "Suggested sending/updating the document request"}; ${user.name} opened it to review and send.${act.note_body ? ` AI note: ${act.note_body}` : ""}`);
        }
      } catch (e) { error = String((e as Error).message).slice(0, 400); }
    }

    await db.from("ai_agent_actions").update(error
      ? { error }
      : { status: act.action_type === "flag_human" ? "acknowledged" : "executed", decided_by_name: user.name, decided_by_user_id: user.id ?? null, was_edited: (act.email_body ?? null) !== (act.original_email_body ?? null), decided_at: now, executed_at: now, error: null }).eq("id", act.id);
    if (!error) {
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_user_id: user.id, actor_name: user.name, action_type: "ai_agent_action", action_summary: `Approved AI ${act.action_type.replace(/_/g, " ")}`, details: { action_id: act.id, edited: act.email_body !== act.original_email_body } });
    }
    return error ? json({ error }, 502) : json({ ok: true, open: ["open_quote_dialog", "update_quote_spaces", "increase_quote_ten_percent", "resend_expired_quote"].includes(act.action_type) ? "quote" : act.action_type === "open_document_request" ? "documents" : null });
  } catch (e) {
    console.error("seller-agent error", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
