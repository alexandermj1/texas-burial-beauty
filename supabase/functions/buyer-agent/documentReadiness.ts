type SellerMilestones = {
  documents_completed_at?: string | null;
  documents_requested_at?: string | null;
  quote_response?: string | null;
  la_signed_at?: string | null;
  ownership_answers?: { sellerConfirmedAt?: string | null } | null;
};
export type BuyerDocumentCount = { total: number; received: number; paperwork: number };

/** An intake deed is not a completed ownership/transfer paperwork packet. */
export function countBuyerDocuments(rows: { status?: string | null; doc_code?: string | null; document_type?: string | null }[]): BuyerDocumentCount {
  return rows.reduce((count, row) => {
    count.total++;
    if (["received", "completed"].includes(String(row.status))) count.received++;
    const deed = row.doc_code === "D1" || /\bdeed\b/i.test(String(row.document_type ?? ""));
    if (!deed) count.paperwork++;
    return count;
  }, { total: 0, received: 0, paperwork: 0 });
}

export function buyerDocumentReadiness(s: SellerMilestones, count?: BuyerDocumentCount) {
  // Paperwork can only be "out" once the seller accepted a quote (or signed) AND finished the family tree.
  // Placeholder/intake rows on an untouched inquiry must never count as a document request.
  const engaged = (s.quote_response === "accepted" || !!s.la_signed_at) && !!s.ownership_answers?.sellerConfirmedAt;
  const requested = !!s.documents_requested_at || (engaged && !!count?.paperwork);
  const complete = !!s.documents_completed_at || (requested && !!count?.total && count.received >= count.total);
  const almostComplete = requested && !!count?.total && count.received / count.total >= 0.75;
  return { requested: requested || complete, complete, almostComplete };
}