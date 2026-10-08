import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search, Minus, Plus, Clock, ShieldCheck, Sparkles, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Range = { low: number; mid: number; high: number };
type Est = {
  ok: boolean;
  reason?: string;
  cemetery: string;
  spaces: number;
  confidence: { score: number; label: string; accuracy_pct: number };
  factors: Record<"location_match" | "market_data" | "recency" | "consistency", string>;
  broker: { per_space: Range; total: Range; timeline: string };
  private: { per_space: Range; total: Range; timeline: string };
};

const TYPES = [
  { v: "plot", l: "Burial plot" },
  { v: "lawn crypt", l: "Lawn crypt" },
  { v: "mausoleum crypt", l: "Mausoleum crypt" },
  { v: "niche", l: "Niche / urn space" },
];
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const Gauge = ({ score }: { score: number }) => {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" className="stroke-background/15" strokeWidth="8" />
      <motion.circle
        cx="50" cy="50" r={r} fill="none" strokeLinecap="round" strokeWidth="8" className="stroke-primary"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
};

const PlotResaleCalculator = ({ compact = false }: { compact?: boolean }) => {
  const [cems, setCems] = useState<{ name: string; city: string | null }[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("");
  const [type, setType] = useState("plot");
  const [spaces, setSpaces] = useState(2);
  const [loading, setLoading] = useState(false);
  const [est, setEst] = useState<Est | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.functions.invoke("plot-value-estimator", { body: { action: "cemeteries" } }).then(({ data }) => {
      if (data?.cemeteries) setCems(data.cemeteries);
    });
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (q ? cems.filter((c) => `${c.name} ${c.city ?? ""}`.toLowerCase().includes(q)) : cems).slice(0, 8);
  }, [cems, query]);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) { setErr("Choose or type your cemetery to get an estimate."); return; }
    setErr(null); setLoading(true);
    const { data, error } = await supabase.functions.invoke("plot-value-estimator", {
      body: { cemetery: query, section, property_type: type, spaces },
    });
    setLoading(false);
    if (error || !data?.ok) { setEst(null); setErr("We couldn't estimate this one automatically — request a free valuation and a broker will price it for you."); return; }
    setEst(data);
  };

  const sellHref = `/sell?cemetery=${encodeURIComponent(est?.cemetery ?? query)}`;
  const field = "w-full h-12 rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  return (
    <div id="plot-value-calculator" className="scroll-mt-28 rounded-[28px] border border-border bg-card shadow-[0_30px_80px_-40px_hsl(var(--foreground)/0.25)] overflow-hidden">
      <div className="px-6 md:px-10 pt-9 pb-7 border-b border-border/60">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-8 bg-primary/60" />
          <p className="text-[10px] tracking-[0.34em] uppercase text-primary font-medium">Free plot value calculator</p>
        </div>
        <h2 className={`font-display ${compact ? "text-3xl md:text-4xl" : "text-[32px] md:text-[48px]"} text-foreground leading-[1.04] max-w-3xl`}>
          What is my cemetery plot worth?
        </h2>
        <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
          Get an instant estimated resale value for burial plots, crypts and niches at Texas cemeteries — selling through a broker versus selling it yourself.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={run} className="p-6 md:p-10 space-y-6 border-b lg:border-b-0 lg:border-r border-border/60">
          <div ref={boxRef} className="relative">
            <label className="text-[10px] tracking-[0.28em] uppercase text-muted-foreground mb-2 block">Cemetery</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
                placeholder="e.g. Restland Memorial Park" className={`${field} pl-11`} autoComplete="off" aria-label="Cemetery name"
              />
            </div>
            <AnimatePresence>
              {open && matches.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-popover shadow-xl overflow-hidden max-h-72 overflow-y-auto"
                >
                  {matches.map((c) => (
                    <li key={c.name}>
                      <button type="button" onClick={() => { setQuery(c.name); setOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors">
                        <span className="text-sm text-foreground">{c.name}</span>
                        {c.city && <span className="block text-xs text-muted-foreground">{c.city}</span>}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.28em] uppercase text-muted-foreground mb-2 block">Garden or section <span className="normal-case tracking-normal">(optional)</span></label>
            <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="As written on your deed" className={field} />
          </div>

          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-muted-foreground mb-2">Property type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button key={t.v} type="button" onClick={() => setType(t.v)} aria-pressed={type === t.v}
                  className={`h-11 rounded-xl border text-sm transition-all ${type === t.v ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[10px] tracking-[0.28em] uppercase text-muted-foreground mb-2">Spaces</p>
              <div className="flex items-center gap-4">
                <button type="button" aria-label="Fewer spaces" onClick={() => setSpaces((s) => Math.max(1, s - 1))}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:border-primary transition-colors"><Minus className="w-4 h-4" /></button>
                <span className="font-display text-4xl w-10 text-center tabular-nums">{spaces}</span>
                <button type="button" aria-label="More spaces" onClick={() => setSpaces((s) => Math.min(12, s + 1))}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:border-primary transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="h-12 px-7 rounded-full bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Estimate value
            </button>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </form>

        <div className="p-6 md:p-10 bg-foreground text-background min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            {!est ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="my-auto">
                <p className="font-display text-3xl leading-tight mb-4">Your estimate appears here.</p>
                <ul className="space-y-3 text-sm text-background/70">
                  <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary mt-0.5" /> Built from real Texas cemetery pricing and resale activity</li>
                  <li className="flex gap-2"><Clock className="w-4 h-4 text-primary mt-0.5" /> Broker vs private sale value and typical timelines</li>
                  <li className="flex gap-2"><Info className="w-4 h-4 text-primary mt-0.5" /> Free, instant, no contact details needed</li>
                </ul>
              </motion.div>
            ) : (
              <motion.div key={JSON.stringify(est.broker)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                <div className="flex items-center gap-5 mb-7">
                  <div className="relative">
                    <Gauge score={est.confidence.score} />
                    <span className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums">{est.confidence.score}</span>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium">Confidence · {est.confidence.label}</p>
                    <p className="text-sm text-background/75 mt-1">Typically within ±{est.confidence.accuracy_pct}% for {est.cemetery}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-background/10 p-5 mb-3">
                  <div className="flex justify-between items-baseline gap-3">
                    <p className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium">Estimated resale with a broker</p>
                    <p className="text-xs text-background/60 whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{est.broker.timeline}</p>
                  </div>
                  <p className="font-display text-4xl md:text-5xl mt-2 tabular-nums">{money(est.broker.total.mid)}</p>
                  <p className="text-sm text-background/70 mt-1">{money(est.broker.total.low)} – {money(est.broker.total.high)} · {money(est.broker.per_space.mid)} per space</p>
                </div>
                <div className="rounded-2xl border border-background/15 p-5 mb-6">
                  <div className="flex justify-between items-baseline gap-3">
                    <p className="text-[10px] tracking-[0.24em] uppercase text-background/60 font-medium">Estimated private sale</p>
                    <p className="text-xs text-background/60 whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{est.private.timeline} avg.</p>
                  </div>
                  <p className="font-display text-3xl mt-2 tabular-nums text-background/85">{money(est.private.total.mid)}</p>
                  <p className="text-sm text-background/60 mt-1">{money(est.private.total.low)} – {money(est.private.total.high)}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-6">
                  {([["Location match", est.factors.location_match], ["Market data", est.factors.market_data], ["Recency", est.factors.recency], ["Consistency", est.factors.consistency]] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-background/10 pb-1.5"><span className="text-background/55">{k}</span><span>{v}</span></div>
                  ))}
                </div>

                <Link to={sellHref} className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition">
                  Get my exact quote — free <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="px-6 md:px-10 py-5 text-[11px] text-muted-foreground leading-relaxed border-t border-border/60">
        Estimates are automated and can be off — the garden, exact location, cemetery fees and current demand all change the real number. For an accurate valuation,{" "}
        <Link to="/sell" className="text-primary underline underline-offset-2">request a free quote from our brokers</Link>. This is not an offer or an appraisal.
      </p>
    </div>
  );
};

export default PlotResaleCalculator;
