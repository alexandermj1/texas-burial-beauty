// Single source of truth for how a seller's quote is expressed.
//
// Storage convention (do not change without migrating data):
//   contact_submissions.quote_amount / accepted_quote_amount
//     = the authorized minimum sales price PER SPACE, EXCLUDING the transfer fee.
//   contact_submissions.transfer_fee_amount
//     = the cemetery's transfer fee, charged ONCE for the whole transfer.
//   contact_submissions.cemetery_retail  = retail PER PLOT.
//   contact_submissions.list_price       = our resale price ACROSS ALL PLOTS.
//
// The sales-price email (buildListingOptionsBlock) shows the headline figure
// INCLUSIVE of the transfer fee: per space = net + fee, all spaces = net x count + fee.
// Every other screen and follow-up email must quote the same two numbers so a
// seller never sees two different prices for the same property.

export type QuoteFigures = {
  plotCount: number;
  /** Authorized minimum per space, excluding the transfer fee (the stored number). */
  netPerSpace: number;
  /** Transfer fee, charged once for the whole transfer. */
  transferFee: number;
  /** Headline per-space figure as quoted to the seller (net + fee). */
  perSpaceInclFee: number;
  /** Headline all-spaces figure as quoted to the seller (net x count + fee). */
  totalInclFee: number;
  /** Net across all spaces, excluding the transfer fee. */
  netTotal: number;
  hasQuote: boolean;
  /** Exactly how the sales-price email words it. */
  headline: string;
  /** Extra one-time fees the office added to the buyer's price. */
  buyerFees: { id: string; label: string; amount: number }[];
  buyerFeesTotal: number;
  /** 15% buyer's premium on the authorized price. */
  buyerPremiumPerSpace: number;
  buyerPremiumTotal: number;
  /** What the buyer pays per space (authorized + transfer fee + 15%). */
  buyerPricePerSpace: number;
  /** Full buyer price for all spaces including added fees. */
  buyerPriceTotal: number;
};

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Buyer's premium charged on top of the seller's authorized price. */
export const BUYER_FEE_RATE = 0.15;

export type BuyerFee = { id: string; label: string; amount: number };

/** One-click fees the office can add on top of the buyer's price. */
export const BUYER_FEE_PRESETS: BuyerFee[] = [
  { id: "plot_showing", label: "Plot showing fee", amount: 1000 },
  { id: "mortuary", label: "Mortuary fee", amount: 750 },
  { id: "deed_recording", label: "Deed transfer & recording", amount: 350 },
  { id: "document_prep", label: "Document preparation", amount: 195 },
  { id: "escrow", label: "Escrow & closing", amount: 350 },
  { id: "notary", label: "Mobile notary", amount: 150 },
  { id: "rush", label: "Rush transfer", amount: 500 },
  { id: "marketing", label: "Marketing & advertising", amount: 295 },
];

export function normalizeBuyerFees(raw: unknown): BuyerFee[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f: any, i: number) => ({
      id: String(f?.id || `fee_${i}`),
      label: String(f?.label || "Fee"),
      amount: Math.max(0, Number(f?.amount) || 0),
    }))
    .filter((f) => f.amount > 0);
}

export function quoteFigures(input: {
  quoteAmount?: number | null;
  acceptedAmount?: number | null;
  transferFee?: number | null;
  plotCount?: number | null;
  /** Extra one-time fees added to the buyer's price. */
  buyerFees?: BuyerFee[] | null;
}): QuoteFigures {
  const plotCount = Math.max(1, Number(input.plotCount) || 1);
  const accepted = Number(input.acceptedAmount) || 0;
  const quoted = Number(input.quoteAmount) || 0;
  const netPerSpace = accepted > 0 ? accepted : quoted > 0 ? quoted : 0;
  const transferFee = Math.max(0, Number(input.transferFee) || 0);
  const hasQuote = netPerSpace > 0;
  const perSpaceInclFee = hasQuote ? netPerSpace + transferFee : 0;
  const netTotal = netPerSpace * plotCount;
  const totalInclFee = hasQuote ? netTotal + transferFee : 0;

  let headline = "No sales price recorded";
  if (hasQuote) {
    const feeNote = transferFee > 0
      ? ` (includes the cemetery's ${money(transferFee)} transfer fee, charged once${plotCount > 1 ? " for the whole transfer, not per space" : ""})`
      : "";
    headline = plotCount > 1
      ? `${money(perSpaceInclFee)} per space · ${money(totalInclFee)} across all ${plotCount} spaces${feeNote}`
      : `${money(perSpaceInclFee)}${feeNote}`;
  }

  const buyerFees = normalizeBuyerFees(input.buyerFees);
  const buyerFeesTotal = buyerFees.reduce((sum, f) => sum + f.amount, 0);
  const buyerPremiumPerSpace = hasQuote ? Math.round(netPerSpace * BUYER_FEE_RATE) : 0;
  const buyerPremiumTotal = hasQuote ? Math.round(netTotal * BUYER_FEE_RATE) : 0;
  const buyerPricePerSpace = hasQuote ? perSpaceInclFee + buyerPremiumPerSpace : 0;
  const buyerPriceTotal = hasQuote ? totalInclFee + buyerPremiumTotal + buyerFeesTotal : 0;

  return {
    plotCount, netPerSpace, transferFee, perSpaceInclFee, totalInclFee, netTotal, hasQuote, headline,
    buyerFees, buyerFeesTotal, buyerPremiumPerSpace, buyerPremiumTotal, buyerPricePerSpace, buyerPriceTotal,
  };
}
