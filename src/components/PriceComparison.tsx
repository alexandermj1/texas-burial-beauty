import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

function useCountUp(target: number, duration = 2000, inView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return count;
}

const comparisons = [
  { type: "Burial Plot", retail: 12000, resale: 7200 },
  { type: "Lawn Crypt", retail: 18000, resale: 10800 },
  { type: "Cremation Niche", retail: 6000, resale: 3600 },
  { type: "Mausoleum Crypt", retail: 25000, resale: 15000 },
];

const BarRow = ({ item, index, inView }: { item: typeof comparisons[0]; index: number; inView: boolean }) => {
  const savings = item.retail - item.resale;
  const savingsPercent = Math.round((savings / item.retail) * 100);
  const retailWidth = 100;
  const resaleWidth = (item.resale / item.retail) * 100;

  const retailCount = useCountUp(item.retail, 1800, inView);
  const resaleCount = useCountUp(item.resale, 2200, inView);
  const savingsCount = useCountUp(savings, 2400, inView);

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="group"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="font-display text-base text-foreground">{item.type}</h4>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.8 + index * 0.15 }}
          className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
        >
          Save ${savingsCount.toLocaleString()}
        </motion.span>
      </div>

      {/* Retail bar */}
      <div className="relative h-8 rounded-lg bg-muted/50 mb-1.5 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-lg bg-muted-foreground/15"
          initial={{ width: 0 }}
          whileInView={{ width: `${retailWidth}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 + index * 0.15, ease: "easeOut" }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center px-3">
          <span className="text-xs text-muted-foreground">
            Cemetery Price: <span className="font-medium text-foreground/70">${retailCount.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Resale bar */}
      <div className="relative h-8 rounded-lg bg-primary/5 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-lg bg-primary/20"
          initial={{ width: 0 }}
          whileInView={{ width: `${resaleWidth}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.4 + index * 0.15, ease: "easeOut" }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center px-3">
          <span className="text-xs text-primary">
            Our Price: <span className="font-semibold">${resaleCount.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const PriceComparison = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 bg-gradient-sage" ref={ref}>
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-[1fr,1.2fr] gap-12 items-center">
          {/* Left — Headline */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
              <span className="text-primary font-medium text-sm tracking-wide uppercase">Price Comparison</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-3xl md:text-4xl text-foreground mb-4 leading-tight"
            >
              Save 30–50% on
              <br />
              <span className="text-gradient-earth italic">every property type</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground text-base leading-relaxed mb-6 max-w-md"
            >
              Cemetery properties purchased through resale are significantly less expensive than buying directly from a cemetery. Here's how much you could save on average.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                to="/buy"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Find your property <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Animated average savings callout */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8 p-4 bg-card rounded-2xl shadow-soft border border-border/30 inline-block"
            >
              <p className="text-xs text-muted-foreground mb-1">Average savings per property</p>
              <p className="font-display text-3xl text-primary">
                $4,800
              </p>
            </motion.div>
          </div>

          {/* Right — Animated Bars */}
          <div className="space-y-5">
            {comparisons.map((item, i) => (
              <BarRow key={item.type} item={item} index={i} inView={inView} />
            ))}

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 1 }}
              className="text-xs text-muted-foreground pt-2"
            >
              * Prices are approximate averages across the San Francisco Bay Area. Actual savings vary by cemetery and property type.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PriceComparison;
