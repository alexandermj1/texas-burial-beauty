/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Search, Navigation, Maximize2, Loader2 } from "lucide-react";
import { bayCemeteries, type CemeteryInfo } from "@/data/cemeteries";
import { cemeteryPath } from "@/lib/cemeterySlug";
import { loadGoogleMaps, brandMapStyles, pinIcon, hasMapsKey } from "@/lib/googleMaps";

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

const directionsUrl = (c: CemeteryInfo) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${c.address}`)}`;

/**
 * Interactive Google map of the cemeteries we broker in a metro, paired with a
 * synced, crawlable index list. Hovering either side highlights the other.
 */
const MetroCemeteryMap = ({ regions, metro, blurb, searchable = false }: Props) => {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!hasMapsKey());

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<Record<string, google.maps.Marker>>({});
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const activeRef = useRef<string | null>(null);

  const set = useMemo(() => bayCemeteries.filter((c) => regions.includes(c.region)), [regions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return set;
    return set.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q));
  }, [set, query]);

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
    info.setContent(
      `<div style="font-family:inherit;max-width:230px;padding:2px 2px 4px">
         <div style="font-size:14px;font-weight:600;color:#2c2a26;line-height:1.25">${c.name}</div>
         <div style="font-size:12px;color:#6b6154;margin-top:2px">${c.address}</div>
         <div style="margin-top:8px;display:flex;gap:10px;font-size:12px;font-weight:600">
           <a href="${cemeteryPath(c.name)}" style="color:${PRIMARY};text-decoration:none">View cemetery</a>
           <a href="${directionsUrl(c)}" target="_blank" rel="noopener" style="color:${ACCENT};text-decoration:none">Directions</a>
         </div>
       </div>`
    );
    info.open({ map, anchor: marker });
  };

  // Highlight the active marker
  useEffect(() => {
    const google = (window as any).google;
    if (!google?.maps) return;
    const prev = activeRef.current;
    if (prev && markers.current[prev]) {
      markers.current[prev].setIcon({
        url: pinIcon(PRIMARY),
        scaledSize: new google.maps.Size(30, 39),
        anchor: new google.maps.Point(15, 39),
      });
      markers.current[prev].setZIndex(1);
    }
    if (active && markers.current[active]) {
      markers.current[active].setIcon({
        url: pinIcon(ACCENT),
        scaledSize: new google.maps.Size(40, 52),
        anchor: new google.maps.Point(20, 52),
      });
      markers.current[active].setZIndex(999);
    }
    activeRef.current = active;
  }, [active]);

  // Search hides non-matching pins and refits the view
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

      <div className="grid lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-6 xl:gap-8 items-start">
        {/* Map canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden border border-border/70 bg-card shadow-soft"
        >
          <div ref={mapEl} className="w-full h-[26rem] sm:h-[32rem] lg:h-[40rem] bg-[hsl(38_35%_95%)]" />

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
        </motion.div>

        {/* Index list — also the crawlable version of the map */}
        <div className="rounded-3xl border border-border/70 bg-background/60 p-2 sm:p-3 max-h-[40rem] overflow-y-auto no-scrollbar">
          <ul className="list-none pl-0 m-0 space-y-1">
            {filtered.map((c) => {
              const on = active === c.name;
              return (
                <li key={c.name}>
                  <div
                    onMouseEnter={() => setActive(c.name)}
                    onMouseLeave={() => setActive(null)}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                      on ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => focus(c)}
                      aria-label={`Show ${c.name} on the map`}
                      className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                    <Link to={cemeteryPath(c.name)} className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] leading-snug text-foreground truncate">{c.name}</span>
                      <span className="block text-xs text-foreground/55">{c.city}, Texas</span>
                    </Link>
                    <a
                      href={directionsUrl(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Directions to ${c.name}`}
                      className="shrink-0 text-accent/70 hover:text-accent transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                    <ArrowRight className="w-4 h-4 shrink-0 text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </div>
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
