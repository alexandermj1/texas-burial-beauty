import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Layers, MapPin, Maximize2 } from "lucide-react";

interface Props {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Optional caption under the map. */
  note?: string;
  /** Tailwind height classes for the map canvas. */
  heightClass?: string;
}


const ACCENT = "#c1704a";

const markerIcon = () =>
  L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 34 44">
      <path d="M17 43C17 43 32 27.2 32 16.5 32 8.0 25.3 1 17 1S2 8.0 2 16.5C2 27.2 17 43 17 43Z" fill="${ACCENT}" stroke="#fff" stroke-width="2.4"/>
      <circle cx="17" cy="16.5" r="5.4" fill="#fff"/>
    </svg>`,
    iconSize: [40, 52],
    iconAnchor: [20, 50],
  });

/**
 * Single-cemetery locator with a satellite toggle. Aerial view is genuinely
 * useful here — families use it to orient themselves to gardens and entrances
 * before they visit.
 */
const CemeteryLocationMap = ({ name, address, lat, lng, note, heightClass = "h-[300px] md:h-[440px]" }: Props) => {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const streetLayer = useRef<L.TileLayer | null>(null);
  const satLayer = useRef<L.TileLayer | null>(null);
  const [satellite, setSatellite] = useState(true);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      center: [lat, lng],
      zoom: 16,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });
    streetLayer.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 20,
    });
    satLayer.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Imagery &copy; Esri", maxZoom: 19 },
    );
    satLayer.current.addTo(m);
    L.marker([lat, lng], { icon: markerIcon(), title: name }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [lat, lng, name]);

  useEffect(() => {
    const m = map.current;
    if (!m || !streetLayer.current || !satLayer.current) return;
    if (satellite) {
      m.removeLayer(streetLayer.current);
      satLayer.current.addTo(m);
    } else {
      m.removeLayer(satLayer.current);
      streetLayer.current.addTo(m);
    }
  }, [satellite]);

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${name}, ${address}`)}`;

  return (
    <div className="rounded-[28px] overflow-hidden border border-border bg-card">
      <div className="relative">
        <div ref={el} className={`${heightClass} w-full z-0`} aria-label={`Map of ${name}`} />

        <button
          type="button"
          onClick={() => setSatellite((s) => !s)}
          className="absolute top-4 right-4 z-[400] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-background/95 backdrop-blur border border-border text-xs font-medium text-foreground shadow-sm hover:border-primary transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          {satellite ? "Street map" : "Satellite"}
        </button>
      </div>

      <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between border-t border-border/70">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{address}</p>
            {note && <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">{note}</p>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:bg-primary transition-colors"
          >
            <Navigation className="w-4 h-4" /> Directions
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border text-sm font-medium text-foreground hover:border-primary transition-colors"
            aria-label="Open larger map"
          >
            <Maximize2 className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default CemeteryLocationMap;
