import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, ArrowRight, Phone, X, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";


import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";

import imgHillside from "@/assets/hero/cemetery-hillside.jpg";
import imgCathedral from "@/assets/hero/cemetery-cathedral.jpg";
import imgMountains from "@/assets/hero/cemetery-mountains.jpg";
import imgPalms from "@/assets/hero/cemetery-palms.jpg";

// Real Texas cemetery photography (uploaded park photos, CDN-hosted)
import restlandHero from "@/assets/restland/restland-hero-lawn.jpg.asset.json";
import restlandLawn from "@/assets/restland/restland-lawn-monuments.jpg.asset.json";
import resthavenAvenue from "@/assets/resthaven/resthaven-avenue.jpg.asset.json";
import resthavenOakPath from "@/assets/resthaven/resthaven-oak-path.jpg.asset.json";
import resthavenStatue from "@/assets/resthaven/resthaven-statue-lawn.jpg.asset.json";
import resthavenWalkway from "@/assets/resthaven/resthaven-walkway.jpg.asset.json";
import resthavenPavilion from "@/assets/resthaven/resthaven-pavilion-walk.jpg.asset.json";
import resthavenBench from "@/assets/resthaven/resthaven-oak-bench.jpg.asset.json";
import resthavenFlags from "@/assets/resthaven/resthaven-veteran-flags.jpg.asset.json";
import grounds1 from "@/assets/cemeteries/cemetery-grounds-1.jpg.asset.json";
import grounds2 from "@/assets/cemeteries/cemetery-grounds-2.jpg.asset.json";
import grounds3 from "@/assets/cemeteries/cemetery-grounds-3.jpg.asset.json";

const PHOTO_POOL: string[] = [
  restlandHero.url,
  resthavenAvenue.url,
  grounds1.url,
  resthavenOakPath.url,
  imgHillside,
  grounds2.url,
  resthavenStatue.url,
  restlandLawn.url,
  imgCathedral,
  resthavenWalkway.url,
  grounds3.url,
  resthavenPavilion.url,
  imgMountains,
  resthavenBench.url,
  imgPalms,
  resthavenFlags.url,
];

// Photography is chosen by REGION (a landscape that represents the area),
// not per individual cemetery — same region shares the same imagery family.
const REGION_PHOTOS: Record<string, string[]> = {
  "Dallas–Fort Worth": [restlandHero.url, restlandLawn.url],
  "Greater Houston": [resthavenAvenue.url, resthavenOakPath.url],
  "Austin": [resthavenPavilion.url, resthavenBench.url],
  "Central Texas": [grounds1.url, resthavenWalkway.url],
  "San Antonio": [resthavenStatue.url, grounds2.url],
  "South Texas": [imgPalms, grounds3.url],
  "East Texas": [resthavenOakPath.url, resthavenBench.url],
  "El Paso & West Texas": [imgMountains, imgHillside],
  "West Texas": [imgMountains, imgHillside],
  "North Texas": [restlandLawn.url, grounds1.url],
};

const photoFor = (region: string, hash: number) => {
  const set = REGION_PHOTOS[region];
  if (set && set.length) return set[hash % set.length];
  return PHOTO_POOL[hash % PHOTO_POOL.length];
};


// Botanical leaf accents (scattered decoratively across the page background)
const LEAF_MODULES = import.meta.glob("@/assets/leaves/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const LEAVES = Object.values(LEAF_MODULES);
const LEAF_SCATTER: Array<{ top: string; left?: string; right?: string; size: number; rotate: number; opacity: number; idx: number }> = [
  // Austin (~0-11%) — moved big terracotta monstera from left to right side
  { top: "2%",  right: "1%",  size: 130, rotate: 14,  opacity: 0.55, idx: 0 },
  { top: "5%",  left: "2%",   size: 110, rotate: -8,  opacity: 0.5,  idx: 5 },
  { top: "9%",  right: "44%", size: 70,  rotate: 30,  opacity: 0.35, idx: 11 },
  // Central Texas (~11-22%)
  { top: "14%", left: "3%",   size: 95,  rotate: -25, opacity: 0.45, idx: 2 },
  { top: "16%", right: "4%",  size: 100, rotate: 10,  opacity: 0.45, idx: 7 },
  { top: "22%", left: "30%",  size: 70,  rotate: 40,  opacity: 0.35, idx: 14 },
  // Dallas–Fort Worth (~22-33%)
  { top: "26%", right: "2%",  size: 125, rotate: -30, opacity: 0.55, idx: 16 }, // teal hibiscus (favorite)
  { top: "30%", left: "3%",   size: 95,  rotate: 12,  opacity: 0.5,  idx: 18 },
  // East Texas (~33-44%) — leaf next to heading enlarged
  { top: "34%", left: "2%",   size: 145, rotate: -8,  opacity: 0.55, idx: 9 },  // bigger palm fan
  { top: "38%", right: "3%",  size: 155, rotate: 12,  opacity: 0.55, idx: 21 }, // bigger leaf
  { top: "44%", left: "38%",  size: 80,  rotate: -10, opacity: 0.4,  idx: 3 },
  // El Paso & West Texas (~44-55%)
  { top: "46%", right: "32%", size: 110, rotate: 12,  opacity: 0.5,  idx: 16 }, // teal hibiscus (favorite)
  { top: "50%", left: "2%",   size: 130, rotate: -20, opacity: 0.55, idx: 17 },
  { top: "54%", right: "2%",  size: 120, rotate: 20,  opacity: 0.5,  idx: 12 },
  // Greater Houston (~55-66%) — rotated so leaves face up
  { top: "58%", left: "3%",   size: 130, rotate: 0,   opacity: 0.55, idx: 4 },  // caladium upright
  { top: "62%", right: "20%", size: 120, rotate: -8,  opacity: 0.5,  idx: 8 },
  { top: "66%", left: "38%",  size: 80,  rotate: 6,   opacity: 0.4,  idx: 16 }, // teal hibiscus (favorite)
  // San Antonio (~66-77%) — caladium enlarged, leaves up / stalks down
  { top: "70%", right: "2%",  size: 200, rotate: 0,   opacity: 0.6,  idx: 15 }, // BIG upright caladium
  { top: "74%", left: "3%",   size: 110, rotate: -10, opacity: 0.5,  idx: 19 },
  // South Texas (~77-88%)
  { top: "78%", right: "3%",  size: 130, rotate: 8,   opacity: 0.55, idx: 20 },
  { top: "82%", left: "30%",  size: 90,  rotate: -15, opacity: 0.45, idx: 16 }, // teal hibiscus (favorite)
  { top: "86%", left: "2%",   size: 125, rotate: -10, opacity: 0.55, idx: 13 },
  // West & North Texas (~88-100%)
  { top: "88%", right: "2%",  size: 140, rotate: 0,   opacity: 0.6,  idx: 16 }, // teal hibiscus (favorite, original)
  { top: "92%", left: "20%",  size: 110, rotate: -8,  opacity: 0.5,  idx: 16 }, // teal hibiscus (favorite)
  { top: "95%", right: "38%", size: 95,  rotate: 14,  opacity: 0.45, idx: 6 },
];

type Cem = (typeof bayCemeteries)[number];

const OFFERING_SETS: string[][] = [
  ["Plots", "Niches", "Mausoleums"],
  ["Plots", "Companion", "Cremation"],
  ["Plots", "Lawn Crypts", "Family Estates"],
  ["Plots", "Niches", "Veteran"],
];

const RegionRow = ({
  groupRegion,
  list,
  gIdx,
  setRef,
}: {
  groupRegion: string;
  list: Cem[];
  gIdx: number;
  setRef: (el: HTMLDivElement | null) => void;
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [list]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 320);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div
      data-region={groupRegion}
      ref={setRef}
      className="mb-14 last:mb-0 scroll-mt-[200px]"
    >
      {/* Region header — quiet editorial band with carousel arrows */}
      <div className="flex items-end justify-between gap-6 mb-5">
        <div className="flex items-baseline gap-4 min-w-0">
          <span className="font-display text-xs text-primary tabular-nums tracking-[0.2em] uppercase shrink-0">
            №&nbsp;{String(gIdx + 1).padStart(2, "0")}
          </span>
          <h2 className="font-display text-2xl md:text-3xl text-foreground tracking-tight leading-none truncate flex items-center gap-3">
            <svg aria-hidden viewBox="0 0 40 40" className="w-6 h-6 md:w-7 md:h-7 text-primary/70 shrink-0">
              <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M20 4 C 28 14, 28 26, 20 36 C 12 26, 12 14, 20 4 Z" />
                <path d="M20 6 L 20 34" />
              </g>
            </svg>
            {groupRegion}
          </h2>
          <span className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium tabular-nums shrink-0 hidden sm:inline">
            · {list.length.toString().padStart(2, "0")} {list.length === 1 ? "cemetery" : "cemeteries"}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canPrev}
            aria-label="Scroll left"
            className="w-11 h-11 rounded-full border-2 border-primary/60 bg-background flex items-center justify-center text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-25 disabled:hover:bg-background disabled:hover:text-foreground disabled:hover:border-primary/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.25} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            disabled={!canNext}
            aria-label="Scroll right"
            className="w-11 h-11 rounded-full border-2 border-primary/60 bg-background flex items-center justify-center text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-25 disabled:hover:bg-background disabled:hover:text-foreground disabled:hover:border-primary/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

      </div>

      {/* Horizontal scroll row — Airbnb-style, x-only */}
      <div className="relative -mx-6 pl-8 pr-6 md:-mx-8 md:pl-10 md:pr-8">
        <div
          ref={scrollerRef}
          className="flex gap-5 overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-mandatory scroll-smooth scroll-pl-8 md:scroll-pl-10 py-3 [touch-action:pan-y] [overscroll-behavior-x:contain] [overscroll-behavior-y:auto] [mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-72px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-72px),transparent_100%)]"
        >
          {list.map((c, i) => {
            let h = 0;
            for (let k = 0; k < c.name.length; k++) h = (h * 31 + c.name.charCodeAt(k)) >>> 0;
            const offerings = OFFERING_SETS[h % OFFERING_SETS.length];
            const refNum = String((h % 999) + 1).padStart(3, "0");
            const slug = slugify(c.name);

            return (
              <motion.article
                key={`${c.name}-${c.city}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
                className="group relative flex flex-col bg-card rounded-[26px] overflow-hidden border border-border/70 shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.35)] hover:shadow-[0_26px_50px_-20px_hsl(var(--primary)/0.35)] hover:-translate-y-1.5 transition-all duration-500 shrink-0 snap-start w-[288px] sm:w-[330px] md:w-[352px]"
              >
                <Link to={`/cemeteries/${slug}`} className="block">
                  {/* Photo — Airbnb-style image-first card */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={photoFor(c.region, h)}
                      alt={`${c.name}, ${c.city}, Texas`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/5 to-transparent" />
                    <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/92 backdrop-blur-md text-[11px] font-semibold tracking-tight text-foreground shadow-sm">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                      </span>
                      Plots available
                    </span>
                    <span className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-foreground/45 backdrop-blur-md text-[10px] font-semibold tracking-[0.12em] uppercase text-background">
                      №&nbsp;{refNum}
                    </span>
                    <div className="absolute bottom-3.5 left-4 right-4">
                      <h3 className="font-display text-[21px] leading-[1.14] text-background tracking-tight line-clamp-2 drop-shadow-[0_2px_10px_hsl(var(--foreground)/0.6)]">
                        {c.name}
                      </h3>
                    </div>
                  </div>
                </Link>

                <div className="px-5 pt-4 pb-4 flex-1 flex flex-col">
                  <p className="text-[13px] text-muted-foreground flex items-center gap-1.5 mb-3">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/75" />
                    <span className="font-medium tracking-tight text-foreground/80">{c.city}, TX</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{c.region}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {offerings.map((o) => (
                      <span
                        key={o}
                        className="text-[11.5px] px-2.5 py-1 rounded-full bg-primary/6 text-primary ring-1 ring-primary/12 font-semibold"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-border/60 divide-x divide-border/60">
                  <Link
                    to={`/buy?cemetery=${encodeURIComponent(c.name)}`}
                    className="group/btn flex items-center justify-center gap-1.5 py-3.5 text-[13.5px] font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-300"
                  >
                    Buy <span className="font-normal opacity-60 group-hover/btn:opacity-100">here</span>
                  </Link>
                  <Link
                    to={`/sell?cemetery=${encodeURIComponent(c.name)}`}
                    className="group/btn flex items-center justify-center gap-1.5 py-3.5 text-[13.5px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-300"
                  >
                    Sell <span className="font-normal opacity-60 group-hover/btn:opacity-100">mine</span>
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </div>
  );
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


  // Chip order — stable, matches alphabetical section order on the page so
  // the chips never reshuffle while scrolling or filtering.
  const chipOrder = useMemo(
    () => ["All", ...regions.filter((r) => r !== "All").sort((a, b) => a.localeCompare(b))],
    []
  );

  const total = bayCemeteries.length;

  // Scroll spy: track which region group is currently in view
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeRegion, setActiveRegion] = useState<string>("Dallas–Fort Worth");

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
    // Measure navbar height so the pinned bar tucks flush under it (no gap).
    const measureNav = () => {
      const nav = document.querySelector("nav");
      if (nav) setNavHeight((nav as HTMLElement).offsetHeight);
    };
    measureNav();
    const onScroll = () => {
      measureNav();
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
        setBarPinned(top <= navHeight);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [grouped, navHeight]);



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
    <div className="relative min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      {/* Page-wide warm wash — one continuous field behind the whole page so
          the theme never stops abruptly below the hero. Kept light at the very
          top so the navbar stays perfectly legible. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(90% 55% at 10% 12%, hsl(var(--secondary) / 0.55) 0%, transparent 60%), radial-gradient(85% 55% at 90% 18%, hsl(var(--accent) / 0.28) 0%, transparent 62%), radial-gradient(80% 60% at 50% 95%, hsl(var(--primary) / 0.10) 0%, transparent 65%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary) / 0.35) 45%, hsl(var(--background)) 100%)",
        }}
      />
      <Seo
        title="Texas Cemeteries We Serve — Buy & Sell Plots | Texas Cemetery Brokers"
        description={`Browse ${total}+ cemeteries across Dallas–Fort Worth, Houston, Austin, San Antonio, El Paso & beyond. Get help buying or selling cemetery plots in Texas.`}
        path="/cemeteries"
        jsonLd={jsonLd}
      />
      <Navbar />

      {/* HERO — sits on the shared page wash, Airbnb-style segmented search */}
      <section className="relative z-10 pt-28 pb-10 md:pt-36 md:pb-14">


        <div className="relative container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto text-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/60 shadow-sm mb-7">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-primary">
                Texas&rsquo; licensed plot marketplace
              </span>
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[68px] text-foreground leading-[1.04] tracking-tight mb-6">
              Cemetery plots,
              <br />
              <em className="not-italic text-primary">simply</em> bought and sold.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-9 leading-relaxed">
              {total}+ cemeteries from Dallas–Fort Worth to the Valley — at meaningfully below retail.
              We handle the cemetery paperwork, transfer and title end to end.
            </p>

            {/* Airbnb-style segmented search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0 bg-background rounded-[28px] md:rounded-full border border-border/70 p-2 shadow-[0_24px_60px_-28px_hsl(var(--foreground)/0.45)] focus-within:shadow-[0_28px_70px_-26px_hsl(var(--primary)/0.4)] transition-shadow duration-300">
                {/* Where */}
                <label className="group flex-1 flex items-center gap-3 px-4 py-2.5 rounded-full hover:bg-muted/50 transition-colors cursor-pointer text-left">
                  <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] tracking-[0.16em] uppercase font-bold text-muted-foreground">Where</span>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-transparent text-[15px] font-semibold text-foreground tracking-tight focus:outline-none cursor-pointer -ml-0.5"
                    >
                      {chipOrder.map((r) => (
                        <option key={r} value={r}>{r === "All" ? "All of Texas" : r}</option>
                      ))}
                    </select>
                  </span>
                </label>

                <span aria-hidden className="hidden md:block w-px h-9 bg-border/70" />



                {/* Cemetery */}
                <label className="group flex-[1.2] flex items-center gap-3 px-4 py-2.5 rounded-full hover:bg-muted/50 transition-colors text-left">
                  <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] tracking-[0.16em] uppercase font-bold text-muted-foreground">Cemetery</span>
                    <input
                      type="text"
                      placeholder="Any cemetery"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent text-[15px] font-semibold text-foreground placeholder:font-semibold placeholder:text-muted-foreground/70 tracking-tight focus:outline-none"
                    />
                  </span>
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="w-7 h-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </label>

                <Link
                  to="/buy"
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 transition-opacity"
                >
                  <Search className="w-4 h-4" strokeWidth={2.4} /> Search
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {total}+ cemeteries served
                </span>
                <span>30–60% below retail</span>
                <a href="tel:+12142304740" className="text-foreground font-semibold hover:text-primary transition-colors">
                  (214) 230-4740
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Anchor that marks where the hero search ends — used to trigger the
          condensed Airbnb-style pinned bar. */}
      <div ref={barAnchorRef as any} aria-hidden="true" />

      {/* Sticky search bar — the hero search itself, smoothly transitioning
          to a slightly condensed sticky state at the top of the viewport. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {barPinned && (
              <motion.div
                key="sticky-search"
                initial={{ y: -28, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="hidden md:block fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.22)]"
                style={{ top: `${navHeight}px`, transformOrigin: "center top" }}
              >
                <div className="container mx-auto px-6 py-3 flex justify-center">
                  {/* Same hero pill design, condensed ~15% in padding & type */}
                  <motion.div
                    layout
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-2xl flex items-center bg-background rounded-full border border-border shadow-[0_10px_28px_-16px_hsl(var(--foreground)/0.4)] focus-within:shadow-[0_14px_32px_-16px_hsl(var(--primary)/0.45)] transition-shadow duration-300"
                  >
                    <Search className="w-[17px] h-[17px] text-muted-foreground ml-5 shrink-0" strokeWidth={2} />
                    <input
                      type="text"
                      placeholder="Search cemeteries, cities, or regions"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 text-base md:text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none tracking-tight"
                    />
                    {query ? (
                      <button
                        onClick={() => setQuery("")}
                        className="mr-1.5 w-8 h-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Link
                        to="/buy"
                        className="hidden sm:inline-flex mr-1.5 items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-[12.5px] font-medium hover:bg-foreground/85 transition-colors"
                      >
                        Find a plot <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}


      {/* Cards grid — warm cream wash that fades softly into the page */}
      <section className="relative pt-14 md:pt-20 pb-20 md:pb-28 overflow-hidden">
        {/* Dotted grid texture — warm tone to match botanical scatter */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--accent) / 0.5) 1.4px, transparent 1.4px)",
            backgroundSize: "24px 24px",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0, hsl(0 0% 0%) 180px, hsl(0 0% 0%) calc(100% - 220px), transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0, hsl(0 0% 0%) 180px, hsl(0 0% 0%) calc(100% - 220px), transparent 100%)",
          }}
        />


        {/* Decorative warm washes — terracotta + sage */}
        <div aria-hidden className="pointer-events-none absolute top-[18%] -right-40 w-[520px] h-[520px] rounded-full bg-primary/12 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-[50%] -left-40 w-[460px] h-[460px] rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-[15%] right-1/3 w-[360px] h-[360px] rounded-full bg-secondary/40 blur-3xl" />

        {/* Botanical scatter — real painted leaves & flowers, freely arranged */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {LEAVES.length > 0 && LEAF_SCATTER.map((s, i) => (
            <img
              key={i}
              src={LEAVES[s.idx % LEAVES.length]}
              alt=""
              loading="lazy"
              className="absolute select-none"
              style={{
                top: s.top,
                left: s.left,
                right: s.right,
                width: `${Math.round(s.size * 1.55)}px`,
                height: "auto",
                opacity: s.opacity,
                transform: `rotate(${s.rotate}deg)`,
                filter: "saturate(0.85)",
              }}
            />
          ))}
        </div>


        <div className="relative container mx-auto px-6">
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
              <RegionRow
                key={groupRegion}
                groupRegion={groupRegion}
                list={list}
                gIdx={gIdx}
                setRef={(el) => { sectionRefs.current[groupRegion] = el; }}
              />
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
            <img loading="lazy" decoding="async" src={imgHillside} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
                    href="tel:+12142304740"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
                  >
                    <Phone className="w-4 h-4" /> (214) 230-4740
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
                  { k: "30+", v: "Years brokering Texas plots" },
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
