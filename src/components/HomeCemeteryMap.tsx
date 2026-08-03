import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";

const ALL_REGIONS = [
  "Dallas–Fort Worth",
  "Greater Houston",
  "Austin",
  "San Antonio",
  "Central Texas",
  "East Texas",
  "El Paso & West Texas",
  "South Texas",
  "West & North Texas",
];

type Metro = {
  label: string;
  regions: string[];
  blurb: string;
  href?: string;
};

const METROS: Metro[] = [
  {
    label: "All Texas",
    regions: ALL_REGIONS,
    blurb: "Every cemetery we actively broker, mapped statewide. Pick a metro, search a city, or click a pin for details.",
    href: "/cemeteries",
  },
  {
    label: "Dallas–Fort Worth",
    regions: ["Dallas–Fort Worth"],
    blurb: "Restland, Sparkman/Hillcrest, Laurel Land and the rest of the DFW metroplex.",
    href: "/cemetery-plots-for-sale-dallas",
  },
  {
    label: "Houston",
    regions: ["Greater Houston"],
    blurb: "Forest Park, Memorial Oaks, Earthman and the wider Greater Houston area.",
    href: "/cemetery-plots-for-sale-houston",
  },
  {
    label: "Austin",
    regions: ["Austin", "Central Texas"],
    blurb: "Austin Memorial Park, Cook-Walden and Central Texas cemeteries.",
    href: "/cemetery-plots-for-sale-austin",
  },
  {
    label: "San Antonio",
    regions: ["San Antonio", "South Texas"],
    blurb: "Sunset Memorial, Mission Park and South Texas cemeteries.",
    href: "/cemetery-plots-for-sale-san-antonio",
  },
];

/** Home-page metro switcher + interactive cemetery map. */
const HomeCemeteryMap = () => {
  const [active, setActive] = useState(0);
  const metro = METROS[active];

  return (
    <section className="py-8 sm:py-10 bg-gradient-warm">
      <div className="container mx-auto px-6">
        <div className="text-center mb-3">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.3em] text-primary sm:text-xs">
            Coverage Map
          </span>
          <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
            <span className="italic font-light">Find a cemetery near you</span>
          </h2>
          <p className="mx-auto mt-1.5 max-w-xl text-sm font-light text-muted-foreground sm:text-base">
            Choose a metro to see the cemeteries we broker there — transfer fees, showing availability and directions.
          </p>
        </div>

        <div className="mb-2 -mx-6 px-6 flex sm:flex-wrap justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar">
          {METROS.map((m, i) => (
            <button
              key={m.label}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                i === active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>


        <MetroCemeteryMap
          key={metro.label}
          regions={metro.regions}
          metro={metro.label === "All Texas" ? "Texas" : metro.label}
          blurb={metro.blurb}
          searchable
          hideTitle
          compact
        />

        {metro.href && (
          <div className="mt-4 text-center">
            <Link
              to={metro.href}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Explore {metro.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeCemeteryMap;
