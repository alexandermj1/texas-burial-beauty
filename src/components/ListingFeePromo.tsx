// Vogue-style editorial promo announcing the temporary listing-fee reduction.
// Three tiers presented as a magazine spread: numbered masthead, big italic
// display prices with a struck-through original, editorial descriptions, and
// a hairline-divided grid that reuses the site's sand/coral/foreground tokens.
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Tier {
  num: string;
  name: string;
  now: string;
  tagline: string;
  desc: string;
  cancel: string;
  featured?: boolean;
}

const tiers: Tier[] = [
  {
    num: "01",
    name: "Starter",
    now: "$299",
    tagline: "A straightforward start.",
    desc: "Your property is listed with a one-time upfront fee. Ideal for owners who want to test the market before committing.",
    cancel: "Early cancellation fee applies if withdrawn within 36 months.",
  },
  {
    num: "02",
    name: "Pro",
    now: "$399",
    tagline: "Actively marketed to Texas buyers.",
    desc: "One-time upfront fee. Actively marketed to Texas buyers and sent directly to local mortuaries and family counselors.",
    cancel: "Cancel anytime at no charge.",
    featured: true,
  },
  {
    num: "03",
    name: "Featured",
    now: "$499",
    tagline: "Maximum visibility for your listing.",
    desc: "One-time upfront fee. Includes targeted Google & Meta advertising for your plots, plus top placement on the priority list we send to local mortuaries and counselors.",
    cancel: "Cancel anytime at no charge.",
  },
  {
    num: "04",
    name: "Set Your Own Price",
    now: "$799",
    tagline: "Your price, our expertise.",
    desc: "Everything in Featured, plus you set your own minimum asking price. A higher minimum may take longer to sell.",
    cancel: "Cancel anytime at no charge.",
  },
];

interface Props {
  /** Slightly denser spacing when rendered inside a hero-adjacent context. */
  compact?: boolean;
}

const ListingFeePromo = ({ compact = false }: Props) => {
  return (
    <section
      id="listing-fees"
      className={`relative overflow-hidden bg-[hsl(var(--warm-white))] border-y border-foreground/10 ${
        compact ? "py-16 md:py-20" : "py-24 md:py-32"
      }`}
    >
      {/* Faint editorial rule pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
      />

      <div className="container mx-auto px-6">
        <div className="max-w-7xl mx-auto">
          {/* Masthead */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="border-b border-foreground/15 pb-6 mb-14 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[10px] tracking-[0.3em] uppercase font-bold px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Four listing options
              </span>
              <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent">
                Listing packages
              </span>
            </div>
            <h2 className="font-display text-foreground tracking-tight leading-[0.98] text-[clamp(2.5rem,6vw,5rem)] max-w-4xl mx-auto">
              List your Texas cemetery property.{" "}
              <span className="italic text-primary">Choose your listing package.</span>
            </h2>
            <p className="mt-5 text-foreground/70 leading-relaxed max-w-2xl mx-auto text-[15px] md:text-base font-light">
              Four ways to list your Texas cemetery property. One-time upfront fees,
              with the same dedicated support from our team. The seller’s 15% commission
              at closing is separate; your valuation remains free.
            </p>
          </motion.div>


          {/* Tiers */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/15 border border-foreground/15">
            {tiers.map((t, i) => (
              <motion.article
                key={t.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className={`relative flex flex-col ${
                  t.featured
                    ? "bg-[hsl(var(--sand-light))]"
                    : "bg-[hsl(var(--warm-white))]"
                } p-6 md:p-8`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[10px] tracking-[0.25em] uppercase font-bold px-3 py-1.5 shadow-soft">
                    Most chosen
                  </span>
                )}

                {/* Number + name */}
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="font-display italic text-4xl text-primary/80 leading-none">
                    {t.num}
                  </span>
                  <span className="h-px flex-1 bg-foreground/20" />
                  <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent">
                    {t.name}
                  </span>
                </div>

                {/* Price block */}
                <div className="mb-5">
                  <div className="flex items-end gap-3">
                    <span className="font-display italic text-primary text-5xl md:text-6xl leading-[0.9] tracking-tight">
                      {t.now}
                    </span>
                  </div>
                  <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-foreground/55 mt-3">
                    One-time upfront fee
                  </p>
                </div>

                {/* Tagline */}
                <h3 className="font-display text-2xl md:text-[1.65rem] text-foreground tracking-tight leading-snug mb-4">
                  {t.tagline}
                </h3>

                {/* Description */}
                <p className="text-foreground/70 leading-relaxed text-[15px] flex-1">
                  {t.desc}
                </p>

                {/* Cancel policy */}
                <div className="mt-6 pt-5 border-t border-foreground/15">
                  <p className="font-display italic text-[13px] text-foreground/65 leading-relaxed">
                    {t.cancel}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Footer note + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-t border-foreground/15 pt-8"
          >
            <p className="font-display italic text-foreground/70 text-lg md:text-xl leading-snug max-w-2xl">
              Not sure which tier fits? Start with a free valuation — we'll walk you through
              the options in plain English, no pressure.
            </p>
            <Link
              to="/sell#quote-form"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all shadow-soft whitespace-nowrap"
            >
              Get a free valuation <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ListingFeePromo;
