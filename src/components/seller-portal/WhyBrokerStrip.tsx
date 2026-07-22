import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Clock, ShieldCheck, Sparkles, Handshake, Eye } from "lucide-react";

/**
 * A dynamic, editorial callout strip that rotates through the strongest
 * data-points for hiring a broker vs. classifieds. Used throughout the
 * seller portal to keep the "why bother?" answer visible while people
 * work through the form.
 */

const STATS = [
  {
    icon: Clock,
    eyebrow: "2025 average time to sale",
    figureBig: "1,152%",
    figureUnit: "faster",
    body:
      "Plots listed through Texas Cemetery Brokers sold 1,152% quicker than the same style plot marketed on Craigslist, eBay or classified sites in 2025.",
  },
  {
    icon: TrendingUp,
    eyebrow: "Average final sale price",
    figureBig: "+22%",
    figureUnit: "higher",
    body:
      "Sellers netted an average of 22% more per plot when we ran the sale — because we price against live cemetery inventory, not what a stranger guesses.",
  },
  {
    icon: Eye,
    eyebrow: "Buyer reach",
    figureBig: "3,400+",
    figureUnit: "qualified buyers",
    body:
      "Your listing goes into a live buyer network of families, funeral homes and cemetery relations offices — not a classifieds slush pile.",
  },
  {
    icon: Handshake,
    eyebrow: "Full service",
    figureBig: "0",
    figureUnit: "buyer calls for you",
    body:
      "We field every inquiry, screen every buyer, and coordinate the cemetery transfer end-to-end. You do nothing until we send the wire.",
  },
];

export const WhyBrokerStrip = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % STATS.length), 5200);
    return () => window.clearInterval(t);
  }, []);
  const active = STATS[idx];
  const Icon = active.icon;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/95 via-primary to-primary/80 text-primary-foreground shadow-soft">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "42px 42px, 60px 60px",
        }}
      />
      <div className="relative px-8 md:px-12 py-10 md:py-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <div className="flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-primary-foreground/70 mb-4">
            <Sparkles className="w-3 h-3" /> Why sellers work with us
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-[11px] tracking-[0.22em] uppercase text-primary-foreground/80 mb-3">
                {active.eyebrow}
              </div>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-display text-6xl md:text-7xl leading-none">
                  {active.figureBig}
                </span>
                <span className="font-display italic text-2xl md:text-3xl text-primary-foreground/80">
                  {active.figureUnit}
                </span>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-primary-foreground/85 max-w-xl">
                {active.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-1.5 mt-6">
            {STATS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Show stat ${i + 1}`}
                className={`h-[3px] rounded-full transition-all ${
                  i === idx ? "w-10 bg-primary-foreground" : "w-4 bg-primary-foreground/30 hover:bg-primary-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`icon-${idx}`}
            initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.85, rotate: 8 }}
            transition={{ duration: 0.5 }}
            className="hidden md:flex w-32 h-32 rounded-3xl bg-primary-foreground/10 border border-primary-foreground/20 items-center justify-center backdrop-blur-sm"
          >
            <Icon className="w-14 h-14" strokeWidth={1.25} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const PROMISES = [
  {
    icon: Eye,
    title: "We show every plot",
    body:
      "Interested buyer? We meet them at the cemetery, walk the section, and answer questions on your behalf. You never take a viewing call.",
  },
  {
    icon: Handshake,
    title: "We negotiate & qualify",
    body:
      "Every offer is vetted for funds and intent. We only surface real ones — no lowballs, no time-wasters.",
  },
  {
    icon: ShieldCheck,
    title: "We handle the cemetery paperwork",
    body:
      "Deed transfers, cemetery approvals, wire instructions — done by us, using the systems each Texas cemetery actually accepts.",
  },
];

export const FullServicePromise = () => (
  <div className="rounded-[24px] border border-border/60 bg-card/70 backdrop-blur-xl p-8 md:p-10">
    <div className="flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-primary mb-3">
      <ShieldCheck className="w-3 h-3" /> Fully hands-off from here
    </div>
    <h3 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-2">
      Finish this form and{" "}
      <em className="italic text-primary">you're done working</em>.
    </h3>
    <p className="text-sm text-muted-foreground max-w-2xl mb-8 leading-relaxed">
      A licensed broker takes over the moment you submit. We do everything on
      the sell-a-plot page — showings, buyer screening, cemetery transfers —
      so you don't have to think about it again until we send you the funds.
    </p>
    <div className="grid md:grid-cols-3 gap-5">
      {PROMISES.map((p) => {
        const Icon = p.icon;
        return (
          <div
            key={p.title}
            className="group relative rounded-2xl border border-border/60 bg-background/60 p-5 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
            </div>
            <div className="font-display text-lg text-foreground mb-1.5 leading-tight">
              {p.title}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {p.body}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const InlineStatBadge = ({
  figure,
  label,
}: {
  figure: string;
  label: string;
}) => (
  <div className="inline-flex items-baseline gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5">
    <span className="font-display text-base text-primary">{figure}</span>
    <span className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">
      {label}
    </span>
  </div>
);

export default WhyBrokerStrip;
