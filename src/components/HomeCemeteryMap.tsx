import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import { METRO_OPTIONS } from "@/data/metroRegions";

/** Home-page interactive cemetery map — region switching lives in the map toolbar. */
const HomeCemeteryMap = () => (
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
          Choose a region to see the cemeteries we broker there — transfer fees, showing availability and directions.
        </p>
      </div>

      <MetroCemeteryMap
        regions={METRO_OPTIONS[0].regions}
        metro={METRO_OPTIONS[0].label}
        searchable
        hideTitle
        compact
      />

      <div className="mt-4 text-center">
        <Link
          to="/cemeteries"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Browse the full cemetery directory <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);

export default HomeCemeteryMap;
