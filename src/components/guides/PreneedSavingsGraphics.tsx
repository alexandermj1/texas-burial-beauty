import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TrendingDown, PiggyBank, CalendarClock, Tag, TrendingUp, ExternalLink } from "lucide-react";

/* ---------------------------------------------------------------- helpers */

function useCountUp(target: number, inView: boolean, duration = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return n;
}

const money = (n: number) => `$${n.toLocaleString()}`;

/* ------------------------------------------------- discount comparison bars */

const rows = [
  { type: "Single burial plot", retailLow: 4500, retailHigh: 14000, saveLow: 30, saveHigh: 50 },
  { type: "Companion / double space", retailLow: 8000, retailHigh: 26000, saveLow: 30, saveHigh: 50 },
  { type: "Lawn crypt", retailLow: 9000, retailHigh: 24000, saveLow: 30, saveHigh: 45 },
  { type: "Mausoleum crypt", retailLow: 12000, retailHigh: 40000, saveLow: 25, saveHigh: 50 },
  { type: "Cremation niche", retailLow: 2500, retailHigh: 9000, saveLow: 25, saveHigh: 45 },
];

export const DiscountTable = () => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-accent/5 overflow-hidden">
      <div className="p-7 md:p-9 border-b border-primary/10 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.6)]">
          <Tag className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-2">The discount, by property type</p>
          <p className="font-display text-2xl md:text-3xl text-foreground leading-snug">Resale spaces run up to 50% below cemetery retail</p>
          <p className="text-foreground/75 leading-relaxed mt-2">
            Wide ranges, because every cemetery and section prices differently. The point is the gap — the same space, in the same garden, bought from an owner rather than from the price list.
          </p>
        </div>
      </div>

      <div className="divide-y divide-primary/10">
        {rows.map((r, i) => {
          const width = 100 - (r.saveLow + r.saveHigh) / 2;
          return (
            <motion.div
              key={r.type}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="p-5 md:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="font-display text-lg text-foreground">{r.type}</p>
                <span className="text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
                  Typically {r.saveLow}–{r.saveHigh}% off
                </span>
              </div>

              {/* retail bar */}
              <div className="relative h-9 rounded-xl bg-muted/40 overflow-hidden mb-1.5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-xl bg-foreground/10"
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: "easeOut" }}
                />
                <div className="absolute inset-y-0 left-0 flex items-center px-3.5">
                  <span className="text-xs text-foreground/70">
                    Cemetery retail range <span className="font-medium text-foreground">{money(r.retailLow)}–{money(r.retailHigh)}</span>
                  </span>
                </div>
              </div>

              {/* resale bar */}
              <div className="relative h-9 rounded-xl bg-primary/5 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-xl bg-primary/25"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${width}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 0.35 + i * 0.08, ease: "easeOut" }}
                />
                <div className="absolute inset-y-0 left-0 flex items-center px-3.5">
                  <span className="text-xs text-primary font-semibold">Typical by-owner resale price</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="px-6 md:px-9 py-5 text-xs text-foreground/55 leading-relaxed border-t border-primary/10">
        Illustrative ranges only, based on what we see across Dallas–Fort Worth, Houston, Austin and San Antonio. Actual pricing depends on the cemetery, the section and what is included — we quote the real figure in writing, including the cemetery's own fees.
      </p>
    </div>
  );
};

/* ------------------------------------------------------ financing illustration */

export const FinancingGraphic = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const retail = 12000;
  const discounted = 6600; // ~45% off
  const monthly = Math.round(discounted / 24);

  const savedCount = useCountUp(retail - discounted, inView);
  const monthlyCount = useCountUp(monthly, inView, 1400);

  const bars = [
    { label: "Cemetery retail, paid at need", value: retail, tone: "bg-foreground/15", text: "text-foreground/70" },
    { label: "Our by-owner price, preneed", value: discounted, tone: "bg-primary/30", text: "text-primary" },
  ];

  return (
    <div ref={ref} className="grid md:grid-cols-[1.15fr,1fr] gap-5">
      {/* bars */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingDown className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold">A worked example</p>
        </div>

        <div className="space-y-5">
          {bars.map((b, i) => (
            <div key={b.label}>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm text-foreground/75">{b.label}</p>
                <p className={`font-display text-xl ${b.text}`}>{money(b.value)}</p>
              </div>
              <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${b.tone}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(b.value / retail) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 0.2 + i * 0.2, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-7 pt-6 border-t border-border/60 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-display text-3xl text-accent leading-none">{money(savedCount)}</p>
            <p className="text-sm text-foreground/70 mt-1">kept in the family on a single space in this example</p>
          </div>
        </motion.div>
      </div>

      {/* financing */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/5 p-6 md:p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <CalendarClock className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold">0% preneed financing</p>
        </div>

        <p className="font-display text-2xl text-foreground leading-snug mb-2">Spread it over 24 months. No interest.</p>
        <p className="text-foreground/75 leading-relaxed text-sm mb-6">
          Where we can offer it, a preneed plan runs interest-free for up to two years — so the discounted price is also the total price. Nothing added, ever.
        </p>

        <div className="rounded-2xl bg-background/70 border border-border/60 p-5 mb-5">
          <p className="text-xs text-foreground/60 mb-1">In the example above, that works out at roughly</p>
          <p className="font-display text-4xl text-primary leading-none">
            {money(monthlyCount)}<span className="text-lg text-foreground/60"> / month</span>
          </p>
          <p className="text-xs text-foreground/60 mt-2">for 24 months · $0 interest · property transfers once settled</p>
        </div>

        {/* 24 month ticks */}
        <div className="mt-auto">
          <div className="flex gap-[3px]">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scaleY: 0.3 }}
                whileInView={{ opacity: 1, scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.03 }}
                className="flex-1 h-7 rounded-[3px] bg-primary/25 origin-bottom"
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-foreground/50 mt-2">
            <span>Month 1</span>
            <span>Month 24</span>
          </div>
        </div>
      </div>
    </div>
  );
};
