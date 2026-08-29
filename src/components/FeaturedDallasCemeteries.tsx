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
      className={variant === "full" ? "py-14 md:py-20 scroll-mt-24" : "py-16 sm:py-20 bg-gradient-warm"}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className={variant === "full" ? "" : "container mx-auto px-6"}>
        {/* Masthead */}
        <div className={variant === "full" ? "max-w-3xl mb-12 md:mb-16" : "text-center max-w-2xl mx-auto mb-12"}>
          <div className={`mb-5 flex items-center gap-4 ${variant === "compact" ? "justify-center" : ""}`}>
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
            className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tight text-foreground [text-wrap:balance]"
          >
            The Dallas parks we <span className="italic font-light">know by heart</span>
          </h2>
          <p className={`mt-5 text-base md:text-[17px] font-light leading-relaxed text-muted-foreground ${variant === "compact" ? "mx-auto" : ""}`}>
            Five memorial parks across Dallas, Colleyville, Fort Worth and Rockwall — photographed on the grounds, with the
            details families actually ask about: how flat the ground is, how close you can park, and what each lawn looks like.
          </p>
        </div>

        {variant === "compact" ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {DALLAS_CEMETERY_PROFILES.map((c, i) => (
                <motion.article
                  key={c.slug}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: (i % 3) * 0.06 }}
                  className="group overflow-hidden rounded-[26px] border border-border/70 bg-card"
                >
                  <Link to={`/cemeteries/${c.slug}`} className="block">
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={c.hero.src}
                        alt={c.hero.alt}
                        width={1200}
                        height={800}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <span className="block text-[10px] uppercase tracking-[0.28em] text-background/75">{c.city}, Texas</span>
                        <h3 className="font-display text-xl leading-snug text-background">{c.name}</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm leading-relaxed text-muted-foreground">{c.standfirst}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-all group-hover:gap-3">
                        Read the profile <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.article>
              ))}
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
                        className="h-[260px] w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] md:h-[420px]"
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
