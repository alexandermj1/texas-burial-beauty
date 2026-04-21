import { motion } from "framer-motion";

const stats = [
  { value: "10,000+", label: "Properties Sold" },
  { value: "29+", label: "Years Experience" },
  { value: "4.9★", label: "Google Rating" },
  { value: "30-50%", label: "Avg. Savings" },
];

const StatsSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-3xl md:text-4xl text-primary mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
