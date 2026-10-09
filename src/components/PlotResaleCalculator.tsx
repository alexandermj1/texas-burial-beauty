import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Search, Minus, Plus, Clock, ShieldCheck, Sparkles, Loader2, MapPin, ChevronDown, Flower2, Landmark, Layers, Trees } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ValuationGraphic from "@/components/cemetery/ValuationGraphic";
import { bayCemeteries } from "@/data/cemeteries";

type Range = { low: number; mid: number; high: number };
type Est = { ok: boolean; cemetery: string; spaces: number; confidence: { score: number; label: string; accuracy_pct: number }; broker: { per_space: Range; total: Range; timeline: string }; private: { per_space: Range; total: Range; timeline: string } };
type Cemetery = { name: string; city: string | null };
const TYPES = [{ v: "plot", l: "Burial plot", icon: Trees }, { v: "lawn crypt", l: "Lawn crypt", icon: Layers }, { v: "mausoleum crypt", l: "Mausoleum crypt", icon: Landmark }, { v: "niche", l: "Niche / urn space", icon: Flower2 }];
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const normalize = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function AnimatedMoney({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 950);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <>{money(shown)}</>;
}

function SaleTimelines({ broker = "1 month – 2 years", privateSale = "5 – 7 years" }: { broker?: string; privateSale?: string }) {
  return <div className="mt-6 pt-5 border-t border-primary/20 text-center">
    <p className="text-xs text-foreground/60 flex items-center justify-center gap-2 mb-4"><Clock className="w-4 h-4" /> Estimated time to sell</p>
    <div className="grid grid-cols-2 divide-x divide-primary/20">
      <div className="px-2"><p className="text-xs text-valuation-teal mb-2">With a broker</p><p className="text-lg sm:text-xl font-medium leading-snug tabular-nums">{broker}</p><p className="text-xs text-foreground/45 mt-1.5">Estimated range</p></div>
      <div className="px-2"><p className="text-xs text-valuation-coral mb-2">Private sale</p><p className="text-lg sm:text-xl font-medium leading-snug tabular-nums">{privateSale}</p><p className="text-xs text-foreground/45 mt-1.5">On average</p></div>
    </div>
  </div>;
}

const PlotResaleCalculator = ({ compact = false }: { compact?: boolean }) => {
  const reduced = useReducedMotion();
  const [cems, setCems] = useState<Cemetery[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [section, setSection] = useState("");
  const [type, setType] = useState("plot");
  const [spaces, setSpaces] = useState(2);
  const [loading, setLoading] = useState(false);
  const [est, setEst] = useState<Est | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    supabase.functions.invoke("plot-value-estimator", { body: { action: "cemeteries" } }).then(({ data }) => {
      if (alive) setCems(data?.cemeteries?.length ? data.cemeteries : bayCemeteries.map(({ name, city }) => ({ name, city })));
    });
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { alive = false; document.removeEventListener("mousedown", close); };
  }, []);
  const matches = useMemo(() => {
    const words = normalize(query).split(" ").filter(Boolean);
    return cems.filter((c) => words.every((word) => normalize(`${c.name} ${c.city ?? ""}`).includes(word)));
  }, [cems, query]);
  const select = (c: Cemetery) => { setQuery(c.name); setOpen(false); setActive(-1); setEst(null); };
  const invalidate = () => { setEst(null); setErr(null); };
  const run = async (e: React.FormEvent) => {
    e.preventDefault(); setOpen(false);
    if (!query.trim()) { setErr("Choose or type your cemetery to get an estimate."); inputRef.current?.focus(); return; }
    setErr(null); setLoading(true); setEst(null);
    try {
      const { data, error } = await supabase.functions.invoke("plot-value-estimator", { body: { cemetery: query, section, property_type: type, spaces } });
      if (error || !data?.ok) setErr("We couldn't estimate this property automatically. Request a free valuation from our team.");
      else setEst(data);
    } catch { setErr("We couldn't connect. Please try again or request a free valuation."); }
    finally { setLoading(false); }
  };
  const sellHref = `/sell?cemetery=${encodeURIComponent(est?.cemetery ?? query)}`;
  const field = "w-full h-12 rounded-lg border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition";
  const transition = { duration: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <div id="plot-value-calculator" className={`plot-calculator ${compact ? "plot-calculator-compact" : ""} scroll-mt-28 rounded-xl border-2 border-primary/25 bg-background`}>
      <div className="valuation-hero relative isolate overflow-hidden border-b border-border rounded-t-xl flex flex-col items-center text-center">
        <div className="absolute inset-0 grid grid-cols-5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className={`valuation-tile valuation-tile-${i}`} />)}
        </div>
        <div className="absolute inset-0 valuation-hero-overlay" aria-hidden="true" />
        <div className={`relative z-10 flex flex-col items-center max-w-3xl ${compact ? "px-5 py-6 md:py-7 gap-3" : "px-6 py-10 md:py-14 gap-5"}`}>
          <p className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-primary"><Sparkles className="w-4 h-4" /> Free instant estimate</p>
          <h2 className={`font-display ${compact ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl"} leading-[1.08] text-foreground`}>What is your cemetery plot worth?</h2>
          <p className={`${compact ? "text-sm" : "text-lg md:text-xl"} text-muted-foreground leading-relaxed max-w-xl`}>{compact ? "Compare resale value and time to sell." : "See what yours could sell for — compare a broker sale with selling privately, in seconds."}</p>
          {!compact && <span className="inline-flex gap-2 items-center text-xs font-medium text-foreground/75 rounded-full border border-primary/30 bg-background/70 backdrop-blur px-4 py-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> No contact details needed</span>}
        </div>
      </div>
      <div className="grid grid-cols-1">
        <form onSubmit={run} className={`${compact ? "p-4 sm:p-6 space-y-4" : "p-6 md:p-9 space-y-6"} min-w-0`}>
          <div ref={boxRef} className="relative">
            <label htmlFor="value-cemetery" className="text-sm font-medium mb-2 block">Cemetery</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-4 text-primary" />
              <input ref={inputRef} id="value-cemetery" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); invalidate(); }} onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive((n) => Math.max(0, Math.min(matches.length - 1, n + (e.key === "ArrowDown" ? 1 : -1)))); }
                  if (e.key === "Enter" && open && active >= 0 && matches[active]) { e.preventDefault(); select(matches[active]); }
                }}
                placeholder="Search by cemetery or city" className={`${field} pl-11 pr-12`} autoComplete="off" role="combobox" aria-expanded={open} aria-controls="cemetery-options" aria-autocomplete="list" aria-activedescendant={active >= 0 ? `cem-option-${active}` : undefined} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 hover:bg-muted text-muted-foreground" aria-label="Browse all cemeteries" onClick={() => { setOpen(!open); inputRef.current?.focus(); }}><ChevronDown /></Button>
            </div>
            <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition} className="absolute z-30 mt-2 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
              <p className="px-4 py-2 border-b border-border text-xs text-muted-foreground">{matches.length} cemeteries {query ? "found" : "in the directory"}</p>
              <ul id="cemetery-options" role="listbox" aria-label="Cemeteries" className="max-h-64 overflow-y-auto">
                {matches.map((c, i) => <li id={`cem-option-${i}`} role="option" aria-selected={i === active} key={`${c.name}-${c.city}`} ref={(el) => { if (el && i === active) el.scrollIntoView({ block: "nearest" }); }}>
                  <Button type="button" variant="ghost" onClick={() => select(c)} className={`w-full h-auto min-h-14 justify-start rounded-none px-4 py-3 whitespace-normal text-left hover:bg-muted hover:text-foreground ${active === i ? "bg-muted" : ""}`}><MapPin className="text-primary" /><span className="min-w-0"><span className="block text-sm">{c.name}</span>{c.city && <span className="block text-xs text-muted-foreground font-normal">{c.city}</span>}</span></Button>
                </li>)}
                {!matches.length && <li className="px-4 py-4 text-sm text-muted-foreground">No directory match. You can still estimate using the name you entered.</li>}
              </ul>
            </motion.div>}</AnimatePresence>
          </div>
          <div><label htmlFor="value-section" className="text-sm font-medium mb-2 block">Garden or section <span className="text-muted-foreground font-normal">(optional)</span></label><input id="value-section" value={section} onChange={(e) => { setSection(e.target.value); invalidate(); }} placeholder="e.g. Garden of Memories" className={field} /></div>
          <fieldset><legend className="text-sm font-medium mb-3">Property type</legend><div className="grid grid-cols-2 gap-2">{TYPES.map((t) => <Button key={t.v} type="button" variant="outline" onClick={() => { setType(t.v); invalidate(); }} aria-pressed={type === t.v} className={`relative h-14 px-3 whitespace-normal text-xs sm:text-sm justify-start hover:bg-card hover:text-foreground ${type === t.v ? "border-primary bg-card text-primary" : "text-muted-foreground"}`}><t.icon /><span>{t.l}</span>{type === t.v && <motion.span layoutId="property-selection" transition={transition} className="absolute bottom-0 inset-x-3 h-0.5 bg-primary" />}</Button>)}</div></fieldset>
          <div className="flex items-center justify-between"><label className="text-sm font-medium">Number of spaces</label><div className="flex items-center gap-3"><Button type="button" size="icon" variant="outline" disabled={spaces === 1} aria-label="Fewer spaces" onClick={() => { setSpaces(spaces - 1); invalidate(); }} className="hover:bg-card hover:text-primary"><Minus /></Button><span className="text-2xl font-medium tabular-nums w-8 text-center">{spaces}</span><Button type="button" size="icon" variant="outline" disabled={spaces === 12} aria-label="More spaces" onClick={() => { setSpaces(spaces + 1); invalidate(); }} className="hover:bg-card hover:text-primary"><Plus /></Button></div></div>
          <Button type="submit" disabled={loading} className="w-full h-13 min-h-12 text-sm">{loading ? <Loader2 className="animate-spin" /> : <Sparkles />}{loading ? "Calculating your estimate…" : "Estimate my plot value"}<ArrowRight className="ml-auto" /></Button>
          {err && <p role="alert" className="text-sm text-destructive">{err} <Link to={sellHref} className="underline">Get a free quote</Link></p>}
        </form>
        <div className={`${compact ? "p-4 sm:p-6" : "p-6 md:p-9 min-h-[420px]"} bg-card text-foreground min-w-0 rounded-b-xl border-t border-primary/20 relative overflow-hidden`} aria-live="polite" aria-busy={loading}>
          <AnimatePresence mode="wait">
            {!est ? <motion.div key={loading ? "loading" : "empty"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition} className="h-full flex flex-col justify-center text-center">
              {!compact && <>
                <p className="text-xs text-valuation-teal mb-3">YOUR RESALE POTENTIAL</p>
                <h3 className="font-body font-medium text-2xl md:text-3xl leading-tight max-w-sm mx-auto">A clearer view of<br />value and time.</h3>
                <ValuationGraphic />
                <div className="flex justify-center flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/70"><span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 rounded-full bg-valuation-teal" /> Broker resale</span><span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 rounded-full bg-valuation-coral" /> Private resale</span></div>
              </>}
              <SaleTimelines />
              {loading && <p className="text-sm text-foreground/60 mt-5">Preparing your estimate…</p>}
            </motion.div> : <motion.div key={JSON.stringify(est)} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition} className="text-center">
               <div className="flex flex-wrap justify-between gap-4 items-start border-b border-primary/20 pb-5 mb-5"><div className="min-w-0 flex-1"><p className="text-xs text-foreground/55 mb-1">YOUR ESTIMATE · {est.spaces} {est.spaces === 1 ? "SPACE" : "SPACES"}</p><h3 className="font-body text-base font-medium break-words">{est.cemetery}</h3></div><div className="shrink-0 text-right"><p className="text-valuation-teal text-xl font-medium tabular-nums">{est.confidence.score}<span className="text-xs text-foreground/50"> / 100</span></p><p className="text-xs text-foreground/65">{est.confidence.label} confidence</p></div></div>
              <p className="text-sm text-valuation-teal font-medium">Estimated resale with a broker</p>
              <p className="text-[38px] sm:text-[46px] font-medium tabular-nums leading-tight mt-2"><AnimatedMoney value={est.broker.total.mid} /></p>
              <p className="text-sm text-foreground/65 mt-2">{money(est.broker.total.low)} – {money(est.broker.total.high)}</p>
              <p className="text-xs text-foreground/55 mt-1">{money(est.broker.per_space.mid)} per space</p>
               <ValuationGraphic broker={est.broker.total.mid} privateSale={est.private.total.mid} />
              <div className="border-t border-primary/20 mt-5 pt-5"><p className="text-sm text-valuation-coral">Estimated private sale</p><p className="text-3xl font-medium tabular-nums mt-2"><AnimatedMoney value={est.private.total.mid} /></p><p className="text-xs text-foreground/60 mt-2">{money(est.private.total.low)} – {money(est.private.total.high)}</p></div>
              <SaleTimelines broker={est.broker.timeline} privateSale={est.private.timeline} />
              <p className="text-xs text-foreground/55 mt-5 leading-relaxed">Indicative uncertainty: ±{est.confidence.accuracy_pct}%. Not a verified prediction of your final sale price.</p>
              <Button asChild className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"><Link to={sellHref}>Get my free broker valuation <ArrowRight /></Link></Button>
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>
       <p className={`${compact ? "px-4 sm:px-6 py-4" : "px-6 md:px-9 py-5"} text-xs text-muted-foreground leading-relaxed border-t border-border`}>Automated estimates can be off. Location, cemetery fees and demand affect the final price. For an accurate valuation, <Link to={sellHref} className="text-primary underline underline-offset-2">request a free quote</Link>. This is not an offer or an appraisal.</p>
    </div>
  );
};
export default PlotResaleCalculator;
