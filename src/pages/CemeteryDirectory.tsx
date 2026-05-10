import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowUpRight, Phone, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import heroBg from "@/assets/hero/cemetery-hillside.jpg";
import imgCathedral from "@/assets/hero/cemetery-cathedral.jpg";
import imgMountains from "@/assets/hero/cemetery-mountains.jpg";
import imgMural from "@/assets/hero/cemetery-mural.jpg";
import imgPalms from "@/assets/hero/cemetery-palms.jpg";
import imgHillside from "@/assets/hero/cemetery-hillside.jpg";

const cardImages = [imgHillside, imgCathedral, imgMountains, imgMural, imgPalms];
const pickImage = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return cardImages[h % cardImages.length];
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

      {/* HERO — cinematic image with centered minimalist search */}
      <section className="relative min-h-[78vh] overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        {/* layered washes for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/55 to-foreground/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--foreground)/0.35)_75%)]" />

        <div className="relative container mx-auto px-6 pt-32 pb-20 min-h-[78vh] flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-md mb-7">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground/90" />
              <span className="text-[11px] tracking-[0.18em] uppercase text-primary-foreground/90 font-medium">
                Statewide coverage · {total}+ cemeteries
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-primary-foreground mb-5 leading-[1.05] drop-shadow-lg max-w-4xl">
              Every cemetery in Texas,<br className="hidden md:block" />
              <em className="italic font-normal opacity-90">one trusted broker.</em>
            </h1>
            <p className="text-primary-foreground/85 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10 drop-shadow">
              Find your cemetery — or the one you want to buy into — and we'll guide the rest.
            </p>
          </motion.div>

          {/* Centered minimalist search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-xl"
          >
            <div className="group relative">
              <div className="absolute inset-0 rounded-full bg-primary-foreground/10 blur-xl opacity-60 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-background/95 backdrop-blur-md rounded-full border border-primary-foreground/30 shadow-2xl overflow-hidden">
                <Search className="w-5 h-5 text-muted-foreground ml-6 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by cemetery, city, or region…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-5 text-foreground placeholder:text-muted-foreground/80 focus:outline-none text-[15px]"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-xs text-muted-foreground hover:text-foreground px-4 mr-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <p className="text-primary-foreground/60 text-xs mt-4 tracking-wide">
              Try “Restland”, “Houston”, or “Austin”
            </p>
          </motion.div>
        </div>

        {/* soft fade into next section */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* Region filter strip */}
      <section className="sticky top-[72px] z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <span className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium shrink-0 mr-2">
              Region
            </span>
            {regions.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  region === r
                    ? "bg-foreground text-background shadow-md"
                    : "bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grouped list */}
      <section className="py-16 md:py-20">
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
                  const img = pickImage(c.name);
                  const monogram = c.name.replace(/^(The|St\.|Saint)\s+/i, "").charAt(0);
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
                        className="group relative block bg-card rounded-3xl overflow-hidden border border-border/70 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.35)]"
                      >
                        {/* Image header — fades into card via mask */}
                        <div className="relative h-40 overflow-hidden">
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 ease-out"
                            style={{
                              maskImage:
                                "linear-gradient(to bottom, black 30%, transparent 100%)",
                              WebkitMaskImage:
                                "linear-gradient(to bottom, black 30%, transparent 100%)",
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(to bottom, hsl(var(--card)/0) 40%, hsl(var(--card)) 100%)",
                            }}
                          />
                          {/* Oversized monogram */}
                          <div className="absolute bottom-2 right-4 font-display text-[120px] leading-none text-foreground/[0.07] group-hover:text-primary/15 transition-colors duration-500 select-none pointer-events-none">
                            {monogram}
                          </div>
                          {/* City pill */}
                          <div className="absolute top-4 left-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md text-foreground text-[11px] font-medium shadow-sm">
                              <MapPin className="w-3 h-3 text-primary" />
                              {c.city}
                            </span>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="relative px-6 pb-6 -mt-2">
                          <h3 className="font-display text-xl text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                            {c.name}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-5 line-clamp-1">
                            {c.address}
                          </p>
                          <div className="flex items-center justify-between pt-3 border-t border-border/60">
                            <span className="text-sm font-medium text-foreground">
                              Buy or sell here
                            </span>
                            <span className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center transition-all duration-300 group-hover:rotate-45">
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
