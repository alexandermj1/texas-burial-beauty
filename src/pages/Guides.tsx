import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
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

// Hand-drawn tropical botanicals — used as feature accents on each guide panel
import hibiscusRed from "@/assets/flowers/hibiscus-red.png.asset.json";
import monstera from "@/assets/flowers/monstera.png.asset.json";
import plumeria from "@/assets/flowers/plumeria.png.asset.json";
import fern from "@/assets/flowers/fern.png.asset.json";
import birdParadise from "@/assets/flowers/bird-paradise.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf.png.asset.json";
import pinkBlossom from "@/assets/flowers/pink-blossom.png.asset.json";
const FLOWERS = [hibiscusRed.url, monstera.url, plumeria.url, fern.url, birdParadise.url, palmFan.url, bananaLeaf.url, pinkBlossom.url];

const OUTBOUND_RESOURCES = [
  { label: "Texas Dept. of Banking — Cemetery Regulation", href: "https://www.dob.texas.gov/cemetery-prepaid-funeral-services" },
  { label: "Texas Funeral Service Commission", href: "https://tfsc.texas.gov/ConsumerInformation.html" },
  { label: "Texas Health & Safety Code Ch. 711", href: "https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm" },
];

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
  flowerIdx: number[]; // index into FLOWERS for feature accents
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
    flowerIdx: [1, 3, 6, 7], // monstera, fern, banana, pink
  },
  {
    slug: "buying-a-cemetery-plot-in-texas",
    issue: "Issue N°02",
    kicker: "The Buyer's Edition",
    title: "How to Buy a Cemetery Plot in",
    titleAccent: "Texas",
    dek: "Choosing the right cemetery, comparing property types, understanding pricing, and securing the right plot for your family — without overpaying.",
    status: "coming-soon",
    meta: "Coming soon",
    panel: "bg-[hsl(16_50%_58%)]",
    panelInk: "text-[hsl(40_30%_97%)]",
    rule: "bg-[hsl(40_45%_82%)]",
    flowerIdx: [0, 2, 5, 7], // hibiscus, plumeria, palm, pink
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
    flowerIdx: [4, 5, 1, 2], // bird-paradise, palm, monstera, plumeria
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

  return (
    <div className="min-h-screen bg-[hsl(38_35%_95%)] flex flex-col relative">
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

      {/* Scattered botanical accents — hand-drawn tropicals */}
      <img src={FLOWERS[0]} alt="" aria-hidden className="hidden md:block absolute -top-14 -left-20 w-64 opacity-60 rotate-[18deg] pointer-events-none select-none" />
      <img src={FLOWERS[1]} alt="" aria-hidden className="hidden md:block absolute top-32 -right-16 w-72 opacity-55 -rotate-[14deg] pointer-events-none select-none" />
      <img src={FLOWERS[5]} alt="" aria-hidden className="hidden lg:block absolute bottom-32 -left-12 w-56 opacity-50 -rotate-[8deg] pointer-events-none select-none" />

      <section className="relative flex-1 flex flex-col pt-24 pb-6 overflow-hidden z-10">
        {/* Masthead */}
        <div className="container mx-auto px-6 max-w-[1400px] mb-5 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-end justify-between gap-6 border-b border-[hsl(28_20%_25%)]/15 pb-4"
          >
            <div>
              <p className="text-[10px] md:text-[11px] tracking-[0.42em] uppercase font-semibold text-[hsl(28_20%_25%)]/70 mb-2">
                The Guides Library · Vol. 1
              </p>
              <h1 className="font-display text-3xl md:text-5xl lg:text-[3.5rem] text-[hsl(28_20%_15%)] leading-[0.95] tracking-tight">
                Plain English, <span className="italic">printed</span> for families.
              </h1>
            </div>
            <p className="hidden lg:block text-xs tracking-[0.18em] uppercase text-[hsl(28_20%_25%)]/60 max-w-xs text-right">
              Three complete guides on selling, buying and transferring Texas cemetery property — swipe to read.
            </p>
          </motion.div>
        </div>

        {/* Carousel */}
        <div className="relative flex-1 flex items-center min-h-0">
          <div ref={emblaRef} className="overflow-hidden w-full">
            <div className="flex">
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
                    <div className="grid md:grid-cols-[1.05fr_0.95fr] h-full">
                      {/* LEFT — editorial text panel */}
                      <div className="relative flex flex-col p-7 md:p-10 lg:p-12">
                        {/* Top meta line */}
                        <div className="flex items-center justify-between mb-8">
                          <p className="text-[10px] tracking-[0.32em] uppercase font-semibold text-[hsl(28_20%_25%)]/65">
                            {g.issue}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full ${
                              isLive
                                ? "bg-[hsl(145_25%_36%)] text-[hsl(40_30%_97%)]"
                                : "bg-[hsl(28_20%_25%)]/8 text-[hsl(28_20%_25%)]/70 border border-[hsl(28_20%_25%)]/15"
                            }`}
                          >
                            {isLive && <span className="w-1 h-1 rounded-full bg-[hsl(40_30%_97%)] animate-pulse" />}
                            {isLive ? "Available" : "Soon"}
                          </span>
                        </div>

                        <p className="font-display italic text-[hsl(16_50%_45%)] text-base md:text-lg mb-3">
                          {g.kicker}
                        </p>

                        <h2 className="font-display text-[2rem] md:text-[2.6rem] lg:text-[3.1rem] leading-[0.98] text-[hsl(28_20%_15%)] tracking-tight mb-6">
                          {g.title}{" "}
                          <span className="italic">{g.titleAccent}</span>
                        </h2>

                        <div className={`w-12 h-px ${g.rule} mb-6`} />

                        <p className="text-[hsl(28_20%_25%)]/75 text-[0.95rem] md:text-base leading-relaxed font-light max-w-md mb-8">
                          {g.dek}
                        </p>

                        <div className="mt-auto flex items-end justify-between gap-4 pt-6 border-t border-[hsl(28_20%_25%)]/10">
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
                      <div className={`relative hidden md:flex overflow-hidden ${g.panel}`}>
                        {/* Soft texture */}
                        <div
                          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                          style={{
                            backgroundImage:
                              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                            backgroundSize: "48px 48px",
                          }}
                        />
                        {/* Botanical leaves */}
                        {g.flowerIdx.map((idx, k) => {
                          const positions = [
                            { top: "-12%", right: "-12%", size: 340, rot: 18, op: 0.9 },
                            { bottom: "-14%", left: "-10%", size: 280, rot: -22, op: 0.75 },
                            { top: "38%", right: "52%", size: 130, rot: 35, op: 0.6 },
                            { top: "18%", left: "28%", size: 110, rot: -15, op: 0.5 },
                          ];
                          const p = positions[k];
                          return (
                            <img
                              key={k}
                              src={FLOWERS[idx % FLOWERS.length]}
                              alt=""
                              aria-hidden
                              className="absolute pointer-events-none select-none"
                              style={{
                                top: p.top,
                                bottom: p.bottom,
                                left: p.left,
                                right: p.right,
                                width: p.size,
                                opacity: p.op,
                                transform: `rotate(${p.rot}deg)`,
                              }}
                            />
                          );
                        })}

                        {/* Issue number — huge editorial display */}
                        <div className={`relative z-10 flex flex-col justify-between p-10 lg:p-12 w-full ${g.panelInk}`}>
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
                            <p className="font-display text-[6rem] lg:text-[8rem] leading-[0.85] tracking-tighter">
                              {String(i + 1).padStart(2, "0")}
                            </p>
                            <div className={`mt-6 w-16 h-px ${g.rule} opacity-80`} />
                            <p className="mt-4 text-[11px] tracking-[0.28em] uppercase opacity-85 font-semibold">
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
                    className="flex-[0_0_94%] md:flex-[0_0_82%] lg:flex-[0_0_72%] xl:flex-[0_0_64%] min-w-0 px-3 md:px-5"
                    style={{ height: "min(64vh, 580px)" }}
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
        <div className="container mx-auto px-6 mt-5 flex items-center justify-between border-t border-[hsl(28_20%_25%)]/15 pt-4 max-w-6xl">
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
      </section>
    </div>
  );
};

export default Guides;
