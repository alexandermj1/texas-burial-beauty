import { motion } from "framer-motion";
import { Search, FileText, CheckCircle, HandshakeIcon } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Tell Us What You Need",
    description: "Start with the plot’s history and the thinking behind selling it, or the place and property your family needs.",
  },
  {
    icon: FileText,
    step: "02",
    title: "We Do the Legwork",
    description: "We check the cemetery’s transfer policy, its forms and who has the authority to sell, alongside the available matches.",
  },
  {
    icon: HandshakeIcon,
    step: "03",
    title: "Review & Agree",
    description: "Look at where the plot is positioned, how it’s being kept and whether it’s a place your family feels a bond with.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Close with Confidence",
    description: "There’s a lot of paperwork to get through. We organize the required signatures and coordinate the transfer with the cemetery.",
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
          <p data-simon-review className="mx-auto mt-5 max-w-3xl leading-relaxed">For most people coming into this, it’s brand new. Unlike selling a car, cemetery plots are probably a once-in-a-lifetime experience. Most people just don’t know how the system works, and neither should they. That’s understandable.</p>
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
              <p data-simon-review className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
