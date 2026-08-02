/// <reference types="google.maps" />

/**
 * Shared Google Maps JS API loader.
 * Prefers the project's own Maps key (works on the custom domain), falling back
 * to the Lovable connector browser key when it isn't configured.
 */
const KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined);
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let promise: Promise<typeof google> | null = null;

export function hasMapsKey() {
  return Boolean(KEY);
}

export function loadGoogleMaps(libraries: string[] = ["geometry"]): Promise<typeof google> {
  if (typeof window !== "undefined" && (window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    if (!KEY) {
      reject(new Error("Google Maps key not configured"));
      return;
    }
    (window as any).__initLovableMaps = () => resolve((window as any).google);
    const params = new URLSearchParams({
      key: KEY,
      loading: "async",
      callback: "__initLovableMaps",
      libraries: libraries.join(","),
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return promise;
}

/** Warm, editorial map styling that matches the brand palette. */
export const brandMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f6f2ea" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b6154" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f6f2ea" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d9cfbe" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#4a5f4a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dfe8d8" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#eee7db" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fbf8f3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f1e3d2" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e5d3bd" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe0e2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9bb0b2" }] },
];

/** Teardrop pin as an inline SVG data URL, colored per state. */
export function pinIcon(fill: string, stroke = "#ffffff", scale = 1) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${34 * scale}" height="${44 * scale}" viewBox="0 0 34 44">
    <path d="M17 43C17 43 32 27.2 32 16.5 32 8.0 25.3 1 17 1S2 8.0 2 16.5C2 27.2 17 43 17 43Z" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>
    <circle cx="17" cy="16.5" r="5.2" fill="${stroke}" opacity="0.95"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
