import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Navigation, MapPin, Search } from "lucide-react";
import { CemeteryInfo } from "@/data/cemeteries";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Zip code to approximate lat/lng (Bay Area zips)
const zipToCoords = (zip: string): { lat: number; lng: number } | null => {
  const zipNum = parseInt(zip);
  if (zipNum >= 94000 && zipNum <= 94099) return { lat: 37.75, lng: -122.45 };
  if (zipNum >= 94100 && zipNum <= 94199) return { lat: 37.75, lng: -122.42 };
  if (zipNum >= 94200 && zipNum <= 94299) return { lat: 37.55, lng: -122.27 };
  if (zipNum >= 94300 && zipNum <= 94399) return { lat: 37.45, lng: -122.18 };
  if (zipNum >= 94400 && zipNum <= 94499) return { lat: 37.60, lng: -122.40 };
  if (zipNum >= 94500 && zipNum <= 94599) return { lat: 37.80, lng: -122.25 };
  if (zipNum >= 94600 && zipNum <= 94699) return { lat: 37.80, lng: -122.20 };
  if (zipNum >= 94700 && zipNum <= 94799) return { lat: 37.87, lng: -122.27 };
  if (zipNum >= 94800 && zipNum <= 94899) return { lat: 37.93, lng: -122.35 };
  if (zipNum >= 94900 && zipNum <= 94999) return { lat: 37.95, lng: -122.50 };
  if (zipNum >= 95000 && zipNum <= 95199) return { lat: 37.34, lng: -121.89 };
  if (zipNum >= 95400 && zipNum <= 95499) return { lat: 38.44, lng: -122.71 };
  if (zipNum >= 93900 && zipNum <= 93999) return { lat: 36.62, lng: -121.85 };
  if (zipNum >= 93700 && zipNum <= 93799) return { lat: 36.74, lng: -119.79 };
  return { lat: 37.56, lng: -122.33 };
};

interface Props {
  cemeteries: CemeteryInfo[];
}

const NearestCemeteryFinder = ({ cemeteries }: Props) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [zipSearch, setZipSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleGeolocate = () => {
    setLoading(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Try entering a zip code instead.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowResults(true);
        setLoading(false);
      },
      () => {
        setLocationError("Unable to get your location. Try entering a zip code instead.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleZipSearch = () => {
    if (zipSearch.length < 5) return;
    const coords = zipToCoords(zipSearch);
    if (coords) {
      setUserLocation(coords);
      setShowResults(true);
      setLocationError("");
    }
  };

  const nearestCemeteries = useMemo(() => {
    if (!userLocation) return [];
    const withDistance = cemeteries.map(cem => {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, cem.lat, cem.lng);
      return { ...cem, distance: dist };
    });

    const seen = new Set<string>();
    const unique = withDistance.filter(c => {
      const key = `${c.name}-${c.city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => a.distance - b.distance).slice(0, 8);
  }, [userLocation, cemeteries]);

  return (
    <section className="py-8 bg-gradient-warm">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-card rounded-2xl p-6 md:p-8 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl text-foreground">Find Cemeteries Near You</h3>
              <p className="text-sm text-muted-foreground">Share your location or enter a zip code</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleGeolocate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Navigation className="w-4 h-4" />
              {loading ? "Finding..." : "Use My Location"}
            </button>
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter zip code (e.g. 94401)"
                  value={zipSearch}
                  onChange={e => setZipSearch(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  onKeyDown={e => e.key === "Enter" && handleZipSearch()}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleZipSearch}
                disabled={zipSearch.length < 5}
                className="px-5 py-2.5 bg-card border border-border text-sm font-medium rounded-full hover:bg-muted transition-colors disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>

          {locationError && (
            <p className="text-sm text-destructive mb-4">{locationError}</p>
          )}

          {showResults && nearestCemeteries.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {nearestCemeteries.map((cem, i) => (
                <motion.div
                  key={`${cem.name}-${cem.city}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-background rounded-lg p-4 border border-border"
                >
                  <h4 className="font-display text-sm text-foreground mb-1">{cem.name}</h4>
                  <p className="text-xs text-muted-foreground mb-1">{cem.address}</p>
                  <p className="text-xs text-primary font-medium mt-2">{cem.distance.toFixed(1)} miles away</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default NearestCemeteryFinder;
