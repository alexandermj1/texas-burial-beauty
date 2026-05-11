import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowUpRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";

// Decorative SVG glyph rotated per card for variety (Vogue-style line art).
const CardGlyph = ({ variant, className = "" }: { variant: number; className?: string }) => {
  const stroke = "hsl(var(--primary))";
  switch (variant % 4) {
    case 0:
      return (
        <svg viewBox="0 0 120 60" className={className} fill="none" stroke={stroke} strokeWidth="1.2">
          <path d="M2 50 Q30 10 60 30 T118 20" strokeLinecap="round" />
          <circle cx="100" cy="14" r="6" fill={stroke} fillOpacity="0.15" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 120 60" className={className} fill="none" stroke={stroke} strokeWidth="1.2">
          <path d="M2 55 L30 30 L55 45 L80 18 L118 35" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="80" cy="18" r="3" fill={stroke} />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 120 60" className={className} fill="none" stroke={stroke} strokeWidth="1.2">
          <path d="M2 45 Q40 5 80 45 T118 30" strokeLinecap="round" />
          <path d="M2 55 Q40 25 80 55 T118 45" strokeLinecap="round" strokeOpacity="0.45" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 60" className={className} fill="none" stroke={stroke} strokeWidth="1.2">
          <circle cx="60" cy="30" r="22" strokeOpacity="0.5" />
          <circle cx="60" cy="30" r="12" />
          <line x1="60" y1="2" x2="60" y2="58" strokeOpacity="0.25" />
        </svg>
      );
  }
};

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

      {/* HERO — minimalist editorial */}
      <section className="relative pt-28 pb-10 md:pt-32 md:pb-14 border-b border-border/60 overflow-hidden">
        {/* Subtle decorative line art */}
        <svg
          className="absolute -right-10 top-16 w-[480px] h-[200px] opacity-[0.08] pointer-events-none hidden md:block"
          viewBox="0 0 480 200"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        >
          <path d="M0 180 Q120 40 240 130 T480 80" />
          <path d="M0 195 Q120 60 240 150 T480 100" />
        </svg>

        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">
              The directory · {total}+ cemeteries
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] mb-4">
              Every cemetery in Texas, <em className="italic font-normal text-primary">one trusted broker.</em>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-8">
              Find your cemetery — or the one you want to buy into — and we'll guide the rest.
            </p>

            <div className="max-w-xl mx-auto">
              <div className="relative flex items-center bg-card rounded-full border border-border shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-primary/50 transition-all overflow-hidden">
                <Search className="w-4 h-4 text-muted-foreground ml-5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by cemetery, city, or region…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-3.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none text-sm"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-xs text-muted-foreground hover:text-foreground px-4 mr-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Region filter strip */}
      <section className="sticky top-[72px] z-30 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium shrink-0 mr-2">
              Region
            </span>
            {regions.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  region === r
                    ? "bg-foreground text-background"
                    : "bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grouped editorial card list */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-6">
          {grouped.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-2xl text-foreground mb-2">No cemeteries match</p>
              <p className="text-sm text-muted-foreground">Try a different search or region.</p>
            </div>
          )}

          {grouped.map(([groupRegion, list]) => (
            <div key={groupRegion} className="mb-20 last:mb-0">
              <div className="flex items-end justify-between mb-8 pb-4 border-b border-border/60">
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-primary font-medium mb-2">
                    Region
                  </p>
                  <h2 className="font-display text-3xl md:text-4xl text-foreground">
                    {groupRegion}
                  </h2>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {list.length.toString().padStart(2, "0")} {list.length === 1 ? "cemetery" : "cemeteries"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map((c, i) => {
                  const monogram = c.name.replace(/^(The|St\.|Saint|Mt\.|Mount)\s+/i, "").charAt(0).toUpperCase();
                  // Hash for variant per card so each is unique.
                  let h = 0;
                  for (let k = 0; k < c.name.length; k++) h = (h * 31 + c.name.charCodeAt(k)) >>> 0;
                  const variant = h % 4;
                  const tints = [
                    "from-sage-light to-card",
                    "from-sand-light to-card",
                    "from-terracotta-light/40 to-card",
                    "from-card to-sage-light/60",
                  ];
                  return (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
                    >
                      <Link
                        to={`/cemeteries/${slugify(c.name)}`}
                        className={`group relative block rounded-3xl overflow-hidden border border-border/70 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.35)] bg-gradient-to-br ${tints[variant]}`}
                      >
                        {/* Top metadata row */}
                        <div className="relative px-6 pt-6 pb-2 flex items-start justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-[11px] font-medium border border-border/60">
                            <MapPin className="w-3 h-3 text-primary" />
                            {c.city}
                          </span>
                          <span className="font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                            {String((i + 1)).padStart(2, "0")}
                          </span>
                        </div>

                        {/* Centerpiece monogram + glyph */}
                        <div className="relative px-6 pt-2 pb-4 flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-2xl bg-background/80 border border-border/70 flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:border-primary transition-colors duration-500">
                              <span className="font-display text-4xl text-foreground group-hover:text-primary-foreground transition-colors duration-500">
                                {monogram}
                              </span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary/15 border border-primary/30" />
                          </div>
                          <CardGlyph variant={variant} className="flex-1 h-14" />
                        </div>

                        {/* Body */}
                        <div className="relative px-6 pb-6">
                          <h3 className="font-display text-xl text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                            {c.name}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-5 line-clamp-1">
                            {c.address}
                          </p>
                          <div className="flex items-center justify-between pt-3 border-t border-border/60">
                            <div className="flex gap-1.5">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/70 border border-border/60 text-muted-foreground">
                                Buy
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/70 border border-border/60 text-muted-foreground">
                                Sell
                              </span>
                            </div>
                            <span className="w-9 h-9 rounded-full bg-background/80 border border-border group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center transition-all duration-300 group-hover:rotate-45">
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
            className="mt-16 relative overflow-hidden rounded-3xl bg-gradient-sage p-10 md:p-14 text-center"
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] tracking-[0.2em] uppercase text-primary font-medium mb-3">
                Don't see yours?
              </p>
              <h3 className="font-display text-3xl md:text-4xl text-foreground mb-3">
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
