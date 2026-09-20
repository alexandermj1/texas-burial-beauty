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

/** Buyer's premium charged on top of the seller's authorized price.
 *  Basis: the purchase price EXCLUDING the cemetery's transfer fee — the same
 *  basis as clause 4.1 of the listing agreement ("15% of the purchase price"),
 *  with the transfer fee treated as a separate buyer-paid cemetery charge. */
export const BUYER_FEE_RATE = 0.15;

/** Default quote as a share of cemetery retail, before the ceiling below. */
export const TARGET_QUOTE_PCT_OF_RETAIL = 0.55;

/** Hard ceiling: what the buyer pays per space — authorized price + transfer
 *  fee + the 15% premium — may never exceed this share of cemetery retail.
 *  On low-value plots a flat transfer fee would otherwise push an ordinary
 *  55% quote up to ~70%+ of retail once everything is added back in. */
export const MAX_BUYER_PCT_OF_RETAIL = 0.70;

/** Buyer's total per space for a given authorized (net) price, excluding any
 *  optional add-on fees. */
export const buyerPriceFromNet = (netPerSpace: number, transferFee: number) =>
  netPerSpace + Math.max(0, transferFee) + netPerSpace * BUYER_FEE_RATE;

/** Highest authorized price per space that keeps the buyer's total at or under
 *  MAX_BUYER_PCT_OF_RETAIL of retail. Returns Infinity when retail is unknown. */
export function maxNetPerSpace(retailPerPlot: number, transferFee: number): number {
  const retail = Number(retailPerPlot) || 0;
  if (retail <= 0) return Infinity;
  const fee = Math.max(0, Number(transferFee) || 0);
  return Math.max(0, (MAX_BUYER_PCT_OF_RETAIL * retail - fee) / (1 + BUYER_FEE_RATE));
}

/** The suggested authorized price per space: 55% of retail, lowered whenever
 *  the transfer fee and premium would push the buyer past the 70% ceiling.
 *  Rounded DOWN to $100 so rounding can never breach the ceiling. */
export function suggestedNetPerSpace(retailPerPlot: number, transferFee: number): number {
  const retail = Number(retailPerPlot) || 0;
  if (retail <= 0) return 0;
  const capped = Math.min(retail * TARGET_QUOTE_PCT_OF_RETAIL, maxNetPerSpace(retail, transferFee));
  return Math.max(0, Math.floor(capped / 100) * 100);
}

/** True when a manually typed price breaks the ceiling. */
export function exceedsBuyerCeiling(netPerSpace: number, retailPerPlot: number, transferFee: number): boolean {
  const retail = Number(retailPerPlot) || 0;
  if (retail <= 0 || !(Number(netPerSpace) > 0)) return false;
  return buyerPriceFromNet(Number(netPerSpace), Number(transferFee) || 0) > MAX_BUYER_PCT_OF_RETAIL * retail + 0.5;
}

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
