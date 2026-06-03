import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSeoSection from "@/components/AboutSeoSection";
import { BuyerPromoAnimation, SellerPromoAnimation } from "@/components/PromoAnimation";
import PriceComparison from "@/components/PriceComparison";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUsSection from "@/components/WhyUsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import StoryStrip from "@/components/StoryStrip";
import featuredImg from "@/assets/story-featured.png";
import cemeteriesImg from "@/assets/story-cemeteries.png";
import propertyTypesImg from "@/assets/story-property-types.png";
import mobileImg from "@/assets/story-mobile.png";
import Seo from "@/components/Seo";
import { ListingCard } from "@/pages/Properties";
import { guides as guideEntries } from "@/pages/Guides";
import GuidesCarousel from "@/components/GuidesCarousel";
import hibiscusFlower from "@/assets/flowers/hibiscus-red.png.asset.json";
import monsteraLeaf from "@/assets/flowers/monstera.png.asset.json";

const HOME_FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much can I save buying cemetery property in Texas through a broker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most buyers save 30–50% versus purchasing directly from a Texas cemetery because we source from private sellers and pass the savings on.",
      },
    },
    {
      "@type": "Question",
      name: "What areas of Texas do you serve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All of Texas, with focus on Dallas–Fort Worth, Greater Houston, Austin, San Antonio and El Paso.",
      },
    },
    {
      "@type": "Question",
      name: "Are there upfront fees to sell my cemetery plot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer a free listing option and a premium $99 listing option. No appraisal charges or hidden fees.",
      },
    },
    {
      "@type": "Question",
      name: "What is the buying or selling process for a Texas cemetery plot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every transaction is different. We handle all the coordination with the cemetery to keep things moving as smoothly as possible, and we keep you updated throughout the process.",
      },
    },
  ],
};


  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Texas Cemetery Brokers | Buy & Sell Cemetery Plots in Texas"
        description="Buy and sell cemetery plots, niches and crypts across Texas — Dallas, Houston, Austin, San Antonio. Below-market resale by trusted brokers."
        path="/"
        jsonLd={HOME_FAQ_JSONLD}
      />
      <Navbar />
      <HeroSection />

      {/* Featured Available Plots — emerges from background as you scroll in */}
      {featuredListings.length > 0 && (
        <section ref={featuredRef} className="relative py-14 sm:py-20 bg-gradient-warm overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.3em] text-primary sm:text-xs">
                Available Now · Texas
              </span>
              <h2 className="font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl min-h-[1.1em] [text-wrap:balance]">
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

            {/* Mobile: horizontal swipe carousel. sm+: grid */}
            <div className="max-w-6xl mx-auto">
              <div className="-mx-6 px-6 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scroll-pl-6 pb-4 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {featuredListings.map((listing, i) => (
                  <div key={listing.id} className="snap-start shrink-0 w-[85%] sm:w-auto">
                    <ListingCard listing={listing} isAdmin={false} index={i} hidePrice />
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-10">
              <Link to="/cemeteries" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                View All Available Plots <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <StoryStrip
        img={featuredImg}
        eyebrow="Browsing"
        title="Finding the right plot, from the comfort of home."
        body="Browse below-market cemetery property listings across Texas, refreshed daily."
        to="/cemeteries"
        cta="See available plots"
        side="left"
        variant="split"
      />

      <AboutSeoSection />
      <BuyerPromoAnimation />

      <StoryStrip
        img={propertyTypesImg}
        eyebrow="Comparing"
        title="Understanding every type of resting place."
        body="Plots, niches, crypts and family estates — see the differences and decide what fits."
        to="/property-types"
        cta="Explore property types"
        side="right"
        variant="compact"
      />

      <SellerPromoAnimation />
      <PriceComparison />
      <HowItWorksSection />

      <StoryStrip
        img={cemeteriesImg}
        eyebrow="Researching"
        title="Every cemetery in Texas, one trusted partner."
        body="From Dallas to Houston, search the cemeteries that matter to your family."
        to="/cemeteries"
        cta="Browse cemeteries"
        side="left"
        variant="wide"
      />

      <WhyUsSection />
      <GuidesCarousel />
      <TestimonialsSection />

      <StoryStrip
        img={mobileImg}
        eyebrow="On the go"
        title="Cemetery property, in the palm of your hand."
        body="Start your search or list a plot from anywhere — designed to work beautifully on every device."
        to="/buy"
        cta="Get a personal match"
        side="right"
        variant="overlay"
      />

      <FAQSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
