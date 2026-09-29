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
    quote_per_space_excl_transfer_fee: sub.quote_amount, accepted_per_space: sub.accepted_quote_amount,
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
    `EMAIL THREAD (oldest to newest):\n${emailList.map((e) => `--- ${e.when} ${e.from} | ${e.subject}\n${e.text}`).join("\n") || "(no emails)"}`,
  ].join("\n\n");

  return { contracts: (contracts.data ?? []) as any[], context, threadId: latestThread?.gmail_thread_id ?? null, lastSellerAt: latestSeller?.received_at ?? null, lastEmailFromUs: emailList.at(-1)?.from === "US (TCB)" };
}

const first = (sub: Sub) => String(sub.name ?? "The seller").trim().split(/\s+/)[0] || "The seller";
const SITE = "https://www.texascemeterybrokers.com";
const FIX_FIELDS = ["plot_description", "section", "lawn", "space_numbers"];
const DOC_STATES = ["needed", "received", "notarized", "not_needed", "issued"];
const FIELD_LABEL: Record<string, string> = { phone: "phone number", section: "section", lawn: "lawn/garden", space_numbers: "space numbers", deed_owner_names: "deed owner names", relationship_to_owner: "relationship to the owner", plot_description: "plot description", cemetery_city: "cemetery city" };
const EDITABLE_FIELDS = ["phone", "section", "lawn", "space_numbers", "deed_owner_names", "relationship_to_owner", "plot_description", "cemetery_city"];

/** Which admin-panel actions are valid on this record RIGHT NOW — computed with the same milestones the panel uses. */
function allowedActions(sub: Sub, contracts: any[]) {
  const answers = (sub.ownership_answers ?? {}) as Record<string, any>;
  const la = contracts.filter((c) => c.kind === "listing_agreement" && c.status !== "void");
  const signed = !!sub.la_signed_at || la.some((c) => ["signed", "notarized", "completed"].includes(c.status));
  const accepted = sub.quote_response === "accepted" || Number(sub.accepted_quote_amount) > 0;
  const liveLink = la.find((c) => ["sent", "viewed"].includes(c.status) && c.sign_token && (!c.sign_token_expires_at || c.sign_token_expires_at > new Date().toISOString()));
  const out = new Set(["reply_email", "add_note", "flag_human", "update_fields"]);
  // Quotes are staff-only for now — the AI never proposes or sends them.
  if (accepted && !signed && !la.some((c) => ["sent", "viewed"].includes(c.status))) out.add("send_listing_agreement");
  if (accepted && !signed && liveLink) out.add("resend_signing_link");
  if (signed && !answers.questionsSentAt && !answers.sellerConfirmedAt) out.add("send_family_tree");
  if (answers.sellerConfirmedAt && !sub.documents_completed_at) out.add("open_document_request");
  if (sub.documents_requested_at && !sub.documents_completed_at) { out.add("fix_document_request"); out.add("update_document_items"); }
  if (sub.quote_sent_at && !accepted && !signed) { out.add("resend_quote_free_listing"); if (Number(sub.quote_amount) > 0) out.add("update_quote_spaces"); }
  return { allowed: out, liveLink };
}

const TOOLS_DOC = `ADMIN PANEL ACTIONS YOU CAN PROPOSE (a staff member approves each one; each runs the exact same code staff use, so records, email tags, milestones and notifications are identical to a human doing it):
- reply_email: plain-text reply in the seller's thread. Fields: subject, body.
- add_note: internal team note on the profile. Field: note.
- flag_human: hand to a person (phone, complaints, legal, refunds, cancellations, price changes, payment links, death/probate edge cases). Field: note.
- update_fields: correct descriptive record fields ONLY from facts the seller or a document clearly states. Field: fields = object with keys from ${EDITABLE_FIELDS.join(", ")}. Never prices, stages, dates or names from guesses.
- send_listing_agreement: generates the listing agreement from the ACCEPTED quote and emails the signing link (autopilot). Only when the quote is accepted and no agreement has been sent. Do not also write a reply_email saying the same thing.
- resend_signing_link: re-emails the existing, still-valid signing link. Use when the seller says they can't find it. Do not resend if they said they will sign later.
- send_family_tree: emails the family tree / ownership questions. Only after the agreement is signed.
- resend_quote_free_listing: ONLY when a staff note or email shows we agreed the seller's listing fee is waived / free listing (e.g. "Pro with the $99 waived"). Re-sends their ORIGINAL quote email in the same thread (same figures and buttons) with a short intro asking them to click the free Starter option; we record it internally as Pro, so no payment is taken. Fields: subject, body = the short plain intro (e.g. "As agreed, your listing fee is waived. To continue, simply click the free Starter option in the quote below — we will record it on our side as the Pro listing, so there is nothing to pay."). Use this instead of flag_human for fee waivers.
- update_quote_spaces: simple quote corrections, ONLY when the seller (or the deed scan) shows the quote has the wrong spaces in the SAME section/lawn — they want to add a space, take one out, or we copied the space numbers/count from the deed wrongly. The per-space price stays EXACTLY the same; only the count / space numbers change. Fields: fields = {spaces (required, the new number of spaces as digits), space_numbers?, section?, lawn?}. On approval it saves the new spaces and opens the normal Send quote screen prefilled, so staff send it exactly like any quote (listing agreement and family tree follow as usual). Put a one-line summary in reason (e.g. "Adds space 5 in Section 12 at the same $2,100 per space"). Do NOT also write a reply_email.
- Quotes: apart from resend_quote_free_listing and update_quote_spaces you NEVER send or propose quotes or valuations. New valuations, a different section/garden, or a price change: flag_human with the reason.
- open_document_request: opens the staff document-request review for this seller (items, POAs and packet are built by the rules engine). Use when the family tree is complete and a request should go out or be updated. Put what should change in note.
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
- SELLER DECLINES THE QUOTE (price too low, decided to sell elsewhere, keeping them): reply_email politely — thank them, say we understand, and wish them the best of luck selling. Keep the door open in one line ("if anything changes, we're happy to help"). Do not argue or push. Only if they say the price is too low AND the quote looks clearly low, or the cemetery is one where we need inventory (e.g. Sparkman-Hillcrest), you may add that we'll take another look at the valuation — never promise a new figure. Do not flag for a plain decline.
- WANTS MORE FOR THE PROPERTY: If they hope for more but are not asking us to make a binding change now, reply that we can take another look. Explain that it is in our interest to sell for the highest price we can achieve too, and that the quote reflects what we believe the current resale market at their cemetery will bear. Never promise a higher number. If they request an actual revised quote/price decision, flag staff; do not change the price yourself. Do not confuse this with a simple same-area space correction, which uses update_quote_spaces.
- DOCUMENTS: If answering about a prepared POA, say it can be downloaded on the document page, signed IN FRONT of a notary, then mailed as a wet-ink original to the address on the page. An uploaded scan for review is optional; do NOT ask for one before mailing or imply they must wait for scan approval. If answering where to send digital documents, mention the personal page link for computer uploads or its QR code / "Use my phone" photos (tagged to checklist items), with email attachments as an alternative. When they ask about posting originals, simply give mailing instructions; do not add a scan-upload step unless they specifically ask for a check. Do not introduce unmentioned services such as FedEx sending email. Never suggest we are waiting on a buyer or transfer when we are actually waiting on a POA original to make the LISTING live. Only include the case-specific document page when SELLER'S DOCUMENT PAGE says it is available.
- LISTING VISIBILITY: if asked where an individual listing is, explain that we use searchable cemetery pages instead of individual plot pages; buyers who enquire are matched with our internal property list, also shared with mortuaries. Link the EXAMPLE AVAILABLE PROPERTY LIST; clearly label it as an example, not live inventory. This ordinary question needs no human review unless the seller disputes their actual marketing status.
- REQUIRED DOCUMENTS: we cannot market or sell without the required ownership/transfer paperwork. We can keep the seller's details on file. If a refund, cancellation, hold or conflicting staff instruction is on the file, leave it to staff to decide whether the file can resume; no customer email from the AI until staff decides.
- SPACE CORRECTIONS on a sent quote (add/remove a space in the same area, space numbers copied wrong): use update_quote_spaces, don't flag.
- NOTES (add_note and every note field): write like a colleague in one plain sentence, e.g. "Robert sent us his phone number: 281-788-6197." Never "Updated the record:", arrows, quotes around values or "Reason:".
- Emails: plain text, following the tone rules, greeting "Dear <First Name>," and the standard sign-off. No markdown.
- KEEP EVERY EXPLANATION SHORT AND PLAIN. Staff skim these on a busy panel:
  - stage_summary: one line, max 12 words, e.g. "Quote accepted, agreement signed, waiting on the deed."
  - next_step: max 10 words, e.g. "Reply confirming we received the deed."
  - reasoning: 1-2 short sentences, plain words, no jargon, no restating the whole record.
  - each action's reason: one short sentence, e.g. "She asked where to send the deed — reply with the address."
  - human_reason: one short sentence saying exactly what a person must decide.
- Return ONLY a JSON object, no code fences, with exactly these keys:
{"stage_summary": string, "next_step": string, "reasoning": string, "confidence": number, "needs_human": boolean, "human_reason": string|null,
 "actions": [{"type": string, "reason": string, "confidence": number, "subject": string|null, "body": string|null, "note": string|null, "fields": object|null, "items": array|null}]}`;

/** Scans on file (deed first) as image/PDF parts so the AI can read them. Kept small for cost. */
async function loadScans(db: SupabaseClient, sub: Sub) {
  if (!sub.customer_profile_id) return { parts: [] as any[], names: [] as string[] };
  const { data } = await db.from("customer_files").select("file_name,file_path,mime_type,document_type,file_size,created_at")
    .eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(40);
  const ok = (f: any) => /^image\/(jpeg|png|webp)$/.test(f.mime_type ?? "") ? (f.file_size ?? 0) < 12_000_000 : f.mime_type === "application/pdf" && (f.file_size ?? 0) < 5_000_000;
  const rank = (f: any) => /deed|certificate of ownership/i.test(f.document_type ?? "") ? 0 : /intake/i.test(f.document_type ?? "") ? 1 : /attachment/i.test(f.document_type ?? "") ? 2 : 9;
  const seen = new Set<number>();
  const picked = (data ?? []).filter(ok).filter((f) => !seen.has(f.file_size) && seen.add(f.file_size)).filter((f) => rank(f) < 9).sort((a, b) => rank(a) - rank(b)).slice(0, 4);
  const parts: any[] = [], names: string[] = [];
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
    parts.push({ type: "input_text", text: `SCAN ${names.length} — ${f.document_type}: ${f.file_name} (uploaded ${f.created_at})` });
    parts.push(f.mime_type === "application/pdf"
      ? { type: "input_file", filename: f.file_name || "scan.pdf", file_data: `data:application/pdf;base64,${b64}` }
      : { type: "input_image", image_url: `data:${blob.type && blob.type.startsWith("image/") ? blob.type : f.mime_type};base64,${b64}` });
  }
  return { parts, names };
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
    actions: actions
      .filter((a: any) => allowed.has(a?.type))
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
    const { allowed } = allowedActions(sub, ctx.contracts);
    // Only read the scans when there is something to check: the seller's latest message
    // questions the documents/plots/details, or staff asked for a manual review.
    const lastText = `${lastMsg?.subject ?? ""} ${lastMsg?.body_text ?? ""}`.toLowerCase();
    const wantsCheck = /wrong|mistake|incorrect|not (right|correct)|deed|document|paperwork|plot|section|lot|space|name is|spelled|transfer/.test(lastText);
    const scans = (customerWaiting && wantsCheck) || trigger === "manual" ? await loadScans(db, sub) : { parts: [], names: [] };
    const raw = await callModel(apiKey, INSTRUCTIONS(playbook.content), `ALLOWED NOW: ${[...allowed].join(", ")}\n\nSCANS ATTACHED: ${scans.names.length ? scans.names.join("; ") : "(none readable)"}\n\n${ctx.context}`, effort, scans.parts);
    const d = parseDecision(raw, allowed);
    // Handing to staff = nothing else. The seller stays in Needs reply.
    if (d.needs_human || d.confidence < 0.7 || d.actions.some((a) => a.type === "flag_human")) d.actions = d.actions.filter((a) => a.type === "flag_human");
    const needsHuman = d.needs_human || d.confidence < 0.7 || d.actions.some((a) => a.type === "flag_human");
    await db.from("ai_agent_runs").update({
      status: "done", stage_summary: d.stage_summary, next_step: d.next_step, reasoning: d.reasoning,
      confidence: d.confidence, needs_human: needsHuman, human_reason: d.human_reason,
    }).eq("id", run!.id);

    // Supersede older undecided proposals for this seller so the queue stays current.
    await db.from("ai_agent_actions").update({ status: "superseded" }).eq("submission_id", sub.id).eq("status", "proposed");

    const rows = d.actions.map((a) => ({
      run_id: run!.id, submission_id: sub.id, action_type: a.type, reason: a.reason, confidence: a.confidence,
      email_to: ["reply_email", "fix_document_request", "resend_quote_free_listing"].includes(a.type) ? sub.email : null,
      email_subject: a.subject, email_body: a.body, original_email_body: a.body,
      note_body: a.type === "flag_human" ? (a.note ?? d.human_reason ?? a.reason) : a.note,
      gmail_thread_id: ctx.threadId,
      payload: a.fields ? { fields: a.fields } : a.items ? { items: a.items } : null,
    }));
    if (needsHuman && !rows.some((r) => r.action_type === "flag_human")) {
      rows.push({ run_id: run!.id, submission_id: sub.id, action_type: "flag_human", reason: d.human_reason ?? "Low confidence", confidence: d.confidence, email_to: null, email_subject: null, email_body: null, original_email_body: null, note_body: d.human_reason ?? d.next_step, gmail_thread_id: ctx.threadId, payload: null });
    }
    if (rows.length) await db.from("ai_agent_actions").insert(rows);
    return { status: "done", run_id: run!.id, effort, decision: d };
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    await db.from("ai_agent_runs").update({ status: "error", error: msg.slice(0, 1000) }).eq("id", run!.id);
    throw e;
  }
}

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
      // Needs-reply sellers only: the latest email on the record is FROM the customer
      // (unanswered). Fetch recent mail both directions and keep only those.
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
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
    const { data: sub } = await db.from("contact_submissions").select("*").eq("id", act.submission_id).maybeSingle();
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
      else await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `Emailed ${first(sub)}: ${act.reason}`, author_name: `AI agent (approved by ${user.name})` });
    } else if (act.action_type === "add_note") {
      const { error: e } = await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `${act.note_body ?? act.reason}`, author_name: `AI agent (approved by ${user.name})` });
      if (e) error = e.message;
    } else if (act.action_type !== "flag_human") {
      // Re-check against the record as it is NOW — it may have moved on since the proposal.
      const { data: contracts } = await db.from("contracts").select("id,kind,status,sign_token,sign_token_expires_at").eq("submission_id", sub.id).is("deleted_at", null);
      const { allowed, liveLink } = allowedActions(sub, contracts ?? []);
      if (!allowed.has(act.action_type)) return json({ error: "This step no longer applies — the record has moved on. Reject it or re-run the AI." }, 409);
      const aiNote = async (body: string) => { await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body, author_name: `AI agent (approved by ${user.name})` }); };
      try {
        if (act.action_type === "send_listing_agreement") {
          const r = await callInternal(url, "autopilot", { submission_id: sub.id, step: "listing_agreement" });
          if (r.status !== "sent") throw new Error(`Listing agreement not sent: ${r.reason ?? r.status}`);
          await aiNote(`Sent ${first(sub)} the listing agreement to sign.`);
        } else if (act.action_type === "resend_signing_link") {
          await callInternal(url, "send-contract-link", { contract_id: liveLink.id, sign_url: `${SITE}/sign/${liveLink.sign_token}` });
          await aiNote(`Re-sent ${first(sub)} the link to sign the listing agreement.`);
        } else if (act.action_type === "send_family_tree") {
          const r = await callInternal(url, "autopilot", { submission_id: sub.id, step: "family_tree" });
          if (r.status !== "sent") throw new Error(`Family tree not sent: ${r.reason ?? r.status}`);
          await aiNote(`Sent ${first(sub)} the family tree questionnaire.`);
        } else if (act.action_type === "update_fields") {
          const fields = (act.payload?.fields ?? {}) as Record<string, string>;
          const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => EDITABLE_FIELDS.includes(k)));
          if (!Object.keys(patch).length) throw new Error("No valid fields to update");
          const before = Object.fromEntries(Object.keys(patch).map((k) => [k, sub[k] ?? "—"]));
          const { error: e } = await db.from("contact_submissions").update(patch).eq("id", sub.id);
          if (e) throw new Error(e.message);
          await aiNote(Object.entries(patch).map(([k, v]) => before[k] === "—" || !String(before[k]).trim()
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
        } else if (act.action_type === "open_quote_dialog" || act.action_type === "open_document_request") {
          await aiNote(`${act.action_type === "open_quote_dialog" ? "Suggested sending the quote" : "Suggested sending/updating the document request"}; ${user.name} opened it to review and send.${act.note_body ? ` AI note: ${act.note_body}` : ""}`);
        }
      } catch (e) { error = String((e as Error).message).slice(0, 400); }
    }

    await db.from("ai_agent_actions").update(error
      ? { error }
      : { status: act.action_type === "flag_human" ? "acknowledged" : "executed", decided_by_name: user.name, decided_at: now, executed_at: now, error: null }).eq("id", act.id);
    if (!error) {
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_user_id: user.id, actor_name: user.name, action_type: "ai_agent_action", action_summary: `Approved AI ${act.action_type.replace(/_/g, " ")}`, details: { action_id: act.id, edited: act.email_body !== act.original_email_body } });
    }
    return error ? json({ error }, 502) : json({ ok: true, open: ["open_quote_dialog", "update_quote_spaces"].includes(act.action_type) ? "quote" : act.action_type === "open_document_request" ? "documents" : null });
  } catch (e) {
    console.error("seller-agent error", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
