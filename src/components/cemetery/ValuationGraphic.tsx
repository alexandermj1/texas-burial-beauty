import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

/** A data illustration, not a price chart: no invented currency scale. */
export default function ValuationGraphic({ broker, privateSale }: { broker?: number; privateSale?: number }) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const hasEstimate = broker !== undefined && privateSale !== undefined;
  const privateWidth = hasEstimate && broker > 0 ? Math.min(100, privateSale / broker * 100) : 70;
  return (
    <div className={`valuation-art relative isolate w-full overflow-hidden rounded-xl my-6 ${hasEstimate ? "valuation-art-result" : ""}`}>
      <div className="valuation-tiles absolute inset-0 grid grid-cols-5" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => <div key={i} className={`valuation-tile valuation-tile-${i % 5}`} />)}
      </div>
      {hasEstimate ? <div className="relative z-10 px-6 py-7 text-left space-y-6">
        <div><p className="text-sm font-medium text-foreground mb-3">Broker resale</p><motion.div className="valuation-value-bar h-5 rounded-full" initial={{ width: reduced ? "100%" : "0%" }} animate={{ width: "100%" }} transition={{ duration: reduced ? 0 : 1.2 }} /></div>
        <div><p className="text-sm font-medium text-foreground mb-3">Private resale</p><motion.div className="valuation-private-bar h-5 rounded-full" initial={{ width: reduced ? `${privateWidth}%` : "0%" }} animate={{ width: `${privateWidth}%` }} transition={{ duration: reduced ? 0 : 1.4, delay: reduced ? 0 : 0.15 }} /></div>
      </div> : <svg viewBox="0 0 800 360" className="relative z-10 w-full h-full" role="img" aria-label="Illustrative resale comparison, not a forecast: broker and private sale">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" className="valuation-area-top" /><stop offset="100%" className="valuation-area-bottom" /></linearGradient>
        </defs>
        {[100, 180, 260].map(y => <path key={y} d={`M45 ${y} H755`} className="stroke-primary/10" strokeWidth="1" fill="none" />)}
        <motion.path d="M45 290 C180 290 240 270 335 210 S550 80 755 65 L755 320 H45 Z" fill={`url(#${id}-fill)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1.5 }} />
        <motion.path d="M45 290 C180 290 240 270 335 210 S550 80 755 65" className="stroke-primary" strokeWidth="7" strokeLinecap="round" fill="none" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 2, ease: [0.22, 1, 0.36, 1] }} />
        <motion.path d="M45 300 C240 300 290 280 420 260 S610 205 755 195" className="stroke-foreground/65" strokeWidth="5" strokeLinecap="round" fill="none" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 2.4, ease: [0.22, 1, 0.36, 1] }} />
        <circle cx="755" cy="65" r="9" className="fill-primary stroke-background" strokeWidth="4" />
        <circle cx="755" cy="195" r="7" className="fill-foreground stroke-background" strokeWidth="3" />
        {!reduced && <circle r="6" className="fill-background stroke-primary" strokeWidth="3"><animateMotion dur="6s" repeatCount="indefinite" path="M45 290 C180 290 240 270 335 210 S550 80 755 65" /></circle>}
      </svg>}
      {!hasEstimate && <p className="absolute bottom-3 inset-x-0 text-center text-xs text-foreground/60">Illustrative comparison · not a price forecast</p>}
    </div>
  );
}