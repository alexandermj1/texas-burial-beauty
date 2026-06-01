import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { guides } from "@/pages/Guides";

/**
 * Home-page guides carousel — mirrors the editorial styling of the
 * Guides hub but lives inline within a normal scrolling page section.
 */
const GuidesCarousel = () => {
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
    <section className="relative py-16 sm:py-20 bg-[hsl(38_35%_95%)] overflow-hidden">
      {/* dotted paper texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(hsl(28 20% 70% / 0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="container mx-auto px-6 max-w-[1400px] relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-6 border-b border-[hsl(28_20%_25%)]/15 pb-5 mb-8"
        >
          <div>
            <p className="text-[10px] md:text-[11px] tracking-[0.42em] uppercase font-semibold text-[hsl(145_25%_36%)] mb-2">
              The Field Manual · Vol. 1
            </p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-[hsl(28_20%_15%)] leading-[0.95] tracking-tight">
              The <span className="italic text-[hsl(145_25%_36%)]">How-To</span> Guides
            </h2>
            <p className="mt-2 text-sm text-[hsl(28_20%_25%)]/75 font-light max-w-xl">
              Plain-English guides for Texas families on buying, selling, and transferring cemetery property.
            </p>
          </div>
          <Link
            to="/guides"
            className="hidden md:inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-[hsl(145_25%_36%)] font-semibold hover:gap-3 transition-all"
          >
            See all guides <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        <div className="relative">
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {guides.map((g, i) => {
                const isLive = g.status === "live";
                const isActive = i === selected;

                const inner = (
                  <article
                    className={`group relative h-[420px] md:h-[440px] w-full rounded-[1.25rem] overflow-hidden bg-[hsl(40_30%_97%)] border border-[hsl(28_20%_25%)]/10 transition-all duration-500 ${
                      isActive
                        ? "shadow-[0_30px_60px_-30px_hsl(28_20%_15%/0.35)] opacity-100"
                        : "shadow-[0_10px_30px_-20px_hsl(28_20%_15%/0.3)] opacity-60 scale-[0.96]"
                    }`}
                  >
                    <div className="grid md:grid-cols-[1.05fr_0.95fr] h-full">
                      <div className="relative flex flex-col p-6 md:p-7">
                        <div className="flex items-center justify-between mb-6">
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

                        <p className="font-display italic text-[hsl(16_50%_45%)] text-base md:text-lg mb-2">
                          {g.kicker}
                        </p>
                        <h3 className="font-display text-[1.5rem] md:text-[1.85rem] leading-[1] text-[hsl(28_20%_15%)] tracking-tight mb-3">
                          {g.title} <span className="italic">{g.titleAccent}</span>
                        </h3>
                        <div className={`w-12 h-px ${g.rule} mb-3`} />
                        <p className="text-[hsl(28_20%_25%)]/75 text-sm leading-relaxed font-light max-w-md mb-5 line-clamp-4">
                          {g.dek}
                        </p>

                        <div className="mt-auto flex items-end justify-between gap-4 pt-3 border-t border-[hsl(28_20%_25%)]/10">
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

                      <div className={`relative hidden md:flex overflow-hidden ${g.panel}`}>
                        <div
                          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                          style={{
                            backgroundImage:
                              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                            backgroundSize: "48px 48px",
                          }}
                        />
                        <img
                          src={g.hero}
                          alt=""
                          aria-hidden
                          className="absolute pointer-events-none select-none"
                          style={{
                            bottom: "-10%",
                            right: "-8%",
                            width: "70%",
                            maxWidth: 360,
                            opacity: 0.95,
                            transform: "rotate(-8deg)",
                            filter: "drop-shadow(0 10px 20px hsl(28 30% 10% / 0.18))",
                          }}
                        />
                        <img
                          src={g.accent}
                          alt=""
                          aria-hidden
                          className="absolute pointer-events-none select-none"
                          style={{
                            top: "-8%",
                            left: "-6%",
                            width: "38%",
                            maxWidth: 170,
                            opacity: 0.55,
                            transform: "rotate(22deg)",
                          }}
                        />
                        <div className={`relative z-10 flex flex-col justify-between p-6 lg:p-7 w-full ${g.panelInk}`}>
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
                            <p className="font-display text-[3.5rem] lg:text-[4.5rem] leading-[0.85] tracking-tighter">
                              {String(i + 1).padStart(2, "0")}
                            </p>
                            <div className={`mt-3 w-14 h-px ${g.rule} opacity-80`} />
                            <p className="mt-2 text-[10px] tracking-[0.28em] uppercase opacity-85 font-semibold">
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
                    className="flex-[0_0_92%] md:flex-[0_0_82%] lg:flex-[0_0_72%] xl:flex-[0_0_64%] min-w-0 px-3 md:px-4"
                  >
                    {isLive ? (
                      <Link to={`/${g.slug}`} className="block">{inner}</Link>
                    ) : (
                      <Link to="/contact" className="block">{inner}</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Previous guide"
            className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[hsl(40_30%_97%)] border border-[hsl(28_20%_25%)]/15 shadow-md flex items-center justify-center text-[hsl(28_20%_15%)] hover:bg-white hover:scale-105 transition-all disabled:opacity-25 disabled:hover:scale-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Next guide"
            className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[hsl(40_30%_97%)] border border-[hsl(28_20%_25%)]/15 shadow-md flex items-center justify-center text-[hsl(28_20%_15%)] hover:bg-white hover:scale-105 transition-all disabled:opacity-25 disabled:hover:scale-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
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

        <div className="md:hidden text-center mt-4">
          <Link to="/guides" className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-[hsl(145_25%_36%)] font-semibold">
            See all guides <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GuidesCarousel;
