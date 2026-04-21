import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Diane C.",
    location: "Plano, TX",
    text: "Thank you for helping us through a very difficult time. That we saved significant amounts over the price we had expected is also appreciated.",
    rating: 5,
  },
  {
    name: "Stephen P.",
    location: "Houston, TX",
    text: "Excellent service and very professional. Provided us with the best for our situation. Quick to respond at time of need.",
    rating: 5,
  },
  {
    name: "Dolores R.",
    location: "Dallas, TX",
    text: "Thank you for selling my cemetery plot so quickly. I had tried for over a year and paid quite a lot for newspaper advertising. Texas Cemetery Brokers made it easy.",
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
          className="text-center mb-16"
        >
          <p className="text-primary font-medium text-sm tracking-wide mb-3">Testimonials</p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Trusted by Texas families
          </h2>
          <p className="text-muted-foreground mt-3">4.9 ★ rating from 71+ reviews</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-shadow duration-400"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                "{t.text}"
              </p>
              <div>
                <p className="font-display text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
