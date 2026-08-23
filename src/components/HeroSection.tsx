import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowUpRight, Phone } from "lucide-react";
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

const useTypewriter = (phrases: string[], active: boolean) => {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) return;
    const current = phrases[phraseIdx];
    if (!deleting && text === current) {
      const t = setTimeout(() => setDeleting(true), 2500);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
      return;
    }
    const delay = deleting ? 80 : 120;
    const t = setTimeout(() => {
      setText((prev) =>
        deleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1)
      );
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, phrases, active]);

  return text;
};

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(sectionRef, { margin: "0px 0px -20% 0px" });
  const typed = useTypewriter(TYPED_PHRASES, inView);

  // iOS/Safari can refuse the initial autoplay (low power mode, first paint race)
  // and then paints its native play button. Keep retrying, and resume on any
  // user interaction or when the tab becomes visible again.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    tryPlay();
    const t = window.setTimeout(tryPlay, 400);
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    document.addEventListener("visibilitychange", tryPlay);
    window.addEventListener("touchstart", tryPlay, { passive: true });
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("scroll", tryPlay, { passive: true });

    return () => {
      clearTimeout(t);
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
      document.removeEventListener("visibilitychange", tryPlay);
      window.removeEventListener("touchstart", tryPlay);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("scroll", tryPlay);
    };
  }, []);


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
          ref={videoRef}
          src="/videos/hero-trees-v3.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload="auto"
          {...({
            "webkit-playsinline": "true",
            "x5-playsinline": "true",
            fetchpriority: "high",
          } as Record<string, string>)}

          aria-hidden="true"
          className="w-full h-full object-cover pointer-events-none [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-start-playback-button]:hidden [&::-webkit-media-controls-play-button]:hidden"
        />

      </motion.div>

      <div className="absolute inset-0 bg-foreground/10 pointer-events-none" />
      {/* Top gradient — keeps the navbar readable without dimming the whole frame */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-foreground/60 via-foreground/25 to-transparent pointer-events-none" />
      {/* Bottom gradient — shade behind headline + Buy/Sell row */}
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-foreground/65 via-foreground/25 to-transparent pointer-events-none" />
      {/* Parallax merge — fades into the page background as the user scrolls, blending hero into next section */}
      <motion.div
        style={{ opacity: mergeOpacity }}
        className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"
      />

      {/* Headline sits low in the blurred zone, aligned with the Buy column below */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative container mx-auto px-6 sm:px-10 mt-auto pt-28 sm:pt-32 pb-2 sm:pb-4"
      >
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="block text-primary-foreground/90 text-[10px] sm:text-xs tracking-[0.3em] uppercase font-medium mb-4 sm:mb-6 drop-shadow-md"
        >
          Partnered with Bayer Cemetery Brokers · Est. 1996 · All of Texas
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-display text-primary-foreground text-[clamp(2.5rem,8vw,8rem)] leading-[1.02] tracking-tight drop-shadow-2xl"
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
          className="mt-6 max-w-2xl text-primary-foreground/85 text-sm sm:text-base lg:text-lg font-light drop-shadow-md"
        >
          Buying or selling a plot shouldn't be hard. We make it effortless — across Texas, with deep expertise in Dallas, Houston, and beyond, at 30–50% below cemetery prices.
        </motion.p>

        <motion.a
          href="tel:+12142304740"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05 }}
          className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-5 py-2.5 text-primary-foreground backdrop-blur-sm hover:bg-primary-foreground/20 transition-all"
        >
          <Phone className="w-4 h-4" />
          <span className="text-sm font-medium">Prefer to talk? Call (214) 230-4740</span>
        </motion.a>
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
            to="/cemeteries"
            className="group flex items-center justify-between py-9 sm:py-10 pr-4 sm:pr-8 text-primary-foreground"
          >
            <span className="font-display text-5xl sm:text-5xl md:text-6xl tracking-tight drop-shadow-lg px-3 -mx-3 rounded-md transition-colors group-hover:bg-primary-foreground/10">Buy</span>
            <ArrowUpRight className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
          <Link
            to="/sell"
            className="group flex items-center justify-between py-9 sm:py-10 pl-4 sm:pl-8 text-primary-foreground"
          >
            <span className="font-display text-5xl sm:text-5xl md:text-6xl tracking-tight italic font-light drop-shadow-lg px-3 -mx-3 rounded-md transition-colors group-hover:bg-primary-foreground/10">Sell</span>
            <ArrowUpRight className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
