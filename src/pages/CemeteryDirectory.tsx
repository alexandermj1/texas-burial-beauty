import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowUpRight, Phone, X } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";

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
      <Navbar forceScrolled />

      {/* HERO — Apple-style centered search, generous whitespace */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        {/* Soft ambient gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-sage-light/60 to-transparent rounded-full blur-3xl" />
          <div className="absolute -top-10 right-0 w-72 h-72 bg-terracotta-light/30 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 max-w-4xl relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-[11px] tracking-[0.32em] uppercase text-primary font-medium mb-5">
              The directory · {total}+ cemeteries
            </p>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.02] mb-6 tracking-tight">
              Every cemetery in Texas.
              <br />
              <em className="italic font-normal text-primary">One trusted broker.</em>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Find your cemetery — or the one you want to buy into — and we'll guide the rest.
            </p>

            {/* Apple-style refined search */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="max-w-xl mx-auto"
            >
              <div className="group relative flex items-center bg-card/80 backdrop-blur-xl rounded-full border border-border/80 shadow-[0_2px_20px_-8px_hsl(var(--foreground)/0.15)] hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.25)] focus-within:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.3)] focus-within:border-primary/40 transition-all duration-300">
                <Search className="w-[18px] h-[18px] text-muted-foreground ml-6 shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search cemeteries, cities, or regions"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-[18px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-[15px] tracking-tight"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="mr-2 w-9 h-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Region filter strip — sticky, refined */}
      <section className="sticky top-[68px] z-30 bg-background/85 backdrop-blur-xl border-y border-border/50">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-medium shrink-0 mr-2">
              Region
            </span>
            {regions.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  region === r
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cards grid — clean editorial, no weird glyphs */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          {grouped.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-2xl text-foreground mb-2">No cemeteries match</p>
              <p className="text-sm text-muted-foreground">Try a different search or region.</p>
            </div>
          )}

          {grouped.map(([groupRegion, list]) => (
            <div key={groupRegion} className="mb-14 last:mb-0">
              <div className="flex items-end justify-between mb-6 pb-3 border-b border-border/50">
                <div>
                  <p className="text-[10px] tracking-[0.22em] uppercase text-primary font-medium mb-1.5">
                    Region
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl text-foreground tracking-tight">
                    {groupRegion}
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {list.length.toString().padStart(2, "0")} {list.length === 1 ? "cemetery" : "cemeteries"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((c, i) => {
                  const monogram = c.name.replace(/^(The|St\.|Saint|Mt\.|Mount)\s+/i, "").charAt(0).toUpperCase();
                  let h = 0;
                  for (let k = 0; k < c.name.length; k++) h = (h * 31 + c.name.charCodeAt(k)) >>> 0;
                  const tints = [
                    "from-sage-light/70 via-card to-card",
                    "from-sand-light to-card",
                    "from-terracotta-light/30 via-card to-card",
                    "from-card via-sage-light/40 to-card",
                  ];
                  const tint = tints[h % 4];
                  return (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.025, 0.2) }}
                    >
                      <Link
                        to={`/cemeteries/${slugify(c.name)}`}
                        className={`group relative block rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.4)] bg-gradient-to-br ${tint}`}
                      >
                        {/* Soft monogram watermark in corner */}
                        <span
                          aria-hidden
                          className="absolute -top-3 -right-3 font-display text-[160px] leading-none text-foreground/[0.04] group-hover:text-primary/[0.08] transition-colors duration-500 select-none pointer-events-none"
                        >
                          {monogram}
                        </span>

                        <div className="relative p-6">
                          <div className="flex items-center justify-between mb-8">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-sm text-foreground text-[11px] font-medium border border-border/50">
                              <MapPin className="w-3 h-3 text-primary" />
                              {c.city}
                            </span>
                            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <h3 className="font-display text-[22px] text-foreground leading-tight mb-2 group-hover:text-primary transition-colors duration-300 tracking-tight">
                            {c.name}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-6 line-clamp-1">
                            {c.address}
                          </p>

                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div className="flex gap-1.5">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/50 text-muted-foreground">
                                Buy
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/50 text-muted-foreground">
                                Sell
                              </span>
                            </div>
                            <span className="w-9 h-9 rounded-full bg-background/70 border border-border/60 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center transition-all duration-300 group-hover:rotate-45">
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-14 relative overflow-hidden rounded-3xl bg-gradient-sage p-10 md:p-14 text-center"
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] tracking-[0.22em] uppercase text-primary font-medium mb-3">
                Don't see yours?
              </p>
              <h3 className="font-display text-3xl md:text-4xl text-foreground mb-3 tracking-tight">
                We work with hundreds more.
              </h3>
              <p className="text-muted-foreground mb-7 max-w-xl mx-auto">
                Call us — we'll tell you exactly what we can do at your specific cemetery.
              </p>
              <a
                href="tel:+14242341678"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-foreground text-background font-medium rounded-full text-sm hover:bg-primary transition-colors"
              >
                <Phone className="w-4 h-4" /> (424) 234-1678
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CemeteryDirectory;
