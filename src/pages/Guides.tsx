import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Tag, ShoppingBag, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

interface Guide {
  slug: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  Icon: typeof Tag;
  status: "live" | "coming-soon";
  meta?: string;
  gradient: string;
  accentColor: string;
}

const guides: Guide[] = [
  {
    slug: "sell-cemetery-plot-texas",
    eyebrow: "For Sellers",
    title: "How to Sell a Cemetery Plot in",
    titleAccent: "Texas",
    description:
      "What affects a plot's value, the legal steps in Texas, and the most reliable way to turn unwanted plots, crypts and niches into cash.",
    Icon: Tag,
    status: "live",
    meta: "8 chapters · 9 min read",
    gradient: "from-[#c4654a] via-[#e8a87c] to-[#87a878]",
    accentColor: "#c4654a",
  },
  {
    slug: "buying-a-cemetery-plot-in-texas",
    eyebrow: "For Buyers",
    title: "How to Buy a Cemetery Plot in",
    titleAccent: "Texas",
    description:
      "Choosing the right cemetery, comparing property types, understanding pricing, and securing the right plot for your family — without overpaying.",
    Icon: ShoppingBag,
    status: "coming-soon",
    gradient: "from-[#4a6741] via-[#87a878] to-[#e8a87c]",
    accentColor: "#4a6741",
  },
  {
    slug: "cemetery-transfer-process-texas",
    eyebrow: "For Everyone",
    title: "The Cemetery",
    titleAccent: "Transfer Process",
    description:
      "How ownership actually changes hands in Texas — conveyance forms, transfer fees, recording timelines, and the details that decide whether a sale closes cleanly.",
    Icon: FileText,
    status: "coming-soon",
    gradient: "from-[#8b6f5e] via-[#c9b99a] to-[#e8a87c]",
    accentColor: "#8b6f5e",
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
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Seo
        title="Guides | Texas Cemetery Brokers — Buying, Selling & Transfer"
        description="Plain-English guides for Texas families on selling, buying, and transferring cemetery property — written by specialists who handle these transactions every day."
        path="/guides"
      />
      <Navbar forceScrolled />

      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
        <div className="absolute top-1/4 -left-40 w-[36rem] h-[36rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 -right-40 w-[36rem] h-[36rem] rounded-full bg-accent/15 blur-3xl" />
      </div>

      <section className="relative flex-1 flex flex-col pt-24 pb-8 overflow-hidden">
        {/* Hero header */}
        <div className="container mx-auto px-6 max-w-6xl text-center mb-6 md:mb-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-3 mb-3 md:mb-4">
              <span className="w-6 h-px bg-accent" />
              <p className="text-accent text-[10px] md:text-xs tracking-[0.28em] uppercase font-semibold">The Guides Library</p>
              <span className="w-6 h-px bg-accent" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] mb-3">
              Plain-English answers to the<br className="hidden md:block" />{" "}
              <span className="italic text-primary">hardest questions</span> families ask.
            </h1>
            <p className="hidden md:block text-base text-foreground/65 max-w-xl mx-auto font-light">
              Swipe through complete guides on selling, buying, and transferring Texas cemetery property.
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
                    className={`group relative h-full w-full flex flex-col rounded-[2rem] overflow-hidden transition-all duration-500 ${
                      isActive ? "scale-100 opacity-100" : "scale-[0.92] opacity-50"
                    }`}
                    style={{
                      boxShadow: isActive
                        ? `0 30px 80px -20px ${g.accentColor}66, 0 10px 30px -10px ${g.accentColor}33`
                        : "0 10px 30px -15px rgba(0,0,0,0.15)",
                    }}
                  >
                    {/* Full bleed gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {/* Grid overlay */}
                    <div
                      className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
                      style={{
                        backgroundImage:
                          "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                        backgroundSize: "44px 44px",
                      }}
                    />
                    {/* Decorative orbs */}
                    <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-black/20 blur-3xl" />

                    {/* Content */}
                    <div className="relative z-10 flex-1 flex flex-col p-8 md:p-12">
                      <div className="flex items-start justify-between mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/95 backdrop-blur flex items-center justify-center shadow-xl">
                          <g.Icon className="w-7 h-7" style={{ color: g.accentColor }} strokeWidth={1.75} />
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold px-3 py-1.5 rounded-full backdrop-blur ${
                          isLive ? "bg-white text-foreground" : "bg-white/20 text-white border border-white/30"
                        }`}>
                          {isLive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: g.accentColor }} />}
                          {isLive ? "Available now" : "Coming soon"}
                        </span>
                      </div>

                      <p className="text-white/85 text-[11px] tracking-[0.28em] uppercase font-bold mb-4">
                        {g.eyebrow} · Guide 0{i + 1}
                      </p>

                      <h2 className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.05] text-white mb-6 max-w-3xl">
                        {g.title}{" "}
                        {g.titleAccent && (
                          <span className="italic text-white/95 underline decoration-white/40 decoration-[3px] underline-offset-[6px]">
                            {g.titleAccent}
                          </span>
                        )}
                      </h2>

                      <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-2xl mb-8 font-light">
                        {g.description}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/20">
                        <span className="text-xs text-white/70 tracking-wide">
                          {isLive ? g.meta : "Notify me when it's ready"}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-foreground font-semibold text-sm group-hover:gap-3 transition-all shadow-lg">
                            Read guide <ArrowRight className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur border border-white/30 text-white font-medium text-sm">
                            Get notified <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );

                return (
                  <div
                    key={g.slug}
                    className="flex-[0_0_92%] md:flex-[0_0_72%] lg:flex-[0_0_62%] min-w-0 px-3 md:px-5"
                    style={{ height: "min(62vh, 560px)" }}
                  >
                    {isLive ? (
                      <Link to={`/${g.slug}`} className="block h-full">{inner}</Link>
                    ) : (
                      <Link to="/contact" className="block h-full">{inner}</Link>
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
            className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-14 md:h-14 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg flex items-center justify-center text-foreground hover:scale-110 hover:bg-card transition-all disabled:opacity-30 disabled:hover:scale-100"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Next guide"
            className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-14 md:h-14 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg flex items-center justify-center text-foreground hover:scale-110 hover:bg-card transition-all disabled:opacity-30 disabled:hover:scale-100"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Dots + counter */}
        <div className="container mx-auto px-6 mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {guides.map((g, i) => (
              <button
                key={g.slug}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to guide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === selected ? "w-10 bg-primary" : "w-2 bg-foreground/20 hover:bg-foreground/40"
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground font-semibold">
            {String(selected + 1).padStart(2, "0")} / {String(guides.length).padStart(2, "0")} · Swipe to explore
          </p>
        </div>
      </section>
    </div>
  );
};

export default Guides;
