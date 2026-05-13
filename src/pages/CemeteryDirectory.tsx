import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowUpRight, Phone, X, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import heroBg from "@/assets/hero/cemetery-mural.jpg";
import imgPalms from "@/assets/hero/cemetery-palms.jpg";
import imgMountains from "@/assets/hero/cemetery-mountains.jpg";
import imgHillside from "@/assets/hero/cemetery-hillside.jpg";
import imgCathedral from "@/assets/hero/cemetery-cathedral.jpg";

const ambientImages = [imgMountains, imgHillside, imgPalms, imgCathedral];

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

      {/* HERO — cinematic full-bleed editorial */}
      <section className="relative min-h-[88vh] flex items-end overflow-hidden">
        {/* Integrated background photo */}
        <motion.img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        {/* Layered gradients for depth (Vogue/editorial feel) */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/30 to-foreground/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 via-transparent to-foreground/40" />
        {/* Subtle vignette + grain */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--foreground)/0.6)_100%)]" />

        <div className="relative container mx-auto px-6 pb-20 md:pb-28 pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-5xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-12 bg-background/60" />
              <p className="text-[11px] tracking-[0.4em] uppercase text-background/80 font-medium">
                The Texas Directory · {total}+ cemeteries
              </p>
            </div>
            <h1 className="font-display text-[44px] sm:text-6xl md:text-7xl lg:text-[88px] text-background leading-[0.98] tracking-tight mb-6">
              Every cemetery
              <br />
              in Texas. <em className="italic font-normal text-background/75">One trusted broker.</em>
            </h1>
            <p className="text-background/80 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
              Discover the cemetery you want to buy into — or list the plot you already own. We handle valuation,
              matching, payment and the official transfer end-to-end.
            </p>

            {/* Minimal centered-style search bar (left aligned in hero) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-xl"
            >
              <div className="group relative flex items-center bg-background/95 backdrop-blur-2xl rounded-full border border-background/20 shadow-[0_20px_60px_-20px_hsl(var(--foreground)/0.6)] focus-within:shadow-[0_24px_80px_-20px_hsl(var(--primary)/0.5)] transition-all duration-300">
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

              {/* Dual conversion CTAs directly under search */}
              <div className="flex flex-wrap gap-3 mt-5">
                <a
                  href="tel:+14242341678"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-background text-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Phone className="w-4 h-4" /> (424) 234-1678
                </a>
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent border border-background/40 text-background text-sm font-medium hover:bg-background/10 transition-colors"
                >
                  Sell my plot <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/buy"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Find a plot <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom marquee strip — editorial detail */}
        <div className="absolute bottom-0 inset-x-0 border-t border-background/15 bg-foreground/40 backdrop-blur-md">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between text-background/70 text-[11px] tracking-[0.25em] uppercase font-medium">
            <span className="hidden sm:inline">Licensed Texas brokerage</span>
            <span className="hidden md:inline">No upfront fees · Sellers</span>
            <span>30–60% below retail · Buyers</span>
            <span className="hidden md:inline">29+ years experience</span>
          </div>
        </div>
      </section>

      {/* Region filter strip — sticky, dark refined */}
      <section className="sticky top-[68px] z-30 bg-background/90 backdrop-blur-xl border-b border-border/60">
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

      {/* Cards grid — editorial with integrated tone */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-6">
          {grouped.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-2xl text-foreground mb-2">No cemeteries match</p>
              <p className="text-sm text-muted-foreground">Try a different search or region.</p>
            </div>
          )}

          {grouped.map(([groupRegion, list], gIdx) => {
            // ambient image rotates per region for editorial variety
            const ambient = ambientImages[gIdx % ambientImages.length];
            return (
              <div key={groupRegion} className="mb-20 last:mb-0">
                {/* Region header — editorial band with integrated photo */}
                <div className="relative mb-8 rounded-3xl overflow-hidden border border-border/60">
                  <img src={ambient} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-foreground/30" />
                  <div className="relative px-7 py-8 md:px-10 md:py-10 flex items-end justify-between gap-6">
                    <div>
                      <p className="text-[10px] tracking-[0.28em] uppercase text-background/75 font-medium mb-2">
                        Region · {String(gIdx + 1).padStart(2, "0")}
                      </p>
                      <h2 className="font-display text-3xl md:text-5xl text-background tracking-tight leading-none">
                        {groupRegion}
                      </h2>
                    </div>
                    <span className="font-display text-background/85 text-sm md:text-base tabular-nums shrink-0">
                      {list.length.toString().padStart(2, "0")} {list.length === 1 ? "cemetery" : "cemeteries"}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map((c, i) => {
                    const monogram = c.name
                      .replace(/^(The|St\.|Saint|Mt\.|Mount)\s+/i, "")
                      .charAt(0)
                      .toUpperCase();
                    let h = 0;
                    for (let k = 0; k < c.name.length; k++) h = (h * 31 + c.name.charCodeAt(k)) >>> 0;
                    // Deeper, more saturated tints — vogue color
                    const tints = [
                      "from-sage-light/80 via-card to-sand-light/40",
                      "from-terracotta-light/40 via-card to-sand-light/60",
                      "from-sand-light via-card to-sage-light/60",
                      "from-card via-sage-light/50 to-terracotta-light/30",
                    ];
                    const tint = tints[h % 4];
                    return (
                      <motion.div
                        key={c.name}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
                      >
                        <Link
                          to={`/cemeteries/${slugify(c.name)}`}
                          className={`group relative block rounded-2xl overflow-hidden border border-border/60 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_hsl(var(--primary)/0.45)] bg-gradient-to-br ${tint}`}
                        >
                          {/* Editorial monogram watermark */}
                          <span
                            aria-hidden
                            className="absolute -top-6 -right-2 font-display text-[200px] leading-none text-foreground/[0.05] group-hover:text-primary/[0.12] transition-colors duration-700 select-none pointer-events-none"
                          >
                            {monogram}
                          </span>

                          {/* subtle texture hairline */}
                          <span aria-hidden className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

                          <div className="relative p-6 md:p-7 min-h-[230px] flex flex-col">
                            <div className="flex items-center justify-between mb-10">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-[11px] font-medium border border-border/50">
                                <MapPin className="w-3 h-3 text-primary" />
                                {c.city}
                              </span>
                              <span className="font-display text-[10px] tracking-[0.22em] uppercase text-muted-foreground/80">
                                {String(i + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
                              </span>
                            </div>

                            <h3 className="font-display text-[22px] md:text-[24px] text-foreground leading-[1.15] mb-2 group-hover:text-primary transition-colors duration-300 tracking-tight">
                              {c.name}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6 line-clamp-1">
                              {c.address}
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/60">
                              <div className="flex gap-1.5">
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-foreground text-background font-medium">
                                  Buy
                                </span>
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium">
                                  Sell
                                </span>
                              </div>
                              <span className="w-10 h-10 rounded-full bg-background/80 border border-border/60 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center transition-all duration-300 group-hover:rotate-45">
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
            );
          })}

          {/* Conversion-driving CTA — dark editorial, dual action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20 relative overflow-hidden rounded-[28px] border border-border/60"
          >
            <img src={imgHillside} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/85 to-foreground/60" />

            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-10 items-center p-10 md:p-14">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <p className="text-[11px] tracking-[0.3em] uppercase text-background/80 font-medium">
                    Don't see yours? · We work with hundreds more
                  </p>
                </div>
                <h3 className="font-display text-3xl md:text-5xl text-background mb-4 tracking-tight leading-[1.05]">
                  Talk to a Texas broker today.
                  <br />
                  <em className="italic font-normal text-background/70">Buying or selling — we'll guide it.</em>
                </h3>
                <p className="text-background/70 mb-7 max-w-xl text-base">
                  One short call. No pressure. We'll tell you exactly what we can do at your specific cemetery,
                  what your plot is worth, and what's available to buy.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="tel:+14242341678"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
                  >
                    <Phone className="w-4 h-4" /> (424) 234-1678
                  </a>
                  <Link
                    to="/sell"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-background text-foreground font-medium rounded-full text-sm hover:bg-background/90 transition-colors"
                  >
                    Get a free valuation <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/buy"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent border border-background/40 text-background font-medium rounded-full text-sm hover:bg-background/10 transition-colors"
                  >
                    I want to buy <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-2 gap-3">
                {[
                  { k: "29+", v: "Years brokering Texas plots" },
                  { k: "$0", v: "Upfront cost to sellers" },
                  { k: "30–60%", v: "Avg. buyer savings vs retail" },
                  { k: "24h", v: "Valuation response time" },
                ].map((s) => (
                  <div key={s.v} className="rounded-2xl bg-background/8 border border-background/15 backdrop-blur-md p-4">
                    <p className="font-display text-2xl text-background leading-none mb-2">{s.k}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-background/65 leading-snug">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CemeteryDirectory;
