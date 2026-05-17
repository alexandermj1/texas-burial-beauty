import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Handshake } from "lucide-react";
import bayerLogo from "@/assets/partners/bayer-cemetery-brokers-logo.png";

/**
 * SEO-geared editorial section for the home page. Plain-language description
 * of what Texas Cemetery Brokers does, written to rank for the long-tail
 * "cemetery plots / brokers / Dallas / Houston / Texas" queries while
 * matching the rest of the site's editorial, light-earthy aesthetic.
 */
const AboutSeoSection = () => {
  const regions = [
    { name: "Dallas–Fort Worth", desc: "Restland, Hillcrest, Sparkman/Hillcrest, Laurel Land" },
    { name: "Greater Houston", desc: "Forest Park, Memorial Oaks, Earthman, Brookside" },
    { name: "Austin", desc: "Cook-Walden, Capital Memorial Gardens" },
    { name: "San Antonio", desc: "Mission Burial Park, Sunset Memorial Park" },
    { name: "El Paso & West Texas", desc: "Restlawn, Evergreen, Mt. Carmel" },
  ];

  return (
    <section className="relative py-20 sm:py-28 bg-background overflow-hidden" aria-labelledby="about-seo-heading">
      {/* Soft background flourish — same warm tone as other editorial blocks */}
      <div className="absolute inset-0 bg-gradient-warm opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative container mx-auto px-6 lg:px-10 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary mb-4">
            Texas Cemetery Brokers · Est. 1996
          </span>
          <h2
            id="about-seo-heading"
            className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground leading-[1.1] tracking-tight max-w-3xl"
          >
            Texas's trusted brokerage for{" "}
            <span className="italic font-light">cemetery plots, niches and crypts.</span>
          </h2>
        </motion.div>

        <div className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="space-y-5 text-base sm:text-lg font-light text-muted-foreground leading-relaxed"
          >
            <p>
              <strong className="text-foreground font-medium">Texas Cemetery Brokers</strong> helps families across
              the state <strong className="text-foreground font-medium">buy and sell cemetery property</strong>{" "}
              — burial plots, columbarium niches, lawn crypts and private mausoleum spaces — at prices typically{" "}
              <strong className="text-foreground font-medium">30–50% below what cemeteries charge directly</strong>.
              We work the private resale market in <strong className="text-foreground font-medium">Dallas–Fort Worth,
              Greater Houston, Austin, San Antonio and El Paso</strong>, then handle the cemetery's transfer paperwork
              from start to finish.
            </p>
            <p>
              For sellers, we list cemetery plots inherited or no longer needed — with no upfront fees and full
              control over your asking price. For buyers planning at-need or pre-need, we match you to verified
              properties at the right cemetery, in the right section, for the right price. Pre-need buyers get our
              best pricing plus interest-free financing.
            </p>
            <p>
              Every transaction is handled by a Texas-licensed broker. We've quietly closed thousands of cemetery
              property transfers since 1996 — and we'd be honored to help with yours.
            </p>

            <div className="flex flex-wrap gap-3 pt-3">
              <Link
                to="/buy"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
              >
                Find a plot in Texas <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-card text-foreground font-medium rounded-full text-sm hover:bg-muted hover:border-primary/40 transition-all"
              >
                Sell a plot you own
              </Link>
            </div>
          </motion.div>

          {/* Region pillars — internal links good for SEO and the user */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6 sm:p-7"
            aria-label="Texas regions we serve"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Where we work</p>
            <ul className="space-y-3.5 text-sm">
              {regions.map((r) => (
                <li key={r.name} className="border-b border-border/40 last:border-0 pb-3.5 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="font-display text-base text-foreground leading-tight">{r.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mb-2">{r.desc}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <Link
                      to={`/buy?region=${encodeURIComponent(r.name)}`}
                      className="group inline-flex items-center gap-1 text-primary font-medium hover:underline"
                    >
                      Buy in {r.name.split("–")[0].split(" & ")[0]}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <span className="text-border" aria-hidden="true">·</span>
                    <Link
                      to={`/sell?region=${encodeURIComponent(r.name)}`}
                      className="group inline-flex items-center gap-1 text-foreground/80 font-medium hover:underline"
                    >
                      Sell in {r.name.split("–")[0].split(" & ")[0]}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>

        {/* Bayer Cemetery Brokers partnership block — editorial, on-brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-14 sm:mt-20"
        >
          <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.06] pointer-events-none" aria-hidden="true" />
            <div className="relative grid sm:grid-cols-[auto_1fr_auto] items-center gap-6 sm:gap-8 p-6 sm:p-8">
              {/* Logo */}
              <div className="shrink-0 flex sm:block items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-background border border-border/60 flex items-center justify-center p-2 shadow-soft">
                  <img
                    src={bayerLogo}
                    alt="Bayer Cemetery Brokers logo"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    width={96}
                    height={96}
                  />
                </div>
                <span className="sm:hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground">In partnership with</span>
              </div>

              {/* Copy */}
              <div className="min-w-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  <Handshake className="w-3 h-3" /> In partnership with
                </span>
                <h3 className="font-display text-xl sm:text-2xl text-foreground leading-tight mb-1">
                  Bayer Cemetery Brokers
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-xl">
                  We work alongside <a href="https://bayercemeterybrokers.com" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">Bayer Cemetery Brokers</a>{" "}
                  — California's longest-running cemetery property brokerage — to give Texas families access to the
                  same trusted process, transfer expertise and nationwide buyer network.
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                <Link
                  to="/partners"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all"
                >
                  Learn about this partnership <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSeoSection;
