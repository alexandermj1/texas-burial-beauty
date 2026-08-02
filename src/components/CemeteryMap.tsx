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

/** Statewide coverage map used on the Cemeteries page. */
const CemeteryMap = () => (
  <section className="py-12 md:py-16 bg-gradient-warm">
    <div className="container mx-auto px-6">
      <MetroCemeteryMap
        regions={ALL_REGIONS}
        metro="Texas"
        blurb="Every cemetery we actively broker, mapped statewide. Search by name or city, click a pin for details, or open directions."
        searchable
      />
    </div>
  </section>
);

export default CemeteryMap;
