import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * SEO-geared editorial section for the home page. Plain-language description
 * of what Texas Cemetery Brokers does, written to rank for the long-tail
 * "cemetery plots / brokers / Dallas / Houston / Texas" queries while
 * matching the rest of the site's editorial, light-earthy aesthetic.
 */
const AboutSeoSection = () => {
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
              For sellers, we list cemetery plots inherited or no longer needed — on commission, with no upfront fees.
              For buyers planning at-need or pre-need, we match you to verified properties at the right cemetery, in
              the right section, for the right price. Pre-need buyers get our best pricing plus interest-free
              financing.
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
            <ul className="space-y-3 text-sm">
              {[
                { name: "Dallas–Fort Worth", desc: "Restland, Hillcrest, Sparkman/Hillcrest, Laurel Land" },
                { name: "Greater Houston", desc: "Forest Park, Memorial Oaks, Earthman, Brookside" },
                { name: "Austin", desc: "Cook-Walden, Capital Memorial Gardens" },
                { name: "San Antonio", desc: "Mission Burial Park, Sunset Memorial Park" },
                { name: "El Paso & West Texas", desc: "Restlawn, Evergreen, Mt. Carmel" },
              ].map((r) => (
                <li key={r.name} className="border-b border-border/40 last:border-0 pb-3 last:pb-0">
                  <Link
                    to={`/buy?region=${encodeURIComponent(r.name)}`}
                    className="group flex items-baseline justify-between gap-3"
                  >
                    <span>
                      <span className="font-display text-base text-foreground block leading-tight">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.desc}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>
      </div>
    </section>
  );
};

export default AboutSeoSection;
