import { buildAttachmentIndex } from "./submissionAttachments.ts";
import { hasSellerAttachments, sellerStage } from "./sellerPipeline.ts";

export function sellerQuoteBacklog(submissions: any[], profiles: any[], files: any[], documents: any[]): any[] {
  const attachments = buildAttachmentIndex(submissions, profiles, files, documents);
  const progressed = new Set(submissions.filter(s => !s.deleted_at && (s.la_signed_at || sellerStage(s, false) !== "no_attachments"))
    .map(s => String(s.email ?? "").trim().toLowerCase()).filter(Boolean));
  return submissions.filter(s => !s.deleted_at && !s.archived_at && !s.closed_at && !s.sold_at && !s.ai_paused_at
    && !/buyer|general|partner/i.test(String(s.customer_kind ?? ""))
    && !/buy_property_wizard|buy_inquiry|cemetery_page_buyer|preneed_guide_form/i.test(String(s.source ?? ""))
    && !progressed.has(String(s.email ?? "").trim().toLowerCase())
    && sellerStage(s, attachments.ids.has(s.id) || hasSellerAttachments(s, 0)) === "attachments")
    .sort((a,b) => a.created_at.localeCompare(b.created_at));
}