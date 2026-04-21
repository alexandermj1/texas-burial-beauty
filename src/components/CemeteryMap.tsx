import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const cemeteries = [
  { name: "Rose Hills Memorial Park", city: "Whittier", lat: 33.99, lng: -118.03, x: 58, y: 52 },
  { name: "Forest Lawn Memorial Park", city: "Glendale", lat: 34.13, lng: -118.25, x: 50, y: 38 },
  { name: "Pacific View Memorial Park", city: "Corona del Mar", lat: 33.59, lng: -117.87, x: 65, y: 72 },
  { name: "Green Hills Memorial Park", city: "Rancho Palos Verdes", lat: 33.77, lng: -118.36, x: 42, y: 62 },
  { name: "El Camino Memorial Park", city: "San Diego", lat: 32.87, lng: -117.21, x: 82, y: 92 },
  { name: "Holy Cross Cemetery", city: "Culver City", lat: 33.98, lng: -118.39, x: 40, y: 50 },
  { name: "Inglewood Park Cemetery", city: "Inglewood", lat: 33.96, lng: -118.35, x: 42, y: 54 },
  { name: "Mountain View Cemetery", city: "Altadena", lat: 34.19, lng: -118.13, x: 54, y: 32 },
  { name: "Harbor Lawn-Mt. Olive", city: "Costa Mesa", lat: 33.66, lng: -117.91, x: 63, y: 68 },
  { name: "Riverside National Cemetery", city: "Riverside", lat: 33.89, lng: -117.44, x: 76, y: 56 },
  { name: "Eternal Hills Memorial Park", city: "Oceanside", lat: 33.18, lng: -117.33, x: 78, y: 82 },
];

const CemeteryMap = () => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="py-16 bg-gradient-warm">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-primary font-medium text-sm tracking-wide mb-2">Our Coverage</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">
            Southern California Cemeteries
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Map container */}
          <div className="relative bg-card rounded-2xl shadow-soft overflow-hidden" style={{ paddingBottom: "70%" }}>
            {/* Stylized map background */}
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                {/* Ocean */}
                <rect width="100" height="100" fill="hsl(200 30% 88%)" />
                {/* Land mass - stylized Southern California */}
                <path
                  d="M 0 0 L 100 0 L 100 45 Q 90 50, 85 55 Q 80 58, 78 65 Q 75 72, 70 75 Q 65 78, 60 80 Q 50 85, 45 82 Q 38 78, 35 72 Q 32 68, 28 65 Q 22 60, 18 58 Q 12 55, 8 52 Q 2 48, 0 45 Z"
                  fill="hsl(38 35% 92%)"
                  stroke="hsl(35 20% 82%)"
                  strokeWidth="0.3"
                />
                {/* Inland texture lines */}
                <path d="M 30 20 Q 50 25, 70 18" fill="none" stroke="hsl(35 20% 86%)" strokeWidth="0.2" />
                <path d="M 25 35 Q 45 40, 65 33" fill="none" stroke="hsl(35 20% 86%)" strokeWidth="0.2" />
                {/* Coastline label */}
                <text x="15" y="75" fill="hsl(200 20% 65%)" fontSize="2.5" fontStyle="italic" opacity="0.6">Pacific Ocean</text>
                {/* Region labels */}
                <text x="42" y="28" fill="hsl(25 10% 55%)" fontSize="1.8" opacity="0.5">Los Angeles County</text>
                <text x="60" y="60" fill="hsl(25 10% 55%)" fontSize="1.8" opacity="0.5">Orange County</text>
                <text x="72" y="48" fill="hsl(25 10% 55%)" fontSize="1.8" opacity="0.5">Riverside County</text>
                <text x="72" y="88" fill="hsl(25 10% 55%)" fontSize="1.8" opacity="0.5">San Diego County</text>
              </svg>
            </div>

            {/* Cemetery pins */}
            {cemeteries.map((cem) => (
              <button
                key={cem.name}
                className="absolute z-10 group"
                style={{ left: `${cem.x}%`, top: `${cem.y}%`, transform: "translate(-50%, -100%)" }}
                onMouseEnter={() => setActive(cem.name)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === cem.name ? null : cem.name)}
              >
                <MapPin
                  className={`w-5 h-5 md:w-6 md:h-6 transition-all drop-shadow-md ${
                    active === cem.name
                      ? "text-accent scale-125"
                      : "text-primary hover:text-accent hover:scale-110"
                  }`}
                  fill={active === cem.name ? "hsl(16 50% 58%)" : "hsl(145 25% 36%)"}
                  strokeWidth={1.5}
                />
                {/* Tooltip */}
                {active === cem.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg"
                  >
                    <p className="font-medium">{cem.name}</p>
                    <p className="opacity-75">{cem.city}, CA</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45 -mt-1" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {cemeteries.map((cem) => (
              <button
                key={cem.name}
                onMouseEnter={() => setActive(cem.name)}
                onMouseLeave={() => setActive(null)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                  active === cem.name
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {cem.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CemeteryMap;
