// Runtime-neutral document-request rules used by both the staff Documents panel
// and Seller AI. No browser, React, Deno or database APIs belong in this file.
import {
  computeRequirements, mailsByDefault, reqKey, ORIGINALS_MAIL_ADDRESS,
  type CemeteryDocRules, type OwnershipAnswers, type RequiredState, type Requirement,
} from "./ownershipRules.ts";
import { physicalOriginalLogged, requiresPhysicalOriginal } from "./originalDocumentReceipt.ts";

export type Answers = OwnershipAnswers & Record<string, any>;
export type DocRow = {
  id: string;
  doc_code: string | null;
  person_name: string | null;
  label: string;
  status: string;
  required_state: string;
  manual_override: string | null;
  notes: string | null;
  file_url: string | null;
  file_urls?: string[] | null;
  why?: string | null;
  statute_ref?: string | null;
  issued_by_us?: boolean | null;
  needs_notary?: boolean | null;
  person_role?: string | null;
  sort_order?: number | null;
};
export type ContractRow = {
  id: string;
  kind: string;
  principal_key?: string | null;
  status: string;
  signature_name?: string | null;
  fill_data?: Record<string, unknown> | null;
  filled_pdf_path?: string | null;
  sign_token?: string | null;
  signed_at?: string | null;
  notarized_at?: string | null;
  completed_at?: string | null;
  countersigned_at?: string | null;
};

export const DONE_STATES = new Set(["received", "notarized", "complete", "not_needed", "not_required", "waived"]);
export const sameCemetery = (a?: string | null, b?: string | null) =>
  String(a ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  === String(b ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const personKey = (n?: string | null) => {
  const t = String(n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};
export const reqDbKey = (r: Pick<Requirement, "code" | "personName">) => `${r.code}::${personKey(r.personName)}`;
export const keyOf = (code?: string | null, person?: string | null) => `${code ?? ""}::${personKey(person)}`;

const DOC_FAMILIES: Array<[string, RegExp, RegExp]> = [
  ["photo_id", /^(D2|D2P)$/, /(photo\s*id|photo\s*identification|driver'?s?\s*licen|state\s*id|passport)/i],
  ["death_certificate", /^D6$/, /death\s*certificate/i],
  ["marriage_certificate", /^D5$/, /marriage\s*(certificate|licen)/i],
  ["poa", /^D21$/, /power\s*of\s*attorney/i],
];
const docFamily = (code?: string | null, label?: string | null): string | null => {
  const c = String(code ?? ""), l = String(label ?? "");
  for (const [family, codeRe, labelRe] of DOC_FAMILIES) if ((c && codeRe.test(c)) || (l && labelRe.test(l))) return family;
  return null;
};
export const isAdHoc = (code?: string | null) => /^X-/i.test(String(code ?? ""));
const rowPerson = (code?: string | null, person?: string | null, label?: string | null) => {
  const direct = personKey(person);
  if (direct) return direct;
  const m = String(label ?? "").match(/[-–—]\s*([^-–—]+)$/);
  return personKey(m?.[1] ?? "");
};
export const familyKey = (code?: string | null, person?: string | null, label?: string | null) => {
  const fam = docFamily(code, label);
  return fam ? `${fam}::${rowPerson(code, person, label)}` : null;
};

export function computedRequirements(answers: Answers, rules?: CemeteryDocRules | null): Requirement[] {
  const removed = new Set(answers.removedDocs ?? []);
  const acked = new Set(answers.acknowledgedWarnings ?? []);
  return computeRequirements(answers, rules)
    .filter((r) => !removed.has(reqKey(r)))
    .filter((r) => !((r.code === "REVIEW" || r.code === "NOTE") && acked.has(reqKey(r))));
}

/** The exact current/historical projection used by the staff Documents panel. */
export function visibleRequirements(opts: {
  answers: Answers;
  rules?: CemeteryDocRules | null;
  rows: DocRow[];
  requestedAt?: string | null;
  cemetery?: string | null;
  fromTree?: boolean;
}): Requirement[] {
  const computed = computedRequirements(opts.answers, opts.rules);
  const frozen = !!opts.requestedAt && opts.rows.some((r) => r.doc_code && r.doc_code !== "REVIEW");
  if (opts.fromTree || !frozen) return computed;
  const cemeteryChanged = !!opts.answers.checklistCemetery && !sameCemetery(String(opts.answers.checklistCemetery), opts.cemetery ?? "");
  const byKey = new Map(computed.map((r) => [reqDbKey(r), r]));
  const persisted = opts.rows
    .filter((r) => r.doc_code && r.doc_code !== "REVIEW" && !(cemeteryChanged && r.doc_code.startsWith("C-")))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((r) => {
      const match = byKey.get(keyOf(r.doc_code, r.person_name));
      return {
        ...(match ?? {}), code: r.doc_code as string, label: r.label,
        why: r.why ?? match?.why ?? "", statute: r.statute_ref ?? match?.statute,
        issuedByUs: r.issued_by_us ?? match?.issuedByUs,
        needsNotary: r.needs_notary ?? match?.needsNotary,
        personName: r.person_name ?? match?.personName,
        personRole: (r.person_role as Requirement["personRole"]) ?? match?.personRole,
      } as Requirement;
    });
  const have = new Set(persisted.map((r) => reqDbKey(r)));
  return [...persisted, ...computed.filter((r) => !have.has(reqDbKey(r)))];
}

export type ChecklistPlan = {
  inserts: Record<string, unknown>[];
  updates: { id: string; patch: Record<string, unknown> }[];
  staleIds: string[];
  wantedPoaPeople: Set<string>;
};

/** Pure diff behind the staff sync. It never resets progress, files or overrides. */
export function planChecklistSync(submissionId: string, reqs: Requirement[], live: DocRow[], cemeteryMoved: boolean): ChecklistPlan {
  const existing = new Map(live.filter((r) => r.doc_code).map((r) => [keyOf(r.doc_code, r.person_name), r]));
  const adHocByFamily = new Map<string, DocRow>();
  for (const r of live) {
    if (!isAdHoc(r.doc_code)) continue;
    const fk = familyKey(r.doc_code, r.person_name, r.label);
    if (fk && !adHocByFamily.has(fk)) adHocByFamily.set(fk, r);
  }
  const adopted = new Set<string>(), seen = new Set<string>();
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  reqs.forEach((r, i) => {
    const key = reqDbKey(r);
    if (seen.has(key)) return;
    seen.add(key);
    const fk = familyKey(r.code, r.personName, r.label);
    const twin = !existing.get(key) && fk ? adHocByFamily.get(fk) : undefined;
    if (twin) adopted.add(twin.id);
    const prev = existing.get(key) ?? twin;
    const base = {
      submission_id: submissionId, doc_code: r.code, person_name: r.personName ?? null,
      person_role: r.personRole ?? null, document_type: r.code, label: r.label,
      issued_by_us: !!r.issuedByUs, needs_notary: !!r.needsNotary, why: r.why,
      statute_ref: r.statute ?? null, sort_order: i,
    };
    if (prev) updates.push({ id: prev.id, patch: base });
    else inserts.push({ ...base, status: "pending", required_state: r.review ? "maybe" : "needed", manual_override: null });
  });
  const wanted = new Set(reqs.map(reqDbKey));
  const wantedFamilies = new Set(reqs.map((r) => familyKey(r.code, r.personName, r.label)).filter(Boolean) as string[]);
  const staleIds = live.filter((r) => {
    const key = keyOf(r.doc_code, r.person_name);
    if (adopted.has(r.id)) return false;
    const supersededGeneralId = r.doc_code === "D2" && reqs.some((x) => x.code === "D2P");
    const supersededPlaceholder = !!r.person_name
      && /^(owner on the deed|each co-owner|each heir|executor|trustee|authorised officer|person acting under authority)$/i.test(r.person_name)
      && reqs.some((x) => x.code === r.doc_code && x.personName && x.personName !== r.person_name);
    const fk = familyKey(r.doc_code, r.person_name, r.label);
    const duplicateAdHoc = isAdHoc(r.doc_code) && !!fk && wantedFamilies.has(fk);
    if (duplicateAdHoc) return !r.file_url && !(r.file_urls ?? []).length && r.status !== "received";
    const oldCemeteryForm = cemeteryMoved && /^C-/.test(r.doc_code ?? "");
    return !!r.doc_code && !wanted.has(key) && !r.file_url
      && (oldCemeteryForm || supersededGeneralId || supersededPlaceholder || (!r.manual_override && (r.status === "pending" || !r.status)));
  }).map((r) => r.id);
  const wantedPoaPeople = new Set(reqs.filter((r) => r.code === "D21")
    .flatMap((r) => [r.personName, ...(r.jointNames ?? [])]).filter(Boolean).map((n) => personKey(n as string)));
  return { inserts, updates, staleIds, wantedPoaPeople };
}

export const contractLocked = (c: ContractRow) => !!c.signed_at || !!c.notarized_at || !!c.completed_at
  || ["signed", "notarized", "completed"].includes(String(c.status));
export const contractNameOf = (c: ContractRow) => String(c.signature_name
  || (c.fill_data?.seller_name as string | undefined) || c.principal_key || "").toLowerCase();
export function preparedPoaFor(r: Requirement, contracts: ContractRow[]): ContractRow | undefined {
  const wanted = (r.jointNames?.join(" & ") ?? r.personName ?? "").toLowerCase();
  const list = contracts.filter((x) => x.kind === "poa" && x.status !== "void");
  return list.find((x) => contractNameOf(x) === wanted)
    ?? (wanted ? list.find((x) => contractNameOf(x).includes(wanted.split(" ")[0])) : list[0]);
}
export function jointMismatch(r: Requirement, contracts: ContractRow[]): boolean {
  if (!r.jointNames || r.jointNames.length < 2) return false;
  const c = preparedPoaFor(r, contracts);
  if (!c) return false;
  const name = contractNameOf(c);
  return !r.jointNames.every((n) => name.includes(n.trim().toLowerCase().split(" ")[0]));
}

/** Current seller-facing state: contracts and returned files outrank stale row labels. */
export function documentStates(requirements: Requirement[], rows: DocRow[], contracts: ContractRow[], answers: Answers): Record<string, RequiredState> {
  const m: Record<string, RequiredState> = {};
  const progress: RequiredState[] = ["not_needed", "maybe", "needed", "issued", "sent", "awaiting_seller", "received", "notarized", "complete"];
  const rank = (s?: RequiredState | null) => s ? progress.indexOf(s) : -1;
  const codeFor: Record<string, string> = { listing_agreement: "LA", poa: "D21", affidavit_heirship: "D12", spousal_consent: "D3" };
  const contractStates: Record<string, RequiredState> = {};
  for (const c of contracts) {
    if (c.status === "void") continue;
    let st: RequiredState | null = null;
    if (c.completed_at || c.countersigned_at || c.status === "completed") st = "complete";
    else if (c.notarized_at || c.status === "notarized") st = "notarized";
    else if (c.signed_at || c.status === "signed") st = "received";
    else if (["sent", "viewed"].includes(c.status)) st = "sent";
    else if (c.status === "draft" && c.sign_token) st = "issued";
    const code = codeFor[c.kind];
    if (!st || !code) continue;
    const people = requirements.filter((r) => r.code === "D21").map((r) => r.personName).filter(Boolean);
    const person = c.signature_name || (c.fill_data?.seller_name as string | undefined) || c.principal_key || (people.length === 1 ? people[0] : "");
    const key = code === "D21" ? `D21::${personKey(person)}` : `${code}::`;
    if (rank(st) > rank(contractStates[key])) contractStates[key] = st;
  }
  const fromContract = (code: string, person?: string | null): RequiredState | undefined => {
    const exact = contractStates[`${code}::${personKey(person)}`];
    if (exact) return exact;
    const tokens = String(person ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    let best: RequiredState | undefined;
    for (const [k, v] of Object.entries(contractStates)) {
      if (!k.startsWith(`${code}::`)) continue;
      const other = k.slice(code.length + 2).split(/\s+/).filter(Boolean);
      if (other.length && (other.every((t) => tokens.includes(t)) || tokens.every((t) => other.includes(t))) && rank(v) > rank(best)) best = v;
    }
    return best;
  };
  for (const r of requirements) {
    const key = reqDbKey(r);
    const row = rows.find((x) => keyOf(x.doc_code, x.person_name) === key);
    const override = (row?.manual_override as RequiredState | null) ?? null;
    if (override === "not_needed") { m[key] = "not_needed"; continue; }
    const held = !!row?.file_url || !!(row?.file_urls ?? []).length;
    let best: RequiredState = override ?? (row?.required_state as RequiredState | undefined) ?? (r.review ? "maybe" : "needed");
    const contract = fromContract(r.code, r.personName);
    if (rank(contract) > rank(best)) best = contract as RequiredState;
    const originalDoc = { doc_code: r.code, person_name: r.personName, needs_notary: r.needsNotary };
    if (requiresPhysicalOriginal(originalDoc, answers) && !physicalOriginalLogged(row ?? {})) best = "needed";
    else if (held && rank("received") > rank(best)) best = "received";
    if (best === "issued" || best === "sent") best = "needed";
    m[key] = best;
  }
  return m;
}

export function outstandingRequirements(requirements: Requirement[], states: Record<string, RequiredState>): Requirement[] {
  return requirements.filter((r) => {
    if (["REVIEW", "NOTE", "LA"].includes(r.code)) return false;
    const state = states[reqDbKey(r)] ?? (r.review ? "maybe" : "needed");
    return !["complete", "received", "notarized", "not_needed"].includes(state);
  });
}

export function mailFor(r: Requirement, answers: Answers): { address: string } | undefined {
  const explicit = answers.mailOriginals?.[reqKey(r)];
  if (explicit) return explicit;
  if (answers.mailSkip?.includes(reqKey(r))) return undefined;
  return mailsByDefault(r.code) ? { address: String(answers.originalsAddress ?? "").trim() || undefined } as { address: string } : undefined;
}
