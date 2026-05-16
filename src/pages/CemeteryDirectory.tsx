import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowRight, Phone, X, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import { getCemeteryImage } from "@/lib/listingImages";
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

      {/* HERO — centered, minimal, integrated with directory */}
      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
          initial={{ scale: 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        {/* Strong readability scrim, soft fade into the page */}
        <div className="absolute inset-0 bg-foreground/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/30 to-background" />

        <div className="relative container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto text-center"
          >
            <p className="text-[11px] tracking-[0.32em] uppercase text-background/85 font-medium mb-6">
              The Texas Directory · {total}+ cemeteries
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-background leading-[1.05] tracking-tight mb-6">
              Every cemetery in Texas.
              <br />
              <em className="italic font-light text-background/85">One trusted broker.</em>
            </h1>
            <p className="text-background text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed font-light">
              Browse the cemeteries we serve, find available plots, or list the one you already own — handled end-to-end.
            </p>

            {/* Big centered search bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <div className="flex items-center bg-background rounded-full border border-background/30 shadow-[0_24px_60px_-20px_hsl(var(--foreground)/0.6)] focus-within:shadow-[0_28px_70px_-20px_hsl(var(--primary)/0.5)] transition-shadow duration-300">
                <Search className="w-5 h-5 text-muted-foreground ml-7 shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search cemeteries, cities, or regions"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-5 py-5 md:py-6 text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-base tracking-tight"
                />
                {query ? (
                  <button
                    onClick={() => setQuery("")}
                    className="mr-2 w-10 h-10 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    to="/buy"
                    className="hidden sm:inline-flex mr-2 items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Find a plot <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6 text-background/85 text-xs tracking-[0.18em] uppercase font-medium">
                <span>Licensed Texas brokerage</span>
                <span className="opacity-40">·</span>
                <span>30–60% below retail</span>
                <span className="opacity-40">·</span>
                <a href="tel:+14242341678" className="inline-flex items-center gap-1.5 hover:text-background transition-colors">
                  <Phone className="w-3.5 h-3.5" /> (424) 234-1678
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Region filter strip — centered, sticky, integrated */}
      <section className="sticky top-[68px] z-30 bg-background/95 backdrop-blur-xl border-y border-border/60">
        <div className="container mx-auto px-6 py-3.5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {regions.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-200 ${
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
                    // Deterministic hash: decides which cards show a hero image vs text-only
                    let h = 0;
                    for (let k = 0; k < c.name.length; k++) h = (h * 31 + c.name.charCodeAt(k)) >>> 0;
                    // Roughly 1 in 3 cards gets a full hero photo; rest are clean text-forward cards
                    const showPhoto = h % 3 === 0;
                    const cemImg = showPhoto ? getCemeteryImage(c.name) : null;

                    // Suggest the breadth of inventory rather than a single plot type
                    const offeringSets: string[][] = [
                      ["Plots", "Niches", "Mausoleums"],
                      ["Plots", "Companion", "Cremation"],
                      ["Plots", "Lawn Crypts", "Family Estates"],
                      ["Plots", "Niches", "Veteran"],
                    ];
                    const offerings = offeringSets[h % offeringSets.length];

                    return (
                      <motion.div
                        key={`${c.name}-${c.city}`}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
                      >
                        <Link
                          to={`/cemeteries/${slugify(c.name)}`}
                          className="group relative flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border/60 shadow-[0_1px_2px_-1px_hsl(var(--foreground)/0.06)] hover:shadow-[0_18px_44px_-16px_hsl(var(--primary)/0.22)] hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
                        >
                          {showPhoto && cemImg ? (
                            <div className="h-48 overflow-hidden relative">
                              <img
                                src={cemImg}
                                alt={`${c.name} grounds`}
                                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent" />
                              <div className="absolute top-3.5 left-3.5">
                                <span className="text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full bg-background/95 backdrop-blur-sm text-foreground font-medium">
                                  {c.region}
                                </span>
                              </div>
                              <div className="absolute bottom-3.5 left-4 right-4">
                                <h3 className="font-display text-xl text-background leading-tight tracking-tight drop-shadow-md line-clamp-2">
                                  {c.name}
                                </h3>
                                <p className="text-background/85 text-xs flex items-center gap-1 mt-1 drop-shadow">
                                  <MapPin className="w-3 h-3" /> {c.city}, TX
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="relative px-6 pt-7 pb-5 border-b border-border/50 bg-gradient-to-br from-secondary/30 via-card to-card overflow-hidden">
                              {/* Decorative monogram letter */}
                              <span
                                aria-hidden="true"
                                className="absolute -top-4 right-2 font-display text-[120px] leading-none text-primary/[0.06] select-none pointer-events-none"
                              >
                                {c.name.charAt(0)}
                              </span>
                              <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-medium">
                                    {c.region}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase text-primary font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Active
                                  </span>
                                </div>
                                <h3 className="font-display text-2xl text-foreground leading-[1.1] tracking-tight mb-2 line-clamp-2">
                                  {c.name}
                                </h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {c.city}, TX
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col flex-1 p-5">
                            <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 font-medium mb-2.5">
                              Available inventory
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-5">
                              {offerings.map((o) => (
                                <span
                                  key={o}
                                  className="text-[11px] px-2.5 py-1 rounded-full bg-muted/70 text-foreground/80 font-medium"
                                >
                                  {o}
                                </span>
                              ))}
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                              <div className="flex gap-1.5">
                                <span className="text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-foreground text-background font-medium">Buy</span>
                                <span className="text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium">Sell</span>
                              </div>
                              <span className="inline-flex items-center gap-1.5 text-primary font-medium text-sm group-hover:gap-2.5 transition-all">
                                View <ArrowRight className="w-3.5 h-3.5" />
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
