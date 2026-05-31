import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import heroCard from "@/assets/hero/cemetery-hillside.jpg";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section
      ref={sectionRef}
      role="banner"
      className="relative min-h-svh flex items-center overflow-hidden"
    >
      {/* Background video */}
      <motion.div
        style={{ y: bgY, scale: bgScale }}
        className="absolute inset-0 w-full h-full"
      >
        <video
          src="/videos/hero-trees.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Warm tint + readability gradient using site tokens */}
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/30" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/95 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="container mx-auto w-full px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 py-20 lg:py-28 items-center relative">
        {/* Text Content */}
        <div className="lg:col-span-7 flex flex-col space-y-8 sm:space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-3"
          >
            <span className="h-px w-8 bg-primary" />
            <p className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-primary font-bold">
              Partnered with Bayer Cemetery Brokers · Est. 1996
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-foreground leading-[0.95] tracking-tight italic"
          >
            Cemetery property,
            <br />
            <span className="not-italic text-primary">made effortless.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-xl text-base sm:text-lg md:text-xl text-foreground/80 leading-relaxed"
          >
            Buying or selling a plot shouldn't be hard. We offer deep expertise across all of Texas, with prices{" "}
            <span className="text-foreground font-semibold italic">30–50% below</span> cemetery direct rates.
          </motion.p>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/cemeteries"
              className="group flex-1 bg-primary text-primary-foreground p-6 sm:p-7 rounded-sm flex items-center justify-between transition-all hover:bg-primary/90 shadow-lg shadow-primary/15"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-75 mb-1">
                  I want to
                </span>
                <span className="font-display text-2xl sm:text-3xl italic leading-none">
                  Buy Property
                </span>
              </div>
              <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 opacity-80" />
            </Link>

            <Link
              to="/sell"
              className="group flex-1 border border-foreground/20 bg-background/70 backdrop-blur-sm text-foreground p-6 sm:p-7 rounded-sm flex items-center justify-between transition-all hover:bg-background hover:border-primary"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">
                  I want to
                </span>
                <span className="font-display text-2xl sm:text-3xl italic leading-none">
                  Sell Property
                </span>
              </div>
              <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 opacity-50" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                Serving all of Texas
              </span>
            </div>
            <span className="text-xs text-foreground/70 font-medium">
              Over 25 years of trusted brokerage
            </span>
          </motion.div>
        </div>

        {/* Visual Column — real cemetery photo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="lg:col-span-5 relative mt-8 lg:mt-0 hidden md:block"
        >
          <div className="aspect-[4/5] w-full rounded-t-full overflow-hidden border border-primary/15 shadow-2xl relative">
            <img
              src={heroCard}
              alt="Peaceful Texas cemetery landscape with manicured lawns and mature trees"
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/25 to-transparent" />
          </div>

          {/* Floating Savings Badge using sand token */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="absolute -bottom-6 -left-4 lg:-bottom-8 lg:-left-8 bg-primary text-primary-foreground p-6 sm:p-8 lg:p-10 rounded-sm shadow-xl"
          >
            <div className="font-display text-4xl sm:text-5xl leading-none italic">30–50%</div>
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold mt-2 opacity-90">
              Below Market Pricing
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
