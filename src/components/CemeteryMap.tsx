import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

// Pin coordinates are positioned over a stylized Texas SVG.
const cemeteries = [
  { name: "Restland Memorial Park", city: "Dallas", x: 60, y: 40 },
  { name: "Sparkman/Hillcrest Memorial Park", city: "Dallas", x: 59, y: 41 },
  { name: "Greenwood Memorial Park", city: "Fort Worth", x: 56, y: 41 },
  { name: "Mount Olivet Cemetery", city: "Fort Worth", x: 56, y: 42 },
  { name: "Forest Park Lawndale", city: "Houston", x: 70, y: 70 },
  { name: "Memorial Oaks Cemetery", city: "Houston", x: 69, y: 70 },
  { name: "Houston National Cemetery", city: "Houston", x: 70, y: 68 },
  { name: "Austin Memorial Park Cemetery", city: "Austin", x: 58, y: 65 },
  { name: "Texas State Cemetery", city: "Austin", x: 59, y: 65 },
  { name: "San Jose Burial Park", city: "San Antonio", x: 52, y: 72 },
  { name: "Fort Sam Houston National Cemetery", city: "San Antonio", x: 53, y: 71 },
  { name: "Evergreen Cemetery East", city: "El Paso", x: 14, y: 56 },
  { name: "Fort Bliss National Cemetery", city: "El Paso", x: 13, y: 55 },
  { name: "City of Lubbock Cemetery", city: "Lubbock", x: 32, y: 30 },
  { name: "Llano Cemetery", city: "Amarillo", x: 32, y: 12 },
  { name: "Greenleaf Cemetery", city: "Waco", x: 60, y: 53 },
  { name: "Memorial Park Cemetery", city: "Tyler", x: 70, y: 47 },
  { name: "Forest Park Cemetery", city: "Beaumont", x: 80, y: 70 },
  { name: "Seaside Memorial Park", city: "Corpus Christi", x: 60, y: 84 },
  { name: "Memory Gardens", city: "McAllen", x: 56, y: 92 },
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
            Texas Cemeteries — Statewide Reach
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl mx-auto">A representative sample of the cemeteries we work with across Texas.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="relative bg-card rounded-2xl shadow-soft overflow-hidden" style={{ paddingBottom: "85%" }}>
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <rect width="100" height="100" fill="hsl(38 35% 95%)" />
                {/* Stylized Texas outline */}
                <path
                  d="M 28 8 L 68 8 L 70 12 L 78 14 L 82 22 L 86 32 L 84 44 L 80 50 L 78 58 L 76 64 L 82 70 L 84 78 L 78 82 L 70 82 L 66 86 L 62 90 L 56 96 L 50 92 L 44 86 L 38 82 L 32 78 L 26 74 L 18 68 L 12 60 L 8 52 L 10 42 L 14 30 L 20 20 L 24 12 Z"
                  fill="hsl(145 25% 80%)"
                  stroke="hsl(145 25% 50%)"
                  strokeWidth="0.4"
                />
                {/* Region labels */}
                <text x="55" y="40" fill="hsl(25 10% 35%)" fontSize="2.2" opacity="0.65" fontWeight="600">DFW</text>
                <text x="65" y="72" fill="hsl(25 10% 35%)" fontSize="2.2" opacity="0.65" fontWeight="600">Houston</text>
                <text x="55" y="67" fill="hsl(25 10% 35%)" fontSize="1.8" opacity="0.6">Austin</text>
                <text x="48" y="74" fill="hsl(25 10% 35%)" fontSize="1.8" opacity="0.6">San Antonio</text>
                <text x="9" y="58" fill="hsl(25 10% 35%)" fontSize="1.8" opacity="0.6">El Paso</text>
                <text x="86" y="92" fill="hsl(200 25% 55%)" fontSize="2" fontStyle="italic" opacity="0.6">Gulf</text>
              </svg>
            </div>

            {cemeteries.map((cem) => (
              <button
                key={cem.name + cem.city}
                className="absolute z-10 group"
                style={{ left: `${cem.x}%`, top: `${cem.y}%`, transform: "translate(-50%, -100%)" }}
                onMouseEnter={() => setActive(cem.name)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === cem.name ? null : cem.name)}
              >
                <MapPin
                  className={`w-5 h-5 md:w-6 md:h-6 transition-all drop-shadow-md ${
                    active === cem.name ? "text-accent scale-125" : "text-primary hover:text-accent hover:scale-110"
                  }`}
                  fill={active === cem.name ? "hsl(16 50% 58%)" : "hsl(145 25% 36%)"}
                  strokeWidth={1.5}
                />
                {active === cem.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg"
                  >
                    <p className="font-medium">{cem.name}</p>
                    <p className="opacity-75">{cem.city}, TX</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45 -mt-1" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {cemeteries.map((cem) => (
              <button
                key={cem.name + cem.city}
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
