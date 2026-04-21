import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, CheckCircle, Search, MapPin, Shield, TrendingDown, FileText, DollarSign, Users, Clock, Award, Heart, Home } from "lucide-react";
import { Link } from "react-router-dom";

function useCountUp(target: number, duration = 2000, inView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return count;
}

/* ─── Stat Pill ─── */
const StatPill = ({ icon: Icon, value, label, delay, color }: {
  icon: React.ElementType; value: string; label: string; delay: number; color: "primary" | "accent";
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 15 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex items-center gap-2.5 bg-card rounded-xl p-3 shadow-soft border border-border/30"
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
      color === "primary" ? "bg-primary/10" : "bg-accent/10"
    }`}>
      <Icon className={`w-4 h-4 ${color === "primary" ? "text-primary" : "text-accent"}`} />
    </div>
    <div>
      <p className={`font-display text-lg leading-none ${color === "primary" ? "text-primary" : "text-accent"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </motion.div>
);

/* ─── Buyer Promo ─── */
const buyerSteps = [
  { icon: Search, label: "Choose your property type", color: "bg-primary/10 text-primary" },
  { icon: MapPin, label: "Pick your preferred location", color: "bg-accent/10 text-accent" },
  { icon: TrendingDown, label: "See your savings vs retail", color: "bg-primary/10 text-primary" },
  { icon: CheckCircle, label: "We show you the property", color: "bg-accent/10 text-accent" },
];

export const BuyerPromoAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const savings = useCountUp(4800, 2200, inView);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % buyerSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [inView]);

  return (
    <section className="py-16 bg-gradient-sage" ref={ref}>
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left — Animated "screen" */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="bg-card rounded-2xl shadow-hover border border-border/30 overflow-hidden">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-muted/50 rounded-full px-3 py-1 text-xs text-muted-foreground text-center">
                    cemeteryproperty.com/buy
                  </div>
                </div>
              </div>

              {/* Animated steps */}
              <div className="p-6 min-h-[280px]">
                <p className="text-xs text-primary font-medium tracking-wide uppercase mb-4">Guided Search</p>
                <div className="space-y-3">
                  {buyerSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={inView ? {
                        opacity: i <= activeStep ? 1 : 0.3,
                        x: 0,
                        scale: i === activeStep ? 1.02 : 1,
                      } : {}}
                      transition={{ duration: 0.5, delay: i * 0.15 }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                        i === activeStep ? "bg-primary/5 border border-primary/20" : "border border-transparent"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${step.color}`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-foreground font-medium">{step.label}</span>
                      {i < activeStep && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                          <CheckCircle className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Savings reveal */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={activeStep >= 2 ? { opacity: 1, height: "auto" } : {}}
                  transition={{ duration: 0.6 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Estimated savings</p>
                    <p className="font-display text-2xl text-primary">${savings.toLocaleString()}</p>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={inView ? { width: "40%" } : {}}
                        transition={{ duration: 1.5, delay: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Our price</span>
                      <span>Cemetery retail</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right — Text + Integrated Stats */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-primary font-medium text-sm tracking-wide uppercase mb-3">How Buying Works</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4 leading-tight">
              Find your property in
              <br />
              <span className="italic text-gradient-earth">four easy steps</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our guided search walks you through the process step by step. Tell us what you're looking for,
              and we'll match you with discounted properties from our network.
            </p>

            {/* Integrated stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatPill icon={TrendingDown} value="40%" label="Avg. Savings" delay={0.3} color="primary" />
              <StatPill icon={Home} value="10,000+" label="Properties Sold" delay={0.4} color="primary" />
              <StatPill icon={DollarSign} value="0%" label="Interest Financing" delay={0.5} color="primary" />
              <StatPill icon={Clock} value="29+" label="Years Experience" delay={0.6} color="primary" />
            </div>

            <Link
              to="/buy"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Start Guided Search <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ─── Seller Promo ─── */
const sellerSteps = [
  { icon: FileText, label: "Tell us about your property", color: "bg-accent/10 text-accent" },
  { icon: DollarSign, label: "Get a free valuation", color: "bg-primary/10 text-primary" },
  { icon: Shield, label: "We market to our buyer network", color: "bg-accent/10 text-accent" },
  { icon: CheckCircle, label: "Sale complete — you get paid", color: "bg-primary/10 text-primary" },
];

export const SellerPromoAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeStep, setActiveStep] = useState(0);
  const [formFields, setFormFields] = useState<number>(0);

  useEffect(() => {
    if (!inView) return;
    const stepInterval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % sellerSteps.length);
    }, 2500);
    return () => clearInterval(stepInterval);
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => {
      setFormFields(prev => prev < 4 ? prev + 1 : prev);
    }, 1200);
    return () => clearInterval(t);
  }, [inView]);

  const fieldLabels = ["Cemetery Name", "Property Type", "Number of Spaces", "Your Email"];
  const fieldValues = ["Holy Cross Cemetery", "Burial Plot", "2", "john@email.com"];

  return (
    <section className="py-16" ref={ref}>
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left — Text + Integrated Stats */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-accent font-medium text-sm tracking-wide uppercase mb-3">How Selling Works</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4 leading-tight">
              Sell your property
              <br />
              <span className="italic" style={{ color: "hsl(var(--accent))" }}>with zero hassle</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Fill out a simple form with your property details, and we'll provide a free valuation within 24 hours.
              No upfront fees, no obligation — we only earn when your property sells.
            </p>

            {/* Integrated stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatPill icon={Shield} value="$0" label="Upfront Fees" delay={0.3} color="accent" />
              <StatPill icon={Users} value="50,000+" label="Buyer Network" delay={0.4} color="accent" />
              <StatPill icon={Award} value="4.9★" label="Google Rating" delay={0.5} color="accent" />
              <StatPill icon={Heart} value="~30 days" label="Avg. Time to Sell" delay={0.6} color="accent" />
            </div>

            <Link
              to="/sell"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Get a Free Valuation <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Right — Animated "screen" showing form fill */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-card rounded-2xl shadow-hover border border-border/30 overflow-hidden">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-muted/50 rounded-full px-3 py-1 text-xs text-muted-foreground text-center">
                    cemeteryproperty.com/sell
                  </div>
                </div>
              </div>

              {/* Animated form */}
              <div className="p-6 min-h-[300px]">
                <p className="text-xs text-accent font-medium tracking-wide uppercase mb-1">Seller Quote Form</p>
                <p className="text-sm text-muted-foreground mb-5">Tell us about your property</p>

                <div className="space-y-3">
                  {fieldLabels.map((label, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.2 }}
                    >
                      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                      <div className={`relative h-9 rounded-lg border transition-all duration-500 flex items-center px-3 ${
                        i < formFields
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-muted/20"
                      }`}>
                        {i < formFields && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm text-foreground"
                          >
                            {fieldValues[i]}
                          </motion.span>
                        )}
                        {i === formFields && (
                          <motion.div
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="w-0.5 h-4 bg-primary"
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={formFields >= 4 ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5 }}
                  className="mt-4"
                >
                  <motion.div
                    animate={formFields >= 4 ? { scale: [1, 1.03, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-accent text-accent-foreground rounded-xl py-2.5 text-center text-sm font-medium"
                  >
                    Get Free Valuation
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
