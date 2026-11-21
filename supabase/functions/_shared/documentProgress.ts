// Shared counting for "uploaded" versus "original at Glendale" on a seller's document request.
// A scan/upload is a copy; only a staff receipt log or the seller's own "I've posted it"
// tick counts toward Glendale (the seller tick is accepted for now, by owner instruction).
import { requiresPhysicalOriginal, physicalOriginalLogged } from "./originalDocumentReceipt.ts";

export type ProgressDoc = {
  doc_code?: string | null; document_type?: string | null; label?: string | null; person_name?: string | null;
  status?: string | null; manual_override?: string | null; required_state?: string | null;
  needs_notary?: boolean | null; file_url?: string | null; file_urls?: string[] | null;
};
export type ProgressContract = { kind?: string | null; status?: string | null; signed_at?: string | null; notarized_at?: string | null; signer?: string | null };
export type ProgressAnswers = { mailSkip?: string[]; mailOriginals?: Record<string, unknown>; mailedConfirmed?: Record<string, string> } | null | undefined;

const WAIVED = ["not_needed", "not_required", "waived"];
const norm = (v?: string | null) => String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");

export function documentProgress(docs: ProgressDoc[], sub: { la_signed_at?: string | null; ownership_answers?: ProgressAnswers }, contracts: ProgressContract[] = []) {
  const answers = sub.ownership_answers ?? {};
  const mailed = answers.mailedConfirmed ?? {};
  const poaDocs = docs.filter(d => d.doc_code === "D21");
  const items = docs.filter(d => !WAIVED.includes(String(d.manual_override ?? d.required_state ?? ""))).map(d => {
    const code = String(d.doc_code ?? "");
    const state = String(d.manual_override ?? d.required_state ?? d.status ?? "");
    const hasFile = !!d.file_url || !!(d.file_urls ?? []).length;
    const signedPoa = code === "D21" && contracts.some(c => c.kind === "poa" && (c.signed_at || c.notarized_at) && (!d.person_name || !c.signer || norm(c.signer) === norm(d.person_name)));
    const laSigned = code === "LA" && (!!sub.la_signed_at || contracts.some(c => c.kind === "listing_agreement" && !!c.signed_at));
    const uploaded = laSigned || hasFile || signedPoa || ["received", "completed"].includes(String(d.status)) || ["received", "notarized", "complete"].includes(state);
    const needsOriginal = !laSigned && requiresPhysicalOriginal(d, answers);
    const key = `${code}::${d.person_name ?? ""}`;
    const sellerPosted = !!mailed[key] || (code === "D21" && poaDocs.length === 1 && !!mailed["D21::"]);
    const staffLogged = physicalOriginalLogged(d);
    const atGlendale = needsOriginal ? staffLogged || sellerPosted : uploaded;
    return { label: d.label ?? d.document_type ?? code, code, person: d.person_name ?? null, uploaded, needsOriginal, atGlendale, staffLogged, sellerPosted: needsOriginal && sellerPosted && !staffLogged };
  });
  return {
    items,
    total: items.length,
    uploaded: items.filter(i => i.uploaded).length,
    atGlendale: items.filter(i => i.atGlendale).length,
    sellerPostedOnly: items.filter(i => i.sellerPosted).length,
  };
}
