// Server-complete Seller AI paperwork operations. These use the same canonical
// rules/diff as the Documents panel and the same generate-contract /
// send-document-packet functions as staff buttons.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  applyPacketPlanToAnswers, computedRequirements, contractLocked, contractNameOf,
  documentStates, jointMismatch, keyOf, mailFor, outstandingRequirements,
  planChecklistSync, preparedPoaFor, reqDbKey, sameCemetery, visibleRequirements,
  type Answers, type ContractRow, type DocRow, type PacketEditPlan,
} from "./paperworkCore.ts";
import { DOC_GUIDE, ORIGINALS_MAIL_ADDRESS, reqKey, type CemeteryDocRules, type Requirement } from "./ownershipRules.ts";
import { matchFilesToDocs, type CandidateFile } from "./matchFilesToDocs.ts";
import { requiresPhysicalOriginal } from "./originalDocumentReceipt.ts";

type Db = SupabaseClient<any, any, any>;
type Hooks = {
  actor: string;
  siteUrl: string;
  generate: (body: Record<string, unknown>) => Promise<Record<string, any>>;
  sendPacket: (body: Record<string, unknown>) => Promise<Record<string, any>>;
};
type Bundle = {
  sub: Record<string, any>;
  answers: Answers;
  rows: DocRow[];
  contracts: ContractRow[];
  rules: CemeteryDocRules | null;
  cemeteryName: string;
  cemeteryCity: string | null;
};

const DOCUMENT_COLS = "id,doc_code,person_name,label,status,required_state,manual_override,notes,file_url,file_urls,why,statute_ref,issued_by_us,needs_notary,person_role,sort_order";
const CONTRACT_COLS = "id,kind,principal_key,status,signature_name,fill_data,filled_pdf_path,sign_token,signed_at,notarized_at,completed_at,countersigned_at";
const error = (e: unknown, fallback: string) => { if (e) throw new Error(typeof e === "object" && e && "message" in e ? String((e as any).message) : fallback); };
const firstName = (sub: Record<string, any>) => String(sub.name ?? "").trim().split(/\s+/)[0] || "there";

export async function loadPaperwork(db: Db, submissionId: string): Promise<Bundle> {
  const [{ data: sub, error: se }, { data: rows, error: de }, { data: contracts, error: ce }] = await Promise.all([
    db.from("contact_submissions").select("*").eq("id", submissionId).maybeSingle(),
    db.from("submission_documents").select(DOCUMENT_COLS).eq("submission_id", submissionId).is("deleted_at", null),
    db.from("contracts").select(CONTRACT_COLS).eq("submission_id", submissionId).is("deleted_at", null),
  ]);
  error(se, "Seller could not be loaded"); error(de, "Checklist could not be loaded"); error(ce, "Prepared documents could not be loaded");
  if (!sub) throw new Error("Seller not found");
  let cemeteryName = String(sub.cemetery ?? "").trim(), cemeteryCity: string | null = null, rules: CemeteryDocRules | null = null;
  if (cemeteryName) {
    let { data: cem, error: ce2 } = await db.from("texas_cemeteries").select("name,doc_rules,city").ilike("name", cemeteryName).is("deleted_at", null).maybeSingle();
    error(ce2, "Cemetery rules could not be loaded");
    if (!cem) {
      const stem = cemeteryName.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/)[0];
      if (stem.length >= 4) {
        const { data: fuzzy, error: fe } = await db.from("texas_cemeteries").select("name,doc_rules,city").ilike("name", `%${stem}%`).is("deleted_at", null).limit(5);
        error(fe, "Cemetery rules could not be loaded");
        cem = (fuzzy ?? []).find((r: any) => r.doc_rules && Object.keys(r.doc_rules).length) ?? fuzzy?.[0] ?? null;
      }
    }
    cemeteryName = String(cem?.name ?? cemeteryName);
    cemeteryCity = cem?.city ?? null;
    rules = (cem?.doc_rules ?? null) as CemeteryDocRules | null;
  }
  return { sub, answers: (sub.ownership_answers ?? {}) as Answers, rows: (rows ?? []) as DocRow[], contracts: (contracts ?? []) as ContractRow[], rules, cemeteryName, cemeteryCity };
}

async function saveAnswers(db: Db, bundle: Bundle, next: Answers, expected: Answers = bundle.answers) {
  const people = (next.people ?? []).map((p) => !p.email?.trim() && bundle.sub.email && String(p.name ?? "").trim().toLowerCase() === String(bundle.sub.name ?? "").trim().toLowerCase()
    ? { ...p, email: bundle.sub.email } : p);
  const withEmails = { ...next, people };
  const { data, error: e } = await db.from("contact_submissions").update({ ownership_answers: withEmails, ownership_roster: people })
    .eq("id", bundle.sub.id).eq("ownership_answers", JSON.stringify(expected)).select("id").maybeSingle();
  if (e) throw new Error(e.message);
  if (!data) throw new Error("The family answers changed while this step was running. Review the newer answers before trying again.");
  bundle.answers = withEmails;
  bundle.sub.ownership_answers = withEmails;
}

async function rebuildUnsigned(db: Db, hooks: Hooks, submissionId: string, changes: { cemetery?: string; cemeteryCity?: string | null; plotDescription?: string }) {
  const { data: contracts, error: e } = await db.from("contracts").select(CONTRACT_COLS).eq("submission_id", submissionId).is("deleted_at", null).neq("status", "void");
  error(e, "Prepared documents could not be checked");
  let rebuilt = 0;
  for (const c of (contracts ?? []) as ContractRow[]) {
    if (contractLocked(c)) continue;
    const fill = (c.fill_data ?? {}) as Record<string, unknown>;
    const countyState = changes.cemeteryCity ? `${changes.cemeteryCity}, TX` : undefined;
    const unchanged = (!changes.cemetery || String(fill.cemetery ?? "").trim() === changes.cemetery.trim())
      && (changes.plotDescription === undefined || String(fill.plot_description ?? "").trim() === changes.plotDescription.trim())
      && (!countyState || String(fill.county_state ?? fill.county ?? "").trim() === countyState);
    if (unchanged) continue;
    await hooks.generate({ submission_id: submissionId, kind: c.kind, overrides: {
      ...fill, ...(changes.cemetery ? { cemetery: changes.cemetery } : {}),
      ...(countyState ? { county_state: countyState, county: countyState } : {}),
      ...(changes.plotDescription !== undefined ? { plot_description: changes.plotDescription } : {}),
      supersede_contract_id: c.id,
    } });
    rebuilt++;
  }
  return rebuilt;
}

async function reconcileCemetery(db: Db, hooks: Hooks, bundle: Bundle): Promise<boolean> {
  const current = bundle.cemeteryName.trim();
  if (!current) return false;
  const marker = String(bundle.answers.checklistCemetery ?? "");
  const drifted = bundle.contracts.filter((c) => {
    const was = String(c.fill_data?.cemetery ?? "").trim();
    return !!was && !sameCemetery(was, current);
  });
  const changed = drifted.some((c) => !contractLocked(c)) || (!!marker && !sameCemetery(marker, current));
  if (!changed) {
    if (!marker) await saveAnswers(db, bundle, { ...bundle.answers, checklistCemetery: current });
    return false;
  }
  for (const c of drifted) {
    if (contractLocked(c)) continue;
    try {
      await hooks.generate({ submission_id: bundle.sub.id, kind: c.kind, overrides: {
        ...(c.fill_data ?? {}), cemetery: current,
        ...(bundle.cemeteryCity ? { county_state: `${bundle.cemeteryCity}, TX`, county: `${bundle.cemeteryCity}, TX` } : {}),
        supersede_contract_id: c.id,
      } });
    } catch (e) {
      await db.from("contracts").update({ status: "void" }).eq("id", c.id).is("signed_at", null).is("notarized_at", null).is("completed_at", null);
      throw new Error(`A prepared document still had the old cemetery and could not be rebuilt: ${(e as Error).message}`);
    }
  }
  await saveAnswers(db, bundle, { ...bundle.answers, checklistCemetery: current });
  return true;
}

async function autoMatchFiles(db: Db, bundle: Bundle): Promise<number> {
  const candidates: CandidateFile[] = [];
  for (const f of Array.isArray(bundle.sub.seller_attachments) ? bundle.sub.seller_attachments : []) if (f?.path) candidates.push({ name: f.name ?? f.path, path: f.path });
  if (bundle.sub.customer_profile_id) {
    const { data: files, error: e } = await db.from("customer_files").select("file_name,file_path,extracted_summary").eq("customer_profile_id", bundle.sub.customer_profile_id).is("deleted_at", null);
    error(e, "Customer files could not be checked");
    for (const f of files ?? []) {
      const existing = candidates.find((c) => c.path === f.file_path);
      if (existing) existing.summary = f.extracted_summary ?? existing.summary;
      else candidates.push({ name: f.file_name, path: f.file_path, summary: f.extracted_summary });
    }
  }
  if (!candidates.length) return 0;
  const open = bundle.rows.filter((r) => {
    const state = String(r.manual_override ?? r.status ?? r.required_state ?? "").toLowerCase();
    const brokerDecided = !!r.manual_override && !["needed", "maybe"].includes(String(r.manual_override).toLowerCase());
    return !r.file_url && !(r.file_urls ?? []).length && !brokerDecided && !["received", "notarized", "complete", "not_needed", "not_required", "waived"].includes(state);
  });
  let closed = 0;
  for (const m of matchFilesToDocs(open, candidates)) {
    const row = open.find((r) => r.id === m.docId);
    if (!row) continue;
    const original = requiresPhysicalOriginal(row, bundle.answers);
    const reason = original ? `Copy already on file — “${m.file.name}”. The original is still needed by post.` : m.reason;
    const patch: Record<string, unknown> = { notes: [row.notes, reason].filter(Boolean).join(" · ") };
    if (!original) Object.assign(patch, { status: "received", required_state: "received", manual_override: "received" });
    const { error: e } = await db.from("submission_documents").update(patch).eq("id", row.id);
    if (e) throw new Error(e.message);
    if (!original) closed++;
  }
  return closed;
}

export async function syncPaperwork(db: Db, hooks: Hooks, submissionId: string, opts: { fromTree?: boolean } = {}) {
  const bundle = await loadPaperwork(db, submissionId);
  const cemeteryMoved = await reconcileCemetery(db, hooks, bundle);
  const fresh = await loadPaperwork(db, submissionId);
  const reqs = visibleRequirements({ answers: fresh.answers, rules: fresh.rules, rows: fresh.rows, requestedAt: fresh.sub.documents_requested_at, cemetery: fresh.cemeteryName, fromTree: opts.fromTree });
  if (!reqs.length) throw new Error("The family tree is not complete enough to build a document checklist.");
  const plan = planChecklistSync(submissionId, reqs, fresh.rows, cemeteryMoved);
  if (plan.inserts.length) {
    const { data: buried, error: be } = await db.from("submission_documents").select("id,doc_code,person_name").eq("submission_id", submissionId).not("deleted_at", "is", null);
    error(be, "Earlier checklist rows could not be checked");
    const buriedByKey = new Map((buried ?? []).filter((b) => b.doc_code).map((b) => [keyOf(b.doc_code, b.person_name), b.id]));
    const freshInserts: Record<string, unknown>[] = [];
    for (const ins of plan.inserts) {
      const id = buriedByKey.get(keyOf(ins.doc_code as string, ins.person_name as string | null));
      if (id) {
        const { error: e } = await db.from("submission_documents").update({ ...ins, deleted_at: null, deleted_by: null }).eq("id", id);
        if (e) throw new Error(e.message);
      } else freshInserts.push(ins);
    }
    if (freshInserts.length) {
      const { error: e } = await db.from("submission_documents").insert(freshInserts);
      if (e) throw new Error(e.message);
    }
  }
  for (const update of plan.updates) {
    const { error: e } = await db.from("submission_documents").update(update.patch).eq("id", update.id);
    if (e) throw new Error(e.message);
  }
  if (plan.staleIds.length) {
    const { error: e } = await db.from("submission_documents").update({ deleted_at: new Date().toISOString(), deleted_by: hooks.actor }).in("id", plan.staleIds).is("deleted_at", null);
    if (e) throw new Error(e.message);
  }
  // Empty is meaningful: removing the last POA retires every obsolete unsigned POA.
  const { data: poas, error: pe } = await db.from("contracts").select(CONTRACT_COLS).eq("submission_id", submissionId).eq("kind", "poa").neq("status", "void");
  error(pe, "Prepared POAs could not be checked");
  let voidedPoas = 0;
  for (const c of (poas ?? []) as ContractRow[]) {
    if (contractLocked(c)) continue;
    const names = [
      ...(Array.isArray(c.fill_data?.joint_names) ? c.fill_data.joint_names as string[] : []),
      ...String(c.fill_data?.seller_name ?? c.signature_name ?? c.principal_key ?? "").split(/\s*&\s*|\s+and\s+/i),
    ].map((n) => String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean)
      .map((n) => { const p = n.split(" "); return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0]; });
    if (names.length && names.some((n) => plan.wantedPoaPeople.has(n))) continue;
    const { error: e } = await db.from("contracts").update({ status: "void" }).eq("id", c.id).is("signed_at", null).is("notarized_at", null).is("completed_at", null);
    if (e) throw new Error(e.message);
    voidedPoas++;
  }
  const beforeAuto = await loadPaperwork(db, submissionId);
  const autoMatched = await autoMatchFiles(db, beforeAuto);
  return { items: reqs.length, inserted: plan.inserts.length, updated: plan.updates.length, retired: plan.staleIds.length, voidedPoas, autoMatched };
}

async function markIssued(db: Db, submissionId: string, r: Requirement) {
  const { data: rows, error: e } = await db.from("submission_documents").select("id").eq("submission_id", submissionId).eq("doc_code", r.code).is("deleted_at", null);
  error(e, "Checklist state could not be updated");
  const wanted = reqDbKey(r);
  for (const row of rows ?? []) {
    const { data: full } = await db.from("submission_documents").select("id,person_name").eq("id", row.id).maybeSingle();
    if (keyOf(r.code, full?.person_name) !== wanted) continue;
    const { error: updateError } = await db.from("submission_documents").update({ manual_override: "issued", required_state: "issued", status: "pending" }).eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
  }
}

export async function preparePaperwork(db: Db, hooks: Hooks, submissionId: string, opts: { listingAgreement?: boolean; fromTree?: boolean } = {}) {
  let bundle = await loadPaperwork(db, submissionId);
  const reqs = visibleRequirements({ answers: bundle.answers, rules: bundle.rules, rows: bundle.rows, requestedAt: bundle.sub.documents_requested_at, cemetery: bundle.cemeteryName, fromTree: opts.fromTree });
  const states = documentStates(reqs, bundle.rows, bundle.contracts, bundle.answers);
  const outstanding = new Set(outstandingRequirements(reqs, states).map(reqDbKey));
  const wanted = reqs.filter((r) => r.contractKind && (opts.listingAgreement ? r.contractKind === "listing_agreement" : ["poa", "affidavit_heirship"].includes(r.contractKind) && outstanding.has(reqDbKey(r))));
  const prepared: string[] = [];
  for (const r of wanted) {
    bundle = await loadPaperwork(db, submissionId);
    let existing: ContractRow | undefined;
    if (r.contractKind === "poa") {
      existing = preparedPoaFor(r, bundle.contracts);
      if (existing?.filled_pdf_path && !jointMismatch(r, bundle.contracts)) continue;
      if (existing && contractLocked(existing) && jointMismatch(r, bundle.contracts)) throw new Error(`${r.label} does not match an already-signed document; staff must check it.`);
    } else {
      existing = bundle.contracts.find((c) => c.kind === r.contractKind && c.status !== "void");
      if (existing?.filled_pdf_path) continue;
      if (existing && contractLocked(existing) && !existing.filled_pdf_path) throw new Error(`${r.label} is signed but its stored PDF is missing; staff must check it.`);
    }
    const result = await hooks.generate({ submission_id: submissionId, kind: r.contractKind, overrides: {
      ...(r.personName ? { seller_name: r.personName } : {}), ...(r.jointNames ? { joint_names: r.jointNames } : {}),
      ...(existing && !contractLocked(existing) ? { supersede_contract_id: existing.id } : {}),
    } });
    const id = result.contract_id ?? result.contract?.id;
    if (!id || !result.pdf_path) throw new Error(`${r.label} did not return a saved PDF.`);
    const { data: saved, error: e } = await db.from("contracts").select("id,filled_pdf_path,status").eq("id", id).eq("submission_id", submissionId).maybeSingle();
    if (e || !saved?.filled_pdf_path) throw new Error(`${r.label} could not be read back with its PDF. Nothing was emailed.`);
    await markIssued(db, submissionId, r);
    prepared.push(r.label);
  }
  return { prepared };
}

export async function buildPacket(db: Db, submissionId: string, siteUrl: string) {
  const bundle = await loadPaperwork(db, submissionId);
  const reqs = visibleRequirements({ answers: bundle.answers, rules: bundle.rules, rows: bundle.rows, requestedAt: bundle.sub.documents_requested_at, cemetery: bundle.cemeteryName });
  const states = documentStates(reqs, bundle.rows, bundle.contracts, bundle.answers);
  const outstanding = outstandingRequirements(reqs, states);
  const poas: { name: string | null; url: string | null; path: string | null }[] = [];
  for (const r of outstanding.filter((x) => x.contractKind === "poa")) {
    const c = preparedPoaFor(r, bundle.contracts);
    if (!c) throw new Error(`${r.label} has not been prepared. Nothing was sent.`);
    if (!c.filled_pdf_path) throw new Error(`${r.label} has no PDF yet. Nothing was sent.`);
    if (poas.some((p) => p.path === c.filled_pdf_path)) continue;
    poas.push({ name: c.signature_name ?? (c.fill_data?.seller_name as string | undefined) ?? r.jointNames?.join(" & ") ?? r.personName ?? null,
      url: c.sign_token ? `${siteUrl}/sign/${c.sign_token}` : null, path: c.filled_pdf_path });
  }
  const docs: { label: string; path: string }[] = [];
  for (const r of outstanding.filter((x) => x.contractKind && x.contractKind !== "poa")) {
    const c = bundle.contracts.find((x) => x.kind === r.contractKind && x.status !== "void");
    if (!c?.filled_pdf_path) throw new Error(`${r.label} has no prepared PDF. Nothing was sent.`);
    if (!docs.some((d) => d.path === c.filled_pdf_path)) docs.push({ label: r.label, path: c.filled_pdf_path });
  }
  const items = outstanding.map((r) => ({ code: r.code, label: r.label, why: r.why, what: DOC_GUIDE[r.code]?.what,
    how: DOC_GUIDE[r.code]?.how, person: r.personName ?? null, needsNotary: !!r.needsNotary,
    issuedByUs: !!r.issuedByUs, mailTo: mailFor(r, bundle.answers)?.address ?? null }));
  const poaRequirements = reqs.filter((r) => r.contractKind === "poa");
  return { bundle, outstanding, items, poas, docs,
    poaUrl: poas[0]?.url ?? null, poaFor: poas[0]?.name ?? null,
    poaMailTo: poaRequirements.length ? mailFor(poaRequirements[0], bundle.answers)?.address ?? null : ORIGINALS_MAIL_ADDRESS };
}

export async function sendPaperwork(db: Db, hooks: Hooks, submissionId: string, opts: { actionId: string; greeting?: string; note?: string }) {
  await syncPaperwork(db, hooks, submissionId);
  await preparePaperwork(db, hooks, submissionId);
  const packet = await buildPacket(db, submissionId, hooks.siteUrl);
  if (!packet.items.length) throw new Error("Nothing is outstanding on the checklist, so there is no request to send.");
  if (!packet.bundle.sub.email) throw new Error("This seller has no email address.");
  const greeting = String(opts.greeting ?? "").trim() || String(packet.bundle.answers.packetGreeting ?? "").trim() || firstName(packet.bundle.sub);
  const note = String(opts.note ?? "").trim();
  await saveAnswers(db, packet.bundle, { ...packet.bundle.answers, packetGreeting: greeting, packetEmailNote: note });
  const result = await hooks.sendPacket({ submission_id: submissionId, items: packet.items,
    packet_url: `${hooks.siteUrl}/documents?s=${submissionId}`, poas: packet.poas,
    docs: packet.docs, poa_url: packet.poaUrl, poa_for: packet.poaFor, poa_mail_to: packet.poaMailTo,
    greeting_name: greeting, note, sent_by_ai: true, action_id: opts.actionId });
  const { data: verify, error: ve } = await db.from("contact_submissions").select("documents_requested_at").eq("id", submissionId).maybeSingle();
  if (ve || !verify?.documents_requested_at) throw new Error("The email service did not confirm the document request. Check the mailbox before trying again.");
  if (result.email_id) {
    const { data: logged } = await db.from("email_messages").select("id").eq("gmail_message_id", result.email_id).eq("matched_submission_id", submissionId).maybeSingle();
    if (!logged) throw new Error("The request was sent but its email record could not be verified. Check the mailbox before trying again.");
  }
  return { items: packet.items.length, poas: packet.poas.length, docs: packet.docs.length, emailId: result.email_id ?? null };
}

async function voidPreparedFor(db: Db, submissionId: string, reqs: Requirement[]) {
  if (!reqs.length) return;
  const { data: contracts, error: e } = await db.from("contracts").select(CONTRACT_COLS).eq("submission_id", submissionId).neq("status", "void");
  error(e, "Prepared documents could not be checked");
  for (const r of reqs) {
    if (!r.contractKind) continue;
    const names = new Set([r.personName, ...(r.jointNames ?? [])].filter(Boolean).map((n) => String(n).toLowerCase()));
    for (const c of (contracts ?? []) as ContractRow[]) {
      if (c.kind !== r.contractKind || contractLocked(c)) continue;
      const signer = contractNameOf(c);
      if (!names.size || names.has(signer) || names.has(String(c.principal_key ?? "").toLowerCase())) {
        const { error: ve } = await db.from("contracts").update({ status: "void" }).eq("id", c.id).is("signed_at", null).is("notarized_at", null).is("completed_at", null);
        if (ve) throw new Error(ve.message);
      }
    }
  }
}

export async function applyPaperworkEdit(db: Db, hooks: Hooks, submissionId: string, plan: PacketEditPlan) {
  const bundle = await loadPaperwork(db, submissionId);
  const reqs = visibleRequirements({ answers: bundle.answers, rules: bundle.rules, rows: bundle.rows, requestedAt: bundle.sub.documents_requested_at, cemetery: bundle.cemeteryName });
  const newCemetery = String(plan.cemetery ?? "").trim();
  if (newCemetery && !sameCemetery(newCemetery, bundle.cemeteryName)) throw new Error("Use the separate cemetery-correction step first so the whole registry is checked before changing this request.");
  const applied = applyPacketPlanToAnswers(bundle.answers, reqs, plan, String(bundle.answers.packetGreeting ?? "").trim() || firstName(bundle.sub));
  if (applied.newPlot) {
    const { data: mislabeled, error: e } = await db.from("texas_cemeteries").select("name").ilike("name", applied.newPlot).is("deleted_at", null).limit(1);
    error(e, "The plot wording could not be checked");
    if (mislabeled?.length || /^(forest lawn hollywood hills|restland memorial park)$/i.test(applied.newPlot)) throw new Error(`“${applied.newPlot}” is a cemetery, not a lot or space.`);
  }
  if (applied.removing.length) {
    const ids = bundle.rows.filter((x) => applied.removing.some((r) => keyOf(x.doc_code, x.person_name) === reqDbKey(r))).map((x) => x.id);
    if (ids.length) {
      const { error: e } = await db.from("submission_documents").update({ deleted_at: new Date().toISOString(), deleted_by: hooks.actor }).in("id", ids).is("deleted_at", null);
      if (e) throw new Error(e.message);
    }
    await voidPreparedFor(db, submissionId, applied.removing);
  }
  const plotChanged = !!applied.newPlot && applied.newPlot !== String(bundle.sub.plot_description ?? "").trim();
  if (plotChanged) applied.next.autopilot = { ...(applied.next.autopilot ?? {}), plotDescription: applied.newPlot, plotDescriptionUpdatedAt: new Date().toISOString() };
  await saveAnswers(db, bundle, applied.next);
  let rebuilt = 0;
  if (plotChanged) {
    const { error: e } = await db.from("contact_submissions").update({ plot_description: applied.newPlot }).eq("id", submissionId);
    if (e) throw new Error(e.message);
    rebuilt = await rebuildUnsigned(db, hooks, submissionId, { plotDescription: applied.newPlot });
  }
  const sync = await syncPaperwork(db, hooks, submissionId, { fromTree: true });
  await preparePaperwork(db, hooks, submissionId, { fromTree: true });
  return { removed: applied.removing.map((r) => r.label), added: applied.added.map((r) => r.label), plotChanged, rebuilt, sync };
}

export async function prepareListingAgreement(db: Db, hooks: Hooks, submissionId: string) {
  const bundle = await loadPaperwork(db, submissionId);
  const existing = bundle.contracts.find((c) => c.kind === "listing_agreement" && c.status !== "void");
  if (existing) throw new Error("A listing agreement already exists on this record; it was not replaced.");
  const result = await hooks.generate({ submission_id: submissionId, kind: "listing_agreement", overrides: {} });
  if (!result.contract_id || !result.pdf_path) throw new Error("The listing agreement did not return a saved PDF.");
  const { data: saved } = await db.from("contracts").select("id,filled_pdf_path").eq("id", result.contract_id).eq("submission_id", submissionId).maybeSingle();
  if (!saved?.filled_pdf_path) throw new Error("The listing agreement PDF could not be read back.");
  return { contractId: result.contract_id as string };
}

export { computedRequirements };
