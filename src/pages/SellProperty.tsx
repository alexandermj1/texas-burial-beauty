import { motion } from "framer-motion";
import { Phone, Mail, ArrowRight, CheckCircle, DollarSign, FileText, ShieldCheck, Clock, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import { SellerPromoAnimation } from "@/components/PromoAnimation";
import sellHeroBg from "@/assets/hero/cemetery-mountains.jpg";

const benefits = [
  { icon: DollarSign, title: "No Upfront Fees", desc: "We only earn when you do. Zero listing fees, zero appraisal costs." },
  { icon: FileText, title: "Free Valuation", desc: "Get an honest, no-obligation market value for your property." },
  { icon: ShieldCheck, title: "We Handle Everything", desc: "From paperwork to cemetery coordination to buyer matching — we do it all." },
  { icon: CheckCircle, title: "Close in 30–60 Days", desc: "Most sales complete in under two months with our streamlined process." },
  { icon: Users, title: "Texas Buyer Network", desc: "Access to thousands of qualified buyers across Dallas, Houston, Austin and San Antonio looking for Texas cemetery property." },
  { icon: TrendingUp, title: "Best Market Prices", desc: "We research comparables to ensure you get the best possible price." },
];

const steps = [
  { num: "1", title: "Contact Us", desc: "Reach out by phone or email. Tell us about your property — the cemetery name, location, type of property (plot, niche, crypt), and any details you have like deed information or section numbers." },
  { num: "2", title: "Free Valuation", desc: "We research recent comparable sales in your cemetery and provide a fair market price estimate. This is completely free and comes with no obligation." },
  { num: "3", title: "Listing & Marketing", desc: "Once you agree to list, we market your property across our buyer network and online listings. We handle all inquiries and pre-qualify potential buyers." },
  { num: "4", title: "Negotiate & Accept", desc: "When we find a buyer, we present you with the offer and negotiate on your behalf to get the best possible price. You're in control — you decide whether to accept." },
  { num: "5", title: "Close the Sale", desc: "We coordinate directly with the cemetery to complete the official transfer. We handle all paperwork, fees, and logistics. You receive your payment quickly and securely." },
];

const faqs = [
  { q: "What types of property can I sell?", a: "We help sell all types of cemetery property: single plots, side-by-side plots, family estates, crypts, mausoleum spaces, niches, and more." },
  { q: "How much does it cost to list?", a: "Nothing upfront. We work on a commission basis — we only get paid when your property sells. There are no listing fees, marketing costs, or hidden charges." },
  { q: "How do you determine the value of my property?", a: "We research recent sales of similar properties in the same cemetery, considering factors like location within the cemetery, property type, and current market demand." },
  { q: "What if I inherited property and don't have the deed?", a: "No problem. We can help you navigate the process of obtaining a replacement deed or the necessary documentation from the cemetery." },
];

const SellProperty = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Sell Your Cemetery Plot in Texas | Free Valuation, No Upfront Fees"
        description="Sell your Texas cemetery plot, niche or crypt with confidence. Free valuation, no upfront fees, 30–60 day average close. Serving Dallas, Houston, Austin & San Antonio."
        path="/sell"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Cemetery Plot Resale",
          provider: { "@id": "https://texascemeterybrokers.com/#organization" },
          areaServed: "Texas, United States",
          offers: { "@type": "Offer", description: "Commission-only — no upfront fees" },
        }}
      />
      <Navbar />

      {/* Hero — editorial split layout with photo background */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <img src={sellHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/75 to-foreground/55" />

        <div className="relative container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="text-primary-foreground/40 font-medium text-xs tracking-[0.3em] uppercase mb-4">Sell With Confidence</p>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-[1.1] mb-6">
                Turn unused plots into <span className="italic text-primary-foreground/70">cash</span>
              </h1>
              <p className="text-primary-foreground/60 text-lg font-light leading-relaxed mb-8 max-w-lg">
                No upfront costs. No hassle. We handle the entire selling process — you only pay when the sale is complete.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#quote-form" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                  Get a Free Valuation <ArrowRight className="w-4 h-4" />
                </a>
                <a href="tel:+14242341678" className="inline-flex items-center gap-2 px-6 py-3 border border-primary-foreground/20 text-primary-foreground/80 font-medium rounded-full text-sm hover:bg-primary-foreground/5 transition-all">
                  <Phone className="w-4 h-4" /> (424) 234-1678
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.3 }} className="hidden md:block">
              <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="space-y-5">
                  {[
                    { label: "Average sale time", value: "30–60 days" },
                    { label: "Upfront cost to you", value: "$0" },
                    { label: "Families helped (network)", value: "10,000+" },
                  ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }} className="flex items-center justify-between border-b border-primary-foreground/10 pb-4 last:border-0 last:pb-0">
                      <span className="text-primary-foreground/50 text-sm">{stat.label}</span>
                      <span className="font-display text-xl text-primary-foreground">{stat.value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SellerQuoteForm />

      {/* Seller Journey Video */}
      <section className="py-16 bg-gradient-warm">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8">
            <p className="text-primary font-medium text-sm tracking-wide mb-3">Your 90-Day Journey</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">See what happens behind the scenes</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">From your first call to final payment — watch the entire process we handle on your behalf.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-hover aspect-video">
            <video className="w-full" autoPlay loop muted playsInline poster="">
              <source src="/videos/seller-journey.mp4" type="video/mp4" />
            </video>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-gradient-warm">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8">
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Why sell with us?</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="bg-card rounded-xl p-6 shadow-soft">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-base text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 bg-gradient-warm">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8">
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Seller FAQ</h2>
          </motion.div>
          <div className="max-w-4xl mx-auto grid gap-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="bg-card rounded-xl p-5 shadow-soft">
                <h3 className="font-display text-base text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-sage">
        <div className="container mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">Ready to sell your property?</h2>
            <p className="text-muted-foreground mb-8 text-lg font-light max-w-lg mx-auto">Get a free, no-obligation valuation today. We respond within 24 hours and there's never any pressure.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+14242341678" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                <Phone className="w-4 h-4" /> (424) 234-1678
              </a>
              <a href="mailto:Help@TexasCemeteryBrokers.com" className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all">
                <Mail className="w-4 h-4" /> Email Us <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SellProperty;
