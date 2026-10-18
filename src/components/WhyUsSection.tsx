import { motion } from "framer-motion";
import { Shield, Heart, FileCheck, Clock } from "lucide-react";

const reasons = [
  {
    icon: Shield,
    title: "Licensed & Bonded",
    description: "In partnership with Bayer Cemetery Brokers (CEB 1512), a licensed California brokerage. Full legal protection on every transaction.",
  },
  {
    icon: Clock,
    title: "30+ Years Experience",
    description: "Backed by a partner brokerage that has helped over 10,000 families since 1996 — now bringing that expertise to Texas.",
  },
  {
    icon: FileCheck,
    title: "We Handle Everything",
    description: "From valuation to paperwork to cemetery coordination — we manage it all.",
  },
  {
    icon: Heart,
    title: "Compassionate Service",
    description: "We understand the personal nature of these decisions and treat every client with care.",
  },
];

const WhyUsSection = () => {
  return (
    <section id="why-us" className="py-16">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-primary font-medium text-sm tracking-wide mb-3">Why Choose Us</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-6 leading-tight">
              The right partner for a <span className="italic text-gradient-earth">meaningful</span> decision
            </h2>
            <p data-simon-review className="text-muted-foreground leading-relaxed">It’s a deeply personal decision. You have a buyer come, look at the plot, and say it’s an absolute perfect fit — but another family can come along and it just doesn’t work for them. People look at where the plot is positioned, how it’s being kept and looked after, and if it’s a place they feel some sort of bond with.</p>
            <p data-simon-review className="mt-4 text-sm">Simon James · Texas Cemetery Brokers</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {reasons.map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-5 rounded-xl bg-card shadow-soft hover:shadow-hover transition-shadow duration-400"
              >
                <reason.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-display text-sm mb-1 text-foreground">{reason.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{reason.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
