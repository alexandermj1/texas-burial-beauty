import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-cemetery.jpg";

const HeroSection = () => {
  return (
    <section
      role="banner"
      className="relative min-h-svh flex items-center justify-center bg-[#FDFBF7] overflow-hidden"
    >
      <div className="container mx-auto w-full px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 py-16 lg:py-24 items-center">
        {/* Text Content */}
        <div className="lg:col-span-7 flex flex-col space-y-10">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-3"
            >
              <span className="h-px w-8 bg-[#5E1212]" />
              <p className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-[#5E1212] font-bold">
                Partnered with Bayer Cemetery Brokers · Est. 1996
              </p>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#1A1816] leading-[0.92] tracking-tight italic"
            >
              Cemetery property,
              <br />
              <span className="not-italic text-[#5E1212]">made effortless.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-lg text-lg md:text-xl text-[#5C5752] leading-relaxed"
            >
              Buying or selling a plot shouldn't be hard. We offer deep expertise across all of Texas, with prices{" "}
              <span className="text-[#1A1816] font-semibold italic">30–50% below</span> cemetery direct rates.
            </motion.p>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/cemeteries"
              className="group flex-1 bg-[#5E1212] text-white p-6 sm:p-7 rounded-sm flex items-center justify-between transition-all hover:bg-[#4A0E0E] shadow-lg shadow-[#5E1212]/10"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">
                  I want to
                </span>
                <span className="font-display text-2xl sm:text-3xl italic leading-none">
                  Buy Property
                </span>
              </div>
              <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 opacity-70" />
            </Link>

            <Link
              to="/sell"
              className="group flex-1 border border-[#B8946A] text-[#1A1816] p-6 sm:p-7 rounded-sm flex items-center justify-between transition-all hover:bg-[#F8F5F0] hover:border-[#5E1212]"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">
                  I want to
                </span>
                <span className="font-display text-2xl sm:text-3xl italic leading-none">
                  Sell Property
                </span>
              </div>
              <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 opacity-40" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#E8EAE6] rounded-full">
              <div className="w-2 h-2 rounded-full bg-[#7D8F7B]" />
              <span className="text-[10px] font-bold text-[#525F51] uppercase tracking-wider">
                Serving all of Texas
              </span>
            </div>
            <span className="text-xs text-[#5C5752] font-medium">
              Over 25 years of trusted brokerage
            </span>
          </motion.div>
        </div>

        {/* Visual Column */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="lg:col-span-5 relative mt-8 lg:mt-0"
        >
          <div className="aspect-[4/5] w-full rounded-t-full overflow-hidden border border-[#B8946A]/20 shadow-2xl relative">
            <img
              src={heroImage}
              alt="Peaceful Texas cemetery landscape with manicured lawns and mature trees"
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#5E1212]/15 to-transparent" />
          </div>

          {/* Floating Savings Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-8 bg-[#B8946A] text-white p-6 sm:p-10 rounded-sm shadow-xl hidden md:block"
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
