import { motion, useReducedMotion } from "framer-motion";

/** A data illustration, not a price chart: no invented currency scale. */
export default function ValuationGraphic() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 440 240" className="w-full max-w-md mx-auto" role="img" aria-label="Illustration of a resale estimate range">
      {[80, 140, 200].map((y) => <path key={y} d={`M40 ${y}H400`} className="stroke-background/10" fill="none" />)}
      <motion.path d="M40 196 C180 196 210 65 400 65" className="stroke-valuation-teal" strokeWidth="3" strokeLinecap="round" fill="none" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] }} />
      <motion.path d="M40 208 C190 208 250 145 400 145" className="stroke-valuation-coral" strokeWidth="2" strokeLinecap="round" fill="none" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 1.8, ease: [0.22, 1, 0.36, 1] }} />
      <circle cx="400" cy="65" r="4" className="fill-valuation-teal" />
      <circle cx="400" cy="145" r="4" className="fill-valuation-coral" />
      <text x="220" y="28" textAnchor="middle" className="fill-background/60 text-[10px] font-body">RESALE POTENTIAL</text>
      <text x="220" y="234" textAnchor="middle" className="fill-background/40 text-[10px] font-body">ILLUSTRATIVE COMPARISON</text>
    </svg>
  );
}