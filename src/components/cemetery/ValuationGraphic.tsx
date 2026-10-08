import { motion, useReducedMotion } from "framer-motion";

/** A data illustration, not a price chart: no invented currency scale. */
export default function ValuationGraphic() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 440 240" className="w-full max-w-md mx-auto" role="img" aria-label="Illustration of a resale estimate range">
      {[50, 100, 150, 200].map((y) => <path key={y} d={`M30 ${y}H410`} className="stroke-background/10" fill="none" />)}
      <motion.path d="M30 197 C80 190 85 172 126 169 S186 165 220 125 S285 148 320 95 S375 75 410 42 L410 95 C365 113 357 130 320 144 S263 183 220 167 S158 198 126 202 S70 211 30 215 Z" className="fill-valuation-teal/15" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1.2 }} />
      <motion.path d="M30 205 C80 200 85 183 126 184 S186 176 220 145 S285 164 320 119 S375 93 410 68" className="stroke-valuation-teal" strokeWidth="3" fill="none" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] }} />
      <motion.path d="M30 216 C85 212 95 204 135 203 S215 203 260 183 S335 184 410 154" className="stroke-valuation-coral" strokeWidth="2" strokeDasharray="5 5" fill="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 0.6, duration: 0.6 }} />
      <path d="M320 32V220" className="stroke-background/20" strokeDasharray="3 5" />
      <motion.circle cx="320" cy="119" r="10" className="fill-valuation-teal/20" animate={reduced ? {} : { r: [10, 18, 10] }} transition={{ duration: 3, repeat: Infinity }} />
      <circle cx="320" cy="119" r="5" className="fill-valuation-teal stroke-background" strokeWidth="2" />
      <text x="30" y="28" className="fill-background/60 text-[10px] font-body">RESALE VALUE</text>
      <text x="340" y="230" className="fill-background/40 text-[10px] font-body">ILLUSTRATION</text>
    </svg>
  );
}