// Cemetery Plot Quoting Tool — deterministic statistical model.
// Spec is authoritative; do not deviate from constants or formulas.

import Papa from "papaparse";

export const PROPERTY_TYPES = [
  "SINGLE_GRAVE",
  "MULTI_GRAVE",
  "SINGLE_LAWN_CRYPT",
  "DD_LAWN_CRYPT",
  "COMPANION_LAWN_CRYPT",
  "LAWN_CRYPT_OTHER",
  "SINGLE_NICHE",
  "COMPANION_NICHE",
  "MULTI_NICHE",
  "NICHE_OTHER",
  "SINGLE_MAUSOLEUM",
  "COMPANION_MAUSOLEUM",
  "TC_MAUSOLEUM",
  "MAUSOLEUM_OTHER",
  "URN_SPACE",
  "CRYPT_OTHER",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface SaleRow {
  cem_key: string;
  lawn_key: string;
  ptype_norm: PropertyType | string;
  retail_price: number;
  resale_price: number;
  resale_pct: number;
  year: number | null;
  sold_date: string | null;
}

const TIME_TREND_SLOPE = 0.0274;
const TIME_TREND_INTERCEPT = 0.4834;
const TIME_BASE_YEAR = 2015;
export const TARGET_YEAR = 2026;

const HALF_LIFE_YEARS = 2;
const RETAIL_LOG_SIGMA = 0.30;

const TIER_BAND_80: Record<number, number> = { 1: 0.104, 2: 0.116, 3: 0.122, 4: 0.178, 5: 0.250 };
const TIER_BIAS_PP: Record<number, number> = { 1: 0.052, 2: 0.053, 3: 0.055, 4: 0.033, 5: 0.000 };
const MIN_COMPS_PER_TIER = 3;

const trendAtYear = (y: number) => TIME_TREND_INTERCEPT + TIME_TREND_SLOPE * (y - TIME_BASE_YEAR);

let cachedRows: SaleRow[] | null = null;
let loadingPromise: Promise<SaleRow[]> | null = null;

export async function loadSales(): Promise<SaleRow[]> {
  if (cachedRows) return cachedRows;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const res = await fetch("/sales_for_app.csv");
    const text = await res.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const rows: SaleRow[] = parsed.data
      .map((r) => ({
        cem_key: (r.cem_key || "").toUpperCase().trim(),
        lawn_key: (r.lawn_key || "").toUpperCase().trim(),
        ptype_norm: (r.ptype_norm || "").toUpperCase().trim(),
        retail_price: Number(r.retail_price),
        resale_price: Number(r.resale_price),
        resale_pct: Number(r.resale_pct),
        year: r.year ? Number(r.year) : null,
        sold_date: r.sold_date || null,
      }))
      .filter((r) => r.cem_key && r.retail_price > 0 && r.resale_pct > 0);
    cachedRows = rows;
    return rows;
  })();
  return loadingPromise;
}

export function getCemeteryOptions(rows: SaleRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.cem_key))).sort();
}

export function getLawnOptions(rows: SaleRow[], cem: string): string[] {
  const c = cem.toUpperCase().trim();
  return Array.from(
    new Set(rows.filter((r) => r.cem_key === c).map((r) => r.lawn_key).filter(Boolean)),
  ).sort();
}

export interface QuoteInput {
  cem_key: string;
  lawn_key: string;
  ptype_norm: string;
  retail_price: number;
  quantity: number;
}

export interface CompResult {
  cem_key: string;
  lawn_key: string;
  ptype_norm: string;
  retail_price: number;
  resale_price: number;
  resale_pct: number;
  year: number | null;
  weight: number;
  adjustedPct: number;
}

export interface QuoteResult {
  refuse: boolean;
  reason?: string;
  tier?: number;
  tierLabel?: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
  predictedSalePct?: number;
  predictedSaleDollars?: number;
  lowerDollars?: number;
  upperDollars?: number;
  band?: number;
  effN?: number;
  nComps?: number;
  offers?: { aggressive: number; standard: number; generous: number };
  topComps?: CompResult[];
  rationale?: string;
}

const TIER_LABELS: Record<number, string> = {
  1: "Cemetery + lawn + plot type",
  2: "Cemetery + lawn",
  3: "Cemetery + plot type",
  4: "Cemetery only",
};

export function computeQuote(rows: SaleRow[], input: QuoteInput): QuoteResult {
  const cem = input.cem_key.toUpperCase().trim();
  const lawn = input.lawn_key.toUpperCase().trim();
  const pt = input.ptype_norm.toUpperCase().trim();

  const inCem = rows.filter((r) => r.cem_key === cem);
  if (inCem.length === 0) {
    return { refuse: true, reason: "No sales data exists for this cemetery." };
  }

  const tierFilters: Array<{ tier: number; rows: SaleRow[] }> = [
    { tier: 1, rows: inCem.filter((r) => r.lawn_key === lawn && r.ptype_norm === pt) },
    { tier: 2, rows: inCem.filter((r) => r.lawn_key === lawn) },
    { tier: 3, rows: inCem.filter((r) => r.ptype_norm === pt) },
    { tier: 4, rows: inCem },
  ];

  let selected: { tier: number; rows: SaleRow[] } | null = null;
  for (const t of tierFilters) {
    if (t.rows.length >= MIN_COMPS_PER_TIER) {
      selected = t;
      break;
    }
  }
  if (!selected) {
    return { refuse: true, reason: "No sales data exists for this cemetery." };
  }

  const trendTarget = trendAtYear(TARGET_YEAR);

  const enriched: CompResult[] = selected.rows.map((r) => {
    const compYear = r.year ?? TARGET_YEAR;
    const adjPct = r.resale_pct + (trendTarget - trendAtYear(compYear));
    const yearsAgo = TARGET_YEAR - compYear;
    const wRecency = Math.pow(0.5, yearsAgo / HALF_LIFE_YEARS);
    const logRatio = Math.log(input.retail_price / r.retail_price);
    const wRetail = Math.exp(-(logRatio * logRatio) / (2 * RETAIL_LOG_SIGMA * RETAIL_LOG_SIGMA));
    const weight = wRecency * wRetail;
    return {
      cem_key: r.cem_key,
      lawn_key: r.lawn_key,
      ptype_norm: r.ptype_norm,
      retail_price: r.retail_price,
      resale_price: r.resale_price,
      resale_pct: r.resale_pct,
      year: r.year,
      weight,
      adjustedPct: adjPct,
    };
  });

  const sumW = enriched.reduce((s, c) => s + c.weight, 0);
  const sumW2 = enriched.reduce((s, c) => s + c.weight * c.weight, 0);
  if (sumW <= 0) {
    return { refuse: true, reason: "Comparable weights collapsed to zero." };
  }
  const meanAdj = enriched.reduce((s, c) => s + c.weight * c.adjustedPct, 0) / sumW;
  const calibratedRaw = meanAdj + TIER_BIAS_PP[selected.tier];
  const calibrated = Math.min(1.5, Math.max(0.05, calibratedRaw));

  const band = TIER_BAND_80[selected.tier];
  const qty = Math.max(1, input.quantity || 1);
  const predictedSaleDollars = calibrated * input.retail_price * qty;
  const lowerDollars = Math.max(0.05, calibrated - band) * input.retail_price * qty;
  const upperDollars = Math.min(1.5, calibrated + band) * input.retail_price * qty;

  const effN = (sumW * sumW) / sumW2;

  let confidence: QuoteResult["confidence"];
  if (selected.tier === 1 && effN >= 5) confidence = "HIGH";
  else if (selected.tier <= 2 && effN >= 3) confidence = "HIGH";
  else if (selected.tier <= 2) confidence = "MEDIUM";
  else if (selected.tier === 3 && effN >= 5) confidence = "MEDIUM";
  else if (selected.tier === 3) confidence = "LOW";
  else if (effN >= 5) confidence = "LOW";
  else confidence = "VERY_LOW";

  const topComps = [...enriched].sort((a, b) => b.weight - a.weight).slice(0, 10);

  const rationale =
    `Engine matched at Tier ${selected.tier} (${TIER_LABELS[selected.tier]}) using ${selected.rows.length} comparable sales. ` +
    `The match group has a time-adjusted, bias-corrected mean resale ratio of ${(calibrated * 100).toFixed(1)}% of retail, ` +
    `with an empirical 80% confidence band of ±${(band * 100).toFixed(1)}%.`;

  return {
    refuse: false,
    tier: selected.tier,
    tierLabel: TIER_LABELS[selected.tier],
    confidence,
    predictedSalePct: calibrated,
    predictedSaleDollars,
    lowerDollars,
    upperDollars,
    band,
    effN,
    nComps: selected.rows.length,
    offers: {
      aggressive: predictedSaleDollars * 0.30,
      standard: predictedSaleDollars * 0.35,
      generous: predictedSaleDollars * 0.40,
    },
    topComps,
    rationale,
  };
}

export const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;
export const fmtPct = (p: number) => `${(p * 100).toFixed(1)}%`;
