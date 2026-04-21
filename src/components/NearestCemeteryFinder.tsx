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

// Approximate Texas zip-prefix → lat/lng mapping (covers all major metros).
const zipToCoords = (zip: string): { lat: number; lng: number } | null => {
  const zipNum = parseInt(zip);
  // Dallas–Fort Worth (75xxx, 76xxx)
  if (zipNum >= 75000 && zipNum <= 75399) return { lat: 32.7767, lng: -96.7970 }; // Dallas
  if (zipNum >= 75400 && zipNum <= 75599) return { lat: 32.3513, lng: -95.3011 }; // Tyler / NE TX
  if (zipNum >= 75600 && zipNum <= 75999) return { lat: 32.5007, lng: -94.7405 }; // Longview/Marshall
  if (zipNum >= 76000 && zipNum <= 76199) return { lat: 32.7555, lng: -97.3308 }; // Fort Worth
  if (zipNum >= 76200 && zipNum <= 76299) return { lat: 33.2148, lng: -97.1331 }; // Denton
  if (zipNum >= 76300 && zipNum <= 76399) return { lat: 33.9137, lng: -98.4934 }; // Wichita Falls
  if (zipNum >= 76400 && zipNum <= 76699) return { lat: 32.4487, lng: -99.7331 }; // Abilene
  if (zipNum >= 76700 && zipNum <= 76799) return { lat: 31.5493, lng: -97.1467 }; // Waco
  // Austin / Central (78xxx)
  if (zipNum >= 78600 && zipNum <= 78799) return { lat: 30.2672, lng: -97.7431 }; // Austin
  if (zipNum >= 78900 && zipNum <= 78999) return { lat: 30.0860, lng: -94.1018 }; // SE TX edge
  // San Antonio (78000–78299)
  if (zipNum >= 78000 && zipNum <= 78299) return { lat: 29.4241, lng: -98.4936 };
  // South TX / Valley (78300–78599)
  if (zipNum >= 78300 && zipNum <= 78499) return { lat: 27.8006, lng: -97.3964 }; // Corpus Christi
  if (zipNum >= 78500 && zipNum <= 78599) return { lat: 26.2034, lng: -98.2300 }; // McAllen
  // Houston metro (77xxx)
  if (zipNum >= 77000 && zipNum <= 77299) return { lat: 29.7604, lng: -95.3698 }; // Houston
  if (zipNum >= 77300 && zipNum <= 77399) return { lat: 30.3119, lng: -95.4561 }; // Conroe
  if (zipNum >= 77400 && zipNum <= 77499) return { lat: 29.5635, lng: -95.8076 }; // Rosenberg
  if (zipNum >= 77500 && zipNum <= 77599) return { lat: 29.5805, lng: -95.0608 }; // Galveston
  if (zipNum >= 77600 && zipNum <= 77799) return { lat: 30.0860, lng: -94.1018 }; // Beaumont
  // West TX (79xxx)
  if (zipNum >= 79000 && zipNum <= 79199) return { lat: 35.2220, lng: -101.8313 }; // Amarillo
  if (zipNum >= 79200 && zipNum <= 79499) return { lat: 33.5779, lng: -101.8552 }; // Lubbock
  if (zipNum >= 79500 && zipNum <= 79699) return { lat: 32.4487, lng: -99.7331 }; // Abilene
  if (zipNum >= 79700 && zipNum <= 79899) return { lat: 31.9973, lng: -102.0779 }; // Midland/Odessa
  if (zipNum >= 79900 && zipNum <= 79999) return { lat: 31.7619, lng: -106.4850 }; // El Paso
  // Default — center of Texas
  return { lat: 31.0, lng: -100.0 };
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
                  placeholder="Enter Texas zip (e.g. 75201)"
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
