import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { TrendingDown, Users, Clock, Award, DollarSign, Home, Shield, Heart } from "lucide-react";

function useCountUp(target: number, duration = 2000, inView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
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

const buyerStats = [
  { icon: TrendingDown, value: 40, suffix: "%", label: "Average Savings", prefix: "Up to " },
  { icon: Home, value: 10000, suffix: "+", label: "Properties Sold", prefix: "" },
  { icon: DollarSign, value: 0, suffix: "%", label: "Interest Financing", prefix: "", staticValue: "0%" },
  { icon: Clock, value: 29, suffix: "+", label: "Years Experience", prefix: "" },
];

const sellerStats = [
  { icon: Shield, value: 0, suffix: "", label: "Upfront Fees", prefix: "$" },
  { icon: Users, value: 50000, suffix: "+", label: "Buyer Network", prefix: "" },
  { icon: Award, value: 4.9, suffix: "★", label: "Google Rating", prefix: "", isDecimal: true },
  { icon: Heart, value: 30, suffix: " days", label: "Avg. Time to Sell", prefix: "~" },
];

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  prefix: string;
  index: number;
  inView: boolean;
  staticValue?: string;
  isDecimal?: boolean;
  accentColor: string;
}

const StatCard = ({ icon: Icon, value, suffix, label, prefix, index, inView, staticValue, isDecimal, accentColor }: StatCardProps) => {
  const count = useCountUp(isDecimal ? Math.round(value * 10) : value, 2200, inView);
  const displayValue = staticValue || (isDecimal ? `${(count / 10).toFixed(1)}` : count.toLocaleString());

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className="relative group"
    >
      <div className="bg-card rounded-2xl p-5 shadow-soft hover:shadow-hover transition-all duration-500 border border-border/30 h-full">
        {/* Animated bar at top */}
        <motion.div
          className={`h-0.5 rounded-full mb-4 ${accentColor}`}
          initial={{ width: 0 }}
          whileInView={{ width: "40%" }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 + index * 0.12 }}
        />
        
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            accentColor === "bg-primary" ? "bg-primary/10" : "bg-accent/10"
          }`}>
            <Icon className={`w-5 h-5 ${accentColor === "bg-primary" ? "text-primary" : "text-accent"}`} />
          </div>
          <div>
            <p className="font-display text-2xl md:text-3xl text-foreground leading-none mb-1">
              {prefix}{displayValue}{suffix}
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AnimatedCounters = () => {
  const buyerRef = useRef<HTMLDivElement>(null);
  const sellerRef = useRef<HTMLDivElement>(null);
  const buyerInView = useInView(buyerRef, { once: true, margin: "-100px" });
  const sellerInView = useInView(sellerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-20">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Buyers Section */}
        <div ref={buyerRef} className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px flex-1 max-w-[40px] bg-primary/30" />
            <span className="text-primary font-medium text-sm tracking-wide uppercase">For Buyers</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-2xl md:text-3xl text-foreground mb-8"
          >
            Why buy through us?
          </motion.h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buyerStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} index={i} inView={buyerInView} accentColor="bg-primary" />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="divider-earth mb-16" />

        {/* Sellers Section */}
        <div ref={sellerRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px flex-1 max-w-[40px] bg-accent/30" />
            <span className="text-accent font-medium text-sm tracking-wide uppercase">For Sellers</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-2xl md:text-3xl text-foreground mb-8"
          >
            Why sell through us?
          </motion.h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sellerStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} index={i} inView={sellerInView} accentColor="bg-accent" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedCounters;
