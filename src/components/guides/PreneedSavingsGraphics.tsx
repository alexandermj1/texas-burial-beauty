import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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

/* --------------------------------------- price appreciation vs buying today */

const CHART_SRC = "https://bayercemeterybrokers.com/cemetery-grave-plot-price-increases-market-trend-analysis/";

// geometry
const W = 720;
const Y0 = 306, Y1 = 44;            // plot height (price $0..$22k)
const MAXP = 22000;
const DEAL = 6500;                  // ~35% off today's $10k, paid over 24 months at 0%
const retailAt = (yr: number) => 10000 * Math.pow(2, yr / 7);

const makeGeom = (mobile: boolean) => {
  const X0 = mobile ? 92 : 58;      // room for the axis labels (larger on phones)
  const X1 = mobile ? 648 : 690;
  const px = (yr: number) => X0 + (yr / 7) * (X1 - X0);
  const py = (p: number) => Y0 - (p / MAXP) * (Y0 - Y1);
  const retailPath = Array.from({ length: 29 }, (_, i) => {
    const yr = (i / 28) * 7;
    return `${i === 0 ? "M" : "L"}${px(yr).toFixed(1)},${py(retailAt(yr)).toFixed(1)}`;
  }).join(" ");
  const payPath = `M${px(0)},${py(0)} L${px(2)},${py(DEAL)}`;
  const gapPath = `${retailPath} L${px(7)},${py(DEAL)} L${px(0)},${py(DEAL)} Z`;
  return { X0, X1, px, py, retailPath, payPath, gapPath, H: mobile ? 392 : 360 };
};
const GEOM_DESKTOP = makeGeom(false);
const GEOM_MOBILE = makeGeom(true);


export const PriceAppreciationChart = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const isMobile = useIsMobile();
  const { px, py, X0, X1, retailPath, payPath, gapPath, H } = isMobile ? GEOM_MOBILE : GEOM_DESKTOP;

  const retailFuture = useCountUp(20000, inView, 2200);
  const dealCount = useCountUp(DEAL, inView, 1600);
  const gapCount = useCountUp(20000 - DEAL, inView, 2400);

  // On phones the SVG is drawn at ~half scale, so text has to be roughly
  // double-size in user units to stay legible without horizontal scrolling.
  const fs = (n: number) => (isMobile ? n * 1.85 : n);
  const yearTicks = isMobile ? [0, 2, 4, 7] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div ref={ref} className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-accent/5 overflow-hidden">
      <div className="p-5 sm:p-7 md:p-9 border-b border-primary/10 flex items-start gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] sm:tracking-[0.28em] text-accent font-semibold mb-2">Prices only move one way</p>
          <p className="font-display text-xl sm:text-2xl md:text-3xl text-foreground leading-snug [text-wrap:balance]">A $10,000 space today is likely a $20,000 space within about seven years</p>
          <p className="text-sm sm:text-base text-foreground/75 leading-relaxed mt-2">
            Cemetery retail prices have historically doubled at roughly that pace.{" "}
            <a href={CHART_SRC} target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline decoration-primary/40 underline-offset-4 hover:decoration-primary inline-flex items-center gap-1 break-words">
              Read our market trend analysis on cemetery plot price increases <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </p>
        </div>
      </div>

      <div className="p-4 md:p-8">
        <div className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Line chart: cemetery retail price rising from $10,000 to about $20,000 over seven years, compared with a discounted by-owner price of about $6,500 paid over 24 months at zero interest">
          <defs>
            <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.22" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          {[0, 5500, 11000, 16500, 22000].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="hsl(var(--border))" strokeOpacity="0.7" strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? "" : "3 5"} />
              <text x={X0 - 10} y={py(v) + (isMobile ? 8 : 5)} textAnchor="end" fontSize={fs(13)} fill="hsl(var(--muted-foreground))">{v === 0 ? "$0" : `$${(v / 1000).toLocaleString()}k`}</text>
            </g>
          ))}
          {yearTicks.map((yr) => (
            <text key={yr} x={px(yr)} y={Y0 + (isMobile ? 34 : 24)} textAnchor="middle" fontSize={fs(13)} fill="hsl(var(--muted-foreground))">
              {yr === 0 ? "Today" : `Yr ${yr}`}
            </text>
          ))}


          {/* shaded gap between rising retail and your locked price */}
          <motion.path
            d={gapPath}
            fill="url(#gapFill)"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 2.5, duration: 1 }}
          />
          {/* gap bracket at year 7 */}
          <motion.g initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 2.9, duration: 0.5 }}>
            <line x1={px(7) + 14} x2={px(7) + 14} y1={py(20000)} y2={py(DEAL)} stroke="hsl(var(--accent))" strokeWidth="2" />
            <line x1={px(7) + 9} x2={px(7) + 19} y1={py(20000)} y2={py(20000)} stroke="hsl(var(--accent))" strokeWidth="2" />
            <line x1={px(7) + 9} x2={px(7) + 19} y1={py(DEAL)} y2={py(DEAL)} stroke="hsl(var(--accent))" strokeWidth="2" />
          </motion.g>

          {/* retail line */}
          <motion.path
            d={retailPath}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
          {/* end dot + label */}
          <motion.g initial={{ opacity: 0, scale: 0 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 2.2, duration: 0.4 }}>
            <circle cx={px(7)} cy={py(20000)} r="6.5" fill="hsl(var(--accent))" />
            <text x={px(7) - 12} y={py(20000) - (isMobile ? 22 : 16)} textAnchor="end" fontSize={fs(15)} fontWeight="700" fill="hsl(var(--accent))">
              ≈ ${retailFuture.toLocaleString()}{isMobile ? "" : " at-need"}
            </text>
          </motion.g>
          <motion.text x={px(0) + 8} y={py(10000) - (isMobile ? 14 : -24)} fontSize={fs(13.5)} fill="hsl(var(--muted-foreground))" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}>
            {isMobile ? "Retail today: $10,000" : "Cemetery retail today: $10,000"}
          </motion.text>

          {/* 0% payment line (first 24 months) */}
          <motion.path
            d={payPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.6, delay: 0.8, ease: "easeOut" }}
          />
          {/* flat dashed continuation of the deal price */}
          <motion.line
            x1={px(2)} x2={px(7)} y1={py(DEAL)} y2={py(DEAL)}
            stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="7 6" strokeOpacity="0.75"
            initial={{ opacity: 0 }} animate={inView ? { opacity: 0.75 } : {}} transition={{ delay: 2.3, duration: 0.6 }}
          />
          <motion.g initial={{ opacity: 0, scale: 0 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 1.9, duration: 0.4 }}>
            <circle cx={px(2)} cy={py(DEAL)} r="6.5" fill="hsl(var(--primary))" />
            <text x={isMobile ? X0 : px(2) + 12} y={py(DEAL) + (isMobile ? 62 : 24)} fontSize={fs(15)} fontWeight="700" fill="hsl(var(--primary))">
              You: ≈ ${dealCount.toLocaleString()}{isMobile ? " · 0% for 24 mo" : " · paid off by month 24 · $0 interest"}
            </text>
          </motion.g>
        </svg>
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs sm:text-sm text-foreground/70">
          <span className="inline-flex items-center gap-2"><span className="w-7 h-1 rounded bg-accent" /> Cemetery retail, compounding ≈10%/yr</span>
          <span className="inline-flex items-center gap-2"><span className="w-7 h-[4.5px] rounded bg-primary" /> Our by-owner price, ~35% off today, spread over 24 months at 0%</span>
          <span className="inline-flex items-center gap-2"><span className="w-4 h-3 rounded-sm bg-accent/20 border border-accent/30" /> The widening gap you avoid</span>
        </div>

        {/* gap callout */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 rounded-2xl bg-primary/10 border border-primary/20 p-5 md:p-6 flex flex-wrap items-center gap-4 justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-display text-3xl text-primary leading-none">${gapCount.toLocaleString()}</p>
              <p className="text-sm text-foreground/70 mt-1">the gap between buying preneed through us and paying at-need retail in seven years</p>
            </div>
          </div>
          <p className="text-xs text-foreground/60 max-w-[240px] leading-relaxed">
            Lock the discounted price now, pay it off interest-free — and the doubling curve works for you, not against you.
          </p>
        </motion.div>

        <p className="text-xs text-foreground/55 leading-relaxed mt-4">
          Illustrative projection based on historic cemetery retail increases; see our{" "}
          <a href={CHART_SRC} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 underline-offset-2">published market analysis</a>{" "}
          for the underlying data. Future prices are not guaranteed — but the direction of travel has been consistent for decades.
        </p>
      </div>
    </div>
  );
};
