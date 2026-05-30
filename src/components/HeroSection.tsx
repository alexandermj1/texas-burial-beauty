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
          // @ts-expect-error - fetchpriority is valid HTML attr
          fetchpriority="high"
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Layered overlays for depth & interest */}
      <div className="absolute inset-0 bg-foreground/35 pointer-events-none" />
      {/* Soft vignette */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_at_center,transparent_35%,hsl(var(--foreground)/0.55)_100%)]" />
      {/* Warm accent glow from upper-left */}
      <div className="absolute -top-32 -left-32 w-[55vw] h-[55vw] rounded-full bg-accent/25 blur-3xl pointer-events-none mix-blend-soft-light" />
      {/* Cool primary glow from lower-right */}
      <div className="absolute -bottom-40 -right-40 w-[60vw] h-[60vw] rounded-full bg-primary/30 blur-3xl pointer-events-none mix-blend-soft-light" />
      {/* Subtle grain/noise texture */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-foreground/85 via-foreground/55 to-transparent pointer-events-none" />
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-foreground/90 via-foreground/55 to-transparent pointer-events-none" />
      {/* Parallax merge — fades into the page background as the user scrolls, blending hero into next section */}
      <motion.div
        style={{ opacity: mergeOpacity }}
        className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"
      />

      {/* Headline sits low in the blurred zone, aligned with the Buy column below */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative container mx-auto px-6 sm:px-10 mt-auto pb-2 sm:pb-4"
      >
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="block text-primary-foreground/90 text-xs tracking-[0.3em] uppercase font-medium mb-4 sm:mb-6 drop-shadow-md"
        >
          Partnered with Bayer Cemetery Brokers · Est. 1996 · All of Texas
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

      {/* Buy / Sell split — bolder, clearer CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative border-t border-primary-foreground/30 bg-foreground/25 backdrop-blur-[2px]"
      >
        <div className="container mx-auto px-6 grid grid-cols-2 divide-x divide-primary-foreground/30">
          <Link
            to="/cemeteries"
            className="group relative flex items-center justify-between py-9 sm:py-11 pr-4 sm:pr-8 text-primary-foreground overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/25 to-primary/45 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="absolute left-0 top-0 h-full w-1 bg-primary scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500" />
            <div className="relative flex flex-col">
              <span className="text-[10px] sm:text-xs tracking-[0.35em] uppercase font-medium text-primary-foreground/75 mb-1.5">
                Browse listings
              </span>
              <span className="font-display text-5xl sm:text-5xl md:text-6xl tracking-tight drop-shadow-lg transition-transform group-hover:translate-x-1">
                Buy
              </span>
            </div>
            <ArrowUpRight className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-transform duration-300 group-hover:translate-x-2 group-hover:-translate-y-2" />
          </Link>
          <Link
            to="/sell"
            className="group relative flex items-center justify-between py-9 sm:py-11 pl-4 sm:pl-8 text-primary-foreground overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-l from-accent/0 via-accent/25 to-accent/45 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="absolute right-0 top-0 h-full w-1 bg-accent scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500" />
            <div className="relative flex flex-col">
              <span className="text-[10px] sm:text-xs tracking-[0.35em] uppercase font-medium text-primary-foreground/75 mb-1.5">
                Get a free quote
              </span>
              <span className="font-display text-5xl sm:text-5xl md:text-6xl tracking-tight italic font-light drop-shadow-lg transition-transform group-hover:translate-x-1">
                Sell
              </span>
            </div>
            <ArrowUpRight className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-transform duration-300 group-hover:translate-x-2 group-hover:-translate-y-2" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
