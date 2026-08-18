import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Compass, Receipt, Building2, Landmark, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import { ALL_TEXAS_REGIONS } from "@/data/metroRegions";
import { bayCemeteries } from "@/data/cemeteries";
import { cemeteryPath } from "@/lib/cemeterySlug";
import { CITY_PAGES } from "./city-page-data";

const SITE = "https://texascemeterybrokers.com";
const PATH = "/texas-cemetery-map";

const REGION_BLURB: Record<string, string> = {
  "Dallas–Fort Worth": "Restland, Sparkman/Hillcrest, Laurel Land, Bluebonnet Hills and the rest of the Metroplex.",
  "Greater Houston": "Forest Park, Memorial Oaks, Earthman, Brookside and the Inner Loop gardens.",
  "Austin": "Cook-Walden, Austin Memorial Park and the Hill Country edge.",
  "San Antonio": "Mission Park, Sunset Memorial and the Catholic cemeteries.",
  "Central Texas": "Waco, Temple, Killeen and the I-35 corridor.",
  "East Texas": "Tyler, Longview, Beaumont and the Piney Woods.",
  "El Paso & West Texas": "El Paso, Midland, Odessa and the far west.",
  "South Texas": "Corpus Christi, the Valley and the coastal bend.",
  "West & North Texas": "Lubbock, Amarillo, Abilene and the Panhandle plains.",
};

const HOW = [
  {
    Icon: Compass,
    title: "Start from where you are",
    body: "Use the locate button or type an address — the map re-sorts every cemetery by real driving distance, so the nearest options rise to the top instead of the biggest names.",
  },
  {
    Icon: Receipt,
    title: "Check the transfer fee before you commit",
    body: "Each pin carries the cemetery's own transfer fee, the charge that moves a deed from one family to another. It is the number most people discover far too late.",
  },
  {
    Icon: Building2,
    title: "See where resale actually happens",
    body: "Colour-coded demand bands show which cemeteries we get the most buyer activity in. Sold-out gardens are usually where owners hold the most value.",
  },
];

const TexasCemeteryMap = () => {
  const stats = useMemo(() => {
    const cities = new Set(bayCemeteries.map((c) => c.city));
    return {
      cemeteries: bayCemeteries.length,
      cities: cities.size,
      regions: ALL_TEXAS_REGIONS.length,
    };
  }, []);

  const byRegion = useMemo(() => {
    const m = new Map<string, typeof bayCemeteries>();
    bayCemeteries.forEach((c) => {
      const arr = m.get(c.region) ?? [];
      arr.push(c);
      m.set(c.region, arr);
    });
    return ALL_TEXAS_REGIONS.filter((r) => m.has(r)).map((r) => [r, m.get(r)!] as const);
  }, []);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Texas Cemetery Map",
      url: `${SITE}${PATH}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any modern web browser",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        `Interactive map of ${stats.cemeteries} Texas cemeteries with transfer fees, resale demand and directions, covering ${stats.cities} cities.`,
      provider: { "@type": "Organization", name: "Texas Cemetery Brokers", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Cemeteries", item: `${SITE}/cemeteries` },
        { "@type": "ListItem", position: 3, name: "Texas Cemetery Map", item: `${SITE}${PATH}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Texas cemeteries mapped by Texas Cemetery Brokers",
      numberOfItems: bayCemeteries.length,
      itemListElement: bayCemeteries.slice(0, 100).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}${cemeteryPath(c.name)}`,
        name: c.name,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Texas Cemetery Map — Fees, Plots & Locations"
        description={`Interactive map of ${stats.cemeteries} Texas cemeteries across ${stats.cities} cities. See transfer fees, resale demand, directions and plots for sale near you.`}
        path={PATH}
        jsonLd={jsonLd}
      />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-warm pt-28 pb-10 sm:pt-32 sm:pb-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sage/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-terracotta/10 blur-3xl" />
          <div className="container relative mx-auto px-6">
            <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2 opacity-50">/</span>
              <Link to="/cemeteries" className="hover:text-foreground">Cemeteries</Link>
              <span className="mx-2 opacity-50">/</span>
              <span className="text-foreground/80">Map</span>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl"
            >
              <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.32em] text-primary sm:text-xs">
                Free tool
              </span>
              <h1 className="font-display text-4xl leading-[1.02] tracking-tight text-foreground sm:text-5xl md:text-6xl [text-wrap:balance]">
                The Texas <span className="italic font-light">cemetery map</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                Every cemetery we broker in Texas, on one map — with the cemetery's own transfer
                fee, how active resale is there, and how far it is from your front door. Built for
                families comparing where to buy, and owners working out what their plot is worth.
              </p>

              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                {[
                  { k: stats.cemeteries, v: "cemeteries mapped" },
                  { k: stats.cities, v: "Texas cities" },
                  { k: stats.regions, v: "regions covered" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="font-display text-3xl text-foreground sm:text-4xl">{s.k}</dt>
                    <dd className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </div>
        </section>

        {/* The tool */}
        <section id="map" aria-label="Interactive Texas cemetery map" className="scroll-mt-24 pb-4">
          <MetroCemeteryMap regions={ALL_TEXAS_REGIONS} metro="Texas" searchable hideTitle />
        </section>

        {/* How to use it */}
        <section className="py-14 sm:py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
              Three ways to <span className="italic font-light">use the map</span>
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {HOW.map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-border/60 bg-card/70 p-6 transition-shadow hover:shadow-soft"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sage text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-lg text-foreground">{title}</h3>
                  <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Metro index — crawlable internal links */}
        <section className="bg-muted/30 py-14 sm:py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Cemetery plots by <span className="italic font-light">Texas metro</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-light text-muted-foreground sm:text-base">
              Each metro has its own pricing guide — retail versus resale ranges, transfer fees and
              the cemeteries that trade most often.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CITY_PAGES.map((c) => (
                <Link
                  key={c.slug}
                  to={`/cemetery-plots-for-sale-${c.slug}`}
                  className="group flex items-start gap-4 rounded-[1.5rem] border border-border/60 bg-background p-5 transition-all hover:border-sage/40 hover:shadow-soft"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-primary">
                    <Landmark className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-display text-lg text-foreground">
                      {c.city}
                      <ArrowRight className="h-4 w-4 -translate-x-1 text-sage opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Plot prices, transfer fees and listings
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Full crawlable region index */}
        <section className="py-14 sm:py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Every cemetery on the map
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-light text-muted-foreground sm:text-base">
              A plain index of the {stats.cemeteries} cemeteries plotted above, grouped by region.
              Open any one for its address, transfer fee and the plots we currently have listed there.
            </p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {byRegion.map(([region, list]) => (
                <div key={region}>
                  <div className="mb-3 flex items-baseline gap-3 border-b border-border/60 pb-2">
                    <h3 className="font-display text-xl text-foreground">{region}</h3>
                    <span className="text-xs text-muted-foreground">{list.length} cemeteries</span>
                  </div>
                  {REGION_BLURB[region] && (
                    <p className="mb-3 text-xs font-light text-muted-foreground">{REGION_BLURB[region]}</p>
                  )}
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {list
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <li key={c.name}>
                          <Link
                            to={cemeteryPath(c.name)}
                            className="group flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage/70" />
                            <span className="min-w-0">
                              <span className="block truncate">{c.name}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">{c.city}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-warm py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
                Found your cemetery? <span className="italic font-light">Here is the next step.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-light text-muted-foreground sm:text-base">
                Tell us the cemetery and what you own and we will value it against current retail
                pricing at that location — no upfront fee, no obligation.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get a free valuation <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/properties"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Search className="h-4 w-4" /> Browse plots for sale
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TexasCemeteryMap;
