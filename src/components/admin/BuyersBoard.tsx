/// <reference types="google.maps" />
// Buyers workspace — a dedicated view inside the Submissions tab.
//
// A buyer's job-to-be-done is different from a seller's: there is no paperwork
// pipeline, only "who is asking for what, and do we have inventory at that
// cemetery?". So this board is built around matching:
//   left   → buyer queue (search + match-aware filters)
//   right  → the buyer, their request, a map of their cemetery + nearby
//            inventory, and the ranked list of sellers we could pair them with.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, MapPin, Mail, Phone, Users, Sparkles, ArrowRight, Loader2,
  Building2, Clock, DollarSign, Send, ExternalLink, Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cemeteryCanon } from "@/lib/cemeteryCanon";
import { loadGoogleMaps, brandMapStyles, hasMapsKey } from "@/lib/googleMaps";
import { properCase } from "@/lib/properCase";
import { resolveKind } from "./CustomerKindBadge";
import SendBuyerPlotCardsDialog from "./SendBuyerPlotCardsDialog";

type Row = Record<string, any>;

interface Props {
  submissions: Row[];
  adminName?: string;
  /** Jump back to the classic pipeline view with this submission open. */
  onOpenSubmission: (id: string) => void;
}

type Cem = {
  id: string; name: string; city: string | null; county: string | null;
  latitude: number | null; longitude: number | null; transfer_fee: number | null;
};

type MatchKind = "ready" | "pipeline";
type Match = {
  seller: Row;
  kind: MatchKind;
  miles: number | null;
  cemetery: string;
};

const RADIUS_MI = 30;

const fmtUsd = (v: number | null | undefined) =>
  v == null ? null : Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

function haversineMi(a: [number, number], b: [number, number]) {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** A seller plot is sellable when it isn't sold and we've agreed terms or it's live. */
const isReady = (s: Row) =>
  !s.sold_at && (s.quote_response === "accepted" || !!s.listing_live_at || s.list_price != null || s.accepted_quote_amount != null);

const BuyersBoard = ({ submissions, adminName, onOpenSubmission }: Props) => {
  const [cems, setCems] = useState<Cem[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "none" | "week">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardsOpen, setCardsOpen] = useState(false);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapErr, setMapErr] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      const { data } = await supabase
        .from("texas_cemeteries" as any)
        .select("id,name,city,county,latitude,longitude,transfer_fee")
        .is("deleted_at", null);
      if (!off) setCems(((data as any[]) ?? []) as Cem[]);
    })();
    return () => { off = true; };
  }, []);

  const cemByCanon = useMemo(() => {
    const m = new Map<string, Cem>();
    for (const c of cems) {
      const k = cemeteryCanon(c.name);
      if (k && !m.has(k)) m.set(k, c);
    }
    return m;
  }, [cems]);

  const buyers = useMemo(
    () => submissions
      .filter(s => resolveKind(s.customer_kind, s.source) === "buyer" && !s.deleted_at && !s.archived_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [submissions],
  );

  const sellers = useMemo(
    () => submissions.filter(s => resolveKind(s.customer_kind, s.source) === "seller" && !s.deleted_at && !s.archived_at),
    [submissions],
  );

  /** Everything we could offer a buyer, grouped by canonical cemetery. */
  const inventoryByCem = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const s of sellers) {
      const k = cemeteryCanon(s.cemetery || "");
      if (!k) continue;
      const arr = m.get(k);
      if (arr) arr.push(s); else m.set(k, [s]);
    }
    return m;
  }, [sellers]);

  /** Ranked matches for a buyer: same cemetery first, then within 30 miles. */
  const matchesFor = useMemo(() => {
    const cache = new Map<string, Match[]>();
    return (buyer: Row): Match[] => {
      if (cache.has(buyer.id)) return cache.get(buyer.id)!;
      const key = cemeteryCanon(buyer.cemetery || "");
      const out: Match[] = [];
      const push = (list: Row[] | undefined, miles: number | null, cemName: string) => {
        for (const s of list ?? []) {
          if (s.sold_at) continue;
          out.push({ seller: s, kind: isReady(s) ? "ready" : "pipeline", miles, cemetery: cemName || s.cemetery || "" });
        }
      };
      if (key) push(inventoryByCem.get(key), 0, buyer.cemetery || "");

      const origin = key ? cemByCanon.get(key) : undefined;
      if (origin?.latitude != null && origin?.longitude != null) {
        for (const c of cems) {
          const ck = cemeteryCanon(c.name);
          if (!ck || ck === key || c.latitude == null || c.longitude == null) continue;
          const list = inventoryByCem.get(ck);
          if (!list?.length) continue;
          const miles = haversineMi([origin.latitude, origin.longitude], [c.latitude, c.longitude]);
          if (miles > RADIUS_MI) continue;
          push(list, miles, c.name);
        }
      }
      out.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "ready" ? -1 : 1;
        return (a.miles ?? 999) - (b.miles ?? 999);
      });
      cache.set(buyer.id, out);
      return out;
    };
  }, [inventoryByCem, cemByCanon, cems]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 864e5;
    return buyers.filter(b => {
      if (needle) {
        const hay = [b.name, b.email, b.phone, b.cemetery, b.message, b.details].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filter === "week") return new Date(b.created_at).getTime() >= weekAgo;
      if (filter === "ready") return matchesFor(b).some(m => m.kind === "ready");
      if (filter === "none") return matchesFor(b).length === 0;
      return true;
    });
  }, [buyers, q, filter, matchesFor]);

  const selected = useMemo(
    () => visible.find(b => b.id === selectedId) ?? buyers.find(b => b.id === selectedId) ?? visible[0] ?? null,
    [visible, buyers, selectedId],
  );

  const selMatches = selected ? matchesFor(selected) : [];
  const readyCount = selMatches.filter(m => m.kind === "ready").length;

  // ---- Map: buyer's cemetery + every cemetery we have inventory at nearby ----
  useEffect(() => {
    if (!selected || !mapEl.current) return;
    if (!hasMapsKey()) { setMapErr("Map key not configured"); return; }
    let cancelled = false;
    (async () => {
      try {
        const g = await loadGoogleMaps([]);
        if (cancelled || !mapEl.current) return;
        const key = cemeteryCanon(selected.cemetery || "");
        const home = key ? cemByCanon.get(key) : undefined;
        const center = home?.latitude != null && home?.longitude != null
          ? { lat: Number(home.latitude), lng: Number(home.longitude) }
          : { lat: 32.7767, lng: -96.797 };

        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(mapEl.current, {
            center, zoom: 10, styles: brandMapStyles, disableDefaultUI: true,
            zoomControl: true, gestureHandling: "greedy",
          });
        }
        const map = mapRef.current;
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const bounds = new g.maps.LatLngBounds();
        const dot = (color: string, scale: number) => ({
          path: g.maps.SymbolPath.CIRCLE, scale,
          fillColor: color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2,
        });

        if (home?.latitude != null && home?.longitude != null) {
          const pos = { lat: Number(home.latitude), lng: Number(home.longitude) };
          markersRef.current.push(new g.maps.Marker({
            map, position: pos, icon: dot("hsl(15, 55%, 48%)", 10), zIndex: 30,
            title: `${home.name} — buyer's cemetery`,
          }));
          bounds.extend(pos);
        }

        const seen = new Set<string>();
        for (const m of selMatches) {
          const ck = cemeteryCanon(m.cemetery);
          if (!ck || seen.has(ck)) continue;
          seen.add(ck);
          const c = cemByCanon.get(ck);
          if (!c || c.latitude == null || c.longitude == null) continue;
          const pos = { lat: Number(c.latitude), lng: Number(c.longitude) };
          const ready = selMatches.some(x => cemeteryCanon(x.cemetery) === ck && x.kind === "ready");
          markersRef.current.push(new g.maps.Marker({
            map, position: pos, icon: dot(ready ? "hsl(150, 45%, 34%)" : "hsl(38, 60%, 48%)", 7),
            title: `${c.name} — ${ready ? "inventory ready" : "sellers in pipeline"}`,
          }));
          bounds.extend(pos);
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 48);
          if (markersRef.current.length === 1) map.setZoom(11);
        } else {
          map.setCenter(center);
        }
        setMapErr(null);
      } catch (e: any) {
        setMapErr(String(e?.message ?? e));
      }
    })();
    return () => { cancelled = true; };
  }, [selected, cemByCanon, selMatches]);

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
      active ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"
    }`;

  return (
    <div className="lg:col-span-12 grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* ── Buyer queue ─────────────────────────────────────────────── */}
      <div className="xl:col-span-4 space-y-3">
        <div className="rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-3 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search buyers, cemeteries, phone…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setFilter("all")} className={chip(filter === "all")}>All ({buyers.length})</button>
            <button onClick={() => setFilter("ready")} className={chip(filter === "ready")}>
              <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Matchable</span>
            </button>
            <button onClick={() => setFilter("none")} className={chip(filter === "none")}>No inventory</button>
            <button onClick={() => setFilter("week")} className={chip(filter === "week")}>This week</button>
          </div>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
              No buyers match this view.
            </div>
          )}
          {visible.map(b => {
            const ms = matchesFor(b);
            const ready = ms.filter(m => m.kind === "ready").length;
            const active = selected?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  active
                    ? "border-primary/50 bg-primary/[0.06] shadow-[0_4px_16px_-12px_hsl(var(--primary)/0.5)]"
                    : "border-border/60 bg-card hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{properCase(b.name || "Unnamed buyer")}</p>
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {b.cemetery || "No cemetery given"}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(b.created_at)}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {ready > 0 ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {ready} ready to offer
                    </span>
                  ) : ms.length > 0 ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {ms.length} in pipeline
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      No inventory yet
                    </span>
                  )}
                  {b.plot_count || b.spaces ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {b.plot_count || b.spaces} space{String(b.plot_count || b.spaces) === "1" ? "" : "s"}
                    </span>
                  ) : null}
                  {b.property_type ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{b.property_type}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Buyer detail ────────────────────────────────────────────── */}
      <div className="xl:col-span-8">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-16 text-center text-sm text-muted-foreground">
            Select a buyer to see their match board.
          </div>
        ) : (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.18)] p-5 space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-display text-xl text-foreground">{properCase(selected.name || "Unnamed buyer")}</h3>
                <div className="mt-1 flex items-center gap-3 flex-wrap text-[12px] text-muted-foreground">
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Mail className="w-3.5 h-3.5" /> {selected.email}
                    </a>
                  )}
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Phone className="w-3.5 h-3.5" /> {selected.phone}
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtDate(selected.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCardsOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Send className="w-3 h-3" /> Send plot cards
                </button>
                <button
                  onClick={() => onOpenSubmission(selected.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted"
                >
                  <ExternalLink className="w-3 h-3" /> Open thread
                </button>
              </div>
            </div>

            {/* What they asked for */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Building2, label: "Cemetery", value: selected.cemetery || "—" },
                { icon: Users, label: "Spaces", value: String(selected.plot_count || selected.spaces || "—") },
                { icon: MapPin, label: "Type", value: selected.property_type || "—" },
                { icon: DollarSign, label: "Budget", value: selected.budget || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-border/60 bg-background/60 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Icon className="w-3 h-3" /> {label}
                  </p>
                  <p className="text-sm text-foreground mt-0.5 truncate" title={value}>{value}</p>
                </div>
              ))}
            </div>

            {(selected.message || selected.details) && (
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What they wrote</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selected.message || selected.details}
                </p>
              </div>
            )}

            {/* Map + matches, side by side so you can see place and stock together */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden border border-border/60 bg-background/60">
                <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-border/50">
                  <span className="text-[11px] font-semibold text-foreground inline-flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-muted-foreground" /> Where they're looking
                  </span>
                  <span className="text-[10px] text-muted-foreground">within {RADIUS_MI} mi</span>
                </div>
                <div ref={mapEl} className="h-[300px] w-full bg-muted/40" />
                {mapErr && (
                  <p className="px-3 py-2 text-[11px] text-muted-foreground">Map unavailable — {mapErr}</p>
                )}
                <div className="px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/50">
                  <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block bg-[hsl(15,55%,48%)]" /> Their cemetery</span>
                  <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block bg-[hsl(150,45%,34%)]" /> Inventory ready</span>
                  <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block bg-[hsl(38,60%,48%)]" /> In pipeline</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 flex flex-col">
                <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-border/50">
                  <span className="text-[11px] font-semibold text-foreground inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" /> Possible matches
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {readyCount} ready · {selMatches.length - readyCount} in pipeline
                  </span>
                </div>
                <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50">
                  {selMatches.length === 0 && (
                    <p className="p-6 text-center text-[12px] text-muted-foreground">
                      Nothing at {selected.cemetery || "their cemetery"} yet. They'll surface here the moment a seller
                      comes in nearby.
                    </p>
                  )}
                  {selMatches.map(({ seller: s, kind, miles, cemetery }) => (
                    <button
                      key={s.id}
                      onClick={() => onOpenSubmission(s.id)}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {cemetery || "Cemetery"}{" "}
                            <span className="text-muted-foreground">· {properCase(s.name || "Seller")}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {[s.property_type, s.spaces ? `${s.spaces} space${String(s.spaces) === "1" ? "" : "s"}` : null, s.section]
                              .filter(Boolean).join(" · ") || "Details pending"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            kind === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {kind === "ready" ? "Ready" : "Pipeline"}
                          </span>
                          {miles != null && miles > 0.5 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{miles.toFixed(0)} mi away</p>
                          )}
                          {fmtUsd(s.list_price) && (
                            <p className="text-[11px] text-foreground mt-0.5">{fmtUsd(s.list_price)}</p>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-primary inline-flex items-center gap-1">
                        Open seller <ArrowRight className="w-2.5 h-2.5" />
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {selected && (
        <SendBuyerPlotCardsDialog
          open={cardsOpen}
          onClose={() => setCardsOpen(false)}
          buyer={{
            id: selected.id,
            name: selected.name,
            email: selected.email,
            cemetery: selected.cemetery,
            property_type: selected.property_type,
          }}
          adminName={adminName}
        />
      )}
    </div>
  );
};

export default BuyersBoard;
