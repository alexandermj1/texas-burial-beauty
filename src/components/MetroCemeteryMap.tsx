/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Search, Navigation, Maximize2, Loader2, Receipt, Layers } from "lucide-react";
import { bayCemeteries, type CemeteryInfo } from "@/data/cemeteries";
import { cemeteryPath } from "@/lib/cemeterySlug";
import { loadGoogleMaps, brandMapStyles, pinIcon, hasMapsKey } from "@/lib/googleMaps";
import { useCemeteryMeta, tierFor, TIER } from "@/hooks/useCemeteryMeta";

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

const PRIMARY = "#4a6b4f";
const ACCENT = "#c1704a";

type Filter = "all" | "available" | "lowfee";
type Sort = "name" | "fee" | "listings";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const directionsUrl = (c: CemeteryInfo) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${c.address}`)}`;

/**
 * Interactive Google map of the cemeteries we broker in a metro, paired with a
 * synced, crawlable index of colour-coded cemetery cards.
 */
const MetroCemeteryMap = ({ regions, metro, blurb, searchable = false }: Props) => {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!hasMapsKey());

  const { metaFor } = useCemeteryMeta();

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<Record<string, google.maps.Marker>>({});
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const activeRef = useRef<string | null>(null);

  const set = useMemo(() => bayCemeteries.filter((c) => regions.includes(c.region)), [regions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = set.filter((c) => {
      if (q && !`${c.name} ${c.city}`.toLowerCase().includes(q)) return false;
      const m = metaFor(c.name);
      if (filter === "available") return m.listings > 0;
      if (filter === "lowfee") return m.transferFee != null && m.transferFee <= 500;
      return true;
    });
    out = [...out].sort((a, b) => {
      const ma = metaFor(a.name);
      const mb = metaFor(b.name);
      if (sort === "fee") {
        const fa = ma.transferFee ?? Number.POSITIVE_INFINITY;
        const fb = mb.transferFee ?? Number.POSITIVE_INFINITY;
        if (fa !== fb) return fa - fb;
      }
      if (sort === "listings" && ma.listings !== mb.listings) return mb.listings - ma.listings;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [set, query, filter, sort, metaFor]);

  // Boot the map once
  useEffect(() => {
    if (!set.length || !mapEl.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapEl.current) return;
        const map = new google.maps.Map(mapEl.current, {
          center: { lat: set[0].lat, lng: set[0].lng },
          zoom: 9,
          styles: brandMapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        mapRef.current = map;
        infoRef.current = new google.maps.InfoWindow({ disableAutoPan: false });

        set.forEach((c) => {
          const marker = new google.maps.Marker({
            map,
            position: { lat: c.lat, lng: c.lng },
            title: `${c.name} — ${c.city}, TX`,
            icon: {
              url: pinIcon(PRIMARY),
              scaledSize: new google.maps.Size(30, 39),
              anchor: new google.maps.Point(15, 39),
            },
            optimized: false,
          });
          marker.addListener("mouseover", () => setActive(c.name));
          marker.addListener("mouseout", () => setActive((a) => (a === c.name ? null : a)));
          marker.addListener("click", () => {
            setActive(c.name);
            openInfo(c);
          });
          markers.current[c.name] = marker;
        });

        const bounds = new google.maps.LatLngBounds();
        set.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
        map.fitBounds(bounds, 64);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  const openInfo = (c: CemeteryInfo) => {
    const map = mapRef.current;
    const info = infoRef.current;
    const marker = markers.current[c.name];
    if (!map || !info || !marker) return;
    const m = metaFor(c.name);
    const tier = TIER[tierFor(m.listings)];
    const facts = [
      m.listings > 0 ? `${m.listings} plot${m.listings === 1 ? "" : "s"} listed` : "Plots by request",
      m.transferFee != null ? `Transfer fee ${money(m.transferFee)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    info.setContent(
      `<div style="font-family:inherit;max-width:240px;padding:2px 2px 4px">
         <div style="display:inline-block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:${tier.pin}">${tier.label}</div>
         <div style="font-size:14px;font-weight:600;color:#2c2a26;line-height:1.25;margin-top:3px">${c.name}</div>
         <div style="font-size:12px;color:#6b6154;margin-top:2px">${c.address}</div>
         <div style="font-size:12px;color:#2c2a26;margin-top:6px">${facts}</div>
         <div style="margin-top:8px;display:flex;gap:10px;font-size:12px;font-weight:600">
           <a href="${cemeteryPath(c.name)}" style="color:${PRIMARY};text-decoration:none">View cemetery</a>
           <a href="${directionsUrl(c)}" target="_blank" rel="noopener" style="color:${ACCENT};text-decoration:none">Directions</a>
         </div>
       </div>`
    );
    info.open({ map, anchor: marker });
  };

  const iconFor = (name: string, on: boolean) => {
    const google = (window as any).google;
    const color = on ? ACCENT : TIER[tierFor(metaFor(name).listings)].pin;
    const size = on ? 40 : 30;
    return {
      url: pinIcon(color),
      scaledSize: new google.maps.Size(size, size * 1.3),
      anchor: new google.maps.Point(size / 2, size * 1.3),
    };
  };

  // Recolour pins whenever meta loads or the active pin changes
  useEffect(() => {
    const google = (window as any).google;
    if (!google?.maps) return;
    const prev = activeRef.current;
    if (prev && markers.current[prev]) {
      markers.current[prev].setIcon(iconFor(prev, false));
      markers.current[prev].setZIndex(1);
    }
    Object.keys(markers.current).forEach((n) => {
      if (n !== active) markers.current[n].setIcon(iconFor(n, false));
    });
    if (active && markers.current[active]) {
      markers.current[active].setIcon(iconFor(active, true));
      markers.current[active].setZIndex(999);
    }
    activeRef.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, metaFor, ready]);

  // Search/filters hide non-matching pins and refit the view
  useEffect(() => {
    const map = mapRef.current;
    const google = (window as any).google;
    if (!map || !google?.maps) return;
    const visible = new Set(filtered.map((c) => c.name));
    set.forEach((c) => markers.current[c.name]?.setVisible(visible.has(c.name)));
    if (!filtered.length) return;
    const bounds = new google.maps.LatLngBounds();
    filtered.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    if (filtered.length === 1) {
      map.setCenter({ lat: filtered[0].lat, lng: filtered[0].lng });
      map.setZoom(13);
    } else {
      map.fitBounds(bounds, 64);
    }
  }, [filtered, set]);

  const focus = (c: CemeteryInfo) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: c.lat, lng: c.lng });
    if ((map.getZoom() ?? 9) < 12) map.setZoom(12);
    setActive(c.name);
    openInfo(c);
  };

  const resetView = () => {
    const map = mapRef.current;
    const google = (window as any).google;
    if (!map || !google?.maps) return;
    infoRef.current?.close();
    setActive(null);
    const bounds = new google.maps.LatLngBounds();
    set.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    map.fitBounds(bounds, 64);
  };

  if (!set.length) return null;

  const chip = (on: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground/70 border-border/70 hover:border-primary/50"
    }`;

  return (
    <section id="map" className="scroll-mt-28 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-3">Coverage map</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.05]">
            Cemeteries we broker across <span className="italic text-primary">{metro}</span>
          </h2>
          {blurb && <p className="text-foreground/70 mt-3 max-w-2xl leading-relaxed">{blurb}</p>}
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cemetery or city…"
            aria-label="Search cemeteries"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </label>
      </div>

      {/* Filters + legend */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button type="button" className={chip(filter === "all")} onClick={() => setFilter("all")}>
          All cemeteries
        </button>
        <button type="button" className={chip(filter === "available")} onClick={() => setFilter("available")}>
          Plots available now
        </button>
        <button type="button" className={chip(filter === "lowfee")} onClick={() => setFilter("lowfee")}>
          Transfer fee ≤ $500
        </button>
        <span className="mx-1 hidden sm:inline text-border">|</span>
        <button type="button" className={chip(sort === "name")} onClick={() => setSort("name")}>
          A–Z
        </button>
        <button type="button" className={chip(sort === "listings")} onClick={() => setSort("listings")}>
          Most plots
        </button>
        <button type="button" className={chip(sort === "fee")} onClick={() => setSort("fee")}>
          Lowest fee
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-6 xl:gap-8 items-start">
        {/* Map canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden border border-border/70 bg-card shadow-soft"
        >
          <div ref={mapEl} className="w-full h-[26rem] sm:h-[32rem] lg:h-[42rem] bg-[hsl(38_35%_95%)]" />

          {!ready && !failed && (
            <div className="absolute inset-0 grid place-items-center bg-[hsl(38_35%_95%)] text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs uppercase tracking-[0.24em]">Loading map</span>
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 grid place-items-center bg-[hsl(38_35%_95%)] px-8 text-center">
              <p className="text-sm text-muted-foreground">
                Map unavailable right now — the full cemetery index is listed alongside.
              </p>
            </div>
          )}

          {/* Overlay chrome */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <span className="pointer-events-auto rounded-full bg-background/90 backdrop-blur px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-foreground/70 border border-border/60 shadow-sm">
              {filtered.length} {filtered.length === 1 ? "cemetery" : "cemeteries"} · {metro}
            </span>
            {ready && (
              <button
                type="button"
                onClick={resetView}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur px-4 py-2 text-xs font-medium text-foreground/80 border border-border/60 shadow-sm hover:text-primary transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Reset view
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="pointer-events-none absolute left-4 bottom-4 rounded-2xl bg-background/92 backdrop-blur border border-border/60 shadow-sm px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Inventory</p>
            <ul className="list-none p-0 m-0 space-y-1.5">
              {(["high", "some", "none"] as const).map((t) => (
                <li key={t} className="flex items-center gap-2 text-[11px] text-foreground/80">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER[t].pin }} />
                  {TIER[t].label}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Index list — also the crawlable version of the map */}
        <div className="rounded-3xl border border-border/70 bg-background/60 p-2 sm:p-3 max-h-[42rem] overflow-y-auto no-scrollbar">
          <ul className="list-none pl-0 m-0 space-y-2">
            {filtered.map((c) => {
              const on = active === c.name;
              const m = metaFor(c.name);
              const t = TIER[tierFor(m.listings)];
              return (
                <li key={c.name}>
                  <div
                    onMouseEnter={() => setActive(c.name)}
                    onMouseLeave={() => setActive(null)}
                    className={`group relative overflow-hidden rounded-2xl px-4 py-3.5 pl-5 transition-all border ${
                      on
                        ? "bg-card border-primary/40 shadow-soft -translate-y-0.5"
                        : "bg-card/70 border-border/60 hover:bg-card hover:border-primary/25"
                    }`}
                  >
                    <span className="absolute left-0 inset-y-0 w-1.5" style={{ background: t.pin }} />
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => focus(c)}
                        aria-label={`Show ${c.name} on the map`}
                        className="shrink-0 mt-0.5 grid place-items-center w-7 h-7 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <Link to={cemeteryPath(c.name)} className="block">
                          <span className="block font-display text-[15px] leading-snug text-foreground">{c.name}</span>
                          <span className="block text-xs text-foreground/55">{c.city}, Texas</span>
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${t.chip}`}>
                            <Layers className="w-3 h-3" />
                            {m.listings > 0 ? `${m.listings} plot${m.listings === 1 ? "" : "s"}` : t.label}
                          </span>
                          {m.transferFee != null && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/60 text-foreground/70">
                              <Receipt className="w-3 h-3" />
                              {money(m.transferFee)} transfer
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <a
                          href={directionsUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Directions to ${c.name}`}
                          className="text-accent/70 hover:text-accent transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                        <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="px-4 py-6 text-sm text-muted-foreground">No cemeteries match those filters.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default MetroCemeteryMap;
