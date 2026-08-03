import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  ChevronDown,
  ArrowUpRight,

  Search,
  Navigation,
  Maximize2,
  Loader2,
  Receipt,
  CalendarClock,
  Globe,
  LocateFixed,
  Route,
  X,
} from "lucide-react";
import { bayCemeteries, type CemeteryInfo } from "@/data/cemeteries";
import { cemeteryPath } from "@/lib/cemeterySlug";
import { useCemeteryMeta, bandInfo, showingLabel, SAME_DAY_REGIONS } from "@/hooks/useCemeteryMeta";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  /** Region names as used in src/data/cemeteries.ts */
  regions: string[];
  /** Heading label, e.g. "Greater Houston" */
  metro: string;
  /** Optional short intro line under the heading */
  blurb?: string;
  /** Show a filter box (useful for the statewide map) */
  searchable?: boolean;
  /** Break out of the parent container to full page width (default true) */
  fullBleed?: boolean;
  /** Hide the large title block so the caller can provide its own header. */
  hideTitle?: boolean;
  /** Compact padding and spacing for use in a tighter layout (e.g. home page). */
  compact?: boolean;
}

const ACCENT = "#c1704a";
const DEFAULT_ZOOM = 9;

type Filter = "all" | "sameday" | "lowfee";
type Sort = "name" | "fee" | "demand" | "distance";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const directionsUrl = (c: CemeteryInfo, from?: { lat: number; lng: number } | null) =>
  `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.lat},${from.lng}` : ""}&destination=${encodeURIComponent(
    `${c.name}, ${c.address}`
  )}`;

const milesBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Official site";
  }
};

/** On-brand headstone glyph used in place of generic arrows. */
const Headstone = ({ color, className = "" }: { color: string; className?: string }) => (
  <svg viewBox="0 0 24 30" className={className} aria-hidden="true">
    <ellipse cx="12" cy="26.5" rx="9" ry="2.4" fill={color} opacity="0.16" />
    <path d="M5 27V11a7 7 0 0 1 14 0v16z" fill={color} />
    <g stroke="#fff" strokeOpacity="0.85" strokeWidth="1.4" strokeLinecap="round">
      <path d="M8.5 17.5h7" />
      <path d="M9.5 21h5" />
    </g>
  </svg>
);

const markerIcon = (color: string, active = false) => {
  const width = active ? 42 : 32;
  const height = active ? 52 : 40;
  return L.divIcon({
    className: "cemetery-map-marker",
    html: `<svg viewBox="0 0 34 44" width="${width}" height="${height}" aria-hidden="true"><path d="M17 43C17 43 32 27.2 32 16.5 32 8 25.3 1 17 1S2 8 2 16.5C2 27.2 17 43 17 43Z" fill="${color}" stroke="#fff" stroke-width="2.2"/><circle cx="17" cy="16.5" r="5.2" fill="#fff" opacity=".95"/></svg>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 6],
  });
};


/**
 * Interactive Google map of the cemeteries we broker in a metro, paired with a
 * synced, crawlable index of colour-coded cemetery cards.
 */
const MetroCemeteryMap = ({ regions, metro, blurb, searchable = false, fullBleed = true, hideTitle = false, compact = false }: Props) => {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const { metaFor } = useCemeteryMeta();

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const meRef = useRef<L.CircleMarker | null>(null);
  const ringRef = useRef<L.Circle | null>(null);
  const activeRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});
  /** Suppresses the auto-scroll when the highlight came from the list itself. */
  const fromListRef = useRef(false);

  const set = useMemo(() => bayCemeteries.filter((c) => regions.includes(c.region)), [regions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = set.filter((c) => {
      if (q && !`${c.name} ${c.city}`.toLowerCase().includes(q)) return false;
      const m = metaFor(c.name);
      if (filter === "sameday") return SAME_DAY_REGIONS.includes(c.region);
      if (filter === "lowfee") return m.transferFee != null && m.transferFee <= 500;
      return true;
    });
    out = [...out].sort((a, b) => {
      const ma = metaFor(a.name);
      const mb = metaFor(b.name);
      if (sort === "distance" && here) {
        return milesBetween(here, a) - milesBetween(here, b);
      }
      if (sort === "fee") {
        const fa = ma.transferFee ?? Number.POSITIVE_INFINITY;
        const fb = mb.transferFee ?? Number.POSITIVE_INFINITY;
        if (fa !== fb) return fa - fb;
      }
      if (sort === "demand" && ma.band !== mb.band) return mb.band - ma.band;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [set, query, filter, sort, metaFor, here]);

  const openInfo = useCallback(
    (c: CemeteryInfo) => {
      const map = mapRef.current;
      const marker = markers.current[c.name];
      if (!map || !marker) return;
      const m = metaFor(c.name);
      const tier = bandInfo(m.band);
      const facts = [
        showingLabel(c.region),
        m.transferFee != null ? `Transfer fee ${money(m.transferFee)}` : null,
        here ? `${milesBetween(here, c).toFixed(1)} mi away` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      marker.bindPopup(
        `<div style="font-family:inherit;max-width:252px;padding:2px 2px 4px">
         <div style="display:inline-block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:${tier.pin}">${tier.label}</div>
         <div style="font-size:14px;font-weight:600;color:#2c2a26;line-height:1.25;margin-top:3px">${c.name}</div>
         <div style="font-size:12px;color:#6b6154;margin-top:2px">${c.address}</div>
         <div style="font-size:12px;color:#2c2a26;margin-top:6px">${facts}</div>
         <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;font-size:12px;font-weight:600">
           <a href="${cemeteryPath(c.name)}" style="color:#4a6b4f;text-decoration:none">View cemetery</a>
           <a href="${directionsUrl(c, here)}" target="_blank" rel="noopener" style="color:${ACCENT};text-decoration:none">Directions</a>
           ${m.website ? `<a href="${m.website}" target="_blank" rel="noopener nofollow" style="color:#6b6154;text-decoration:none">Official site</a>` : ""}
         </div>
       </div>`
      ).openPopup();
    },
    [metaFor, here]
  );

  // Boot the map once
  useEffect(() => {
    if (!set.length || !mapEl.current || mapRef.current) return;
    try {
        const map = L.map(mapEl.current, {
          center: [set[0].lat, set[0].lng],
          zoom: DEFAULT_ZOOM,
          zoomControl: true,
          scrollWheelZoom: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;

        set.forEach((c) => {
          const marker = L.marker([c.lat, c.lng], {
            title: `${c.name} — ${c.city}, TX`,
            icon: markerIcon(bandInfo(0).pin),
            riseOnHover: true,
          }).addTo(map);
          marker.on("mouseover", () => {
            fromListRef.current = false;
            setActive(c.name);
          });
          marker.on("click", () => {
            fromListRef.current = false;
            setActive(c.name);
          });
          markers.current[c.name] = marker;
        });

        map.fitBounds(L.latLngBounds(set.map((c) => [c.lat, c.lng] as [number, number])), { padding: [64, 64] });
        setReady(true);
    } catch {
      setFailed(true);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  // Recolour pins whenever meta loads or the active pin changes, open its bubble
  // and — when the highlight came from the map — reveal the matching card.
  useEffect(() => {
    if (!mapRef.current) return;
    Object.keys(markers.current).forEach((n) => {
      if (n !== active) {
        markers.current[n].setIcon(markerIcon(bandInfo(metaFor(n).band).pin));
        markers.current[n].setZIndexOffset(0);
      }
    });
    if (active && markers.current[active]) {
      markers.current[active].setIcon(markerIcon(ACCENT, true));
      markers.current[active].setZIndexOffset(999);
      const c = set.find((x) => x.name === active);
      if (c) openInfo(c);
      if (!fromListRef.current) {
        // Bring the matching card to the top of the list panel, not just into view.
        const list = listRef.current;
        const card = cardRefs.current[active];
        if (list && card) {
          list.scrollTo({ top: Math.max(0, card.offsetTop - list.offsetTop - 8), behavior: "smooth" });
        }
      }

    } else {
      mapRef.current.closePopup();
    }
    activeRef.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, metaFor, ready]);

  // Search/filters hide non-matching pins and refit the view
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visible = new Set(filtered.map((c) => c.name));
    set.forEach((c) => {
      const marker = markers.current[c.name];
      if (!marker) return;
      if (visible.has(c.name)) marker.addTo(map);
      else marker.removeFrom(map);
    });
    if (!filtered.length) return;
    if (sort === "distance" && here) return; // keep the "near me" framing
    if (filtered.length === 1) {
      map.setView([filtered[0].lat, filtered[0].lng], 13);
    } else {
      map.fitBounds(L.latLngBounds(filtered.map((c) => [c.lat, c.lng] as [number, number])), { padding: [64, 64] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, set]);

  const focus = (c: CemeteryInfo) => {
    const map = mapRef.current;
    fromListRef.current = true;
    setActive(c.name);
    if (!map) return;
    map.panTo([c.lat, c.lng]);
    if (map.getZoom() < 12) map.setZoom(12);
  };

  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    map.closePopup();
    setActive(null);
    map.fitBounds(L.latLngBounds(set.map((c) => [c.lat, c.lng] as [number, number])), { padding: [64, 64] });
  };

  /** Drop the "you are here" marker, frame the nearest cemeteries and sort by distance. */
  const applyOrigin = (p: { lat: number; lng: number }, label: string) => {
    setHere(p);
    setOriginLabel(label);
    setSort("distance");
    setLocError(null);
    const map = mapRef.current;
    if (!map) return;
    meRef.current?.remove();
    ringRef.current?.remove();
    meRef.current = L.circleMarker([p.lat, p.lng], {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2c2a26",
      fillOpacity: 1,
    }).bindTooltip(label).addTo(map);
    ringRef.current = L.circle([p.lat, p.lng], {
      radius: 1600,
      color: "#2c2a26",
      opacity: 0.25,
      weight: 1,
      fillColor: "#2c2a26",
      fillOpacity: 0.06,
    }).addTo(map);
    const nearest = [...set].sort((a, b) => milesBetween(p, a) - milesBetween(p, b)).slice(0, 5);
    map.fitBounds(
      L.latLngBounds([[p.lat, p.lng], ...nearest.map((c) => [c.lat, c.lng] as [number, number])]),
      { padding: [72, 72] }
    );
    if (nearest[0]) {
      fromListRef.current = false;
      setActive(nearest[0].name);
    }
  };

  const clearOrigin = () => {
    meRef.current?.remove();
    ringRef.current?.remove();
    meRef.current = null;
    ringRef.current = null;
    setHere(null);
    setOriginLabel(null);
    setAddressInput("");
    setSort("name");
    resetView();
  };

  const findNearMe = () => {
    if (!navigator.geolocation) {
      setLocError("Location isn’t available in this browser — enter an address instead.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        applyOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "Your location");
      },
      () => {
        setLocating(false);
        setLocError("We couldn’t get your location — enter your address below instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const searchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = addressInput.trim();
    if (!q) {
      // Empty field → treat "Nearest" as "use my location".
      findNearMe();
      return;
    }
    setLocating(true);
    setLocError(null);
    try {
      // Server-side geocoding first — works on every domain, unlike the
      // referrer-restricted browser key which isn't authorised for Geocoding.
      const { data } = await supabase.functions.invoke("map-geocode", {
        body: { target: "query", query: /^\d{5}$/.test(q) ? `${q}, USA` : `${q}, Texas, USA` },
      });
      const loc = (data as any)?.location;
      if (loc && typeof loc.lat === "number") {
        applyOrigin({ lat: loc.lat, lng: loc.lng }, q);
        return;
      }
      throw new Error("no result");
    } catch {
      setLocError("We couldn’t find that address — try a ZIP code or “City, TX”.");
    } finally {
      setLocating(false);
    }
  };


  if (!set.length) return null;

  const chip = (on: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      on
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-foreground/70 border-border/70 hover:border-primary/50"
    }`;

  const sameDayMetro = regions.some((r) => SAME_DAY_REGIONS.includes(r));

  return (
    <section id="map" className="scroll-mt-28 py-12 md:py-16 w-full">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-3">Coverage map</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.05]">
            Cemeteries we broker across <span className="italic text-primary">{metro}</span>
          </h2>
          {blurb && <p className="text-foreground/70 mt-3 max-w-2xl leading-relaxed">{blurb}</p>}
          {sameDayMetro && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium">
              <CalendarClock className="w-4 h-4" />
              Same-day in-person showings across {metro}
            </p>
          )}
        </div>

        {/* One toolbar: find, locate, sort */}
        <div className="rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4 mb-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by cemetery or city"
                aria-label="Search cemeteries"
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-background border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </label>

            <form onSubmit={searchAddress} className="relative flex items-center">
              <Route className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Your address or ZIP"
                aria-label="Your address"
                className="w-full pl-10 pr-[6.5rem] py-2.5 rounded-full bg-background border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={findNearMe}
                  title="Use my location"
                  aria-label="Use my location"
                  className="w-8 h-8 grid place-items-center rounded-full text-accent hover:bg-accent/10 transition-colors"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Nearest
                </button>
              </div>
            </form>

            <label className="relative lg:w-56">
              <span className="sr-only">Sort cemeteries</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="w-full appearance-none pl-4 pr-9 py-2.5 rounded-full bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              >
                <option value="name">Sort: A–Z</option>
                <option value="demand">Sort: Most in demand</option>
                <option value="fee">Sort: Lowest transfer fee</option>
                {here && <option value="distance">Sort: Closest to me</option>}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={chip(filter === "all")} onClick={() => setFilter("all")}>
              All
            </button>
            {sameDayMetro && (
              <button type="button" className={chip(filter === "sameday")} onClick={() => setFilter("sameday")}>
                Same-day showings
              </button>
            )}
            <button type="button" className={chip(filter === "lowfee")} onClick={() => setFilter("lowfee")}>
              Fee under $500
            </button>
            {originLabel && (
              <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-background border border-border/70 px-3 py-1.5 text-xs text-foreground/70">
                <span className="w-2 h-2 rounded-full bg-foreground" />
                From <span className="font-medium text-foreground truncate max-w-[16rem]">{originLabel}</span>
                <button type="button" onClick={clearOrigin} aria-label="Clear starting point" className="hover:text-primary">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          {locError && <p className="text-xs text-accent mt-3">{locError}</p>}
        </div>


        <div className="grid lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2.6fr)_26rem] gap-5 xl:gap-7 items-start">
          {/* Map canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative rounded-3xl overflow-hidden border border-border/70 bg-card shadow-soft"
          >
            <div ref={mapEl} className="w-full h-[32rem] sm:h-[40rem] lg:h-[46rem] xl:h-[52rem] bg-[hsl(38_35%_95%)]" />

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

            {/* Legend — deliberately relative, no raw numbers */}
            <div className="pointer-events-none absolute left-4 bottom-4 rounded-2xl bg-background/92 backdrop-blur border border-border/60 shadow-sm px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Buyer interest</p>
              <ul className="list-none p-0 m-0 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[11px] text-foreground/80">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: bandInfo(b).pin }} />
                    {bandInfo(b).label}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-2 max-w-[11rem] leading-snug">
                Graded relative to other Texas cemeteries we broker.
              </p>
            </div>
          </motion.div>

          {/* Index list — also the crawlable version of the map */}
          <div
            ref={listRef}
            className="rounded-3xl border border-border/70 bg-gradient-to-b from-card/80 to-background/40 p-2 sm:p-3 lg:max-h-[46rem] xl:max-h-[52rem] overflow-y-auto no-scrollbar"
          >
            <ul className="list-none pl-0 m-0 space-y-2.5">
              {filtered.map((c, i) => {
                const on = active === c.name;
                const m = metaFor(c.name);
                const t = bandInfo(m.band);
                const miles = here ? milesBetween(here, c) : null;
                return (
                  <li key={c.name} ref={(el) => (cardRefs.current[c.name] = el)}>
                    <div
                      onMouseEnter={() => {
                        fromListRef.current = true;
                        setActive(c.name);
                      }}
                      onClick={() => focus(c)}
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 border cursor-pointer ${
                        on
                          ? "bg-card border-primary/45 shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.45)] -translate-y-0.5"
                          : "bg-card/60 border-border/50 hover:bg-card hover:border-primary/25 hover:-translate-y-0.5"
                      }`}
                    >
                      {/* colour rail + soft tint */}
                      <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: t.pin }} />
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `linear-gradient(100deg, ${t.pin}12, transparent 62%)` }}
                      />

                      <div className="relative px-4 py-4 pl-5">
                        <div className="flex items-start gap-3">
                          <Headstone color={t.pin} className="w-7 h-9 shrink-0 mt-0.5" />

                          <div className="min-w-0 flex-1">
                            <Link
                              to={cemeteryPath(c.name)}
                              onClick={(e) => e.stopPropagation()}
                              className="block font-display text-[17px] leading-snug text-foreground hover:text-primary transition-colors"
                            >
                              {c.name}
                            </Link>
                            <p className="text-xs text-foreground/55 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {c.city}, Texas
                              {miles != null && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="font-medium text-primary">
                                    {miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away
                                  </span>
                                </>
                              )}
                            </p>
                          </div>

                          {sort === "distance" && miles != null && i === 0 && (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                              Closest
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ color: t.pin, background: `${t.pin}14`, border: `1px solid ${t.pin}40` }}
                          >
                            {t.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-primary/25 bg-primary/8 text-primary">
                            <CalendarClock className="w-3 h-3" />
                            {showingLabel(c.region)}
                          </span>
                          {m.transferFee != null && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/60 text-foreground/70">
                              <Receipt className="w-3 h-3" />
                              {money(m.transferFee)} transfer
                            </span>
                          )}
                        </div>


                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3.5 pt-3 border-t border-border/50 text-[11px] font-semibold">
                          <Link
                            to={cemeteryPath(c.name)}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:opacity-75 transition-opacity"
                          >
                            View profile <ArrowUpRight className="w-3 h-3" />
                          </Link>
                          <a
                            href={directionsUrl(c, here)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-accent hover:opacity-75 transition-opacity"
                          >
                            <Navigation className="w-3 h-3" /> Directions
                          </a>
                          {m.website && (
                            <a
                              href={m.website}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              onClick={(e) => e.stopPropagation()}
                              title={hostOf(m.website)}
                              className="inline-flex items-center gap-1 text-foreground/55 hover:text-foreground transition-colors ml-auto"
                            >
                              <Globe className="w-3 h-3" /> Official site
                            </a>
                          )}
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
      </div>
    </section>
  );
};

export default MetroCemeteryMap;
