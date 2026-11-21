import { buyerInventoryPricing } from "./buyerInventoryPricing";
import { BUYER_FEE_RATE } from "./quoteFigures";
import { buyerDocumentReadiness, countBuyerDocuments } from "../../supabase/functions/buyer-agent/documentReadiness";
import { resolveBuyerCemetery } from "../../supabase/functions/_shared/cemeteryMatching";
import { documentProgress, type ProgressContract, type ProgressDoc } from "../../supabase/functions/_shared/documentProgress";

export type SheetDocument = ProgressDoc & { submission_id: string };
export type SheetContract = ProgressContract & { submission_id: string };
export type SheetCemetery = { name: string; city?: string | null; region?: string | null; transfer_fee?: number | null };
export type SheetRecord = Record<string, any> & {
  id: string;
  quote_response?: string | null;
  la_signed_at?: string | null;
  documents_requested_at?: string | null;
  documents_completed_at?: string | null;
  ownership_answers?: { sellerConfirmedAt?: string | null } | null;
};
export type PaperworkState = "complete" | "pending" | "review" | "not_requested";
const buyerSources = new Set(["buy_property_wizard", "buy_inquiry", "cemetery_page_buyer", "preneed_guide_form", "buyer"]);

export function sheetEligible(s: SheetRecord) {
  const buyer = s.customer_kind === "buyer" || (!["seller", "partner"].includes(s.customer_kind) && buyerSources.has(s.source));
  return !buyer && !s.deleted_at && !s.archived_at && !!(s.quote_response === "accepted" || s.la_signed_at || s.listing_live_at || s.documents_completed_at || s.contracts_completed_at);
}

export function sheetPaperwork(s: SheetRecord, docs: SheetDocument[], contracts: SheetContract[] = []) {
  const count = countBuyerDocuments(docs);
  const progress = documentProgress(docs, s as any, contracts);
  const readiness = buyerDocumentReadiness(s, count);
  const pending = docs.filter(d => !["received", "completed"].includes(String(d.status)));
  const poa = docs.some(d => d.doc_code === "D21" || d.document_type === "D21" || /poa|power.of.attorney/i.test(`${d.doc_code || ""} ${d.document_type || ""}`));
  const conflicts: string[] = [];
  if (readiness.complete && pending.length) conflicts.push("Completion milestone conflicts with outstanding checklist items.");
  if (readiness.complete && (!count.paperwork || !poa)) conflicts.push("Completion needs a transfer-paperwork checklist with POA evidence; a deed alone is not enough.");
  // The pipeline's staff-confirmed completion is authoritative for the row colour.
  // Keep checklist discrepancies visible without undoing that recorded decision.
  const staffComplete = !!s.documents_completed_at;
  // Green = staff-confirmed, or every requested item is at Glendale (staff receipt, or the seller's "I've posted it" tick).
  const allAtGlendale = progress.total > 0 && progress.atGlendale >= progress.total && !!count.paperwork && poa;
  const state: PaperworkState = staffComplete ? "complete" : conflicts.length ? "review" : allAtGlendale ? "complete" : readiness.requested || progress.uploaded > 0 || count.received > 0 ? "pending" : "not_requested";
  const outstanding = progress.items.filter(i => !i.atGlendale);
  return { state, staffComplete, allAtGlendale, progress, outstanding, count, pending, conflicts, aiReadiness: readiness.complete ? "Available now (AI milestone/checklist)" : readiness.almostComplete ? "About 2 weeks (staff check)" : s.la_signed_at ? "About a month for preneed (staff check)" : "Timing to confirm" };
}

export function buildSheetRow(s: SheetRecord, docs: SheetDocument[], directory: SheetCemetery[], now = Date.now(), contracts: SheetContract[] = []) {
  const cemetery = resolveBuyerCemetery(s.cemetery, directory, s.cemetery_city);
  const pricing = buyerInventoryPricing(s, cemetery?.transfer_fee ?? null);
  const f = pricing.together;
  const retail = Number(s.cemetery_retail) > 0 ? Number(s.cemetery_retail) : null;
  const paperwork = sheetPaperwork(s, docs, contracts);
  const active = !s.closed_at && !s.sold_at;
  const reserved = active && !!s.reserved_until && Date.parse(s.reserved_until) > now;
  const issues = [...paperwork.conflicts];
  if (!cemetery) issues.push("Cemetery identity / metro needs confirmation; Buyer AI may not resolve this record.");
  if (!pricing.count) issues.push("Space count is not confirmed; no all-space total calculated.");
  if (!pricing.single.hasQuote) issues.push("No authorized sale price recorded.");
  if (pricing.transferFee === null) issues.push("Transfer fee is unknown; buyer total needs confirmation.");
  if (!retail) issues.push("Retail price missing; Buyer AI cannot quote a verified savings comparison.");
  if (cemetery?.transfer_fee != null && s.transfer_fee_amount != null && Number(cemetery.transfer_fee) !== Number(s.transfer_fee_amount)) issues.push("Directory transfer fee differs from the saved quote; buyer totals use the directory fee, as Buyer AI does.");
  if (paperwork.allAtGlendale && !s.documents_completed_at) issues.push("Every item is at Glendale (or posted by the seller) but the completion milestone is not recorded.");
  if (paperwork.staffComplete && paperwork.progress.total > paperwork.progress.atGlendale) issues.push(`Staff marked complete, but ${paperwork.progress.total - paperwork.progress.atGlendale} item(s) are not logged at Glendale yet.`);
  const agreementEligible = !!(s.la_signed_at || s.quote_response === "accepted");
  if (!agreementEligible) issues.push("Progress evidence exists but acceptance / signed agreement is missing; not Buyer AI eligible.");
  const priceReady = pricing.ready && !!f;
  const sellerCommission = f?.hasQuote ? Math.round(f.netTotal * BUYER_FEE_RATE) : null;
  const buyerCommission = priceReady ? f.buyerPremiumTotal : null;
  const adjustmentFee = priceReady ? f.adjustmentFee : null;
  const adjustmentPerSpace = pricing.ready ? pricing.single.adjustmentFee : null;
  const profit = sellerCommission !== null && buyerCommission !== null && adjustmentFee !== null ? sellerCommission + buyerCommission + adjustmentFee : null;
  const buyerEach = pricing.ready ? pricing.single.buyerPriceTotal : null;
  const buyerTotal = priceReady ? f.buyerPriceTotal : null;
  const pctRetail = retail && buyerEach !== null ? buyerEach / retail * 100 : null;
  const pctRetailBundle = retail && pricing.count && buyerTotal !== null ? buyerTotal / (retail * pricing.count) * 100 : null;
  const status = s.sold_at ? "Sold" : s.closed_at ? "Closed" : reserved ? "Reserved" : s.listing_live_at ? "Listed" : s.la_signed_at ? "Agreement signed" : "Accepted";
  const stage = s.pipeline_stage_override || (s.sold_at ? "Sold" : s.closed_at ? "Closed" : s.listing_live_at ? "Listed" : s.contracts_completed_at ? "File compiled" : s.documents_completed_at ? "Docs complete" : s.documents_requested_at ? "Docs requested" : s.la_signed_at ? "Agreement signed" : "Quote accepted");
  return {
    id: s.id, seller: s.name || "Unknown", cemetery: s.cemetery || "—", city: s.cemetery_city || cemetery?.city || "", metro: cemetery?.region || "Unassigned",
    location: [s.lawn, s.section, s.space_numbers].filter(Boolean).join(" · "), propertyType: s.property_type || "", plots: pricing.count,
    netPerSpace: pricing.single.hasQuote ? pricing.single.netPerSpace : null, transferFee: pricing.transferFee, savedTransferFee: s.transfer_fee_amount,
    sellerTotal: f?.hasQuote ? f.netTotal : null, sellerProceeds: f?.hasQuote && sellerCommission !== null ? f.netTotal - sellerCommission : null,
    buyerPerSpace: buyerEach, buyerTotal, buyerCommission, sellerCommission, profit, adjustmentFee, adjustmentPerSpace, extraFees: pricing.single.buyerFeesTotal - pricing.single.adjustmentFee, retail, pctRetail, pctRetailBundle,
    acceptedAt: s.quote_responded_at || null, status, stage, listingNumber: s.listing_number || "", paperwork, docsReceived: paperwork.progress.uploaded, docsTotal: paperwork.progress.total, docsAtGlendale: paperwork.progress.atGlendale, docsSellerPosted: paperwork.progress.sellerPostedOnly,
    documentState: paperwork.state, issues, active, reserved, aiEligible: active && !reserved && agreementEligible && !!cemetery && pricing.ready && !!retail && !!pricing.count,
    pricing,
  };
}
export type SheetRow = ReturnType<typeof buildSheetRow>;