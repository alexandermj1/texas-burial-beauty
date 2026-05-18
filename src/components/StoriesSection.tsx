import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import featuredImg from "@/assets/story-featured.png";
import cemeteriesImg from "@/assets/story-cemeteries.png";
import propertyTypesImg from "@/assets/story-property-types.png";

const stories = [
  {
    img: featuredImg,
    eyebrow: "Browsing",
    title: "Finding the right plot, from the comfort of home.",
    to: "/properties",
    span: "md:col-span-7",
    aspect: "md:aspect-[16/10]",
  },
  {
    img: propertyTypesImg,
    eyebrow: "Comparing",
    title: "Understanding every type of resting place.",
    to: "/property-types",
    span: "md:col-span-5",
    aspect: "md:aspect-[4/5]",
  },
  {
    img: cemeteriesImg,
    eyebrow: "Researching",
    title: "Every cemetery in Texas, one trusted broker.",
    to: "/cemeteries",
    span: "md:col-span-12",
    aspect: "md:aspect-[21/9]",
  },
];

const StoriesSection = () => {
  return (
    <section className="relative py-16 sm:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="mb-10 sm:mb-14 max-w-3xl">
          <span className="block text-[11px] font-medium uppercase tracking-[0.3em] text-primary mb-3">
            Stories
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight text-foreground">
            Real people, real moments.
          </h2>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-12">
          {stories.map((s, i) => (
            <motion.div
              key={s.to}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={s.span}
            >
              <Link
                to={s.to}
                className="group block relative overflow-hidden rounded-2xl ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all h-full"
              >
                <div className={`aspect-[16/10] ${s.aspect} overflow-hidden bg-secondary/30`}>
                  <img
                    src={s.img}
                    alt={s.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 md:p-8 text-primary-foreground">
                  <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.3em] text-primary-foreground/80 mb-2">
                    {s.eyebrow}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl md:text-3xl leading-tight tracking-tight max-w-md drop-shadow-md">
                    {s.title}
                  </h3>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary-foreground/85 group-hover:text-primary-foreground transition-colors">
                    Explore
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoriesSection;
