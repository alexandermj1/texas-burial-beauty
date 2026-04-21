import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How much can I save by buying through Cemetery Property Resales?",
    a: "Most buyers save 30–50% compared to purchasing directly from a cemetery. We source properties from private sellers, passing those savings on to you.",
  },
  {
    q: "Are there any upfront fees to sell my property?",
    a: "No. We only charge a commission when your property successfully sells. There are no listing fees, appraisal charges, or hidden costs.",
  },
  {
    q: "How long does it take to buy or sell?",
    a: "Most transactions complete within 30–60 days, depending on the cemetery's transfer process. We handle all the coordination to keep things moving.",
  },
  {
    q: "What areas do you serve?",
    a: "We serve the entire San Francisco Bay Area including the Peninsula, South Bay, East Bay, North Bay, San Francisco, and select Central Valley locations.",
  },
  {
    q: "Is the transfer process legally binding and secure?",
    a: "Absolutely. All transfers go through the cemetery's official process with proper documentation, ensuring full legal protection for both parties. We are licensed and bonded (CEB 1421).",
  },
];

const FAQSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-medium text-sm tracking-wide mb-3">FAQ</p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Common questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card rounded-xl px-6 border-none shadow-soft"
              >
                <AccordionTrigger className="font-display text-sm text-foreground hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
