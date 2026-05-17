import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowRight, Phone, X, ShieldCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";

import heroBg from "@/assets/hero/cemetery-mural.jpg";
import imgHillside from "@/assets/hero/cemetery-hillside.jpg";

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

  // Scroll spy: track which region group is currently in view
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeRegion, setActiveRegion] = useState<string>("");

  useEffect(() => {
    const els = Object.entries(sectionRefs.current).filter(([, el]) => el) as [string, HTMLDivElement][];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const name = (visible[0].target as HTMLElement).dataset.region!;
          setActiveRegion(name);
        }
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: [0, 0.1, 0.5, 1] }
    );
    els.forEach(([, el]) => observer.observe(el));
    return () => observer.disconnect();
  }, [grouped]);

  const scrollToRegion = (name: string) => {
    const el = sectionRefs.current[name];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 180;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Smooth scroll progress through the regions list (0 → 1)
  const listRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  // Pinned-bar state. Sticky doesn't work because PageTransition wraps the
  // page in overflow-hidden containers (which break position:sticky against
  // the viewport). We fall back to fixed positioning toggled by scroll.
  const barAnchorRef = useRef<HTMLDivElement | null>(null);
  const [barPinned, setBarPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(64);

  useEffect(() => {
    const onScroll = () => {
      // progress
      const el = listRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportAnchor = window.innerHeight * 0.35;
        const traveled = viewportAnchor - rect.top;
        const total = Math.max(rect.height - viewportAnchor, 1);
        const p = Math.min(1, Math.max(0, traveled / total));
        setProgress(p);
      }
      // pin/unpin the region bar based on its anchor position
      const anchor = barAnchorRef.current;
      if (anchor) {
        const top = anchor.getBoundingClientRect().top;
        setBarPinned(top <= NAV_OFFSET);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [grouped]);



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
              <div className="flex items-center bg-background rounded-full border border-background/20 shadow-[0_20px_50px_-20px_hsl(var(--foreground)/0.55)] focus-within:shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.45)] transition-shadow duration-300">
                <Search className="w-[18px] h-[18px] text-muted-foreground ml-6 shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search cemeteries, cities, or regions"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-3.5 md:py-4 text-foreground placeholder:text-muted-foreground/55 focus:outline-none text-[15px] tracking-tight"
                />
                {query ? (
                  <button
                    onClick={() => setQuery("")}
                    className="mr-1.5 w-9 h-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    to="/buy"
                    className="hidden sm:inline-flex mr-1.5 items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-medium hover:bg-foreground/85 transition-colors"
                  >
                    Find a plot <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Apple-style ultra-minimal supporting line — no pill */}
              <p className="mt-5 text-[12px] text-background/75 font-light tracking-wide">
                Licensed Texas brokerage · 30–60% below retail ·{" "}
                <a href="tel:+14242341678" className="text-background hover:text-primary transition-colors underline-offset-4 hover:underline">
                  (424) 234-1678
                </a>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Region filter strip — rendered inline (anchor for scroll detection),
          AND portaled to <body> as a fixed bar once scrolled past, so it
          escapes PageTransition's transform/overflow containing block. */}
      {(() => {
        const BarInner = (
          <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-2.5">
            <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Currently viewing</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[12px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {region !== "All" ? region : (activeRegion || "All Texas regions")}
              </span>
              <span className="hidden md:inline text-[10px] text-muted-foreground/70">· 30–50% below retail</span>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-1.5 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar -mx-1 px-1">
              {regions.map((r) => {
                const isFiltered = region === r;
                const isCurrent = region === "All" && r !== "All" && activeRegion === r;
                const highlighted = isFiltered || isCurrent;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      if (r === "All") {
                        setRegion("All");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        setRegion(r);
                        setTimeout(() => scrollToRegion(r), 50);
                      }
                    }}
                    className={`shrink-0 relative px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-[12px] font-medium tracking-tight transition-all duration-200 inline-flex items-center gap-1.5 ${
                      highlighted
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            {/* Scroll progress underline */}
            <div className="absolute left-0 bottom-0 h-px w-full bg-transparent">
              <div
                className="h-px bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        );

        return (
          <>
            {/* Inline anchor copy — sits in the flow, used by scroll detection */}
            <section
              ref={barAnchorRef as any}
              className="relative z-20 bg-background/92 backdrop-blur-xl border-y border-border/60"
            >
              {BarInner}
            </section>

            {/* Portaled fixed copy — appears under the navbar when scrolled past */}
            {barPinned && typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-soft animate-in fade-in slide-in-from-top-2 duration-200"
                  style={{ top: `${NAV_OFFSET}px` }}
                >
                  {BarInner}
                </div>,
                document.body
              )}
          </>
        );
      })()}

      {/* Cards grid — soft muted bg for card contrast */}
      <section className="py-14 md:py-20 bg-muted/40">
        <div className="container mx-auto px-6">
          {grouped.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-2xl text-foreground mb-2">No cemeteries match</p>
              <p className="text-sm text-muted-foreground">Try a different search or region.</p>
            </div>
          )}

          <div ref={listRef}>
            <div className="min-w-0">
              {grouped.map(([groupRegion, list], gIdx) => {
                return (
              <div
                key={groupRegion}
                data-region={groupRegion}
                ref={(el) => { sectionRefs.current[groupRegion] = el; }}
                className="mb-16 last:mb-0 scroll-mt-32"
              >
                {/* Region header — quiet editorial band, matches card vocabulary */}
                <div className="flex items-end justify-between gap-6 mb-6 pb-5 border-b border-border/70">
                  <div className="flex items-baseline gap-4">
                    <span className="font-display text-xs text-primary tabular-nums tracking-[0.2em] uppercase">
                      №&nbsp;{String(gIdx + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-display text-2xl md:text-4xl text-foreground tracking-tight leading-none">
                      {groupRegion}
                    </h2>
                  </div>
                  <span className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground font-medium tabular-nums shrink-0 pb-1">
                    {list.length.toString().padStart(2, "0")} {list.length === 1 ? "cemetery" : "cemeteries"}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map((c, i) => {
                    let h = 0;
                    for (let k = 0; k < c.name.length; k++) h = (h * 31 + c.name.charCodeAt(k)) >>> 0;

                    const offeringSets: string[][] = [
                      ["Plots", "Niches", "Mausoleums"],
                      ["Plots", "Companion", "Cremation"],
                      ["Plots", "Lawn Crypts", "Family Estates"],
                      ["Plots", "Niches", "Veteran"],
                    ];
                    const offerings = offeringSets[h % offeringSets.length];
                    const refNum = String((h % 999) + 1).padStart(3, "0");
                    const slug = slugify(c.name);


                    return (
                      <motion.article
                        key={`${c.name}-${c.city}`}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
                        className="group relative flex flex-col bg-card rounded-2xl overflow-hidden ring-1 ring-border/80 shadow-[0_8px_28px_-12px_hsl(var(--foreground)/0.18),0_2px_6px_-2px_hsl(var(--foreground)/0.1)] hover:shadow-[0_28px_56px_-18px_hsl(var(--primary)/0.38)] hover:-translate-y-1 hover:ring-primary/50 transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:opacity-60 group-hover:before:opacity-100 after:absolute after:inset-0 after:rounded-2xl after:pointer-events-none after:bg-gradient-to-b after:from-foreground/[0.02] after:to-transparent"
                      >
                        {/* Top: editorial header with monogram backdrop */}
                        <Link
                          to={`/cemeteries/${slug}`}
                          className="relative block px-6 pt-6 pb-5 bg-gradient-to-br from-secondary/40 via-card to-card overflow-hidden"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute -top-6 -right-2 font-display text-[150px] leading-none text-primary/[0.07] select-none pointer-events-none tracking-tighter"
                          >
                            {c.name.charAt(0)}
                          </span>

                          <div className="relative">
                            <div className="flex items-center justify-between mb-5">
                              <span className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground font-medium">
                                {c.region}
                              </span>
                              <span className="font-display text-[11px] text-muted-foreground/70 tabular-nums tracking-wider">
                                №&nbsp;{refNum}
                              </span>
                            </div>

                            <h3 className="font-display text-[22px] leading-[1.15] text-foreground tracking-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {c.name}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                              {c.city}, TX
                            </p>
                          </div>
                        </Link>

                        {/* Middle: inventory + status */}
                        <div className="px-6 pt-4 pb-5 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/80 font-medium">
                              Inventory
                            </p>
                            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-primary font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Active
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {offerings.map((o) => (
                              <span
                                key={o}
                                className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-foreground/75 font-medium"
                              >
                                {o}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Footer: integrated Buy / Sell split */}
                        <div className="grid grid-cols-2 border-t border-border/60 divide-x divide-border/60">
                          <Link
                            to={`/buy?cemetery=${encodeURIComponent(c.name)}`}
                            className="group/buy flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
                          >
                            Buy here
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover/buy:opacity-100 group-hover/buy:ml-0 transition-all" />
                          </Link>
                          <Link
                            to={`/sell?cemetery=${encodeURIComponent(c.name)}`}
                            className="group/sell flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            Sell mine
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover/sell:opacity-100 group-hover/sell:ml-0 transition-all" />
                          </Link>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </div>
                );
              })}
            </div>
          </div>


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
