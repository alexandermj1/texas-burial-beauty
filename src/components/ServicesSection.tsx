import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 bg-gradient-warm">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <p className="text-primary font-medium text-sm tracking-wide mb-3">How It Works</p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Buy or sell with confidence
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Buy Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link
              to="/buy"
              className="group relative block bg-sage-light rounded-2xl p-10 hover:shadow-hover transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[80px]" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <TrendingDown className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3 text-foreground">Buy Property</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Find cemetery plots, crypts, and niches at below-market prices across Texas. We personally show you available properties in Dallas, Houston, and beyond.
                </p>
                <div className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                  Browse available properties
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Sell Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <Link
              to="/sell"
              className="group relative block bg-terracotta-light rounded-2xl p-10 hover:shadow-hover transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-[80px]" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display text-2xl mb-3 text-foreground">Sell Property</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Have unused cemetery property? We handle everything — research, marketing, and closing. We only get paid when you do.
                </p>
                <div className="inline-flex items-center gap-2 text-accent font-medium text-sm group-hover:gap-3 transition-all">
                  Get a free valuation
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
