import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Search } from "lucide-react";
import { bayCemeteries, type CemeteryInfo } from "@/data/cemeteries";
import { cemeteryPath } from "@/lib/cemeterySlug";

interface Props {
  /** Region names as used in src/data/cemeteries.ts */
  regions: string[];
  /** Heading label, e.g. "Greater Houston" */
  metro: string;
  /** Optional short intro line under the heading */
  blurb?: string;
  /** Show a filter box (useful for the statewide map) */
  searchable?: boolean;
}

interface Placed extends CemeteryInfo {
  x: number;
  y: number;
}

/**
 * Lightweight, dependency-free metro map. Cemetery coordinates are projected
 * into a padded equirectangular box (with a cosine correction on longitude so
 * the shape stays true), then rendered as interactive pins over a branded
 * canvas. No API key, no third-party script, fully crawlable text alongside.
 */
const MetroCemeteryMap = ({ regions, metro, blurb, searchable = false }: Props) => {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const placed = useMemo<Placed[]>(() => {
    const set = bayCemeteries.filter((c) => regions.includes(c.region));
    if (!set.length) return [];
    const lats = set.map((c) => c.lat);
    const lngs = set.map((c) => c.lng);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const k = Math.cos((midLat * Math.PI) / 180);

    const xs = lngs.map((l) => l * k);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);
    const spanX = Math.max(maxX - minX, 0.02);
    const spanY = Math.max(maxY - minY, 0.02);

    return set.map((c) => ({
      ...c,
      x: 8 + ((c.lng * k - minX) / spanX) * 84,
      y: 92 - ((c.lat - minY) / spanY) * 84,
    }));
  }, [regions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return placed;
    return placed.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q));
  }, [placed, query]);

  if (!placed.length) return null;

  const visible = new Set(filtered.map((c) => c.name));

  return (
    <section id="map" className="scroll-mt-28 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-3">Coverage map</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.05]">
            Cemeteries we broker across <span className="italic text-primary">{metro}</span>
          </h2>
          {blurb && <p className="text-foreground/70 mt-3 max-w-2xl leading-relaxed">{blurb}</p>}
        </div>
        {searchable && (
          <label className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter cemeteries…"
              aria-label="Filter cemeteries"
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </label>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6 xl:gap-8 items-start">
        {/* Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden border border-border/70 bg-card shadow-soft"
        >
          <div className="relative" style={{ paddingBottom: "78%" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(145_20%_93%)] via-[hsl(38_35%_96%)] to-[hsl(16_40%_93%)]" />

            {/* Grid + soft topography */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <defs>
                <pattern id="mcm-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M8 0H0V8" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.09" strokeWidth="0.25" />
                </pattern>
                <radialGradient id="mcm-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100" height="100" fill="url(#mcm-grid)" />
              <ellipse cx="50" cy="50" rx="46" ry="40" fill="url(#mcm-glow)" />
            </svg>

            {/* Connecting hairlines from the metro centroid */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {placed.map((c) => (
                <line
                  key={`l-${c.name}`}
                  x1="50"
                  y1="50"
                  x2={c.x}
                  y2={c.y}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={active === c.name ? 0.35 : 0.07}
                  strokeWidth="0.2"
                />
              ))}
            </svg>

            {placed.map((c) => {
              const on = active === c.name;
              const dim = !visible.has(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onMouseEnter={() => setActive(c.name)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(c.name)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(on ? null : c.name)}
                  aria-label={`${c.name}, ${c.city}`}
                  className={`absolute z-10 outline-none transition-opacity ${dim ? "opacity-20" : "opacity-100"}`}
                  style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translate(-50%, -100%)" }}
                >
                  {on && (
                    <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent/25 animate-ping" />
                  )}
                  <MapPin
                    className={`relative w-5 h-5 md:w-[26px] md:h-[26px] drop-shadow-md transition-transform duration-200 ${
                      on ? "scale-125 text-accent" : "text-primary hover:scale-110"
                    }`}
                    fill={on ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                    strokeWidth={1.4}
                  />
                  {on && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-xl bg-foreground text-background px-3 py-2 text-xs shadow-lg"
                    >
                      <span className="block font-medium">{c.name}</span>
                      <span className="block opacity-70">{c.city}, TX</span>
                    </motion.span>
                  )}
                </button>
              );
            })}

            <div className="absolute bottom-4 left-5 z-10 text-[10px] uppercase tracking-[0.24em] text-foreground/45">
              {placed.length} cemeteries · {metro}
            </div>
          </div>
        </motion.div>

        {/* Index list — also the crawlable version of the map */}
        <div className="rounded-3xl border border-border/70 bg-background/60 p-2 sm:p-3 max-h-[34rem] overflow-y-auto no-scrollbar">
          <ul className="list-none pl-0 m-0 space-y-1">
            {filtered.map((c) => {
              const on = active === c.name;
              return (
                <li key={c.name}>
                  <Link
                    to={cemeteryPath(c.name)}
                    onMouseEnter={() => setActive(c.name)}
                    onMouseLeave={() => setActive(null)}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                      on ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors ${on ? "bg-accent" : "bg-primary/50"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] leading-snug text-foreground truncate">{c.name}</span>
                      <span className="block text-xs text-foreground/55">{c.city}, Texas</span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0 text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="px-4 py-6 text-sm text-muted-foreground">No cemeteries match that search.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default MetroCemeteryMap;
