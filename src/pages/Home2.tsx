import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUsSection from "@/components/WhyUsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import ContactSection from "@/components/ContactSection";
import PriceComparison from "@/components/PriceComparison";
import { BuyerPromoAnimation, SellerPromoAnimation } from "@/components/PromoAnimation";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/pages/Properties";
import Seo from "@/components/Seo";


type ListingRow = any;

type IntroState = "idle" | "playing" | "done";

const FALLBACK_DURATION_MS = 10000;
// Listings start emerging earlier and fade up from behind the scene.
const LISTINGS_START = 0.5;

// Typewriter phrases shown above the emerging listings.
const SEARCH_PHRASES = [
  "Begin your search.",
  "Find a peaceful resting place.",
  "Discover plots near you.",
  "Explore Texas cemeteries.",
  "Compare prices instantly.",
];

const useTypewriter = (phrases: string[], active: boolean) => {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) return;
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
    const delay = deleting ? 35 : 70;
    const t = setTimeout(() => {
      setText((prev) =>
        deleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1)
      );
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, phrases, active]);

  return text;
};

const Home2 = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState(8);
  const [introState, setIntroState] = useState<IntroState>("idle");
  const [featured, setFeatured] = useState<ListingRow[]>([]);
  const progress = useMotionValue(0);
  const typed = useTypewriter(SEARCH_PHRASES, introState !== "idle");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, cemetery, city, plot_type, section, spaces, asking_price, photos, description, contact_name, contact_phone, contact_email, profit, cost_price")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) setFeatured(data);
    })();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const shouldLock = introState !== "done";

    root.style.overflow = shouldLock ? "hidden" : "";
    body.style.overflow = shouldLock ? "hidden" : "";

    return () => {
      root.style.overflow = "";
      body.style.overflow = "";
    };
  }, [introState]);

  // Drive `progress` (0 → 1) from the actual <video> playback so it plays at
  // its native frame rate and full duration. Scroll only triggers play.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (introState !== "playing") return;

    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay can be blocked; the time-based fallback below still advances.
      });
    }

    let rafId = 0;
    const fallbackDuration = (videoDuration || FALLBACK_DURATION_MS / 1000) * 1000;
    const startTime = performance.now();

    const tick = () => {
      const dur = video.duration || videoDuration || FALLBACK_DURATION_MS / 1000;
      let next: number;

      if (dur > 0 && !Number.isNaN(video.currentTime)) {
        next = Math.min(video.currentTime / dur, 1);
      } else {
        next = Math.min((performance.now() - startTime) / fallbackDuration, 1);
      }

      progress.set(next);

      if (next < 1 && !video.ended) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        progress.set(1);
        setIntroState("done");
      }
    };

    rafId = window.requestAnimationFrame(tick);

    const handleEnded = () => {
      progress.set(1);
      setIntroState("done");
    };
    video.addEventListener("ended", handleEnded);

    return () => {
      window.cancelAnimationFrame(rafId);
      video.removeEventListener("ended", handleEnded);
    };
  }, [introState, progress, videoDuration]);

  useEffect(() => {
    const startIntro = () => {
      setIntroState((current) => (current === "idle" ? "playing" : current));
    };

    const handleWheel = (event: WheelEvent) => {
      if (introState === "done") return;
      event.preventDefault();
      startIntro();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (introState === "done") return;
      event.preventDefault();
      startIntro();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (introState === "done") return;

      if (["ArrowDown", "ArrowUp", "Space", "PageDown", "PageUp"].includes(event.code)) {
        event.preventDefault();
        startIntro();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [introState]);

  const idleHintOpacity = useTransform(progress, [0, 0.03], [1, 0]);
  const copyOpacity = useTransform(progress, [0, 0.12, 0.34], [1, 1, 0]);
  const copyY = useTransform(progress, [0, 0.34], ["0%", "-20%"]);
  // Listings emerge over the live final frames of the video.
  const listingsOpacity = useTransform(progress, [LISTINGS_START, Math.min(LISTINGS_START + 0.18, 0.92)], [0, 1]);
  const listingsBlur = useTransform(progress, [LISTINGS_START, LISTINGS_START + 0.18], ["blur(24px)", "blur(0px)"]);
  const listingsScale = useTransform(progress, [LISTINGS_START, 1], [0.78, 1]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Seo
        title="Texas Cemetery Brokers — Premium Cemetery Plot Resale"
        description="Premium cemetery plot resale across Texas — Dallas, Houston, Austin, San Antonio. Below-market plots, concierge service, partnered with Bayer Cemetery Brokers."
        path="/home2"
        noindex
      />
      <Navbar />

      <section className="relative h-screen overflow-hidden">
        <video
          ref={videoRef}
          src="/videos/hero-drone.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration || 8)}
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />

        {/* Subtle top vignette only — keeps navbar legible without darkening the sky. */}
        <div className="absolute inset-x-0 top-0 z-30 h-32 bg-gradient-to-b from-background/30 to-transparent pointer-events-none" />

        <motion.div style={{ opacity: copyOpacity, y: copyY }} className="absolute inset-0 z-20 flex flex-col justify-end pb-24 sm:pb-32">
          <div className="container mx-auto px-6 sm:px-10">
            <span className="mb-4 block text-xs font-medium uppercase tracking-[0.3em] text-primary-foreground/90 drop-shadow-md sm:mb-6">
              Scroll · A Texas Story
            </span>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-primary-foreground drop-shadow-2xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl">
              Where memory <span className="italic font-light">meets sky.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-light text-primary-foreground/85 drop-shadow-md sm:text-lg">
              Cemetery property, reimagined. One scroll starts the journey — then the sky opens and listings arrive.
            </p>
          </div>
        </motion.div>

        {/* Removed the dark "Plots in the clouds" interstitial — listings now take over directly. */}

        {/* Sky background — gentle gradient that fades in with the listings so the
            end state feels like an open sky rather than a frozen video frame. */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: listingsOpacity }}
          className="absolute inset-0 z-[15] pointer-events-none"
        >
          <div className="h-full w-full bg-[linear-gradient(to_bottom,hsl(205_85%_72%)_0%,hsl(200_75%_82%)_45%,hsl(30_55%_88%)_100%)]" />
        </motion.div>

        <motion.div
          style={{ opacity: listingsOpacity, scale: listingsScale, filter: listingsBlur }}
          className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto px-4 pt-24 pb-10 sm:px-8 sm:pt-28"
        >
          <div className="mx-auto w-full max-w-7xl">
            {/* Header — white text, typewriter */}
            <div className="mb-8 text-center sm:mb-10">
              <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.3em] text-primary-foreground/85 drop-shadow-md sm:text-xs">
                Available Now · Texas
              </span>
              <h2 className="font-display text-4xl leading-[1.05] tracking-tight text-primary-foreground drop-shadow-2xl sm:text-6xl md:text-7xl">
                <span className="italic font-light">{typed || "\u00A0"}</span>
                <span
                  className="ml-1 inline-block h-[0.85em] w-[0.05em] -mb-[0.1em] animate-pulse bg-primary-foreground/80 align-baseline"
                  aria-hidden="true"
                />
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base font-light text-primary-foreground/85 drop-shadow-md sm:text-lg">
                Recently listed plots and trusted cemeteries across Texas — Dallas, Houston, Austin & San Antonio.
              </p>
            </div>

            {/* Featured plots — uses real ListingCard. Wrapper disables hover translate/scale. */}
            {featured.length > 0 && (
              <div className="home2-static-cards mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.slice(0, 6).map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} isAdmin={false} index={i} />
                ))}
              </div>
            )}

            <p className="mt-2 text-center text-xs text-primary-foreground/80 drop-shadow">
              Keep scrolling to explore the full site ↓
            </p>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: idleHintOpacity }}
          className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-primary-foreground/85 pointer-events-none"
        >
          {introState === "idle" ? "↓ Scroll once to begin" : ""}
        </motion.div>
      </section>

      {/* Below-the-fold — mirrors the original homepage at /. */}
      <BuyerPromoAnimation />
      <SellerPromoAnimation />
      <PriceComparison />
      <HowItWorksSection />
      <WhyUsSection />
      <TestimonialsSection />
      <FAQSection />
      <ContactSection />

      <Footer />
    </div>
  );
};


export default Home2;
