import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import burialImg from "@/assets/property-types/single-plot.png";
import nicheImg from "@/assets/property-types/cremation-niche.png";
import cryptImg from "@/assets/property-types/mausoleum.png";
import estateImg from "@/assets/property-types/family-estate.png";

const types = [
  { name: "Burial plots", image: burialImg },
  { name: "Cremation niches", image: nicheImg },
  { name: "Crypts & mausoleums", image: cryptImg },
  { name: "Family estates", image: estateImg },
];

export default function ListingPropertyCycle() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % types.length), 4500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, paused]);
  const type = types[index];
  return (
    <div className="flex items-center gap-3 mt-5 lg:mt-7" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="We list burial plots, cremation niches, crypts, mausoleums and family estates">
      <div className="relative h-20 w-20 shrink-0" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.img key={type.name} src={type.image} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.65 }} className="absolute inset-0 w-full h-full object-contain" />
        </AnimatePresence>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1">Every property type welcome</p>
        <div className="h-10 flex items-start" aria-hidden>
          <AnimatePresence mode="wait">
            <motion.p key={type.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="font-display text-lg text-primary leading-tight">{type.name}</motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}