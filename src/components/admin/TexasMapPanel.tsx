/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Plus, Trash2, Route, RefreshCw, X } from "lucide-react";

type Cemetery = { id: string; name: string; city: string | null; address: string | null; latitude: number | null; longitude: number | null };
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
    const params = new URLSearchParams({ key: BROWSER_KEY, loading: "async", callback: "__initTxMap" });
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

const TEXAS_CENTER = { lat: 31.4, lng: -99.5 };

export default function TexasMapPanel() {
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selection, setSelection] = useState<Selected[]>([]);
  const [route, setRoute] = useState<{ durationSeconds: number; distanceMeters: number; polyline: string | null } | null>(null);
  const [routing, setRouting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", role: "", city: "", address: "" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, a] = await Promise.all([
      supabase.from("texas_cemeteries").select("id,name,city,address,latitude,longitude").order("name"),
      supabase.from("agent_locations" as any).select("*").order("name"),
    ]);
    if (c.data) setCemeteries(c.data as any);
    if (a.data) setAgents(a.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      infoRef.current = new g.maps.InfoWindow();
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

    cemeteries.forEach((c) => {
      if (c.latitude == null || c.longitude == null) return;
      const pos = { lat: Number(c.latitude), lng: Number(c.longitude) };
      const marker = new g.maps.Marker({
        position: pos,
        map: mapRef.current!,
        title: c.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#3f6f4a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        infoRef.current?.setContent(`<div style="font-family:system-ui;font-size:13px"><strong>${c.name}</strong><br/>${c.city || ""}</div>`);
        infoRef.current?.open({ anchor: marker, map: mapRef.current! });
        handleSelect({ kind: "cemetery", id: c.id, name: c.name, lat: pos.lat, lng: pos.lng });
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
        infoRef.current?.setContent(`<div style="font-family:system-ui;font-size:13px"><strong>${a.name}</strong>${a.role ? ` — ${a.role}` : ""}<br/>${a.city || ""}</div>`);
        infoRef.current?.open({ anchor: marker, map: mapRef.current! });
        handleSelect({ kind: "agent", id: a.id, name: a.name, lat: pos.lat, lng: pos.lng });
      });
      markersRef.current.push(marker);
      bounds.extend(pos);
      count++;
    });

    if (count > 1) mapRef.current.fitBounds(bounds, 60);
    else if (count === 1) { mapRef.current.setCenter(bounds.getCenter()); mapRef.current.setZoom(9); }
  }, [cemeteries, agents, mapReady, handleSelect]);

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

  const missingGeo = cemeteries.filter((c) => c.latitude == null || c.longitude == null).length;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4">
      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-soft min-h-[560px]">
        <div ref={mapDiv} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading map…</div>
          </div>
        )}

        {/* Selection / route overlay */}
        {selection.length > 0 && (
          <div className="absolute top-3 left-3 right-3 md:right-auto md:max-w-md bg-card/95 backdrop-blur rounded-xl border border-border shadow-lg p-3 space-y-2">
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

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur rounded-lg border border-border shadow-md px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#3f6f4a] border-2 border-white" /> Cemetery</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rotate-45 bg-[#c96f4a] border-2 border-white" /> Agent</div>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
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
          <div className="max-h-56 overflow-y-auto space-y-1 text-sm">
            {loading ? <p className="text-muted-foreground text-xs">Loading…</p> : cemeteries.map((c) => {
              const has = c.latitude != null && c.longitude != null;
              const isSel = !!selection.find((s) => s.kind === "cemetery" && s.id === c.id);
              return (
                <button key={c.id}
                  onClick={() => has && handleSelect({ kind: "cemetery", id: c.id, name: c.name, lat: Number(c.latitude), lng: Number(c.longitude) })}
                  disabled={!has}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${isSel ? "bg-primary/10 text-primary" : "hover:bg-muted/60"} ${!has ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.city || "—"}</span>
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
          Click any two markers (or list items) to calculate drive time and distance between them.
        </p>
      </div>
    </div>
  );
}
