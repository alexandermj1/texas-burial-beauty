import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import heroBg from "@/assets/hero/cemetery-hillside.jpg";

const CemeteryDirectory = () => {
  const [region, setRegion] = useState("All");
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const filtered = bayCemeteries.filter((c) => {
      if (region !== "All" && c.region !== region) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const map = new Map<string, typeof bayCemeteries>();
    filtered.forEach((c) => {
      const arr = map.get(c.region) ?? [];
      arr.push(c);
      map.set(c.region, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [region, query]);

  const total = bayCemeteries.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Texas Cemeteries Served by Texas Cemetery Brokers",
    numberOfItems: total,
    itemListElement: bayCemeteries.slice(0, 50).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://texascemeterybrokers.com/cemeteries/${slugify(c.name)}`,
      name: c.name,
    })),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Texas Cemeteries We Serve — Buy & Sell Plots | Texas Cemetery Brokers"
        description={`Browse ${total}+ cemeteries across Dallas–Fort Worth, Houston, Austin, San Antonio, El Paso & beyond. Get help buying or selling cemetery plots in Texas.`}
        path="/cemeteries"
        jsonLd={jsonLd}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[55vh] overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/55 to-foreground/30" />
        <div className="relative container mx-auto px-6 pt-32 pb-16 flex items-end min-h-[55vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-primary-foreground/80 text-xs tracking-[0.2em] uppercase font-medium mb-4 drop-shadow">
              Statewide Coverage
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-primary-foreground mb-4 drop-shadow-lg leading-tight">
              Texas Cemeteries We Serve
            </h1>
            <p className="text-primary-foreground/90 text-lg leading-relaxed drop-shadow-md max-w-2xl">
              We help families buy and sell plots at {total}+ cemeteries across Texas — from
              Dallas–Fort Worth and Houston to Austin, San Antonio, El Paso and beyond. Choose a
              cemetery to learn more.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-[72px] z-30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, city, or region..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    region === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grouped list */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {grouped.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-2">No cemeteries match your filters</p>
              <p className="text-sm text-muted-foreground">Try a different search or region.</p>
            </div>
          )}

          {grouped.map(([groupRegion, list]) => (
            <div key={groupRegion} className="mb-14">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-display text-2xl md:text-3xl text-foreground">{groupRegion}</h2>
                <span className="text-sm text-muted-foreground">
                  {list.length} {list.length === 1 ? "cemetery" : "cemeteries"}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <Link
                      to={`/cemeteries/${slugify(c.name)}`}
                      className="group block bg-card rounded-2xl p-5 border border-border hover:border-primary/40 hover:shadow-hover transition-all duration-300"
                    >
                      <span className="inline-block px-2.5 py-1 rounded-full bg-sage-light text-primary text-[11px] font-medium mb-3">
                        {c.city}
                      </span>
                      <h3 className="font-display text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
                        <MapPin className="w-3 h-3" /> {c.address}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-2.5 transition-all">
                        Buy or sell here <ArrowRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 bg-gradient-sage rounded-2xl p-8 text-center"
          >
            <h3 className="font-display text-2xl md:text-3xl text-foreground mb-2">
              Don't see your cemetery?
            </h3>
            <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
              We work with hundreds of cemeteries statewide. Call us — we'll let you know exactly
              what we can do at your specific cemetery.
            </p>
            <a
              href="tel:+14242341678"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              <Phone className="w-4 h-4" /> (424) 234-1678
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CemeteryDirectory;
