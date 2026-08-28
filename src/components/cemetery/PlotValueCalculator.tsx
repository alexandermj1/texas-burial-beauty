import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, Minus, Plus, TrendingDown, Receipt } from "lucide-react";
import type { FlagshipCemetery } from "@/data/flagshipCemeteries";
import { money } from "@/data/flagshipCemeteries";

/**
 * Interactive savings / valuation estimator for a single cemetery.
 * Buyers see retail vs resale and what they would save; owners see an
 * estimated resale range for the same property. Everything is presented as a
 * range — never a specific asking price for a live listing.
 */
const PlotValueCalculator = ({ cemetery }: { cemetery: FlagshipCemetery }) => {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [typeIdx, setTypeIdx] = useState(0);
  const [spaces, setSpaces] = useState(2);

  const row = cemetery.pricing[typeIdx] ?? cemetery.pricing[0];

  const result = useMemo(() => {
    const retailLo = row.retail[0] * spaces;
    const retailHi = row.retail[1] * spaces;
    const resaleLo = row.resale[0] * spaces;
    const resaleHi = row.resale[1] * spaces;
    const saveLo = retailLo - resaleHi;
    const saveHi = retailHi - resaleLo;
    const pct = Math.round((1 - (resaleLo + resaleHi) / (retailLo + retailHi)) * 100);
    return { retailLo, retailHi, resaleLo, resaleHi, saveLo, saveHi, pct };
  }, [row, spaces]);

  const barPct = Math.max(18, 100 - result.pct);

  return (
    <div className="rounded-[28px] border border-border bg-[hsl(40_36%_97%)] overflow-hidden">
      {/* Header */}
      <div className="px-6 md:px-10 pt-9 md:pt-11 pb-7 border-b border-border/60">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-8 bg-primary/60" />
          <p className="text-[10px] tracking-[0.34em] uppercase text-primary font-medium">
            {cemetery.city} value estimator
          </p>
        </div>
        <h3 className="font-display text-[30px] md:text-[46px] text-foreground leading-[1.04] max-w-2xl">
          What is a space at {cemetery.name} worth?
        </h3>

        <div className="mt-7 inline-flex gap-7 border-b border-border/70">
          {(["buy", "sell"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`pb-3 -mb-px text-[11px] tracking-[0.22em] uppercase transition-colors border-b ${
                mode === m
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {m === "buy" ? "I'm buying" : "I'm selling"}
            </button>
          ))}
        </div>
      </div>


      <div className="p-6 md:p-8 grid lg:grid-cols-[1fr_1fr] gap-8">
        {/* Inputs */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Property type</p>
          <div className="flex flex-wrap gap-2 mb-7">
            {cemetery.pricing.map((p, i) => (
              <button
                key={p.type}
                type="button"
                onClick={() => setTypeIdx(i)}
                aria-pressed={i === typeIdx}
                className={`px-4 py-2.5 rounded-full text-sm border transition-all ${
                  i === typeIdx
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {p.type}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-3">How many spaces?</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSpaces((s) => Math.max(1, s - 1))}
              aria-label="Fewer spaces"
              className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-display text-4xl text-foreground w-14 text-center tabular-nums">{spaces}</span>
            <button
              type="button"
              onClick={() => setSpaces((s) => Math.min(12, s + 1))}
              aria-label="More spaces"
              className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-7 flex items-start gap-2.5 rounded-2xl bg-muted/50 border border-border/60 p-4">
            <Receipt className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {cemetery.name} records a transfer fee of{" "}
              <strong className="text-foreground">{money(cemetery.transferFee)} per space</strong> —{" "}
              {money(cemetery.transferFee * spaces)} for {spaces} {spaces === 1 ? "space" : "spaces"}. Paid to the
              cemetery to record the deed change, confirmed in writing before anyone commits.
            </p>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-3xl bg-foreground text-background p-6 md:p-7 flex flex-col">
          {mode === "buy" ? (
            <>
              <p className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium mb-4">
                Estimated cemetery retail
              </p>
              <p className="font-display text-2xl md:text-3xl mb-1 line-through decoration-primary/60 decoration-2 opacity-70">
                {money(result.retailLo)} – {money(result.retailHi)}
              </p>

              <p className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium mt-6 mb-2">
                Typical resale through us
              </p>
              <p className="font-display text-3xl md:text-[42px] leading-none mb-5">
                {money(result.resaleLo)} – {money(result.resaleHi)}
              </p>

              <div className="h-2 rounded-full bg-background/15 overflow-hidden mb-3">
                <motion.div
                  key={`${typeIdx}-${spaces}`}
                  initial={{ width: "100%" }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
              <p className="text-sm text-background/75 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Roughly {money(Math.max(0, result.saveLo))} – {money(Math.max(0, result.saveHi))} saved (~{result.pct}%)
              </p>

              <Link
                to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}&spaces=${spaces}`}
                className="mt-auto pt-7 inline-flex items-center justify-between gap-3 group"
              >
                <span className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-full text-sm font-medium w-full justify-center group-hover:opacity-90 transition-opacity">
                  Show me available spaces <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </>
          ) : (
            <>
              <p className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium mb-4">
                Estimated resale value of your {spaces === 1 ? "space" : `${spaces} spaces`}
              </p>
              <p className="font-display text-3xl md:text-[42px] leading-none mb-4">
                {money(result.resaleLo)} – {money(result.resaleHi)}
              </p>
              <p className="text-sm text-background/75 leading-relaxed mb-5">
                Based on what comparable {row.type.toLowerCase()} property at {cemetery.name} has been trading for.
                Garden, section and location move this number meaningfully — a broker confirms it against the deed.
              </p>
              <ul className="space-y-2.5 text-sm text-background/80">
                {["No upfront cost to be valued", "We market, screen buyers and take payment safely", "We file the cemetery's transfer paperwork"].map(
                  (l) => (
                    <li key={l} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {l}
                    </li>
                  ),
                )}
              </ul>
              <Link to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`} className="mt-auto pt-7 block">
                <span className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-full text-sm font-medium w-full justify-center hover:opacity-90 transition-opacity">
                  Get my free valuation <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="px-6 md:px-8 pb-6 text-[11px] text-muted-foreground leading-relaxed">
        Figures are estimated ranges for {cemetery.name} based on our own transaction history and current cemetery
        pricing, not an offer or an appraisal. Exact numbers depend on the garden, section and location of the specific
        property.
      </p>
    </div>
  );
};

export default PlotValueCalculator;
