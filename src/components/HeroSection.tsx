import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// Phrases that follow "Cemetery property,". Cycled via typewriter.
const TYPED_PHRASES = [
  "made simple.",
  "made personal.",
  "made affordable.",
  "for you.",
  "for your family.",
];

const useTypewriter = (phrases: string[]) => {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    if (!deleting && text === current) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
      return;
    }
    const delay = deleting ? 40 : 75;
    const t = setTimeout(() => {
      setText((prev) =>
        deleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1)
      );
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, phrases]);

  return text;
};

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const typed = useTypewriter(TYPED_PHRASES);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.4, 0]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const mergeOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-svh flex flex-col overflow-hidden"
      role="banner"
    >
      {/* Background video — sharp (top half stays crisp), parallax shifts it down on scroll */}
      <motion.div className="absolute inset-0 w-full h-full" style={{ scale: videoScale, y: videoY }}>
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

      {/* Blurred copy — only behind the Buy/Sell buttons row at the very bottom */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-32 sm:h-40 pointer-events-none overflow-hidden"
        style={{
          scale: videoScale,
          y: videoY,
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
        }}
        aria-hidden="true"
      >
        <video
          src="/videos/hero-trees.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover blur-[3px] scale-110"
        />
      </motion.div>

      {/* Color grading — darker overall so white text reads anywhere */}
      <div className="absolute inset-0 bg-foreground/40 pointer-events-none" />
      {/* Top gradient — strong, tall, opaque at the very top so the navbar always reads */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-foreground via-foreground/70 to-transparent pointer-events-none" />
      {/* Bottom gradient — deep shade behind headline + Buy/Sell row */}
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-foreground/90 via-foreground/55 to-transparent pointer-events-none" />
      {/* Parallax merge — fades into the page background as the user scrolls, blending hero into next section */}
      <motion.div
        style={{ opacity: mergeOpacity }}
        className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"
      />

      {/* Headline sits low in the blurred zone, aligned with the Buy column below */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative container mx-auto px-6 sm:px-10 mt-[22vh] sm:mt-auto pb-2 sm:pb-4"
      >
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="block text-primary-foreground/90 text-xs tracking-[0.3em] uppercase font-medium mb-4 sm:mb-6 drop-shadow-md"
        >
          Est. 1996 · All of Texas
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-display text-primary-foreground text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-[1.02] tracking-tight drop-shadow-2xl"
        >
          Cemetery property,
          <br />
          <span className="italic font-light">
            {typed}
            <span className="inline-block w-[0.05em] -mb-[0.1em] ml-1 h-[0.85em] bg-primary-foreground/80 animate-pulse align-baseline" aria-hidden="true" />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-6 max-w-2xl text-primary-foreground/85 text-base sm:text-lg font-light drop-shadow-md"
        >
          Buying or selling a plot shouldn't be hard. We make it effortless — across Texas, with deep expertise in Dallas, Houston, and beyond, at 30–50% below cemetery prices.
        </motion.p>
      </motion.div>

      {/* Buy / Sell split — minimal text links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative border-t border-primary-foreground/25"
      >
        <div className="container mx-auto px-6 grid grid-cols-2 divide-x divide-primary-foreground/25">
          <Link
            to="/buy"
            className="group flex items-center justify-between py-7 sm:py-10 pr-4 sm:pr-8 text-primary-foreground"
          >
            <span className="font-display text-3xl sm:text-5xl tracking-tight drop-shadow-lg px-3 -mx-3 rounded-md transition-colors group-hover:bg-primary-foreground/10">Buy</span>
            <ArrowUpRight className="w-7 h-7 sm:w-10 sm:h-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
          <Link
            to="/sell"
            className="group flex items-center justify-between py-7 sm:py-10 pl-4 sm:pl-8 text-primary-foreground"
          >
            <span className="font-display text-3xl sm:text-5xl tracking-tight italic font-light drop-shadow-lg px-3 -mx-3 rounded-md transition-colors group-hover:bg-primary-foreground/10">Sell</span>
            <ArrowUpRight className="w-7 h-7 sm:w-10 sm:h-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
