import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DALLAS_CEMETERY_PROFILES } from "@/data/dallasCemeteryProfiles";

const SITE = "https://texascemeterybrokers.com";

/**
 * Editorial profiles of the five Dallas–Fort Worth parks we photograph most.
 * `full` runs a magazine spread (used on the Dallas city page); `compact`
 * runs a card row for the home page. Both emit ImageGallery + ItemList
 * structured data so the photography is indexable.
 */
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
        <div className={variant === "full" ? "max-w-3xl mb-12 md:mb-16" : "text-center max-w-2xl mx-auto mb-8"}>
          <div className={`mb-4 flex items-center gap-4 ${variant === "compact" ? "justify-center" : ""}`}>
            {variant === "compact" && <span className="h-px w-10 bg-primary/40" />}
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
              Featured Dallas–Fort Worth cemeteries
            </span>
            {variant === "compact" ? (
              <span className="h-px w-10 bg-primary/40" />
            ) : (
              <span className="h-px flex-1 bg-border" />
            )}
          </div>
          <h2
            id="featured-cemeteries-heading"
            className="font-display text-2xl md:text-3xl leading-[1.1] tracking-tight text-foreground [text-wrap:balance]"
          >
            The Dallas parks we <span className="italic font-light">know by heart</span>
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
            {/* Asymmetric editorial spread: 7/5, 5/7, then a full-width closing
                card — no orphan gaps, each block a different rhythm. */}
            <div className="grid gap-5 lg:grid-cols-12">
              {DALLAS_CEMETERY_PROFILES.map((c, i) => {
                const spans = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7", "lg:col-span-12"];
                const wide = i === 0 || i === 3;
                const closing = i === 4;
                return (
                  <motion.article
                    key={c.slug}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: (i % 2) * 0.08 }}
                    className={`group relative overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-[0_18px_50px_-30px_hsl(var(--foreground)/0.35)] ${spans[i]}`}
                  >
                    <Link
                      to={`/cemeteries/${c.slug}`}
                      className={closing ? "grid md:grid-cols-2" : "flex h-full flex-col"}
                    >
                      <div className={`relative overflow-hidden ${closing ? "h-64 md:h-full md:min-h-[320px]" : wide ? "h-64 sm:h-72" : "h-56"}`}>
                        {/* Cloudy-day grade: lift exposure, warm the light, deepen greens */}
                        <img
                          src={c.hero.src}
                          alt={c.hero.alt}
                          width={1600}
                          height={1000}
                          loading="lazy"
                          className="h-full w-full object-cover brightness-[1.12] contrast-[1.06] saturate-[1.28] sepia-[0.12] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.06]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/15 to-transparent" />
                        {/* warm sunlight wash */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-[hsl(45_80%_70%/0.22)] mix-blend-soft-light" />

                        {/* index numeral */}
                        <span className="absolute left-5 top-5 font-display text-5xl leading-none text-background/25 [text-shadow:0_1px_12px_hsl(var(--foreground)/0.3)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="absolute right-5 top-5 rounded-full border border-background/40 bg-foreground/30 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-background backdrop-blur-sm">
                          {c.city}, TX
                        </span>

                        {!closing && (
                          <div className="absolute inset-x-0 bottom-0 p-5">
                            <span className="mb-2 block h-px w-8 bg-primary/80 transition-all duration-500 group-hover:w-14" />
                            <h3 className="font-display text-xl leading-snug text-background md:text-2xl [text-wrap:balance]">{c.name}</h3>
                          </div>
                        )}
                      </div>

                      <div className={`flex flex-1 flex-col p-5 md:p-6 ${closing ? "justify-center md:p-10" : ""}`}>
                        {closing && (
                          <>
                            <span className="text-[10px] uppercase tracking-[0.28em] text-primary">{c.city}, Texas</span>
                            <h3 className="mt-2 font-display text-2xl leading-tight text-foreground md:text-3xl">{c.name}</h3>
                          </>
                        )}
                        <p className={`text-sm leading-relaxed text-muted-foreground ${closing ? "mt-4 text-[15px]" : "mt-1"}`}>
                          {c.standfirst}
                        </p>

                        {/* facts reveal on hover (desktop), always visible on touch */}
                        <dl className="mt-4 space-y-1.5 border-t border-border/60 pt-3 opacity-100 transition-all duration-500 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                          {c.facts.slice(0, closing ? 3 : 2).map((f) => (
                            <div key={f.label} className="flex items-baseline gap-3">
                              <dt className="shrink-0 text-[9px] uppercase tracking-[0.2em] text-primary/80">{f.label}</dt>
                              <dd className="text-xs text-foreground/80">{f.value}</dd>
                            </div>
                          ))}
                        </dl>

                        <span className={`mt-auto inline-flex items-center gap-2 pt-4 text-sm font-medium text-primary transition-all group-hover:gap-3`}>
                          Read the profile <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/cemetery-plots-for-sale-dallas"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
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
