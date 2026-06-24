import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Plus } from "lucide-react";
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
  { num: "01", kicker: "No upfront cost", title: "Free or $99 to list.", desc: "Choose a free listing or our premium $99 listing. No appraisal fees. No hidden charges. Ever." },
  { num: "02", kicker: "Free valuation", title: "An honest market price.", desc: "We research recent sales in your cemetery and give you a fair, no-obligation estimate." },
  { num: "03", kicker: "Done for you", title: "We handle every form.", desc: "Cemetery transfers, deeds, escrow, paperwork — every call, every signature, on us." },
  { num: "04", kicker: "You decide", title: "Nothing happens without you.", desc: "List with us and stay in control. We negotiate on your behalf. You approve every offer." },
  { num: "05", kicker: "Texas reach", title: "A real buyer network.", desc: "Thousands of qualified buyers across Dallas, Houston, Austin and San Antonio." },
  { num: "06", kicker: "Best prices", title: "Comparable-driven pricing.", desc: "We benchmark every property against recent sales to make sure you don't leave money on the table." },
];

const faqs = [
  { q: "What types of property can I sell?", a: "We help sell all types of cemetery property: single plots, side-by-side plots, family estates, crypts, mausoleum spaces, niches, and more." },
  { q: "How much does it cost to list?", a: "We offer two options: a free listing and a premium $99 listing. No marketing costs or hidden charges." },
  { q: "How do you determine the value of my property?", a: "We research recent sales of similar properties in the same cemetery, considering factors like location within the cemetery, property type, and current market demand." },
  { q: "What if I inherited property and don't have the deed?", a: "No problem. We can help you navigate the process of obtaining a replacement deed or the necessary documentation from the cemetery." },
];

const SellProperty = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--sand-light))] flex flex-col [&>footer]:mt-auto">
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

      {/* ====================================================
          VOGUE-STYLE HERO — broken editorial masthead with the
          form embedded as the focal interactive element.
          No mirrored text blocks. Layered, asymmetric.
         ==================================================== */}
      <section className="relative pt-24 pb-20 md:pt-28 md:pb-28 overflow-hidden bg-[hsl(var(--sand-light))]">
        {/* Subtle botanicals far from text */}
        <motion.img src={bananaLeaf.url} alt="" aria-hidden
          initial={{ opacity: 0, x: -40, rotate: -20 }} animate={{ opacity: 0.1, x: 0, rotate: -14 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="hidden md:block absolute -left-60 top-40 w-[28rem] pointer-events-none select-none"
        />
        <motion.img src={palmFan.url} alt="" aria-hidden
          initial={{ opacity: 0, x: 40, rotate: 12 }} animate={{ opacity: 0.1, x: 0, rotate: 8 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="hidden lg:block absolute -right-44 bottom-10 w-[26rem] pointer-events-none select-none"
        />
        <motion.img src={hibiscusCoral.url} alt="" aria-hidden
          initial={{ opacity: 0, rotate: 18 }} animate={{ opacity: 0.85, rotate: 6 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="hidden md:block absolute right-[6%] top-32 w-24 lg:w-28 pointer-events-none select-none drop-shadow-md"
        />
        <motion.img src={pinkBranch.url} alt="" aria-hidden
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="hidden md:block absolute left-[4%] bottom-20 w-28 lg:w-36 pointer-events-none select-none -rotate-6"
        />

        <div className="relative container mx-auto px-6">
          {/* --- MASTHEAD --- */}
          <div className="max-w-7xl mx-auto border-b border-foreground/15 pb-4 mb-10 flex items-center justify-between text-[10px] tracking-[0.3em] uppercase font-bold text-foreground/70">
            <span>Vol. 01 · Texas Edition</span>
            <span className="hidden sm:inline italic font-display normal-case tracking-normal text-base text-foreground">The Seller&rsquo;s Brief</span>
            <span>Est. 2026</span>
          </div>

          {/* --- BROKEN EDITORIAL GRID --- */}
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-x-6 gap-y-10">
            {/* Tiny eyebrow — top left */}
            <div className="col-span-12 lg:col-span-3">
              <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-2">Cover Story</p>
              <p className="font-display italic text-foreground/60 text-sm leading-snug max-w-[16ch]">
                On selling a Texas cemetery plot, gracefully.
              </p>
            </div>

            {/* MASSIVE asymmetric headline */}
            <div className="col-span-12 lg:col-span-9 lg:-mt-3">
              <h1 className="font-display text-foreground leading-[0.92] tracking-tight text-[clamp(3rem,9vw,8.5rem)]">
                Sell your plot
                <span className="block pl-[6%]">
                  the <span className="italic font-medium text-primary">right</span> way.
                </span>
              </h1>
            </div>

            {/* Standfirst — drop cap intro paragraph, magazine-style, narrow column */}
            <div className="col-span-12 md:col-span-7 lg:col-span-5 lg:col-start-2 lg:-mt-4">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed font-light first-letter:font-display first-letter:text-6xl first-letter:font-medium first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none">
                Most owners try to sell on their own — and lose months chasing buyers, paperwork, and cemetery red tape. We take all of that off your plate, find a serious buyer, and close for you. Free valuation. No upfront cost. You stay in charge.
              </p>
              <div className="mt-6 flex items-baseline gap-3 text-[10px] tracking-[0.25em] uppercase font-bold text-foreground/60">
                <span>By Texas Cemetery Brokers</span>
                <span className="h-px flex-1 bg-foreground/20" />
                <span className="italic font-display normal-case tracking-normal text-sm">in partnership with Bayer</span>
              </div>
            </div>

            {/* Pull quote — right column, sits next to standfirst */}
            <aside className="hidden lg:block col-span-4 col-start-9 border-l border-foreground/20 pl-6">
              <p className="font-display italic text-2xl text-foreground/85 leading-snug">
                &ldquo;They handled everything — deeds, the cemetery, the buyer. I just signed.&rdquo;
              </p>
              <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-foreground/55 mt-4">
                David &amp; Anne R. · Fort Worth
              </p>
            </aside>

            {/* Stat strip — runs full width across the grid */}
            <div className="col-span-12 grid grid-cols-3 lg:grid-cols-4 gap-px bg-foreground/15 border-y border-foreground/15 mt-2">
              {[
                { v: "$0", l: "Upfront cost" },
                { v: "24h", l: "Response time" },
                { v: "10k+", l: "Texas buyers" },
                { v: "100%", l: "You stay in control" },
              ].map((s, i) => (
                <div key={i} className={`bg-[hsl(var(--sand-light))] px-4 py-5 ${i === 3 ? "hidden lg:block" : ""}`}>
                  <div className="font-display text-3xl md:text-4xl italic text-primary">{s.v}</div>
                  <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-foreground/60 mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            {/* --- THE EMBEDDED FORM --- magazine page within the page */}
            <div className="col-span-12 grid grid-cols-12 gap-x-6 gap-y-8 mt-6">
              {/* Section opener label — left margin */}
              <div className="col-span-12 lg:col-span-3 lg:pt-2">
                <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-3">The Valuation</p>
                <h3 className="font-display text-2xl md:text-3xl text-foreground leading-tight tracking-tight">
                  A few quiet <span className="italic text-primary">questions.</span>
                </h3>
                <p className="text-sm text-foreground/65 mt-3 leading-relaxed max-w-[26ch]">
                  Takes about two minutes. One question at a time — no overwhelming form. We reply within 24 hours.
                </p>
                <p className="hidden lg:block text-xs text-foreground/55 mt-6">
                  Prefer to talk?{" "}
                  <a href="tel:+12142304740" className="underline underline-offset-2 hover:text-primary transition-colors">
                    (214) 230-4740
                  </a>
                </p>
              </div>

              {/* The form, embedded directly on the page — no card, no in-your-face panel */}
              <div className="col-span-12 lg:col-span-9 lg:border-l lg:border-foreground/20 lg:pl-10">
                <SellerQuoteForm editorial />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Seller Journey Video */}
      <section className="py-16 bg-[hsl(var(--sand-light))] border-t border-foreground/10">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8">
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-3">The Seller Journey</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground tracking-tight">See what happens <span className="italic text-primary">behind the scenes.</span></h2>
            <p className="text-foreground/70 mt-4 max-w-lg mx-auto">From your first call to final payment — watch the entire process we handle on your behalf.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-hover aspect-video">
            <video className="w-full" autoPlay loop muted playsInline poster="">
              <source src="/videos/seller-journey.mp4" type="video/mp4" />
            </video>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          WHY SELLERS CHOOSE US — editorial index, matches palette
         ============================================ */}
      <section className="relative py-24 md:py-32 bg-[hsl(var(--warm-white))] overflow-hidden">
        <motion.img src={plumeriaCluster.url} alt="" aria-hidden
          initial={{ opacity: 0 }} whileInView={{ opacity: 0.18 }} viewport={{ once: true }} transition={{ duration: 1 }}
          className="hidden md:block absolute -right-20 top-10 w-64 pointer-events-none select-none rotate-12"
        />
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            {/* Section masthead */}
            <div className="border-b border-foreground/15 pb-4 mb-16 flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-3">The Index</p>
                <h2 className="font-display text-4xl md:text-6xl text-foreground tracking-tight leading-[1.02] max-w-2xl">
                  Why sellers <span className="italic text-primary">choose us.</span>
                </h2>
              </div>
              <p className="font-display italic text-foreground/60 max-w-sm text-base leading-relaxed">
                Six reasons owners hand us the deed and breathe out for the first time in months.
              </p>
            </div>

            {/* Editorial numbered list — two columns of meaty entries */}
            <div className="grid md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-0">
              {benefits.map((b, i) => (
                <motion.article
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                  className="group grid grid-cols-[auto,1fr] gap-x-6 py-8 border-t border-foreground/15 first:border-t-0 md:[&:nth-child(2)]:border-t-0"
                >
                  <div className="font-display italic text-5xl md:text-6xl text-primary/80 leading-none group-hover:text-primary transition-colors">
                    {b.num}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-2">{b.kicker}</p>
                    <h3 className="font-display text-2xl md:text-3xl text-foreground tracking-tight leading-tight mb-3">
                      {b.title}
                    </h3>
                    <p className="text-foreground/70 leading-relaxed text-[15px]">{b.desc}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs — editorial accordion */}
      <FaqSection faqs={faqs} />

      {/* CTA */}
      <section className="py-20 bg-gradient-sage">
        <div className="container mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">Ready to sell your property?</h2>
            <p className="text-foreground/70 mb-8 text-lg font-light max-w-lg mx-auto">Get a free, no-obligation valuation today. We respond within 24 hours — and there's never any pressure.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="#quote-form" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all shadow-soft">
                Get a Free Valuation <ArrowRight className="w-4 h-4" />
              </a>
              <a href="mailto:info@texascemeterybrokers.com" className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4">
                <Mail className="w-4 h-4" /> Or email us instead
              </a>
            </div>
          </motion.div>
        </div>
      </section>


      <Footer />
    </div>
  );
};

const FaqSection = ({ faqs }: { faqs: { q: string; a: string }[] }) => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 sm:py-28 bg-[hsl(var(--sand-light))]">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4"
          >
            <div className="lg:sticky lg:top-32">
              <p className="text-accent font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
                Seller FAQ
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05] tracking-tight">
                Questions, <span className="italic font-light text-foreground/60">answered.</span>
              </h2>
              <p className="text-sm text-foreground/70 leading-relaxed mt-5 max-w-sm">
                Everything you need to know before listing your Texas cemetery property. Still curious? Send us a note — we reply within 24 hours.
              </p>
            </div>
          </motion.div>

          <div className="lg:col-span-8 divide-y divide-foreground/15 border-t border-b border-foreground/15">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full text-left py-7 flex items-start gap-6 group"
                  >
                    <span className="font-mono text-[11px] text-foreground/55 tabular-nums pt-1 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-lg sm:text-xl text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors duration-300">
                      {faq.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="shrink-0 mt-1 w-8 h-8 rounded-full border border-foreground/25 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-colors duration-300"
                    >
                      <Plus className="w-3.5 h-3.5 text-foreground" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pl-12 pr-14 pb-7 text-foreground/70 text-sm sm:text-base leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SellProperty;
