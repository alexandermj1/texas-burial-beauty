// Editorial listing packages with current upfront fees and unchanged benefits.
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Tier {
  num: string;
  name: string;
  now: string;
  regular: string;
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
    regular: "$499",
    tagline: "A straightforward start.",
    desc: "Your property is listed with a one-time upfront fee. Ideal for owners who want to test the market before committing.",
    cancel: "Early cancellation fee applies if withdrawn within 36 months.",
  },
  {
    num: "02",
    name: "Pro",
    now: "$399",
    regular: "$599",
    tagline: "Actively marketed to Texas buyers.",
    desc: "One-time upfront fee. Actively marketed to Texas buyers and sent directly to local mortuaries and family counselors.",
    cancel: "Cancel anytime at no charge.",
    featured: true,
  },
  {
    num: "03",
    name: "Featured",
    now: "$499",
    regular: "$699",
    tagline: "Maximum visibility for your listing.",
    desc: "One-time upfront fee. Includes targeted Google & Meta advertising for your plots, plus top placement on the priority list we send to local mortuaries and counselors.",
    cancel: "Cancel anytime at no charge.",
  },
];

// Midnight after October 31 in America/Chicago (still CDT).
export const OCTOBER_OFFER_END = Date.parse("2026-11-01T00:00:00-05:00");
export function offerCountdown(now: number) {
  const seconds = Math.max(0, Math.floor((OCTOBER_OFFER_END - now) / 1000));
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
}

interface Props {
  /** Slightly denser spacing when rendered inside a hero-adjacent context. */
  compact?: boolean;
}

const ListingFeePromo = ({ compact = false }: Props) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const offerActive = now < OCTOBER_OFFER_END;
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
                Three listing options
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
              Three ways to list your Texas cemetery property. One-time upfront fees,
              with the same dedicated support from our team. The seller’s 15% commission
              at closing is separate; your valuation remains free.
            </p>
            {offerActive && (
              <div className="mt-7 flex flex-col items-center gap-4">
                <p className="text-primary font-semibold text-base flex items-center gap-2"><Clock className="h-4 w-4" /> October offer · Save $200 on every package</p>
                <div role="timer" aria-label="Time remaining in October offer" className="flex justify-center gap-3 sm:gap-5 tabular-nums">
                  {offerCountdown(now).map((value, index) => (
                    <div key={index} className="min-w-14 sm:min-w-16 text-center">
                      <span className="block rounded-lg border border-primary/20 bg-primary/5 py-3 text-2xl sm:text-3xl font-semibold text-primary">{String(value).padStart(2, "0")}</span>
                      <span className="mt-2 block text-xs text-muted-foreground">{["Days", "Hours", "Minutes", "Seconds"][index]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Ends October 31, 2026 at 11:59 p.m. Texas time.</p>
              </div>
            )}
          </motion.div>


          {/* Tiers */}
          <div className="grid md:grid-cols-3 gap-5">
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
                } rounded-lg border border-foreground/15 p-6 md:p-8`}
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
                  {offerActive && <p className="mb-3 text-muted-foreground text-sm">Regularly <span className="line-through">{t.regular}</span> <span className="ml-2 font-semibold text-primary">Save $200</span></p>}
                  <div className="flex items-end gap-3">
                    <span className="font-display italic text-primary text-5xl md:text-6xl leading-[0.9] tracking-tight">
                      {offerActive ? t.now : t.regular}
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
