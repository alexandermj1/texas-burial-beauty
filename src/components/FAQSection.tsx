import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "How much can I save buying through Texas Cemetery Brokers?",
    a: "Most buyers save 30–50% compared to purchasing directly from a cemetery. We source properties from private sellers, passing those savings on to you.",
  },
  {
    q: "Are there any upfront fees to sell my property?",
    a: "We offer a free listing option and a premium $99 listing option — choose whichever fits you best. No appraisal charges or hidden costs.",
  },
  {
    q: "How long does it take to buy or sell?",
    a: "Every transaction is different. We handle all the coordination with the cemetery to keep things moving as smoothly as possible, and we keep you updated throughout the process.",
  },
  {
    q: "What areas do you serve?",
    a: "We serve all of Texas with a particular focus on the Dallas–Fort Worth Metroplex and Greater Houston. We also actively work in Austin, San Antonio, El Paso, and most other Texas metros.",
  },
  {
    q: "Is the transfer process legally binding and secure?",
    a: "Absolutely. All transfers go through the cemetery's official process with proper documentation, ensuring full legal protection for both parties. We operate in partnership with Bayer Cemetery Brokers — a licensed California brokerage (CEB 1512) — for back-office expertise and shared buyer networks.",
  },
];

const FAQSection = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-20">
          {/* Left rail — sticky intro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4"
          >
            <div className="lg:sticky lg:top-32">
              <p className="text-primary font-medium text-[11px] tracking-[0.3em] uppercase mb-4">
                FAQ · 005
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05] tracking-tight">
                Questions, <span className="italic font-light text-muted-foreground">answered.</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-5 max-w-sm">
                Everything you need to know before buying or selling cemetery property in Texas. Still curious? Reach out — we reply within 24 hours.
              </p>
            </div>
          </motion.div>

          {/* Right — minimal list */}
          <div className="lg:col-span-8 divide-y divide-border/60 border-t border-b border-border/60">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full text-left py-7 flex items-start gap-6 group"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums pt-1 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-lg sm:text-xl text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors duration-300">
                      {faq.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="shrink-0 mt-1 w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-colors duration-300"
                    >
                      <Plus className="w-3.5 h-3.5 text-foreground" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pl-12 pr-14 pb-7 text-muted-foreground text-sm sm:text-base leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
