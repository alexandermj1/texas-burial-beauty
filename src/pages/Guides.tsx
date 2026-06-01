import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";

// Botanical leaves used as editorial accents (same library as the cemetery directory)
const LEAF_MODULES = import.meta.glob("@/assets/leaves/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const LEAVES = Object.values(LEAF_MODULES);

// Hand-drawn tropical botanicals — individually drawn, properly cropped
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import plumeriaCluster from "@/assets/flowers/plumeria-cluster.png.asset.json";
import leafVeined from "@/assets/flowers/leaf-veined.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";

// Six distinct botanicals — three flowering, three foliage.
// Each guide pairs ONE hero flower with ONE supporting leaf so nothing
// repeats inside a panel and foliage never sits on top of a flower head.
const FLORAL = {
  hibiscus: hibiscusCoral.url,
  plumeria: plumeriaCluster.url,
  pinkBranch: pinkBranch.url,
} as const;
const FOLIAGE = {
  veined: leafVeined.url,
  palm: palmFan.url,
  banana: bananaLeaf.url,
} as const;
// Background scatter on the page (kept large + sparse, all different species)
const SCATTER = [FOLIAGE.palm, FLORAL.pinkBranch, FOLIAGE.banana];


interface Guide {
  slug: string;
  issue: string;
  kicker: string;
  title: string;
  titleAccent: string;
  dek: string;
  status: "live" | "coming-soon";
  meta: string;
  panel: string;
  panelInk: string;
  rule: string;
  hero: string;      // featured flower (large, bottom-right of panel)
  accent: string;    // single supporting leaf (small, top-left of panel)
}

export const guides: Guide[] = [
  {
    slug: "sell-cemetery-plot-texas",
    issue: "Issue N°01",
    kicker: "The Seller's Edition",
    title: "How to Sell a Cemetery Plot in",
    titleAccent: "Texas",
    dek: "What your plot is really worth, the legal steps in Texas, and the most reliable way to turn unwanted plots, crypts and niches into cash.",
    status: "live",
    meta: "8 chapters · 9 min read",
    panel: "bg-[hsl(145_25%_36%)]",
    panelInk: "text-[hsl(40_30%_97%)]",
    rule: "bg-[hsl(40_45%_82%)]",
    hero: FLORAL.hibiscus,
    accent: FOLIAGE.banana,
  },
  {
    slug: "cemetery-plots-for-sale-texas",
    issue: "Issue N°02",
    kicker: "The Buyer's Edition",
    title: "Cemetery Plots for Sale in",
    titleAccent: "Texas",
    dek: "Buy plots, niches and crypts across Texas for typically 30–50% below cemetery retail — verified resale inventory, in-person showings and 0% pre-need financing.",
    status: "live",
    meta: "10 chapters · 8 min read",
    panel: "bg-[hsl(16_50%_58%)]",
    panelInk: "text-[hsl(40_30%_97%)]",
    rule: "bg-[hsl(40_45%_82%)]",
    hero: FLORAL.plumeria,
    accent: FOLIAGE.palm,
  },
  {
    slug: "cemetery-transfer-process-texas",
    issue: "Issue N°03",
    kicker: "The Transfer Edition",
    title: "The Cemetery",
    titleAccent: "Transfer Process",
    dek: "How ownership actually changes hands in Texas — conveyance forms, transfer fees, recording timelines, and the details that decide whether a sale closes cleanly.",
    status: "coming-soon",
    meta: "Coming soon",
    panel: "bg-[hsl(28_22%_38%)]",
    panelInk: "text-[hsl(40_30%_97%)]",
    rule: "bg-[hsl(40_45%_82%)]",
    hero: FLORAL.pinkBranch,
    accent: FOLIAGE.veined,
  },
];

const Guides = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "center", loop: false, containScroll: "trimSnaps" });
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelected(emblaApi.selectedScrollSnap());
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi]);

  // Mouse wheel / trackpad navigates the carousel (since the page can't scroll vertically)
  useEffect(() => {
    if (!emblaApi) return;
    const node = emblaApi.rootNode();
    let cooldown = false;
    const handler = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 8) return;
      e.preventDefault();
      if (cooldown) return;
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 420);
      if (delta > 0) emblaApi.scrollNext();
      else emblaApi.scrollPrev();
    };
    // Attach to window so the user doesn't have to hover the carousel exactly
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, [emblaApi]);

  // Lock body scroll so the Guides hub fits exactly in the viewport
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="h-screen bg-[hsl(38_35%_95%)] flex flex-col relative overflow-hidden">
      <Seo
        title="Guides | Texas Cemetery Brokers — Buying, Selling & Transfer"
        description="Plain-English guides for Texas families on selling, buying, and transferring cemetery property — written by specialists who handle these transactions every day."
        path="/guides"
      />
      <Navbar forceScrolled />

      {/* Editorial paper texture — soft dotted grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(28 20% 70% / 0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Scattered page accents — three different species, well spaced, never overlapping */}
      <img src={SCATTER[0]} alt="" aria-hidden className="hidden md:block absolute -top-10 -left-20 w-56 opacity-50 rotate-[14deg] pointer-events-none select-none" />
      <img src={SCATTER[1]} alt="" aria-hidden className="hidden md:block absolute top-40 -right-12 w-60 opacity-55 -rotate-[12deg] pointer-events-none select-none" />
      <img src={SCATTER[2]} alt="" aria-hidden className="hidden lg:block absolute bottom-24 -left-16 w-64 opacity-45 -rotate-[8deg] pointer-events-none select-none" />

      <section className="relative flex-1 flex flex-col pt-[5.5rem] pb-2 overflow-hidden z-10 min-h-0">
        {/* Masthead */}
        <div className="container mx-auto px-6 max-w-[1600px] mb-1 md:mb-2 mt-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-end justify-between gap-6 border-b border-[hsl(28_20%_25%)]/15 pb-3"
          >
            <div>
              <p className="text-[10px] md:text-[11px] tracking-[0.42em] uppercase font-semibold text-[hsl(145_25%_36%)] mb-2">
                The Texas Cemetery Field Manual · Vol. 1
              </p>
              <h1 className="font-display text-[2.4rem] md:text-[3.5rem] lg:text-[4.25rem] xl:text-[4.75rem] text-[hsl(28_20%_15%)] leading-[0.95] tracking-tight">
                The <span className="italic text-[hsl(145_25%_36%)]">How-To</span> Guides
              </h1>
              <p className="mt-1.5 text-sm text-[hsl(28_20%_25%)]/75 font-light max-w-xl">
                Everything Texas families need to know about cemetery property — written by the specialists who do it every day.
              </p>
            </div>
            <p className="hidden lg:block text-xs tracking-[0.18em] uppercase text-[hsl(28_20%_25%)]/60 max-w-xs text-right">
              Three complete editions · swipe through to read →
            </p>
          </motion.div>
        </div>

        {/* Carousel */}
        <div className="relative flex-1 flex items-stretch min-h-0 py-1">
          <div ref={emblaRef} className="overflow-hidden w-full h-full">
            <div className="flex h-full">
              {guides.map((g, i) => {
                const isLive = g.status === "live";
                const isActive = i === selected;

                const inner = (
                  <article
                    className={`group relative h-full w-full rounded-[1.25rem] overflow-hidden bg-[hsl(40_30%_97%)] border border-[hsl(28_20%_25%)]/10 transition-all duration-500 ${
                      isActive
                        ? "shadow-[0_30px_60px_-30px_hsl(28_20%_15%/0.35)] opacity-100"
                        : "shadow-[0_10px_30px_-20px_hsl(28_20%_15%/0.3)] opacity-60 scale-[0.96]"
                    }`}
                  >
                    <div className="grid grid-cols-[1.05fr_0.95fr] h-full">
                      {/* LEFT — editorial text panel */}
                      <div className="relative flex flex-col p-3.5 sm:p-5 md:p-7 lg:p-8">

                        {/* Top meta line */}
                        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
                          <p className="text-[8px] sm:text-[10px] tracking-[0.28em] sm:tracking-[0.32em] uppercase font-semibold text-[hsl(28_20%_25%)]/65 truncate pr-2">
                            {g.issue}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[8px] sm:text-[9px] uppercase tracking-[0.18em] sm:tracking-[0.22em] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shrink-0 ${
                              isLive
                                ? "bg-[hsl(145_25%_36%)] text-[hsl(40_30%_97%)]"
                                : "bg-[hsl(28_20%_25%)]/8 text-[hsl(28_20%_25%)]/70 border border-[hsl(28_20%_25%)]/15"
                            }`}
                          >
                            {isLive && <span className="w-1 h-1 rounded-full bg-[hsl(40_30%_97%)] animate-pulse" />}
                            {isLive ? "Available" : "Soon"}
                          </span>
                        </div>

                        <p className="font-display italic text-[hsl(16_50%_45%)] text-sm sm:text-base md:text-lg mb-2 md:mb-3">
                          {g.kicker}
                        </p>

                        <h2 className="font-display text-[1.15rem] sm:text-[1.5rem] md:text-[2rem] lg:text-[2.4rem] leading-[1.05] md:leading-[1] text-[hsl(28_20%_15%)] tracking-tight mb-2 md:mb-4">
                          {g.title}{" "}
                          <span className="italic">{g.titleAccent}</span>
                        </h2>

                        <div className={`w-10 md:w-12 h-px ${g.rule} mb-2 md:mb-4`} />

                        <p className="hidden sm:block text-[hsl(28_20%_25%)]/75 text-sm md:text-[0.95rem] leading-relaxed font-light max-w-md mb-6">
                          {g.dek}
                        </p>

                        <div className="mt-auto flex items-end justify-between gap-2 md:gap-4 pt-3 md:pt-4 border-t border-[hsl(28_20%_25%)]/10">

                          <span className="text-[10px] tracking-[0.24em] uppercase text-[hsl(28_20%_25%)]/55 font-medium">
                            {g.meta}
                          </span>
                          {isLive ? (
                            <span className="inline-flex items-center gap-2 text-[hsl(145_25%_36%)] font-semibold text-sm tracking-wide group-hover:gap-3 transition-all">
                              Read the guide <ArrowUpRight className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-[hsl(28_20%_25%)]/60 font-medium text-sm tracking-wide">
                              Notify me <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* RIGHT — colour panel with botanical */}
                      <div className={`relative flex overflow-hidden ${g.panel}`}>
                        {/* Soft texture */}
                        <div
                          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                          style={{
                            backgroundImage:
                              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                            backgroundSize: "48px 48px",
                          }}
                        />
                        {/* Hero flower — large, bottom-right; nothing else covers it */}
                        <img
                          src={g.hero}
                          alt=""
                          aria-hidden
                          className="absolute pointer-events-none select-none"
                          style={{
                            bottom: "-10%",
                            right: "-8%",
                            width: "70%",
                            maxWidth: 420,
                            opacity: 0.95,
                            transform: "rotate(-8deg)",
                            filter: "drop-shadow(0 10px 20px hsl(28 30% 10% / 0.18))",
                          }}
                        />
                        {/* Supporting leaf — small, top-left, well clear of the hero */}
                        <img
                          src={g.accent}
                          alt=""
                          aria-hidden
                          className="absolute pointer-events-none select-none"
                          style={{
                            top: "-8%",
                            left: "-6%",
                            width: "38%",
                            maxWidth: 200,
                            opacity: 0.55,
                            transform: "rotate(22deg)",
                          }}
                        />

                        {/* Issue number — huge editorial display */}
                        <div className={`relative z-10 flex flex-col justify-between p-7 lg:p-8 w-full ${g.panelInk}`}>
                          <div className="flex items-start justify-between">
                            <p className="text-[10px] tracking-[0.32em] uppercase font-semibold opacity-80">
                              {g.kicker}
                            </p>
                            <p className="text-[10px] tracking-[0.32em] uppercase font-semibold opacity-80">
                              {String(i + 1).padStart(2, "0")} / {String(guides.length).padStart(2, "0")}
                            </p>
                          </div>
                          <div>
                            <p className="font-display italic text-base opacity-90 mb-2">N°0{i + 1}</p>
                            <p className="font-display text-[4rem] lg:text-[5.5rem] leading-[0.85] tracking-tighter">
                              {String(i + 1).padStart(2, "0")}
                            </p>
                            <div className={`mt-4 w-16 h-px ${g.rule} opacity-80`} />
                            <p className="mt-3 text-[11px] tracking-[0.28em] uppercase opacity-85 font-semibold">
                              Texas Cemetery Brokers
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );

                return (
                  <div
                    key={g.slug}
                    className="flex-[0_0_98%] md:flex-[0_0_96%] lg:flex-[0_0_94%] xl:flex-[0_0_90%] min-w-0 px-2 md:px-4 h-full"
                  >
                    {isLive ? (
                      <Link to={`/${g.slug}`} className="block h-full">
                        {inner}
                      </Link>
                    ) : (
                      <Link to="/contact" className="block h-full">
                        {inner}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrows */}
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Previous guide"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[hsl(40_30%_97%)] border border-[hsl(28_20%_25%)]/15 shadow-md flex items-center justify-center text-[hsl(28_20%_15%)] hover:bg-white hover:scale-105 transition-all disabled:opacity-25 disabled:hover:scale-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Next guide"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[hsl(40_30%_97%)] border border-[hsl(28_20%_25%)]/15 shadow-md flex items-center justify-center text-[hsl(28_20%_15%)] hover:bg-white hover:scale-105 transition-all disabled:opacity-25 disabled:hover:scale-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Footer rail — dots + counter */}
        <div className="container mx-auto px-6 flex items-center justify-between border-t border-[hsl(28_20%_25%)]/15 py-2.5 max-w-[1600px]">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[hsl(28_20%_25%)]/65 font-semibold">
            {String(selected + 1).padStart(2, "0")} / {String(guides.length).padStart(2, "0")}
          </p>
          <div className="flex items-center gap-2">
            {guides.map((g, i) => (
              <button
                key={g.slug}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to guide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === selected
                    ? "w-10 bg-[hsl(145_25%_36%)]"
                    : "w-1.5 bg-[hsl(28_20%_25%)]/25 hover:bg-[hsl(28_20%_25%)]/45"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] tracking-[0.32em] uppercase text-[hsl(28_20%_25%)]/65 font-semibold hidden md:block">
            Swipe →
          </p>
        </div>
        {/* SEO content rail — keyword-rich internal links to high-intent pages */}
        <aside className="relative z-10 shrink-0 border-t border-[hsl(28_20%_25%)]/15 bg-[hsl(40_30%_97%)]/70 backdrop-blur-sm">
          <div className="container mx-auto px-6 max-w-[1600px] py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <p className="text-[10px] tracking-[0.32em] uppercase font-semibold text-[hsl(145_25%_36%)] shrink-0">
              Popular in Texas
            </p>
            <nav aria-label="Popular Texas cemetery resources" className="flex flex-wrap gap-x-4 gap-y-1">
              {[
                { label: "Cemetery plots for sale in Dallas", to: "/cemeteries?region=Dallas" },
                { label: "Cemetery plots for sale in Houston", to: "/cemeteries?region=Houston" },
                { label: "Austin cemetery plots", to: "/cemeteries?region=Austin" },
                { label: "San Antonio cemetery plots", to: "/cemeteries?region=San+Antonio" },
                { label: "Sell my cemetery plot in Texas", to: "/sell" },
                { label: "Free plot valuation", to: "/contact#sell-inquiry" },
                { label: "Browse Texas cemeteries", to: "/cemeteries" },
              ].map((r) => (
                <Link
                  key={r.to}
                  to={r.to}
                  className="text-[11px] text-[hsl(28_20%_25%)]/85 hover:text-[hsl(145_25%_36%)] underline-offset-4 hover:underline font-medium"
                >
                  {r.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Guides;
