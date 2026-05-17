import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Handshake, ShieldCheck, TrendingDown, MapPin } from "lucide-react";
import bayerLogo from "@/assets/partners/bayer-cemetery-brokers-logo-transparent.png";

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
    <section
      className="relative py-24 sm:py-32 bg-background overflow-hidden"
      aria-labelledby="about-seo-heading"
    >
      {/* Background flourishes — match the rest of the site's warm, layered aesthetic */}
      <div className="absolute inset-0 bg-gradient-warm opacity-50 pointer-events-none" aria-hidden="true" />
      <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-secondary/30 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Wider container — break out of the cramped 5xl */}
      <div className="relative container mx-auto px-6 lg:px-10 max-w-6xl">
        {/* Editorial header — left-aligned, generous, mirrors other sections */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary mb-5">
            Texas Cemetery Brokers · Est. 1996
          </span>
          <h2
            id="about-seo-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.02] tracking-tight"
          >
            Texas's trusted brokerage for{" "}
            <span className="italic font-light text-primary/90">cemetery plots, niches and crypts.</span>
          </h2>
        </motion.div>

        {/* Three-stat band — adds rhythm + makes the savings concrete */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60"
        >
          {[
            { stat: "30–50%", label: "Below cemetery retail", icon: TrendingDown },
            { stat: "Since 1996", label: "Texas-licensed brokerage", icon: ShieldCheck },
            { stat: "5 Regions", label: "DFW, Houston, Austin, San Antonio & El Paso", icon: MapPin },
          ].map((s) => (
            <div key={s.label} className="bg-card/80 backdrop-blur-sm p-5 sm:p-7 md:p-8 flex flex-col">
              <s.icon className="w-5 h-5 text-primary mb-3" />
              <div className="font-display text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight leading-none mb-2">
                {s.stat}
              </div>
              <div className="text-[13px] sm:text-sm text-muted-foreground font-light leading-snug">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Two-column editorial body — wider columns, more air */}
        <div className="mt-16 grid lg:grid-cols-[1.35fr_1fr] gap-12 lg:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="space-y-6 text-base sm:text-lg font-light text-muted-foreground leading-relaxed"
          >
            <p className="text-lg sm:text-xl text-foreground/85 font-light leading-relaxed">
              <strong className="text-foreground font-medium">Texas Cemetery Brokers</strong> helps families across
              the state <strong className="text-foreground font-medium">buy and sell cemetery property</strong>{" "}
              — burial plots, columbarium niches, lawn crypts and private mausoleum spaces — at prices typically{" "}
              <strong className="text-foreground font-medium">30–50% below what cemeteries charge directly</strong>.
            </p>
            <p>
              We work the private resale market in <strong className="text-foreground font-medium">Dallas–Fort
              Worth, Greater Houston, Austin, San Antonio and El Paso</strong>, then handle the cemetery's transfer
              paperwork from start to finish — so you never deal with the cemetery office yourself.
            </p>
            <p>
              For sellers, we list cemetery plots inherited or no longer needed — with{" "}
              <strong className="text-foreground font-medium">no upfront fees</strong> and full control over your
              asking price. For buyers planning at-need or pre-need, we match you to verified properties at the
              right cemetery, in the right section, for the right price. Pre-need buyers get our best pricing plus
              interest-free financing.
            </p>
            <p>
              Every transaction is handled by a Texas-licensed broker. We've quietly closed thousands of cemetery
              property transfers since 1996 — and we'd be honored to help with yours.
            </p>

            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                to="/cemeteries"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all shadow-soft"
              >
                Browse Texas cemeteries <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground font-medium rounded-full text-sm hover:bg-muted hover:border-primary/40 transition-all"
              >
                List a plot you own
              </Link>
            </div>
          </motion.div>

          {/* Region pillars — internal links good for SEO and the user */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-7 sm:p-8 shadow-soft"
            aria-label="Texas regions we serve"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-5 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-primary" /> Where we work
            </p>
            <ul className="space-y-4 text-sm">
              {regions.map((r) => (
                <li key={r.name} className="border-b border-border/40 last:border-0 pb-4 last:pb-0">
                  <div className="font-display text-base text-foreground leading-tight mb-1.5">{r.name}</div>
                  <p className="text-xs text-muted-foreground leading-snug mb-2.5">{r.desc}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <Link
                      to={`/cemeteries?region=${encodeURIComponent(r.name)}`}
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
          className="mt-20 sm:mt-24"
        >
          <div className="relative rounded-3xl border border-border/60 bg-card/85 backdrop-blur overflow-hidden shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-secondary/[0.08] pointer-events-none" aria-hidden="true" />
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/[0.05] blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="relative grid sm:grid-cols-[auto_1fr_auto] items-center gap-8 sm:gap-10 p-8 sm:p-10">
              {/* Logo — no white circle box, transparent PNG sits cleanly on the card */}
              <div className="shrink-0 flex sm:block items-center gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                  <img
                    src={bayerLogo}
                    alt="Bayer Cemetery Brokers logo"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    width={112}
                    height={112}
                  />
                </div>
                <span className="sm:hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  In partnership with
                </span>
              </div>

              {/* Copy */}
              <div className="min-w-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">
                  <Handshake className="w-3 h-3" /> In partnership with
                </span>
                <h3 className="font-display text-2xl sm:text-3xl text-foreground leading-tight mb-2">
                  Bayer Cemetery Brokers
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed max-w-xl">
                  We work alongside{" "}
                  <a
                    href="https://bayercemeterybrokers.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Bayer Cemetery Brokers
                  </a>{" "}
                  — a long-established California cemetery property brokerage — to give Texas families access to the
                  same trusted transfer expertise and nationwide buyer network.
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                <Link
                  to="/partners"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all"
                >
                  About the partnership <ArrowRight className="w-4 h-4" />
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
