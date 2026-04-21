import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { BuyerPromoAnimation, SellerPromoAnimation } from "@/components/PromoAnimation";
import PriceComparison from "@/components/PriceComparison";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUsSection from "@/components/WhyUsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { ListingCard } from "@/pages/Properties";

const FEATURED_PHRASES = [
  "Featured plots.",
  "Featured this week.",
  "Featured near you.",
  "Featured across Texas.",
  "Featured below market.",
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

const Index = () => {
  const [allListings, setAllListings] = useState<any[]>([]);
  const [rotationOffset, setRotationOffset] = useState(0);
  const featuredRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const typed = useTypewriter(FEATURED_PHRASES, active);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, cemetery, city, plot_type, section, spaces, asking_price, photos, description, contact_name, contact_phone, contact_email, profit, cost_price")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24);
      if (data) setAllListings(data);
    };
    fetchFeatured();
  }, []);

  // Rotate featured plots every 5 seconds when there are more than 6 listings.
  useEffect(() => {
    if (allListings.length <= 6) return;
    const interval = setInterval(() => {
      setRotationOffset((o) => (o + 1) % allListings.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [allListings.length]);

  const featuredListings = allListings.length > 0
    ? Array.from({ length: Math.min(6, allListings.length) }, (_, i) =>
        allListings[(rotationOffset + i) % allListings.length]
      )
    : [];

  // Drive an emergence animation as the user scrolls into the featured section.
  const { scrollYProgress } = useScroll({
    target: featuredRef,
    offset: ["start end", "center center"],
  });
  const cardsOpacity = useTransform(scrollYProgress, [0, 0.35], [0, 1]);
  const cardsScale = useTransform(scrollYProgress, [0, 0.6], [0.92, 1]);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      if (v > 0.05 && !active) setActive(true);
    });
    return () => unsub();
  }, [scrollYProgress, active]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

      {/* Featured Available Plots — emerges from background as you scroll in */}
      {featuredListings.length > 0 && (
        <section ref={featuredRef} className="relative py-20 sm:py-28 bg-gradient-warm overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.3em] text-primary sm:text-xs">
                Available Now · Texas
              </span>
              <h2 className="font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                <span className="italic font-light">{typed || "\u00A0"}</span>
                <span
                  className="ml-1 inline-block h-[0.85em] w-[0.05em] -mb-[0.1em] animate-pulse bg-foreground/70 align-baseline"
                  aria-hidden="true"
                />
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base font-light text-muted-foreground sm:text-lg">
                Recently listed properties at below-market prices across Texas — Dallas, Houston & beyond.
              </p>
            </div>

            <motion.div
              style={{ opacity: cardsOpacity, scale: cardsScale }}
              className="home2-static-cards grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto"
            >
              {featuredListings.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} isAdmin={false} index={i} />
              ))}
            </motion.div>

            <div className="text-center mt-10">
              <Link to="/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                View All Available Plots <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

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

export default Index;
