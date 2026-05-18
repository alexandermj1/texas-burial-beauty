import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "M.G.",
    meta: "Local Guide · 5 months ago",
    text: "These are an amazing, exceptional, professional & friendly group of people. We were in an emotional, stressful unexpected situation — the loss of a parent — and Simon guided us gently and promptly to a beautiful plot within our family's budget.",
    rating: 5,
  },
  {
    name: "Cheryl Cook",
    meta: "Local Guide · 5 months ago",
    text: "Bayer sold 4 of our family plots that we'd had since 1959. They handled all the complicated paperwork and regulatory requirements, ensuring a smooth, worry-free outcome for our family. 15+++ out of 10.",
    rating: 5,
  },
  {
    name: "Luis Ibarra",
    meta: "3 reviews · 7 months ago",
    text: "Always use a cemetery broker before going directly to the cemetery! Bayer saved me 50% on my father's final resting place compared to what the cemetery quoted directly. Kind, professional service alongside significant savings.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 bg-gradient-warm">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="text-primary font-medium text-sm tracking-wide mb-3">Reviews from our sister company</p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Three decades of trusted service
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Texas Cemetery Brokers is the Texas-licensed extension of{" "}
            <span className="text-foreground font-medium">Bayer Cemetery Brokers</span>, serving families
            in California since 1996. These verified Google reviews are from Bayer clients — the same team,
            the same standards, now licensed to serve Texas.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">4.9 average · 70+ verified Google reviews</p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-shadow duration-400 flex flex-col"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic flex-1">
                "{t.text}"
              </p>
              <div>
                <p className="font-display text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.meta}</p>
                <p className="text-[11px] text-primary/80 mt-1 tracking-wide uppercase">
                  Review of Bayer Cemetery Brokers
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
