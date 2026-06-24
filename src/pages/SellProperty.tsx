import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, ArrowRight, CheckCircle, DollarSign, FileText, ShieldCheck, Clock, Users, TrendingUp, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import plumeriaCluster from "@/assets/flowers/plumeria-cluster.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";

const benefits = [
  { icon: DollarSign, title: "Free or $99 Listing", desc: "Choose a free listing or our premium $99 listing — no appraisal costs, no hidden charges." },
  { icon: FileText, title: "Free Valuation", desc: "Get an honest, no-obligation market value for your property." },
  { icon: ShieldCheck, title: "We Handle Everything", desc: "From paperwork to cemetery coordination to buyer matching — we do it all." },
  { icon: CheckCircle, title: "You Stay In Control", desc: "List with us and stay in control — we handle the marketing, buyers, and paperwork while you decide." },
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
  { q: "How much does it cost to list?", a: "We offer two options: a free listing and a premium $99 listing. No marketing costs or hidden charges." },
  { q: "How do you determine the value of my property?", a: "We research recent sales of similar properties in the same cemetery, considering factors like location within the cemetery, property type, and current market demand." },
  { q: "What if I inherited property and don't have the deed?", a: "No problem. We can help you navigate the process of obtaining a replacement deed or the necessary documentation from the cemetery." },
];

const SellProperty = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Sell Your Cemetery Plot in Texas | Free Valuation"
        description="Sell your Texas cemetery plot, niche or crypt with confidence. Free valuation, no upfront fees. Serving Dallas, Houston, Austin & San Antonio."
        path="/sell"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Cemetery Plot Resale",
            provider: { "@id": "https://texascemeterybrokers.com/#organization" },
            areaServed: "Texas, United States",
            offers: { "@type": "Offer", description: "Free listing or $99 premium listing" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
              { "@type": "ListItem", position: 2, name: "Sell Property", item: "https://texascemeterybrokers.com/sell" },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <Navbar forceScrolled />

      {/* Hero + valuation form — one merged editorial spread */}
      <section className="relative pt-24 pb-20 md:pt-28 md:pb-28 bg-[hsl(var(--sand-light))] overflow-hidden" id="quote-form">
        {/* Layered backdrop: sage wash on top fading into sand, with a dot grid */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-[hsl(var(--sage-light))]/70 to-transparent pointer-events-none" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--terracotta) / 0.35) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[hsl(var(--terracotta-light))]/25 to-transparent pointer-events-none" />

        {/* Botanical illustrations */}
        <motion.img src={bananaLeaf.url} alt="" aria-hidden
          initial={{ opacity: 0, x: -40, rotate: -20 }} animate={{ opacity: 0.4, x: 0, rotate: -14 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="hidden md:block absolute -left-44 top-32 w-[28rem] pointer-events-none select-none"
        />
        <motion.img src={palmFan.url} alt="" aria-hidden
          initial={{ opacity: 0, x: 40, rotate: 12 }} animate={{ opacity: 0.3, x: 0, rotate: 8 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="hidden lg:block absolute -right-32 bottom-24 w-[24rem] pointer-events-none select-none"
        />
        <motion.img src={hibiscusCoral.url} alt="" aria-hidden
          initial={{ opacity: 0, y: -20, rotate: 18 }} animate={{ opacity: 0.85, y: 0, rotate: 8 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="hidden md:block absolute right-6 lg:right-20 top-24 w-40 lg:w-52 pointer-events-none select-none"
        />
        <motion.img src={pinkBranch.url} alt="" aria-hidden
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 0.6, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="hidden md:block absolute left-6 bottom-12 w-40 lg:w-52 pointer-events-none select-none -rotate-6"
        />
        <motion.img src={plumeriaCluster.url} alt="" aria-hidden
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="md:hidden absolute -right-10 top-20 w-36 pointer-events-none select-none"
        />

        <div className="relative container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start max-w-7xl mx-auto">
            {/* LEFT — editorial pitch: why list with us */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 lg:sticky lg:top-28"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] tracking-[0.3em] font-semibold text-primary uppercase">
                  The Seller&rsquo;s Edition
                </span>
                <div className="h-px w-12 bg-border" />
                <span className="text-[10px] tracking-[0.3em] font-medium text-accent uppercase italic">
                  Vol. 01
                </span>
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.02] tracking-tight mb-6">
                Sell your plot,{" "}
                <span className="italic font-medium text-primary">the right way.</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 font-light max-w-lg">
                Most owners try to sell on their own — and lose months chasing buyers, paperwork, and cemetery red tape. We take all of that off your plate, find a serious buyer, and close the deal for you.
              </p>

              {/* Why list with us — clear value props */}
              <ul className="space-y-4 mb-10 max-w-lg">
                {[
                  { t: "$0 upfront, no obligation", d: "Free listing or $99 premium — never any appraisal fees or hidden charges." },
                  { t: "We bring the buyers", d: "Thousands of qualified Texas buyers across DFW, Houston, Austin & San Antonio." },
                  { t: "We do the paperwork", d: "Cemetery transfer, deeds, escrow — every form, every call, handled." },
                  { t: "You decide, always", d: "We negotiate on your behalf. Nothing happens without your approval." },
                ].map((v, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={2.2} />
                    <div>
                      <div className="font-display text-base text-foreground">{v.t}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{v.d}</div>
                    </div>
                  </motion.li>
                ))}
              </ul>

              {/* Editorial stat strip */}
              <div className="grid grid-cols-3 gap-4 border-t border-border pt-6 max-w-lg">
                <div>
                  <div className="font-display text-2xl md:text-3xl italic text-primary">$0</div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground/80 font-semibold mt-1">Upfront</div>
                </div>
                <div className="border-x border-border pl-4">
                  <div className="font-display text-2xl md:text-3xl italic text-accent">10k+</div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground/80 font-semibold mt-1">Families</div>
                </div>
                <div className="pl-4">
                  <div className="font-display text-2xl md:text-3xl italic text-foreground">24h</div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground/80 font-semibold mt-1">Response</div>
                </div>
              </div>

              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/70 font-semibold mt-5">
                In partnership with Bayer Cemetery Brokers
              </p>

              <p className="text-xs text-muted-foreground/80 mt-4">
                Prefer to talk?{" "}
                <a href="tel:+12142304740" className="underline underline-offset-2 hover:text-primary transition-colors">
                  Call (214) 230-4740
                </a>
              </p>
            </motion.div>

            {/* RIGHT — the form, embedded directly into the hero */}
            <div className="lg:col-span-7">
              <SellerQuoteForm compact />
            </div>
          </div>
        </div>
      </section>


      {/* Seller Journey Video */}
      <section className="py-16 bg-gradient-warm">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8">
            <p className="text-primary font-medium text-sm tracking-wide mb-3">The Seller Journey</p>
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

      {/* Benefits — bold sage band, the visual anchor of the page */}
      <section className="relative py-20 bg-foreground text-background overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--background)) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <img
          src={plumeriaCluster.url}
          alt=""
          aria-hidden
          className="hidden md:block absolute -right-16 top-8 w-72 opacity-25 pointer-events-none select-none rotate-12"
        />
        <div className="relative container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-3xl mb-12">
            <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-semibold mb-4">Why sellers choose us</p>
            <h2 className="font-display text-3xl md:text-5xl text-background leading-tight">
              The fairest, fastest way to sell <span className="italic text-accent">Texas cemetery property.</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl">
            {benefits.map((b, i) => {
              const accentEvery = i % 3 === 1;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={`rounded-2xl p-6 transition-all hover:-translate-y-1 ${
                    accentEvery
                      ? "bg-accent text-accent-foreground shadow-hover"
                      : "bg-background text-foreground shadow-soft"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
                      accentEvery ? "bg-accent-foreground/15" : "bg-primary/10"
                    }`}
                  >
                    <b.icon className={`w-5 h-5 ${accentEvery ? "text-accent-foreground" : "text-primary"}`} />
                  </div>
                  <h3 className="font-display text-lg mb-2">{b.title}</h3>
                  <p className={`text-sm leading-relaxed ${accentEvery ? "text-accent-foreground/85" : "text-muted-foreground"}`}>
                    {b.desc}
                  </p>
                </motion.div>
              );
            })}
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
              <a href="tel:+12142304740" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                <Phone className="w-4 h-4" /> (214) 230-4740
              </a>
              <a href="mailto:info@texascemeterybrokers.com" className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all">
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
