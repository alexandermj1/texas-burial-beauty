import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

type StoryVariant = "split" | "wide" | "overlay" | "compact";

interface StoryStripProps {
  img: string;
  eyebrow: string;
  title: string;
  body?: string;
  to: string;
  cta?: string;
  /** Image side on desktop for "split" / "compact" variants. */
  side?: "left" | "right";
  /** Layout variant — vary across the page so strips don't all feel identical. */
  variant?: StoryVariant;
}

const StoryStrip = ({
  img,
  eyebrow,
  title,
  body,
  to,
  cta = "Explore",
  side = "left",
  variant = "split",
}: StoryStripProps) => {
  const imageFirst = side === "left";

  // ----- Variant: WIDE — full-bleed image with text below (cinematic) -----
  if (variant === "wide") {
    return (
      <section className="relative py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 max-w-[1500px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-end justify-between gap-6 mb-6 sm:mb-8"
          >
            <div className="max-w-xl">
              <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary mb-3">
                {eyebrow}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
                {title}
              </h2>
            </div>
            <Link
              to={to}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary whitespace-nowrap hover:gap-2.5 transition-all"
            >
              {cta} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <Link
            to={to}
            className="group block relative overflow-hidden rounded-3xl ring-1 ring-foreground/10 hover:ring-foreground/20 transition-all"
          >
            <motion.div
              initial={{ scale: 1.06 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              className="aspect-[21/9] overflow-hidden bg-secondary/30"
            >
              <img
                src={img}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
            </motion.div>
          </Link>

          {body && (
            <p className="mt-6 max-w-2xl text-base sm:text-lg font-light text-muted-foreground leading-relaxed">
              {body}
            </p>
          )}
        </div>
      </section>
    );
  }

  // ----- Variant: OVERLAY — image with text floating over it -----
  if (variant === "overlay") {
    return (
      <section className="relative py-14 sm:py-20 bg-background">
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 max-w-[1400px]">
          <Link
            to={to}
            className="group block relative overflow-hidden rounded-3xl ring-1 ring-foreground/10 hover:ring-foreground/20 transition-all"
          >
            <motion.div
              initial={{ scale: 1.05 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              className="aspect-[16/9] sm:aspect-[2.4/1] overflow-hidden bg-secondary/30"
            >
              <img
                src={img}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
            </motion.div>

            {/* Gradient scrim for legibility */}
            <div
              aria-hidden
              className={`absolute inset-0 ${
                imageFirst
                  ? "bg-gradient-to-r from-foreground/75 via-foreground/40 to-transparent"
                  : "bg-gradient-to-l from-foreground/75 via-foreground/40 to-transparent"
              }`}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute inset-0 flex flex-col justify-center p-8 sm:p-14 lg:p-20 max-w-2xl ${
                imageFirst ? "" : "ml-auto text-right items-end"
              }`}
            >
              <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary-foreground/90 mb-3">
                {eyebrow}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight text-primary-foreground mb-4 drop-shadow-md">
                {title}
              </h2>
              {body && (
                <p className="text-sm sm:text-base font-light text-primary-foreground/85 leading-relaxed mb-5 drop-shadow-sm">
                  {body}
                </p>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground border-b border-primary-foreground/40 pb-0.5 group-hover:gap-2.5 transition-all w-fit">
                {cta} <ArrowUpRight className="w-4 h-4" />
              </span>
            </motion.div>
          </Link>
        </div>
      </section>
    );
  }

  // ----- Variant: COMPACT — smaller image, text-led, asymmetric -----
  if (variant === "compact") {
    return (
      <section className="relative py-12 sm:py-16 bg-background">
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 max-w-[1200px]">
          <div className="grid md:grid-cols-12 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: imageFirst ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`md:col-span-5 ${imageFirst ? "md:order-1" : "md:order-2"}`}
            >
              <Link
                to={to}
                className="group block relative overflow-hidden rounded-2xl ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
              >
                <div className="aspect-[4/5] overflow-hidden bg-secondary/30">
                  <img
                    src={img}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={`md:col-span-7 ${imageFirst ? "md:order-2" : "md:order-1"}`}
            >
              <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary mb-3">
                {eyebrow}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.02] tracking-tight text-foreground mb-5">
                {title}
              </h2>
              {body && (
                <p className="text-base sm:text-lg font-light text-muted-foreground leading-relaxed mb-6 max-w-xl">
                  {body}
                </p>
              )}
              <Link
                to={to}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
              >
                {cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // ----- Default: SPLIT (original 7/5 grid) -----
  return (
    <section className="relative py-14 sm:py-20 bg-background">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 max-w-[1400px]">
        <div className="grid md:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`md:col-span-7 ${imageFirst ? "md:order-1" : "md:order-2"}`}
          >
            <Link
              to={to}
              className="group block relative overflow-hidden rounded-2xl ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
            >
              <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                <img
                  src={img}
                  alt={title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                />
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`md:col-span-5 ${imageFirst ? "md:order-2" : "md:order-1"}`}
          >
            <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary mb-3">
              {eyebrow}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.05] tracking-tight text-foreground mb-4">
              {title}
            </h2>
            {body && (
              <p className="text-base sm:text-lg font-light text-muted-foreground leading-relaxed mb-5">
                {body}
              </p>
            )}
            <Link
              to={to}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
            >
              {cta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoryStrip;

