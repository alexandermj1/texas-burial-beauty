import { motion } from "framer-motion";
import { Search, FileText, CheckCircle, HandshakeIcon } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Tell Us What You Need",
    description: "Whether buying or selling, share your requirements and we'll get to work.",
  },
  {
    icon: FileText,
    step: "02",
    title: "We Do the Legwork",
    description: "We find matches, verify availability, and handle all cemetery coordination.",
  },
  {
    icon: HandshakeIcon,
    step: "03",
    title: "Review & Agree",
    description: "You review options and pricing — no pressure, no hidden fees.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Close with Confidence",
    description: "We manage the paperwork and transfer. You're done in 30–60 days.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8"
        >
          <p className="text-primary font-medium text-sm tracking-wide mb-3">How It Works</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">
            Four simple steps
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center p-6 bg-card rounded-xl shadow-soft"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Step {s.step}</span>
              <h3 className="font-display text-base mb-2 mt-1 text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
