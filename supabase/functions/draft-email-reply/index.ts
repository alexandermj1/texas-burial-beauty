// Drafts a full email reply using Lovable AI with a tool-calling architecture
// for cost efficiency. The initial system prompt is intentionally small (tone +
// business identity + rules). The model must call tools to load heavy reference
// material (listing agreement summary, POA summary, pricing details, cemetery
// info) — so tokens are only spent when the reply actually needs those facts.
//
// Model: google/gemini-3.1-flash-lite (cheap, supports tools via OpenRouter).
// Returns plain text — the composer converts it to HTML and preserves the
// existing greeting/signature convention.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

interface ThreadMsg { from: string; subject?: string; body: string; }

// --- Tool reference material (loaded only when the model asks) ------------
// Keep each blob short and factual. No sales language.
const LISTING_AGREEMENT_SUMMARY = `
Listing Agreement — key points (plain summary):
- Consignment/listing agreement between the seller and Texas Cemetery Brokers.
- Grants us the exclusive right to market and sell the interment property described (cemetery, section, spaces).
- Seller sets an "authorized minimum" net price. We may not accept less without written approval.
- Term: typically active until sold, cancelled in writing, or the parties agree otherwise.
- We handle marketing, buyer inquiries, negotiation, paperwork, and coordination with the cemetery for transfer.
- Seller is paid at closing after the cemetery completes the transfer of ownership.
- Seller certifies they own the property free of liens/co-owner disputes; co-owners must be disclosed.
- Signed by the seller (and any co-owner). We countersign after review.
`.trim();

const POA_SUMMARY = `
Power of Attorney (POA) — key points (plain summary):
- Limited POA authorizing Texas Cemetery Brokers to act on the seller's behalf for the specific transfer of the described interment property only.
- Lets us submit transfer paperwork, sign cemetery forms, and coordinate closing so the seller does not need to be present at the cemetery.
- Does NOT grant control over any other property, finances, or unrelated matters.
- Must be notarized. The seller can notarize in person or online (we send a Proof.com upload link with the packet).
- Expires when the transfer is completed or the listing is cancelled.
`.trim();

const PRICING_AND_OPTIONS = `
Listing options (factual, non-promotional):
- Starter — $0. Listed on our website.
- Pro — $99. In 2025 data, Pro listings sold on average 22% faster than Starter.
- Featured — $299. In 2025 data, Featured listings sold on average 61% faster. Useful context: ~90% of plot sales originate through mortuaries, so being near the top of the list they show families matters.
- Set Your Own Price — $499. Everything in Featured, and the seller sets their own floor price. For sellers who are comfortable waiting longer for a sale in exchange for a potentially higher return. We always try to sell for the highest amount regardless of the option chosen; this option only raises the floor.
Sample mortuary listing sheet:
- We publish a sample of the actual Available Property List we circulate to Texas funeral homes and mortuaries. If a seller asks how we market the property, what the list looks like, or where their plot would appear, share this link: https://www.texascemeterybrokers.com/sample-listing-sheet.html (opens in any browser; a PDF version is at https://www.texascemeterybrokers.com/__l5e/assets-v1/4f4d9a57-3daf-4acc-bef9-f182c7bf8e0f/texas-cemetery-brokers-featured-listings.pdf). Make clear it is an example document, not current inventory.
Quotes:
- We present a SUGGESTED SALES PRICE (not a "quote" in the take-it-or-leave-it sense), based on the specific cemetery and property type and in line with other listings at that location.
- Never promise a sale timeline or guarantee a sale.
- If a specific figure hasn't been given to the seller yet, say we will follow up with the exact figure rather than estimating.
`.trim();

const PROCESS_FLOW = `
The seller process, in order (this is the same for everybody up to the family tree, then each file diverges):

1. INQUIRY — the seller contacts us about property they want to sell.
2. DETAILS & ATTACHMENTS — we ask for their cemetery/section/space details and a copy of the certificate of ownership ("deed" from the cemetery) — a clear photo or scan emailed to us is fine at this stage.
3. SUGGESTED SALES PRICE — we review comparable listings at that cemetery and send them a suggested sales price plus the listing options.
4. ACCEPTANCE — the seller accepts the price and chooses a listing option.
5. LISTING AGREEMENT — we send the listing agreement for e-signature. We countersign after review.
6. FAMILY TREE / OWNERSHIP CONFIRMATION — we email a link to a secure online questionnaire ("confirming the deed") where the seller walks through who is on the deed, who is living or deceased, marriages, heirs and so on. This is what tells us who actually has authority to sign. It takes a few minutes and can be done on a phone.
7. DOCUMENT REQUEST — only AFTER the questionnaire is finished and one of our brokers has reviewed it do we know the exact document list. We then send a personalised document request with everything prepared for them.
8. SIGNING, NOTARISING & MAILING — the seller signs; anything that has to be notarised (the limited power of attorney and, where applicable, affidavits/consents) is notarised in person or online (we send an online-notary link).
9. FINALISING THE LISTING — the ORIGINAL wet-ink documents must be MAILED to us: the certificate of ownership (deed) and the notarised POA and any other originals. Photo IDs (driver's licence etc.) do NOT need mailing — a clear photo or scan is fine. Our partner Bayer Cemetery Brokers holds physical records securely in case the cemetery requires them at the time of sale: 100 N Brand Blvd #213, Glendale, CA 91203.
10. LIVE LISTING → SALE → TRANSFER — once the paperwork is in hand the listing goes live. When it sells we handle the cemetery transfer and the seller is paid at closing.

TIMING RULES FOR REPLIES:
- Before the family tree is complete, NEVER give a final document list. Say what is generally needed and that we'll confirm the exact list once the ownership questionnaire is reviewed.
- After the family tree is complete and reviewed by a broker, the checklist on the submission IS the answer — use get_submission_context and reference the actual items rather than generalising.
- Do not ask for something the submission shows we already have.
`.trim();

// Distilled from real broker corrections to past AI drafts (ai_draft_edits).
// These are house rules the team has repeatedly had to add by hand.
const HOUSE_RULES_LEARNED = `
House rules learned from broker corrections to previous drafts:
- Originals: a signed scan emailed to us is not the end of it — the wet-ink original still has to be mailed to our partner Bayer Cemetery Brokers, 100 N Brand Blvd #213, Glendale, CA 91203, who keep it on file securely in case the cemetery requires it at the time of sale. Bayer Cemetery Brokers is our partner — say so plainly if the name comes up.
- Driver's licences / photo IDs never need mailing — a clear photo or scan is fine.
- If a notarisation is missing, be gentle: allow that we may be looking at the wrong document, say we can't see the notary stamp, and point them to where they can get it notarised (bank, UPS store, or the online notary link we sent).
- Explain WHY we need the deed, not just that we need it. And tell them they can simply reply to the email with a scan or clear photo.
- Whenever a link is referenced, be explicit that the link is in THIS email — sellers often go looking through older emails.
- Be appreciative and specific when a seller has been thorough or quick to respond.
- When we've received documents, say we'll review and may come back with clarifying questions, and tell them the next step.
- Buyers asking us to find the owner of a specific plot: who owns a specific plot is proprietary information held confidentially by the cemetery. The resale market is seller-led — we can only sell what owners voluntarily list. Offer to take their requirements (property type, number of spaces, area) and keep them on file.
- Never say we'll clarify something with the cemetery on the seller's behalf unless the admin instructions say so — usually we ask the SELLER to confirm the configuration with the cemetery.
- Popular cemeteries can carry roughly a one-month wait for a suitable property; anything we already have available today has no wait.
- Don't over-claim availability; if inventory is thin for at-need buyers, say so honestly and ask what they're looking for.
`.trim();



const BUSINESS_FAQ = `
Business FAQ:
- We are a licensed Texas brokerage that helps families sell unused/duplicate cemetery property (plots, crypts, niches, mausoleum spaces).
- Model: consignment/listing brokerage. We do NOT buy property outright. We market and sell on the owner's behalf.
- Payment to seller: at closing, after the cemetery transfer is complete.
- Fees: seller pays the listing option they choose ($0/$99/$299). Our commission is agreed in the listing agreement and taken from the sale proceeds at closing.
- Cemetery transfer fees are charged by the cemetery itself, not by us. Amount varies by cemetery.
- Timeline: varies by cemetery, property type, and asking price. We do not guarantee a sale by a specific date.
- Territory: Texas.
`.trim();

const REQUIRED_DOCUMENTS_REFERENCE = `
Documents a seller typically needs — FRAME AS "GENERALLY", NEVER AS A FINAL CHECKLIST.
The exact list depends on the cemetery and the family situation. Always offer to confirm after review.

Baseline (almost every transfer):
- Certificate of ownership from the cemetery (a "deed" from the cemetery office, NOT a county-recorded deed). If lost, it's usually recoverable from the cemetery's own records — reassure the seller.
- Government photo ID for everyone who has to sign.
- The cemetery's own transfer form and transfer fee (varies by cemetery).
- A limited Power of Attorney to Texas Cemetery Brokers, signed AFTER the seller accepts the quote and signs the listing agreement.

Situational (mention only what applies):
- Married living owner: spouse usually needs to sign a consent, even if only the owner's name is on the certificate (spouse has an interment right in Texas). Divorce decree or spouse's death certificate can clear this.
- Deceased owner (inheritance): needs proof of authority to sell. If probated will → letters testamentary / letters of administration. If no will → heirship documentation or court process. If multiple heirs → generally ALL of them must sign; never imply one heir can act alone unless they hold proper legal authority for the others.
- Trust-owned: trustee signs, with the trust document showing authority.
- Organization-owned (church, lodge, company): authorized officer signs, with proof of authority.
- Lost deed AND cemetery has no record: lost-deed affidavit.
- Any deceased owner listed on the deed: death certificate.

Process notes:
- Sellers can upload through the seller portal or email us — photos or scans are fine.
- We verify ownership with the cemetery before the listing goes live.
- Check what the seller has ALREADY provided via get_submission_context (deed on file, ID on file, payment received, LA signed, POA signed, etc.) before asking for anything again.
`.trim();

const OWNERSHIP_AUTHORITY_GUIDE = `
Ownership & authority guide — use to answer "who has to sign / can I sell this?" questions.

CORE FRAMING RULE (most important):
- The honest answer to "what do you need from me" is: it depends on who owns the plot and how they came to own it.
- Give the general shape, explain the exact list depends on their situation, offer to confirm once we've reviewed their deed and details.
- NEVER state a definitive final document list. NEVER promise cemetery-specific requirements — cemeteries set their own rules.

STABLE FACTS (safe to state):
- A cemetery plot is not normal real estate. What's sold is the "right of sepulture" (right of burial). The ownership document is a cemetery-issued certificate of ownership, not a county-recorded deed. A lost deed is usually recoverable from the cemetery.
- Each cemetery sets its own rules, transfer forms, fees, and requirements — they can demand more than the legal minimum.
- We're a registered Texas broker. We sell based on the recorded owner and record the completed transfer with the cemetery.
- A plot sold as a single unit generally cannot be split without the cemetery's consent.

PROCESS IN PLAIN TERMS:
1. Seller sends ownership documents and details.
2. We confirm who has authority to sell.
3. We send a quote.
4. Seller accepts and signs the listing agreement + a limited POA appointing us.
5. We complete and record the transfer with the cemetery.

FOUR OWNERSHIP SITUATIONS (identify which one applies; if unclear, ask ONE clarifying question):

1) LIVING OWNER selling their own plot — simplest. Owner signs. If married, spouse usually needs to consent even if not on the certificate. Divorce decree or spouse's death cert can clear this.

2) OWNER HAS DIED (inheritance) — most common source of complexity. Be extra careful and empathetic (often bereaved families). Authority depends on:
   - Was there a will? Probated will → executor typically has authority. No will → heirship / court process / sworn heirship document.
   - Who inherits? If several people inherit (multiple children/siblings), ALL of them generally must sign. Do NOT imply one heir can act alone unless they hold proper legal authority for the others.
   - Treat "the owner passed away" as a signal to be less specific and route through a human review.

3) TRUST owns the plot — trustee signs; we'll need to see the trust paperwork.

4) ORGANIZATION owns the plot (church, lodge, company) — an authorized officer signs, with proof of authorization.

WHO SIGNS — PRINCIPLE:
There is only ever one owner of record. Everyone else (heir, executor, trustee, officer, agent, us) acts in relation to that owner. The question is never "does this person own it?" but "does this person have provable authority to sign for the owner?"
- Living owner signs personally (spouse consents if married).
- Co-owners: everyone named on the certificate signs.
- Heirs: sign once inheritance is established; all of them if there are several.
- Executor: signs for an estate with court paperwork proving it.
- Trustee: signs for a trust; officer signs for an organization.

COMMON RELATIONSHIP SITUATIONS (safe answers):
- "I'm one of three siblings inheriting" → Generally ALL siblings need to sign. Do not imply one can act alone.
- "I'm the owner's niece/nephew" → Nieces/nephews usually only inherit when there are no closer relatives (no children, grandchildren, or parents of the owner), typically by stepping into a deceased parent's place. Possible, but depends on the family situation — we'll confirm.
- "I'm the daughter-in-law / son-in-law" → In Texas, in-laws and stepchildren generally do NOT inherit directly. The heir is usually their spouse or blood relative. Gently explain and route through that person. Common, understandable misunderstanding — handle kindly.
- "I have POA for my mother who owns it" → If the parent is LIVING, they remain the owner and the child signs in the parent's name as attorney-in-fact — nothing transfers into the child's name. Whether the POA lets us act depends on what it actually says; we'd need to review it. Cleanest path: get our authorization directly from the parent while they're able. IMPORTANT: a POA ends when the person dies — if the parent has passed away, it becomes an inheritance situation.

HARD GUARDRAILS:
- Do NOT give legal advice or interpret a will, POA, or estate. We're not attorneys. It's fine to say so.
- Do NOT state a definitive final document checklist. Always "generally / typically", always "we'll confirm".
- Do NOT quote statutes, thresholds, or timelines as promises.
- Do NOT tell a customer they definitely can or cannot sell, or that their document definitely is or isn't sufficient — that determination happens after review.
- Do NOT promise cemetery-specific requirements.
- Do NOT assume one person can act alone when multiple owners or heirs may exist.

ESCALATE TO A HUMAN when: deceased owner with a complicated or contested estate, disputes between heirs/co-owners, occupied plots, anything involving a POA or guardianship, or the customer seems confused or upset. Safe line: "I want to make sure we get this exactly right for your situation, so I'm going to have one of our team confirm the details with you."

REPLY SKELETON for "what will you need from me?":
"Thanks for reaching out — happy to help you sell your plot. In most cases we'll need your certificate of ownership (the deed from the cemetery), photo ID for anyone who needs to sign, and — once we've sent you a quote you're happy with — a short authorization form so we can complete the transfer at the cemetery for you. The exact list depends a little on your situation — for example, whether the plot is owned by one person or several, whether the original owner is still living, and if you're married, since a spouse often needs to sign too. [If deceased owner: Since it sounds like the original owner has passed away, there are usually a couple of extra steps to confirm who has the authority to sell, and we'll walk you through those.] If you can send over a copy of the deed and let me know [one or two relevant clarifiers], I'll confirm exactly what applies to you and get you a quote."
`.trim();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function lookupCemetery(name: string): Promise<string> {
  if (!name?.trim()) return "No cemetery name supplied.";
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await svc
    .from("texas_cemeteries")
    .select("name, city, county, address, transfer_fee, phone, notes")
    .ilike("name", `%${name.trim()}%`)
    .limit(3);
  if (!data?.length) return `No record found for "${name}".`;
  return data.map((c: any) => {
    const parts = [
      `Name: ${c.name}`,
      c.city && `City: ${c.city}`,
      c.county && `County: ${c.county}`,
      c.address && `Address: ${c.address}`,
      c.transfer_fee != null ? `Transfer fee: $${c.transfer_fee}` : `Transfer fee: not on file`,
      c.notes && `Notes: ${String(c.notes).slice(0, 300)}`,
    ].filter(Boolean);
    return parts.join("\n");
  }).join("\n---\n");
}

// Compact snapshot of what THIS customer submitted + any documents already
// analyzed for them. Small, factual, no chit-chat — the model uses it to be
// specific ("I see you already sent the deed") instead of generic.
// --- Buyer inventory search ------------------------------------------------
// Buyers get a real answer based on actual inventory: (a) live listings at the
// cemetery, and (b) seller files that are past "quote accepted" (property we
// have secured and will be listing shortly). If nothing matches, the reply
// should offer the waiting list rather than over-promising.
async function findInventory(args: { cemetery?: string; city?: string; propertyType?: string }): Promise<string> {
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const cem = (args?.cemetery || "").trim();
  const city = (args?.city || "").trim();
  const type = (args?.propertyType || "").trim();

  let lq = svc
    .from("listings")
    .select("id, cemetery, city, plot_type, section, spaces, asking_price, status, created_at")
    .eq("status", "active")
    .limit(15);
  if (cem) lq = lq.ilike("cemetery", `%${cem}%`);
  else if (city) lq = lq.ilike("city", `%${city}%`);
  if (type) lq = lq.ilike("plot_type", `%${type}%`);
  const { data: listings } = await lq;

  let sq = svc
    .from("contact_submissions")
    .select("id, cemetery, cemetery_city, property_type, spaces, section, accepted_quote_amount, quote_response, quote_amount, listing_live_at, la_signed_at, documents_completed_at")
    .not("accepted_quote_amount", "is", null)
    .limit(25);
  if (cem) sq = sq.ilike("cemetery", `%${cem}%`);
  else if (city) sq = sq.ilike("cemetery_city", `%${city}%`);
  const { data: secured } = await sq;

  const securedMatches = (secured || []).filter((s: any) =>
    !type || String(s.property_type || "").toLowerCase().includes(type.toLowerCase()));

  const lines: string[] = [];
  lines.push(`Inventory search — cemetery: ${cem || "(any)"}${city ? `, city: ${city}` : ""}${type ? `, type: ${type}` : ""}`);

  if (listings?.length) {
    lines.push("LIVE LISTINGS (available now, no wait):");
    for (const l of listings as any[]) {
      lines.push(`- ${l.cemetery}${l.city ? `, ${l.city}` : ""} — ${l.plot_type || "property"}${l.section ? `, ${l.section}` : ""}, ${l.spaces ?? 1} space(s)${l.asking_price != null ? ` — asking $${l.asking_price}` : ""}`);
    }
  } else {
    lines.push("LIVE LISTINGS: none matching.");
  }

  if (securedMatches.length) {
    lines.push("SECURED PROPERTY (seller has accepted our price — past the accepted stage, paperwork in progress, coming to market shortly):");
    for (const s of securedMatches as any[]) {
      const stage = s.listing_live_at ? "listing live" : s.documents_completed_at ? "paperwork complete" : s.la_signed_at ? "agreement signed" : "price accepted";
      lines.push(`- ${s.cemetery}${s.cemetery_city ? `, ${s.cemetery_city}` : ""} — ${s.property_type || "property"}${s.section ? `, ${s.section}` : ""}, ${s.spaces ?? 1} space(s) — stage: ${stage}`);
    }
  } else {
    lines.push("SECURED PROPERTY: none matching.");
  }

  const any = (listings?.length || 0) + securedMatches.length > 0;
  lines.push(any
    ? `HOW TO USE THIS: mention only what is listed above, in general terms (cemetery, property type, number of spaces). Prioritise SECURED PROPERTY and LIVE LISTINGS. Do NOT quote a price to the buyer unless the admin instructions supply one — say we can send the exact figures and details across. Resale property is typically around 40% below what the cemetery charges for the equivalent property today, so it is fine to say savings are usually significant, phrased as "approximately" and "typically".`
    : `HOW TO USE THIS: we have NOTHING matching right now. Say so honestly and kindly. Explain that we keep a waiting list, that we are actively working with families who are bringing property at this cemetery to market, and offer to add them to the list so we can contact them as soon as something suitable comes in. Mention that resale property typically comes in at approximately 40% below the cemetery's current price, so it is usually worth the wait, phrased gently and without pressure. Ask what exactly they are looking for (property type, number of spaces, preferred area/section) and whether their need is at-need or pre-need. Never invent inventory.`);

  return lines.join("\n");
}

async function getSubmissionContext(submissionId: string): Promise<string> {
  if (!submissionId?.trim()) return "No submission id supplied.";
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: sub } = await svc
    .from("contact_submissions")
    .select(`
      id, name, email, phone, source, created_at,
      cemetery, cemetery_city, property_type, spaces, plot_count, section, space_numbers, lawn,
      message, details, timeline, budget,
      ownership_type, deed_owner_names, deed_owners_status, relationship_to_owner,
      authorization_confirmed, multi_owner_perm_required, multi_owner_perm_signed_at,
      deed_on_file, gov_id_on_file, death_cert_on_file,
      purchase_info, prepaid_endowment_info,
      quote_amount, quote_net_amount, transfer_fee_amount, quote_sent_at,
      quote_response, quote_responded_at, accepted_quote_amount, listing_tier, listing_option,
      payment_link_sent_at, payment_received_at,
      la_issued_at, la_signed_at, la_countersigned_at,
      poa_signed_at, poa_notarized_at,
      documents_requested_at, documents_completed_at, listing_live_at, listing_url,
      ownership_answers, ownership_roster, ownership_reviewed_at,
      customer_profile_id, seller_attachments, admin_notes
    `)
    .eq("id", submissionId)
    .maybeSingle();

  if (!sub) return `No submission found for id ${submissionId}.`;

  // Family tree / ownership questionnaire ("confirming the deed") state.
  const ans: any = (sub as any).ownership_answers ?? {};
  const roster: any[] = Array.isArray((sub as any).ownership_roster) ? (sub as any).ownership_roster : [];
  const treeSentAt = ans?.sentAt ?? ans?.sent_at ?? null;
  const treeDoneAt = ans?.sellerConfirmedAt ?? ans?.seller_confirmed_at ?? null;
  const answerLines = Object.entries(ans)
    .filter(([k, v]) => v != null && v !== "" && !/^(sentAt|sent_at|sellerConfirmedAt|seller_confirmed_at|token)$/.test(k))
    .slice(0, 40)
    .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200)}`);
  const rosterLines = roster.slice(0, 20).map((p: any) =>
    `- ${p?.name ?? "(unnamed)"}${p?.role ? ` — ${p.role}` : ""}${p?.relation ? ` (${p.relation})` : ""}${p?.deceased ? " — DECEASED" : ""}${p?.signer ? " — must sign" : ""}`
  );
  const treeBlock = [
    `- Questionnaire sent: ${treeSentAt ? String(treeSentAt).slice(0, 10) : "no"}   Completed by seller: ${treeDoneAt ? String(treeDoneAt).slice(0, 10) : "no"}`,
    `- Reviewed by a broker: ${(sub as any).ownership_reviewed_at ? String((sub as any).ownership_reviewed_at).slice(0, 10) : "no — the exact document list is NOT final yet"}`,
    answerLines.length ? `Answers given by the seller:\n${answerLines.join("\n")}` : "(no answers recorded yet)",
    rosterLines.length ? `People identified:\n${rosterLines.join("\n")}` : "",
  ].filter(Boolean).join("\n");



  // Documents attached to this customer, with AI-extracted summaries.
  let filesBlock = "(no documents on file for this customer)";
  if (sub.customer_profile_id) {
    const { data: files } = await svc
      .from("customer_files")
      .select("file_name, document_type, extracted_summary, extraction_status, created_at")
      .eq("customer_profile_id", sub.customer_profile_id)
      .order("created_at", { ascending: true })
      .limit(20);
    if (files?.length) {
      filesBlock = files.map((f: any, i: number) => {
        const status = f.extraction_status || "unknown";
        const summary = (f.extracted_summary || "").slice(0, 400);
        return `[${i + 1}] ${f.file_name}${f.document_type ? ` (${f.document_type})` : ""} — extraction: ${status}${summary ? `\n   Summary: ${summary}` : ""}`;
      }).join("\n");
    }
  }

  // Any explicit document checklist tracked on the submission.
  const { data: docReqs } = await svc
    .from("submission_documents")
    .select("label, document_type, status, received_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });
  const reqsBlock = docReqs?.length
    ? docReqs.map((d: any) => `- ${d.label} [${d.status}${d.received_at ? `, received ${d.received_at.slice(0,10)}` : ""}]`).join("\n")
    : "(no explicit document checklist yet)";

  const fmt = (v: any) => (v == null || v === "" ? "—" : String(v));
  const money = (v: any) => (v == null ? "—" : `$${Number(v).toLocaleString()}`);
  const yn = (v: any) => (v === true ? "yes" : v === false ? "no" : "unknown");

  return [
    `Submission ${sub.id} (source: ${fmt(sub.source)}, created ${String(sub.created_at).slice(0,10)})`,
    `Customer: ${fmt(sub.name)} <${fmt(sub.email)}> ${sub.phone ? `phone ${sub.phone}` : ""}`.trim(),
    ``,
    `PROPERTY`,
    `- Cemetery: ${fmt(sub.cemetery)}${sub.cemetery_city ? ` (${sub.cemetery_city})` : ""}`,
    `- Property type: ${fmt(sub.property_type)}`,
    `- Spaces / plot count: ${fmt(sub.spaces)} / ${fmt(sub.plot_count)}`,
    `- Section / space numbers / lawn: ${fmt(sub.section)} / ${fmt(sub.space_numbers)} / ${fmt(sub.lawn)}`,
    `- Timeline: ${fmt(sub.timeline)}   Budget: ${fmt(sub.budget)}`,
    ``,
    `OWNERSHIP`,
    `- Ownership type: ${fmt(sub.ownership_type)}   Relationship to owner: ${fmt(sub.relationship_to_owner)}`,
    `- Deed owner names: ${fmt(sub.deed_owner_names)}   Deed owners status: ${fmt(sub.deed_owners_status)}`,
    `- Authorization confirmed: ${yn(sub.authorization_confirmed)}   Multi-owner permission required/signed: ${yn(sub.multi_owner_perm_required)} / ${sub.multi_owner_perm_signed_at ? "signed" : "not signed"}`,
    `- Deed on file: ${yn(sub.deed_on_file)}   Gov ID on file: ${yn(sub.gov_id_on_file)}   Death cert on file: ${yn(sub.death_cert_on_file)}`,
    `- Purchase info: ${fmt(sub.purchase_info)}`,
    `- Prepaid / endowment info: ${fmt(sub.prepaid_endowment_info)}`,
    ``,
    `QUOTE & LISTING`,
    `- Quote sent: ${sub.quote_sent_at ? sub.quote_sent_at.slice(0,10) : "no"}   Amount: ${money(sub.quote_amount)}   Net to seller: ${money(sub.quote_net_amount)}   Transfer fee: ${money(sub.transfer_fee_amount)}`,
    `- Quote response: ${fmt(sub.quote_response)}${sub.quote_responded_at ? ` on ${sub.quote_responded_at.slice(0,10)}` : ""}   Accepted amount: ${money(sub.accepted_quote_amount)}`,
    `- Listing tier / option: ${fmt(sub.listing_tier)} / ${fmt(sub.listing_option)}`,
    `- Payment link sent: ${sub.payment_link_sent_at ? sub.payment_link_sent_at.slice(0,10) : "no"}   Payment received: ${sub.payment_received_at ? sub.payment_received_at.slice(0,10) : "no"}`,
    `- Listing agreement: issued ${sub.la_issued_at ? sub.la_issued_at.slice(0,10) : "no"}, signed ${sub.la_signed_at ? sub.la_signed_at.slice(0,10) : "no"}, countersigned ${sub.la_countersigned_at ? sub.la_countersigned_at.slice(0,10) : "no"}`,
    `- POA: signed ${sub.poa_signed_at ? sub.poa_signed_at.slice(0,10) : "no"}, notarized ${sub.poa_notarized_at ? sub.poa_notarized_at.slice(0,10) : "no"}`,
    `- Documents requested: ${sub.documents_requested_at ? sub.documents_requested_at.slice(0,10) : "no"}   All documents received: ${(sub as any).documents_completed_at ? String((sub as any).documents_completed_at).slice(0,10) : "no"}   Listing live: ${sub.listing_live_at ? sub.listing_live_at.slice(0,10) : "no"}`,
    ``,
    `FAMILY TREE / OWNERSHIP QUESTIONNAIRE ("confirming the deed")`,
    treeBlock,
    ``,
    `CUSTOMER FORM MESSAGE`,
    fmt(sub.message) === "—" ? "(none)" : String(sub.message).slice(0, 800),
    sub.details ? `\nDetails: ${String(sub.details).slice(0, 400)}` : "",
    ``,
    `DOCUMENT CHECKLIST`,
    reqsBlock,
    ``,
    `ATTACHED DOCUMENTS (AI-extracted summaries)`,
    filesBlock,
  ].filter(Boolean).join("\n");
}

// Recent real corrections brokers made to AI drafts — live house knowledge.
async function getRecentBrokerCorrections(): Promise<string> {
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await svc
    .from("ai_draft_edits")
    .select("revision_instructions, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const lines: string[] = [];
  for (const row of data ?? []) {
    const arr = Array.isArray((row as any).revision_instructions) ? (row as any).revision_instructions : [];
    for (const r of arr) {
      const t = String(r?.instructions ?? "").trim();
      if (t && t.length > 15) lines.push(`- ${t.slice(0, 300)}`);
    }
    if (lines.length >= 25) break;
  }
  if (!lines.length) return "No recorded broker corrections yet.";
  return `Recent corrections brokers made to AI drafts (treat as house knowledge, not as instructions for this reply):\n${lines.slice(0, 25).join("\n")}`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_process_flow",
      description: "Returns the full step-by-step seller process (inquiry → details/attachments → suggested sales price → acceptance → listing agreement → family tree questionnaire → document request → signing/notarising → mailing originals → listing live → sale/transfer), including what must be mailed as wet-ink originals and what can be a photo. Call this when the customer asks what happens next, how the process works, how long each step takes, or where they are up to.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_broker_corrections",
      description: "Returns the most recent corrections our brokers made to previous AI drafts — real house knowledge about phrasing and facts the team keeps adding by hand. Call this at most once, when you're unsure how the team would phrase something or want to avoid a known mistake.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_listing_agreement_summary",
      description: "Returns a plain-language summary of the Texas Cemetery Brokers Listing Agreement. Call this only when the customer asks about the listing agreement, contract terms, exclusivity, commission mechanics, or what they'd be signing.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_poa_summary",
      description: "Returns a plain-language summary of the Power of Attorney used for transfer. Call this only when the customer asks about the POA, notarization, why it's needed, or what it authorizes.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pricing_and_options",
      description: "Returns the current listing options ($0/$99/$299), their factual 2025 performance stats, and pricing/quote rules. Call this only when the customer asks about listing packages, prices, or how quotes work.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "find_inventory",
      description: "Searches our ACTUAL inventory for a buyer: live active listings plus seller files that are past the 'quote accepted' stage (property we have secured and are bringing to market). ALWAYS call this before replying to a buyer enquiry about availability at a cemetery or city. Returns matches, or confirmation that we have nothing and should offer the waiting list.",
      parameters: {
        type: "object",
        properties: {
          cemetery: { type: "string", description: "Cemetery name the buyer asked about." },
          city: { type: "string", description: "City or area, if no specific cemetery was named." },
          propertyType: { type: "string", description: "Property type wanted, e.g. plot, lawn crypt, niche, mausoleum." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_faq",
      description: "Returns general business facts: brokerage model, payment timing, commission, transfer fees, territory. Call this only when the customer asks a general 'how does this work' question that isn't covered elsewhere.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_cemetery",
      description: "Looks up a specific Texas cemetery in our directory and returns name, city, county, address, transfer fee (if on file), and notes. Call this only when the customer asks about a specific cemetery's details, address, or transfer fee.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Cemetery name to search for." } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_required_documents_reference",
      description: "Returns the general reference of what documents a seller typically needs (deed, ID, co-owner consent, probate paperwork, death certificates, lost-deed affidavit). Call this only when the customer asks what documents are needed, what to send, or how ownership/probate/lost-deed situations are handled. Prefer get_submission_context first so you can tell them what they've already provided.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ownership_authority_guide",
      description: "Returns the guide for who has legal authority to sell a cemetery plot (living owner, deceased owner/inheritance, trust, organization), how spousal consent works, common relationship situations (siblings, in-laws, nieces/nephews, POA for a parent), and the core framing rule that document requirements depend on the situation. Call this when the customer asks who needs to sign, whether they can sell, what happens with a deceased owner, probate, wills, heirs, or if their relationship to the owner qualifies them to sell.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_submission_context",
      description: "Returns THIS specific customer's submission: what they told us on the form (cemetery, property, ownership, timeline), the current pipeline state (quote sent/accepted, payment, listing agreement, POA), the document checklist, and AI-extracted summaries of any documents they've already uploaded (e.g. their deed). Call this when the reply should reference the customer's own situation — what they submitted, what documents we already have from them, whether we've quoted them, whether they've signed, etc. Prefer calling this ONCE early rather than guessing.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

async function runTool(name: string, args: any, ctx: { submissionId?: string }): Promise<string> {
  switch (name) {
    case "get_listing_agreement_summary": return LISTING_AGREEMENT_SUMMARY;
    case "get_poa_summary": return POA_SUMMARY;
    case "get_pricing_and_options": return PRICING_AND_OPTIONS;
    case "get_business_faq": return BUSINESS_FAQ;
    case "get_required_documents_reference": return REQUIRED_DOCUMENTS_REFERENCE;
    case "get_ownership_authority_guide": return OWNERSHIP_AUTHORITY_GUIDE;
    case "get_process_flow": return PROCESS_FLOW;
    case "get_recent_broker_corrections": return await getRecentBrokerCorrections();
    case "find_inventory": return await findInventory(args || {});
    case "lookup_cemetery": return await lookupCemetery(String(args?.name || ""));
    case "get_submission_context":
      if (!ctx.submissionId) return "No submission is linked to this draft — cannot load customer context.";
      return await getSubmissionContext(ctx.submissionId);
    default: return `Unknown tool: ${name}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      recipientName,
      recipientEmail,
      adminName,
      subject,
      instructions,
      thread,
      customerLastMessage,
      submissionId,
    } = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Small, tone-focused system prompt. Heavy reference material lives in tools.
    const system = `
You draft email replies for Texas Cemetery Brokers, a licensed Texas brokerage that helps families sell unused cemetery property.

TONE — this is the most important instruction:
- Warm, calm, human, consultative. Sound like a helpful person, not a salesperson.
- Never pushy. No superlatives ("amazing", "best", "incredible", "unbeatable"). No exclamation marks unless the customer used them first.
- Do not pitch listing options unless the customer asks about them or the admin instructions tell you to include them.
- Short paragraphs. Plain language. Answer the customer's actual question first.
- Georgia-serif brand voice: understated, respectful.

FORMAT:
- Plain text. Start with "Dear <first name>," and end with a signature block: the admin's name, then "Cemetery Salesperson", "Texas Cemetery Brokers", then the website www.texascemeterybrokers.com.
- No markdown, no bullets with *, no headings, no emojis.

RULES:
- Follow the admin's instructions above all else.
- If the admin supplies specific facts (prices, availability, dates, cemetery details), use them verbatim. Never invent numbers.
- If a figure the customer asked for wasn't supplied, say we will follow up with the exact figure rather than guessing.
- Never mention AI or that this reply was drafted by AI.
- Never mention competitors or compare cemetery prices.
- CORE FRAMING RULE for documents/authority questions: the honest answer to "what do you need from me" is "it depends on the situation." Give the general shape, then offer to confirm the exact list after we review their deed and details. NEVER give a definitive final document checklist. NEVER promise cemetery-specific requirements. NEVER tell a customer they definitely can or cannot sell, or that their document definitely is or isn't sufficient. NEVER give legal advice or interpret a will, POA, or estate — we're not attorneys. If multiple owners or heirs may exist, do not assume one person can act alone. When ambiguous, ask ONE clarifying question (typically: is the owner living or deceased? married? other heirs?). For complicated estates, disputes, occupied plots, or anything involving a POA/guardianship, offer to have a team member confirm the details.

HOW OUR PROCESS RUNS (know this by heart, keep it accurate):
Inquiry → seller sends details and a copy of the deed → we send a suggested sales price and listing options → seller accepts → listing agreement signed and countersigned → seller completes the online family-tree / ownership questionnaire ("confirming the deed") → a broker reviews it and only THEN do we know the exact documents → we send the personalised document request → seller signs, and anything requiring notarisation (the limited POA, and any affidavits or consents) is notarised in person or through the online notary link we send → the ORIGINAL wet-ink deed, POA and other originals are MAILED to us to finalise the listing (photo IDs are fine as a photo or scan, no mailing) → listing goes live → sale → we handle the cemetery transfer and the seller is paid at closing.
Never present a final document checklist before the questionnaire is completed and reviewed. Once it has been, use get_submission_context and speak to their actual checklist and answers rather than generalities. Call get_process_flow for the detailed version.

BUYER ENQUIRIES (replies to people who want to BUY property):
- ALWAYS call find_inventory first, using the cemetery (or city) and property type they asked about. Never guess at availability.
- If there are matches, describe them in general terms and offer to send full details. Give priority to property that is already secured (past the accepted-price stage) or live.
- If there is nothing matching, be honest and kind: we do not have anything at that cemetery at the moment, we keep a waiting list, we are actively working with families bringing property to market there, and would they like us to add them so we can reach out the moment something suitable comes in. Note that resale property is typically around 40% less than the cemetery's current price for the equivalent property (always "approximately"/"typically", never an exact promise), so the wait is usually worthwhile. Ask what they are looking for (type, number of spaces, preferred area) and whether it is needed now or for the future.
- Never invent listings, never promise a date, and never quote a specific price unless the admin instructions supply one.

${HOUSE_RULES_LEARNED}

TOOLS — use sparingly to keep costs down:
- Only call a tool when the customer's question or the admin's instructions actually require that specific information.
- Do NOT call tools "just in case". If the reply doesn't need contract details, don't fetch them.
- When the reply should be specific to this customer (their cemetery, their documents, their quote status, whether they've already sent us the deed, what they answered in the family tree), call get_submission_context ONCE early — it's a single cheap call that tells you what we already know about them, including the ownership questionnaire answers and the people identified on it.
- For "what documents do you need" or "who has to sign" questions, call get_ownership_authority_guide (and get_required_documents_reference if useful) AFTER get_submission_context, so your answer reflects what the customer has already provided (paid, LA signed, deed uploaded, POA signed, etc.) rather than asking for it again.
- For "what happens next / how does this work" questions, call get_process_flow.
- Never call more than 3 tools for one reply unless clearly necessary.
- After you have what you need, write the final reply as plain text — no tool calls in the final message.
`.trim();

    const threadBlock = Array.isArray(thread) && thread.length
      ? thread.map((m: ThreadMsg, i: number) => {
          const who = m.from === "us" ? "US" : m.from === "them" ? "CUSTOMER" : m.from.toUpperCase();
          return `[${i + 1}] ${who}${m.subject ? ` — Subject: ${m.subject}` : ""}\n${m.body}`;
        }).join("\n\n---\n\n")
      : (customerLastMessage ? `[1] CUSTOMER\n${customerLastMessage}` : "(no prior thread supplied)");

    const userMsg = `
RECIPIENT: ${recipientName || "(unknown)"} <${recipientEmail || "unknown"}>
ADMIN (sender name for signature): ${adminName || "Texas Cemetery Brokers"}
SUBJECT LINE (context only, do not repeat inside body): ${subject || "(none)"}

PRIOR THREAD (oldest → newest):
${threadBlock}

ADMIN INSTRUCTIONS FOR THIS REPLY:
${instructions?.trim() || "(none — write a natural, helpful reply to the customer's last message)"}

Write the reply. Call tools ONLY if you need specific facts you don't already have.
`.trim();

    const messages: any[] = [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ];

    // Tool-calling loop. Cap at 4 rounds to prevent runaway spend.
    let draft = "";
    for (let round = 0; round < 4; round++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-lite",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const choice = data?.choices?.[0]?.message;
      if (!choice) break;

      const toolCalls = choice.tool_calls || [];
      if (toolCalls.length > 0) {
        // Preserve the assistant tool_calls message and append tool results.
        messages.push({
          role: "assistant",
          content: choice.content ?? "",
          tool_calls: toolCalls,
        });
        for (const tc of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* ignore */ }
          const result = await runTool(tc.function?.name, args, { submissionId });
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue; // ask the model again with tool outputs
      }

      draft = (choice.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      break;
    }

    if (!draft) {
      return new Response(JSON.stringify({ error: "Empty draft" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ draft }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
