import { supabase } from "@/integrations/supabase/client";
import { quoteFigures, normalizeBuyerFees } from "@/lib/quoteFigures";
import { emptyFields, canonicalDocument, type AgreementFields } from "../../supabase/functions/purchase-agreement/terms";

export * from "../../supabase/functions/purchase-agreement/terms";

export type PaStatus = "draft" | "sent" | "viewed" | "buyer_signed" | "countersigned" | "paid" | "void";

export const STATUS_LABEL: Record<PaStatus, string> = {
  draft: "Buyer matched — not sent",
  sent: "Sent to buyer",
  viewed: "Buyer opened it",
  buyer_signed: "Buyer signed — countersign",
  countersigned: "Awaiting payment",
  paid: "Paid",
  void: "Voided",
};

/** Sellers can be matched to a buyer once their paperwork is out (Docs out or later). */
export function sellerReadyForBuyer(s: { documents_requested_at?: string | null; documents_completed_at?: string | null; listing_number?: string | null; listing_live_at?: string | null; sold_at?: string | null; deleted_at?: string | null }) {
  return !s.sold_at && !s.deleted_at && (!!s.documents_requested_at || !!s.documents_completed_at || !!s.listing_number || !!s.listing_live_at);
}

/** How many spaces a buyer wants: explicit number, else 1. */
function wantSpaces(buyer: any) {
  const n = parseInt(String(buyer?.spaces ?? "").match(/\d+/)?.[0] ?? "", 10);
  return Number.isFinite(n) && n > 0 && n < 50 ? n : 0;
}

/**
 * Starting schedule for a match, using the same buyer pricing as quotes and the
 * buyer AI (quoteFigures). Staff can change every figure before sending.
 */
export function defaultFields(seller: any, buyer: any): AgreementFields {
  const f = emptyFields();
  const available = Math.max(1, Number(seller.plot_count) || parseInt(String(seller.spaces ?? ""), 10) || 1);
  const want = wantSpaces(buyer);
  const spaces = want && want < available ? want : available;
  f.purchaser = { ...f.purchaser, names: buyer.name ?? "", email: buyer.email ?? "", phone: buyer.phone ?? "" };
  f.property = {
    cemetery: seller.cemetery ?? "", city: seller.cemetery_city ?? "",
    description: [seller.section && `Section ${seller.section}`, seller.lawn && `Lawn/Garden ${seller.lawn}`, seller.lot && `Lot ${seller.lot}`, seller.plot_description].filter(Boolean).join(", "),
    spaces, property_type: seller.property_type ?? "", commodities: "",
  };
  f.deed.holder1 = buyer.name ?? "";
  f.charges = chargesForSpaces(seller, spaces);
  return f;
}

/** Buyer schedule for a given number of the seller's spaces (same quoteFigures basis as quotes and the buyer AI). */
export function chargesForSpaces(seller: any, spaces: number): AgreementFields["charges"] {
  const q = quoteFigures({
    quoteAmount: seller.quote_amount, acceptedAmount: seller.accepted_quote_amount, transferFee: seller.transfer_fee_amount,
    plotCount: Math.max(1, spaces), buyerFees: normalizeBuyerFees(seller.buyer_fees),
  });
  return {
    deposit: 0,
    balance: q.hasQuote ? q.buyerPriceTotal - q.transferFee - q.buyerFeesTotal : 0,
    transfer_fee: q.transferFee,
    adjustments: q.buyerFeesTotal,
    adjustments_note: q.buyerFees.map((x) => x.label).join(", "),
  };
}

export async function documentFingerprint(fields: AgreementFields, version?: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalDocument(fields, version)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function paCall<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("purchase-agreement", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const money = (v: number) => (Number(v) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const inviteEmailPreviewNote =
  "The buyer gets a branded email from info@texascemeterybrokers.com with a summary, a private signing link and what happens next. It's logged on their email thread.";

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Email-safe block for the composer: signing link, or payment link once countersigned. */
export function purchaseAgreementEmailBlock(opts: { url: string; cemetery: string; total: number; kind: "sign" | "pay" }) {
  const head = opts.kind === "sign" ? "Your purchase agreement" : "Complete your purchase";
  const body = opts.kind === "sign"
    ? `Your purchase agreement for <strong>${escHtml(opts.cemetery)}</strong> is ready to review and sign online. It takes about five minutes, and you'll receive a copy by email.`
    : `Your purchase agreement for <strong>${escHtml(opts.cemetery)}</strong> is fully signed. The total amount due is <strong>${money(opts.total)}</strong>, payable securely by card.`;
  const label = opts.kind === "sign" ? "Review &amp; sign your purchase agreement" : `Pay ${money(opts.total)} securely`;
  return `<div data-purchase-agreement="1" style="margin:18px 0;padding:18px 20px;border:1px solid #e6dccf;border-left:4px solid #4b7359;border-radius:8px;background:#f6f1ea;font-family:Georgia,serif;">
<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#4b7359;margin-bottom:6px;">${head}</div>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2d2a26;">${body}</p>
<a href="${escHtml(opts.url)}" style="display:inline-block;background:#4b7359;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:15px;">${label}</a>
</div>`;
}
