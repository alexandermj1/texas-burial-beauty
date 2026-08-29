import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DALLAS_CEMETERY_PROFILES } from "@/data/dallasCemeteryProfiles";

const SITE = "https://texascemeterybrokers.com";

/**
 * Editorial profiles of the five Dallas–Fort Worth parks we photograph most.
 * `full` runs a magazine spread (used on the Dallas city page); `compact`
 * runs the home page "Editorial Archive" card grid. Both emit ImageGallery +
 * ItemList structured data so the photography is indexable.
 */

/** Accent rotation for the compact cards — sage, terracotta, sand, repeat. */
const COMPACT_ACCENTS = [
  {
    panel: "bg-sage-light/45 border-l-2 border-sage/30",
    kicker: "text-sage",
    thumbs: "-left-4",
  },
  {
    panel: "bg-terracotta-light/45 border-r-2 border-terracotta/30",
    kicker: "text-terracotta",
    thumbs: "-right-4",
  },
  {
    panel: "bg-sand-light/70 border-l-2 border-sand/70",
    kicker: "text-foreground/60",
    thumbs: "-left-4",
  },
  {
    panel: "bg-sage-light/45 border-l-2 border-sage/30",
    kicker: "text-sage",
    thumbs: "-left-4",
  },
  {
    panel: "bg-terracotta-light/45 border-r-2 border-terracotta/30",
    kicker: "text-terracotta",
    thumbs: "-right-4",
  },
] as const;

const FeaturedDallasCemeteries = ({ variant = "full" }: { variant?: "full" | "compact" }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Featured Dallas–Fort Worth cemeteries",
    itemListElement: DALLAS_CEMETERY_PROFILES.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Cemetery",
        name: c.name,
        url: `${SITE}/cemeteries/${c.slug}`,
        address: { "@type": "PostalAddress", addressLocality: c.city, addressRegion: "TX", addressCountry: "US" },
        description: c.standfirst,
        image: [c.hero.src, ...c.photos.map((p) => p.src)],
      },
    })),
  };

  return (
    <section
      id="featured-cemeteries"
      aria-labelledby="featured-cemeteries-heading"
      className={variant === "full" ? "py-14 md:py-20 scroll-mt-24" : "py-12 sm:py-16 bg-gradient-warm"}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className={variant === "full" ? "" : "container mx-auto px-6"}>
        {/* Masthead */}
        <div
          className={
            variant === "compact"
              ? "mx-auto mb-8 max-w-2xl text-center md:mb-10"
              : "max-w-3xl mb-12 md:mb-16"
          }
        >
          <div className={`mb-4 flex items-center gap-4 ${variant === "compact" ? "justify-center" : ""}`}>
            {variant === "compact" ? (
              <>
                <span className="h-px w-12 bg-gold/40" />
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                  Cemetery directory
                </span>
                <span className="h-px w-12 bg-gold/40" />
              </>
            ) : (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                  Featured Dallas–Fort Worth cemeteries
                </span>
                <span className="h-px flex-1 bg-border" />
              </>
            )}
          </div>
          <h2
            id="featured-cemeteries-heading"
            className="font-display text-3xl leading-[1.08] tracking-tight text-foreground italic [text-wrap:balance] md:text-[40px]"
          >
            The Dallas parks we <span className="font-light not-italic">know by heart</span>
          </h2>
          {variant !== "compact" && (
            <p className="mt-5 text-base md:text-[17px] font-light leading-relaxed text-muted-foreground">
              Five memorial parks across Dallas, Colleyville, Fort Worth and Rockwall — photographed on the grounds, with the
              details families actually ask about: how flat the ground is, how close you can park, and what each lawn looks like.
            </p>
          )}
        </div>

        {variant === "compact" ? (
          <>
            {/* Editorial Archive: photo-forward cards with overlapping detail
                thumbnails and tinted caption panels. Four regular cards, then
                Sparkman/Hillcrest as a full-width closing spread. */}
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 md:gap-x-10">
              {DALLAS_CEMETERY_PROFILES.slice(0, 4).map((c, i) => {
                const accent = COMPACT_ACCENTS[i];
                return (
                  <motion.article
                    key={c.slug}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: (i % 2) * 0.07 }}
                  >
                    <Link to={`/cemeteries/${c.slug}`} className="group block">
                      <div className="relative">
                        <div className="aspect-[16/8] overflow-hidden rounded-[4px] bg-sand-light shadow-[0_14px_32px_-24px_hsl(var(--foreground)/0.5)]">
                          <img
                            src={c.hero.src}
                            alt={c.hero.alt}
                            width={800}
                            height={400}
                            loading="lazy"
                            className="h-full w-full object-cover brightness-[1.1] contrast-[1.06] saturate-[1.26] sepia-[0.1] transition-transform duration-[900ms] ease-out group-hover:scale-[1.045]"
                          />
                        </div>

                        {/* Ghost index */}
                        <span className="absolute right-3 top-3 rounded-full bg-foreground/50 px-2 py-0.5 font-display text-[10px] leading-none tracking-[0.15em] text-background backdrop-blur-sm">
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        {/* Overlapping detail thumbnails */}
                        <div className={`absolute -bottom-3.5 flex gap-1.5 ${accent.thumbs}`}>
                          {c.photos.map((p) => (
                            <figure
                              key={p.src}
                              className="h-10 w-10 overflow-hidden rounded-[3px] border-2 border-background shadow-md sm:h-11 sm:w-11"
                            >
                              <img
                                src={p.src}
                                alt={p.alt}
                                width={120}
                                height={120}
                                loading="lazy"
                                className="h-full w-full object-cover brightness-[1.08] contrast-[1.05] saturate-[1.2]"
                              />
                            </figure>
                          ))}
                        </div>
                      </div>

                      <div className={`mt-7 p-4 sm:p-5 ${accent.panel}`}>
                        <span className={`text-[9px] font-semibold uppercase tracking-[0.25em] ${accent.kicker}`}>
                          {c.city}, Texas
                        </span>
                        <h3 className="mt-1.5 mb-2 font-display text-xl leading-tight text-foreground md:text-[22px]">
                          {c.name}
                        </h3>
                        <p className="mb-3 max-w-sm text-[13px] font-light leading-relaxed text-muted-foreground line-clamp-2">
                          {c.standfirst}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold transition-all duration-300 group-hover:gap-3.5">
                          View profile <span className="h-px w-7 bg-gold" />
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}

              {/* Full-width closing spread — Sparkman/Hillcrest */}
              {(() => {
                const c = DALLAS_CEMETERY_PROFILES[4];
                if (!c) return null;
                return (
                  <motion.article
                    className="md:col-span-2 md:mt-4"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.55 }}
                  >
                    <Link
                      to={`/cemeteries/${c.slug}`}
                      className="group flex flex-col overflow-hidden rounded-[4px] bg-card shadow-[0_24px_60px_-32px_hsl(var(--foreground)/0.5)] md:flex-row"
                    >
                      <div className="relative md:w-3/5">
                        <div className="aspect-[16/8] w-full overflow-hidden bg-sand-light md:aspect-auto md:h-full md:min-h-[240px]">
                          <img
                            src={c.hero.src}
                            alt={c.hero.alt}
                            width={1200}
                            height={600}
                            loading="lazy"
                            className="h-full w-full object-cover brightness-[1.1] contrast-[1.06] saturate-[1.26] sepia-[0.1] transition-transform duration-[1000ms] ease-out group-hover:scale-[1.035]"
                          />
                        </div>
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {c.photos.map((p) => (
                            <figure
                              key={p.src}
                              className="h-11 w-11 overflow-hidden rounded-[3px] border-2 border-background shadow-lg sm:h-12 sm:w-12"
                            >
                              <img
                                src={p.src}
                                alt={p.alt}
                                width={140}
                                height={140}
                                loading="lazy"
                                className="h-full w-full object-cover brightness-[1.08] contrast-[1.05] saturate-[1.2]"
                              />
                            </figure>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center bg-terracotta-light/50 p-6 md:w-2/5 md:p-8 lg:p-10">
                        <span className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-terracotta">
                          {c.city}, Texas
                        </span>
                        <h3 className="mb-3 font-display text-2xl leading-[1.12] text-foreground lg:text-3xl">
                          {c.name}
                        </h3>
                        <p className="mb-5 text-[13px] font-light leading-relaxed text-muted-foreground lg:text-sm">
                          {c.standfirst}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold transition-all duration-300 group-hover:gap-4">
                          Explore full archive <span className="h-px w-9 bg-gold" />
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                );
              })()}
            </div>
            <div className="mt-9 text-center">
              <Link
                to="/cemetery-plots-for-sale-dallas"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 transition-all hover:gap-3 hover:underline"
              >
                Cemetery plots for sale in Dallas–Fort Worth <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-16 md:space-y-24">
            {DALLAS_CEMETERY_PROFILES.map((c, i) => {
              const flip = i % 2 === 1;
              return (
                <motion.article
                  key={c.slug}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.65 }}
                  className="grid gap-8 md:gap-10 lg:grid-cols-12 lg:items-start"
                >
                  {/* Lead photograph */}
                  <figure className={`lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
                    <Link
                      to={`/cemeteries/${c.slug}`}
                      className="group block overflow-hidden rounded-[28px] border border-border/70 bg-card"
                    >
                      <img
                        src={c.hero.src}
                        alt={c.hero.alt}
                        width={1600}
                        height={1000}
                        loading="lazy"
                        className="h-[260px] w-full object-cover brightness-[1.12] contrast-[1.06] saturate-[1.28] sepia-[0.12] transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] md:h-[420px]"
                      />
                    </Link>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {c.photos.map((p) => (
                        <figure key={p.src} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                          <img
                            src={p.src}
                            alt={p.alt}
                            width={800}
                            height={600}
                            loading="lazy"
                            className="h-24 w-full object-cover md:h-32"
                          />
                        </figure>
                      ))}
                    </div>
                    <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {c.name}, {c.area}. Photographed on the grounds by Texas Cemetery Brokers.
                    </figcaption>
                  </figure>

                  {/* Profile */}
                  <div className={`lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
                    <span className="block text-[10px] uppercase tracking-[0.3em] text-primary">
                      {String(i + 1).padStart(2, "0")} · {c.city}, Texas
                    </span>
                    <h3 className="mt-3 font-display text-2xl leading-tight text-foreground md:text-[34px]">
                      <Link to={`/cemeteries/${c.slug}`} className="hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                    </h3>
                    <p className="mt-3 text-[15px] font-light italic leading-relaxed text-foreground/70">{c.standfirst}</p>

                    <div className="mt-5 space-y-4">
                      {c.body.map((para) => (
                        <p key={para.slice(0, 24)} className="text-[15px] leading-[1.75] text-foreground/80">
                          {para}
                        </p>
                      ))}
                    </div>

                    <dl className="mt-6 border-t border-border/70">
                      {c.facts.map((f) => (
                        <div key={f.label} className="flex items-baseline gap-5 border-b border-border/70 py-2.5">
                          <dt className="w-28 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{f.label}</dt>
                          <dd className="text-sm text-foreground/85">{f.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <Link
                        to={`/cemeteries/${c.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-all hover:gap-3"
                      >
                        {c.name} plots & prices <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link to="/sell" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                        Sell a plot here
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedDallasCemeteries;
