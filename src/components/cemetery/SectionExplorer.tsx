import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BellRing, Camera } from "lucide-react";
import type { FlagshipCemetery, FlagshipSection, PriceTier } from "@/data/flagshipCemeteries";

const TIER: Record<PriceTier, { label: string; chip: string }> = {
  premium: { label: "Premium", chip: "border-[#a8442f]/30 bg-[#a8442f]/10 text-[#8c3826]" },
  standard: { label: "Mid-range", chip: "border-[#b79a4e]/35 bg-[#b79a4e]/12 text-[#8a7233]" },
  value: { label: "Best value", chip: "border-primary/30 bg-primary/10 text-primary" },
};

const KIND_FILTERS = ["All", "Ground", "Lawn crypt", "Mausoleum", "Niche", "Veteran"] as const;

/**
 * Garden / section explorer. Section names come from real deeds customers
 * have sent us, which is exactly the language buyers search with. Photo slots
 * are reserved so lawn-level photography can drop straight in.
 */
const SectionExplorer = ({ cemetery }: { cemetery: FlagshipCemetery }) => {
  const [filter, setFilter] = useState<(typeof KIND_FILTERS)[number]>("All");
  const [open, setOpen] = useState<string | null>(cemetery.sections[0]?.name ?? null);

  const shown: FlagshipSection[] =
    filter === "All" ? cemetery.sections : cemetery.sections.filter((s) => s.kind === filter);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-6 -mx-1 px-1">
        {KIND_FILTERS.filter((k) => k === "All" || cemetery.sections.some((s) => s.kind === k)).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              filter === k
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {shown.map((s, i) => {
          const isOpen = open === s.name;
          return (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
              className={`rounded-3xl border bg-card overflow-hidden transition-colors ${
                isOpen ? "border-primary/50" : "border-border hover:border-primary/30"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.name)}
                aria-expanded={isOpen}
                className="w-full text-left p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display text-lg md:text-xl text-foreground leading-tight">{s.name}</h3>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border ${TIER[s.tier].chip}`}>
                    {TIER[s.tier].label}
                  </span>
                </div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">{s.kind}</p>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 md:px-6 pb-6">
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.note}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4 rounded-2xl border border-dashed border-border p-3">
                        <Camera className="w-3.5 h-3.5 text-primary shrink-0" />
                        Lawn-level photography of this section is being added.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}&section=${encodeURIComponent(s.name)}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          <BellRing className="w-3.5 h-3.5" /> Alert me when this comes up
                        </Link>
                        <Link
                          to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}&section=${encodeURIComponent(s.name)}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-xs font-medium text-foreground hover:border-primary transition-colors"
                        >
                          I own here — value it <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionExplorer;
