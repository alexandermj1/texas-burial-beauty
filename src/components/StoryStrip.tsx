import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface StoryStripProps {
  img: string;
  eyebrow: string;
  title: string;
  body?: string;
  to: string;
  cta?: string;
  /** Image side on desktop. Defaults to "left". */
  side?: "left" | "right";
}

const StoryStrip = ({ img, eyebrow, title, body, to, cta = "Explore", side = "left" }: StoryStripProps) => {
  const imageFirst = side === "left";
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
