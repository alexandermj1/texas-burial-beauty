/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Plus, Trash2, Route, RefreshCw, X, Search, Phone, Globe, ArrowRight, Navigation } from "lucide-react";

type Cemetery = {
  id: string; name: string; city: string | null; address: string | null;
  county: string | null;
  latitude: number | null; longitude: number | null;
  contact_phone: string | null; website: string | null; description: string | null;
};

type Agent = { id: string; name: string; role: string | null; city: string | null; address: string | null; latitude: number | null; longitude: number | null; color: string | null; notes: string | null };
type Selected = { kind: "cemetery" | "agent"; id: string; name: string; lat: number; lng: number };

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let gmapsPromise: Promise<typeof google> | null = null;
function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== "undefined" && (window as any).google?.maps) return Promise.resolve((window as any).google);
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    if (!BROWSER_KEY) { reject(new Error("Google Maps browser key not configured")); return; }
    (window as any).__initTxMap = () => resolve((window as any).google);
    const s = document.createElement("script");
    const params = new URLSearchParams({ key: BROWSER_KEY, loading: "async", callback: "__initTxMap", libraries: "geometry" });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}
function fmtMiles(m: number) { return `${(m / 1609.344).toFixed(1)} mi`; }

// Deterministic color per cemetery id (matches marker + list dot)
function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 62%, 46%)`;
}

// Deterministic, warmer palette-locked color per county for at-a-glance grouping.
function colorForCounty(county: string | null | undefined): string {
  if (!county) return "hsl(30, 8%, 55%)";
  let h = 0;
  for (let i = 0; i < county.length; i++) h = (h * 33 + county.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 58%, 44%)`;
}



// Simple canonicalizer that mirrors the DB's canonical_cemetery function loosely
function canon(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(cemetery|memorial park|memorial|mortuary|mausoleum|association|assoc|funeral home|park|gardens?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TEXAS_CENTER = { lat: 31.4, lng: -99.5 };

interface Props {
  onViewSubmissions?: (cemeteryName: string) => void;
}

export default function TexasMapPanel({ onViewSubmissions }: Props) {
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selection, setSelection] = useState<Selected[]>([]);
  const [route, setRoute] = useState<{ durationSeconds: number; distanceMeters: number; polyline: string | null } | null>(null);
  const [routing, setRouting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", role: "", city: "", address: "" });
  const [detail, setDetail] = useState<Cemetery | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [searchLoc, setSearchLoc] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [countyFilter, setCountyFilter] = useState<string | null>(null);



  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, a, subs] = await Promise.all([
      supabase.from("texas_cemeteries").select("id,name,city,address,county,latitude,longitude,contact_phone,website,description").order("name"),
      supabase.from("agent_locations" as any).select("*").order("name"),
      supabase.from("contact_submissions").select("cemetery").not("cemetery", "is", null),
    ]);
    if (c.data) setCemeteries(c.data as any);
    if (a.data) setAgents(a.data as any);
    if (subs.data) {
      const map = new Map<string, number>();
      (subs.data as any[]).forEach((s) => {
        const k = String(s.cemetery || "").trim().toLowerCase();
        if (!k) return;
        map.set(k, (map.get(k) || 0) + 1);
      });
      setSubmissionCounts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Color cemeteries by county so the map reads as a regional heat map at a glance.
  const enriched = useMemo(() => {
    return cemeteries.map((c) => {
      const key = String(c.name || "").trim().toLowerCase();
      return { ...c, color: colorForCounty(c.county), count: submissionCounts.get(key) || 0 };
    });
  }, [cemeteries, submissionCounts]);

  // County chips (sorted by count desc)
  const countyStats = useMemo(() => {
    const m = new Map<string, number>();
    cemeteries.forEach((c) => {
      const k = (c.county || "").trim();
      if (!k) return;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [cemeteries]);

  const visible = useMemo(
    () => (countyFilter ? enriched.filter((c) => (c.county || "") === countyFilter) : enriched),
    [enriched, countyFilter]
  );


  // Initialize map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !mapDiv.current) return;
      mapRef.current = new g.maps.Map(mapDiv.current, {
        center: TEXAS_CENTER,
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#f5efe6" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#f5efe6" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#5c4a3a" }] },
          { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#8a9a5b" }] },
          { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e8e0cc" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e0d3b8" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#b8cfd8" }] },
        ],
      });
      setMapReady(true);
    }).catch((e) => {
      console.error(e);
      toast({ title: "Map failed to load", description: e.message, variant: "destructive" });
    });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback((item: Selected) => {
    setRoute(null);
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    setSelection((prev) => {
      const exists = prev.find((p) => p.kind === item.kind && p.id === item.id);
      if (exists) return prev.filter((p) => !(p.kind === item.kind && p.id === item.id));
      const next = [...prev, item];
      return next.length > 2 ? next.slice(-2) : next;
    });
  }, []);

  // Render markers whenever data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const g = (window as any).google as typeof google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new g.maps.LatLngBounds();
    let count = 0;

    visible.forEach((c) => {
      if (c.latitude == null || c.longitude == null) return;
      const pos = { lat: Number(c.latitude), lng: Number(c.longitude) };
      const marker = new g.maps.Marker({
        position: pos,
        map: mapRef.current!,
        title: `${c.name} — ${c.count} submission${c.count === 1 ? "" : "s"}`,
        label: c.count > 0 ? { text: String(c.count), color: "#ffffff", fontSize: "11px", fontWeight: "700" } : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: c.count > 0 ? 12 : 8,
          fillColor: c.color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setDetail(c);
        mapRef.current!.panTo(pos);
      });
      markersRef.current.push(marker);
      bounds.extend(pos);
      count++;
    });

    agents.forEach((a) => {
      if (a.latitude == null || a.longitude == null) return;
      const pos = { lat: Number(a.latitude), lng: Number(a.longitude) };
      const marker = new g.maps.Marker({
        position: pos,
        map: mapRef.current!,
        title: a.name,
        icon: {
          path: "M -8 0 L 0 -14 L 8 0 L 0 8 Z",
          scale: 1.2,
          fillColor: a.color || "#c96f4a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        handleSelect({ kind: "agent", id: a.id, name: a.name, lat: pos.lat, lng: pos.lng });
      });
      markersRef.current.push(marker);
      bounds.extend(pos);
      count++;
    });

    if (count > 1 && !searchLoc && !detail) mapRef.current.fitBounds(bounds, 60);
    else if (count === 1 && !searchLoc) { mapRef.current.setCenter(bounds.getCenter()); mapRef.current.setZoom(9); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, agents, mapReady, handleSelect]);

  // User search marker
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const g = (window as any).google as typeof google;
    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
    if (searchLoc) {
      userMarkerRef.current = new g.maps.Marker({
        position: { lat: searchLoc.lat, lng: searchLoc.lng },
        map: mapRef.current,
        title: searchLoc.label,
        icon: {
          path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#1f2937",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 999,
      });
      mapRef.current.panTo({ lat: searchLoc.lat, lng: searchLoc.lng });
      mapRef.current.setZoom(9);
    }
  }, [searchLoc, mapReady]);

  // Draw polyline when route arrives
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const g = (window as any).google as typeof google;
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (route?.polyline) {
      const path = g.maps.geometry?.encoding?.decodePath?.(route.polyline);
      if (path) {
        polylineRef.current = new g.maps.Polyline({
          path, geodesic: true, strokeColor: "#c96f4a", strokeOpacity: 0.9, strokeWeight: 4, map: mapRef.current,
        });
      }
    }
  }, [route, mapReady]);

  const runGeocode = async () => {
    setGeocoding(true);
    const { data, error } = await supabase.functions.invoke("map-geocode", { body: { target: "cemeteries" } });
    setGeocoding(false);
    if (error) { toast({ title: "Geocode failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Geocoded", description: `${(data as any)?.updated ?? 0} cemeteries updated` });
    fetchAll();
  };

  const computeRoute = async () => {
    if (selection.length !== 2) return;
    setRouting(true);
    const [a, b] = selection;
    const { data, error } = await supabase.functions.invoke("map-route", {
      body: { origin: { lat: a.lat, lng: a.lng }, destination: { lat: b.lat, lng: b.lng } },
    });
    setRouting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Route failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setRoute(data as any);
  };

  const addAgent = async () => {
    if (!newAgent.name.trim()) return;
    let lat: number | null = null, lng: number | null = null;
    const q = [newAgent.address, newAgent.city, "TX"].filter(Boolean).join(", ");
    if (q) {
      const { data } = await supabase.functions.invoke("map-geocode", { body: { target: "query", query: q } });
      if ((data as any)?.location) { lat = (data as any).location.lat; lng = (data as any).location.lng; }
    }
    const { error } = await supabase.from("agent_locations" as any).insert({
      name: newAgent.name, role: newAgent.role || null, city: newAgent.city || null,
      address: newAgent.address || null, latitude: lat, longitude: lng,
    });
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setNewAgent({ name: "", role: "", city: "", address: "" });
    setAddOpen(false);
    fetchAll();
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Delete this agent location?")) return;
    const { error } = await supabase.from("agent_locations" as any).delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  const searchAddress = async () => {
    if (!addressQuery.trim()) return;
    setSearching(true);
    const q = addressQuery.trim();
    const { data, error } = await supabase.functions.invoke("map-geocode", { body: { target: "query", query: q } });
    setSearching(false);
    if (error || !(data as any)?.location) {
      toast({ title: "Couldn't find that address", description: error?.message || "Try adding city + state", variant: "destructive" });
      return;
    }
    const loc = (data as any).location;
    setSearchLoc({ lat: loc.lat, lng: loc.lng, label: q });
    setDetail(null);
  };

  const clearSearch = () => { setSearchLoc(null); setAddressQuery(""); };

  const nearestToSearch = useMemo(() => {
    if (!searchLoc) return [];
    return enriched
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({ ...c, dist: haversineMi(searchLoc.lat, searchLoc.lng, Number(c.latitude), Number(c.longitude)) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [searchLoc, enriched]);

  const missingGeo = cemeteries.filter((c) => c.latitude == null || c.longitude == null).length;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-soft min-h-[620px]">
        <div ref={mapDiv} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading map…</div>
          </div>
        )}

        {/* Address search */}
        <div className="absolute top-3 left-3 right-3 md:right-auto md:w-[420px] flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Enter an address to find nearest cemeteries…"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAddress()}
              className="w-full pl-9 pr-8 py-2 rounded-full bg-card/95 backdrop-blur border border-border text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {(addressQuery || searchLoc) && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <button onClick={searchAddress} disabled={searching || !addressQuery.trim()} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-md hover:opacity-90 disabled:opacity-50">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
          </button>
        </div>

        {/* Selection / route overlay */}
        {selection.length > 0 && (
          <div className="absolute top-16 left-3 right-3 md:right-auto md:max-w-md bg-card/95 backdrop-blur rounded-xl border border-border shadow-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Selected ({selection.length}/2)</p>
              <button onClick={() => { setSelection([]); setRoute(null); if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; } }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            {selection.map((s, i) => (
              <div key={s.kind + s.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium grid place-items-center">{i === 0 ? "A" : "B"}</span>
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{s.kind}</span>
              </div>
            ))}
            {selection.length === 2 && (
              <button onClick={computeRoute} disabled={routing} className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {routing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />} Drive time
              </button>
            )}
            {route && (
              <div className="mt-1 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-muted/60 py-2">
                  <p className="text-[11px] text-muted-foreground">Drive time</p>
                  <p className="text-lg font-display text-foreground">{fmtDuration(route.durationSeconds)}</p>
                </div>
                <div className="rounded-lg bg-muted/60 py-2">
                  <p className="text-[11px] text-muted-foreground">Distance</p>
                  <p className="text-lg font-display text-foreground">{fmtMiles(route.distanceMeters)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cemetery detail card */}
        {detail && (
          <div className="absolute bottom-3 right-3 left-3 md:left-auto md:w-[380px] bg-card rounded-2xl border border-border shadow-xl p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 w-4 h-4 rounded-full shrink-0 border-2 border-white shadow" style={{ background: colorFor(detail.id) }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-base text-foreground leading-tight">{detail.name}</h4>
                  <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                {detail.city && <p className="text-xs text-muted-foreground mt-0.5">{detail.city}, TX</p>}
                {detail.address && <p className="text-sm text-foreground/80 mt-2 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />{detail.address}</p>}
                {detail.contact_phone && <p className="text-sm text-foreground/80 mt-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><a href={`tel:${detail.contact_phone}`} className="hover:text-primary">{detail.contact_phone}</a></p>}
                {detail.website && <p className="text-sm mt-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-muted-foreground" /><a href={detail.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{detail.website.replace(/^https?:\/\//, "")}</a></p>}
                {detail.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{detail.description}</p>}

                {(() => {
                  const en = enriched.find((c) => c.id === detail.id);
                  const cnt = en?.count || 0;
                  return (
                    <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-border">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Submissions</p>
                        <p className="text-xl font-display" style={{ color: colorFor(detail.id) }}>{cnt}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {onViewSubmissions && (
                          <button
                            onClick={() => { onViewSubmissions(detail.name); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                          >
                            View submissions <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {detail.latitude != null && detail.longitude != null && (
                          <button
                            onClick={() => handleSelect({ kind: "cemetery", id: detail.id, name: detail.name, lat: Number(detail.latitude), lng: Number(detail.longitude) })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs hover:bg-muted"
                          >
                            Add to route <Route className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur rounded-lg border border-border shadow-md px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary border-2 border-white" /> Cemetery (# = submissions)</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rotate-45 bg-[#c96f4a] border-2 border-white" /> Agent</div>
          {searchLoc && <div className="flex items-center gap-2"><Navigation className="w-3 h-3 text-foreground" /> Your search</div>}
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        {searchLoc && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-base text-foreground">Nearest cemeteries</h3>
                <p className="text-[11px] text-muted-foreground truncate">to {searchLoc.label}</p>
              </div>
              <button onClick={clearSearch} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1 text-sm max-h-72 overflow-y-auto">
              {nearestToSearch.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDetail(c)}
                  className="w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 hover:bg-muted/60"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 truncate">
                    <span className="text-foreground">{c.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{c.city || ""}{c.count > 0 ? ` · ${c.count} sub` : ""}</span>
                  </span>
                  <span className="text-[11px] font-medium text-primary shrink-0">{c.dist.toFixed(1)} mi</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base text-foreground">Cemeteries</h3>
            <span className="text-xs text-muted-foreground">{cemeteries.length} total</span>
          </div>
          {missingGeo > 0 && (
            <div className="mb-3 text-xs bg-muted/60 rounded-lg p-2 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{missingGeo} missing coordinates</span>
              <button onClick={runGeocode} disabled={geocoding} className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50">
                {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Geocode
              </button>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto space-y-1 text-sm">
            {loading ? <p className="text-muted-foreground text-xs">Loading…</p> : enriched.map((c) => {
              const has = c.latitude != null && c.longitude != null;
              return (
                <button key={c.id}
                  onClick={() => has && setDetail(c)}
                  disabled={!has}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors hover:bg-muted/60 ${!has ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: c.color + "22", color: c.color }}>{c.count}</span>}
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{c.city || "—"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base text-foreground">Agents</h3>
            <button onClick={() => setAddOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="w-3 h-3" /> Add</button>
          </div>
          {addOpen && (
            <div className="mb-3 space-y-2 bg-muted/40 rounded-lg p-2">
              <input placeholder="Name" value={newAgent.name} onChange={(e) => setNewAgent((p) => ({ ...p, name: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              <input placeholder="Role (optional)" value={newAgent.role} onChange={(e) => setNewAgent((p) => ({ ...p, role: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              <input placeholder="Address" value={newAgent.address} onChange={(e) => setNewAgent((p) => ({ ...p, address: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              <input placeholder="City" value={newAgent.city} onChange={(e) => setNewAgent((p) => ({ ...p, city: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              <button onClick={addAgent} className="w-full px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium">Save</button>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto space-y-1 text-sm">
            {agents.length === 0 ? <p className="text-muted-foreground text-xs">No agents yet.</p> : agents.map((a) => {
              const has = a.latitude != null && a.longitude != null;
              const isSel = !!selection.find((s) => s.kind === "agent" && s.id === a.id);
              return (
                <div key={a.id} className={`px-2 py-1.5 rounded-lg flex items-center gap-2 ${isSel ? "bg-primary/10" : "hover:bg-muted/60"}`}>
                  <button onClick={() => has && handleSelect({ kind: "agent", id: a.id, name: a.name, lat: Number(a.latitude), lng: Number(a.longitude) })} disabled={!has} className={`flex-1 text-left flex items-center gap-2 min-w-0 ${!has ? "opacity-50" : ""}`}>
                    <span className="w-2.5 h-2.5 rotate-45 shrink-0" style={{ background: a.color || "#c96f4a" }} />
                    <span className="truncate">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{a.city || ""}</span>
                  </button>
                  <button onClick={() => deleteAgent(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground px-1">
          Click a cemetery dot to see details and submissions. Use "Add to route" on two locations to calculate drive time.
        </p>
      </div>
    </div>
  );
}
