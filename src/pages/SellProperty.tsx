import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import sellHeroBg from "@/assets/hero/cemetery-mountains.jpg";

const PHONE_DISPLAY = "(424) 234-1678";
const PHONE_HREF = "tel:+14242341678";

const steps = [
  {
    num: "01",
    title: "Tell us about your plot",
    body: "Cemetery name, section, and any paperwork you have on hand. If you don't have the deed, that's fine — we'll take it from there.",
  },
  {
    num: "02",
    title: "We value it against current Texas market data",
    body: "Most cemeteries restrict resale prices, and most online estimates are wrong. We'll tell you plainly what your property can fetch in today's market and why.",
  },
  {
    num: "03",
    title: "We find the buyer and handle the cemetery transfer",
    body: "Including the deed work, the cemetery's transfer fee, and any required forms. You don't speak to the cemetery — we do that on your behalf.",
  },
  {
    num: "04",
    title: "You sign once. We wire your funds.",
    body: "Most sales close in 60–120 days, depending on the cemetery's official transfer timeline.",
  },
];

const ranges = [
  { label: "Houston metro · lawn section", value: "$1,800 – $3,500" },
  { label: "DFW · companion plot", value: "$3,200 – $6,800" },
  { label: "Austin · mausoleum crypt", value: "$5,500 – $14,000" },
];

const faqs = [
  {
    q: "Can I sell a plot if the cemetery says it's non-transferable?",
    a: "Often, yes. Many cemeteries quote a strict policy at the counter but will process a third-party transfer when the paperwork is presented correctly. We've handled this many times across Texas. If a property is genuinely non-transferable, we'll tell you on the first call rather than waste your time.",
  },
  {
    q: "Do I need the original deed?",
    a: "It helps, but it isn't required. If the deed is lost or never made it through probate, we can request a replacement or a duplicate certificate of ownership directly from the cemetery on your behalf.",
  },
  {
    q: "What if the plot is in a different state than I am?",
    a: "Almost every sale we handle is long-distance. You can sign electronically, and the cemetery transfer happens locally regardless of where you live. You do not need to travel.",
  },
  {
    q: "How long does a sale usually take?",
    a: "Most sales close in 60 to 120 days. The variable is the cemetery's own transfer office, not us — some process paperwork in two weeks, others take three months.",
  },
  {
    q: "What fees are involved?",
    a: "There are no upfront fees. We are paid a commission only when your plot sells. The cemetery typically charges a transfer fee (usually $100–$400), which is paid out of the sale proceeds at closing.",
  },
  {
    q: "Do I owe taxes on the sale?",
    a: "In most cases, the sale of an inherited or long-held cemetery plot is not a taxable event for the seller. We are not a tax advisor — for anything beyond a routine sale, please confirm with your CPA.",
  },
  {
    q: "What if there are multiple heirs on the deed?",
    a: "All listed owners or heirs typically need to sign the transfer documents. We can coordinate signatures across multiple family members, even in different states, and we'll guide you through what the cemetery requires.",
  },
  {
    q: "Can I sell just one plot out of a family estate?",
    a: "Yes. Family estates of two, four, six or more spaces can be sold whole or split, depending on the cemetery's rules. We'll review your specific section and let you know which is likely to net you more.",
  },
];

const SellProperty = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Sell a Cemetery Plot in Texas | Texas Cemetery Brokers"
        description="A licensed Texas cemetery property resale firm. We handle the paperwork, the cemetery, and the buyer. No upfront fees. Free valuation within 48 hours."
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

      {/* 1. Hero — editorial, left-aligned, photo on the right */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="md:col-span-7"
            >
              <p className="text-primary font-medium text-xs tracking-[0.3em] uppercase mb-6">
                For Texas families
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.05] tracking-tight">
                Selling a cemetery plot{" "}
                <span className="italic font-light text-foreground/80">
                  you no longer need.
                </span>
              </h1>
              <p className="mt-8 max-w-xl text-lg md:text-xl font-light text-muted-foreground leading-relaxed">
                We handle the paperwork, the cemetery, and the buyer. You sign at the end and receive your funds.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <a
                  href="#quote-form"
                  className="inline-flex items-center px-7 py-4 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all"
                >
                  Get a Free Valuation
                </a>
                <a
                  href={PHONE_HREF}
                  className="text-foreground/70 hover:text-foreground text-sm underline underline-offset-4 decoration-foreground/30"
                >
                  Or call us: {PHONE_DISPLAY}
                </a>
              </div>

              <p className="mt-6 text-sm text-muted-foreground/80 max-w-md">
                No obligation. No upfront fees. Most valuations returned within 48 hours.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="md:col-span-5"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm shadow-hover">
                <img
                  src={sellHeroBg}
                  alt="A quiet Texas cemetery in the soft light of late afternoon."
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Trust strip */}
      <section className="border-y border-foreground/10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-foreground/70">
            <span>Licensed in Texas</span>
            <span className="hidden sm:inline text-foreground/20">|</span>
            <span>10,000+ families helped through our network since 1996</span>
            <span className="hidden sm:inline text-foreground/20">|</span>
            <span>BBB Accredited</span>
            <span className="hidden sm:inline text-foreground/20">|</span>
            <span>No fee until your plot sells</span>
          </div>
        </div>
      </section>

      {/* 3. How it works — vertical, not card grid */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <p className="text-primary font-medium text-xs tracking-[0.3em] uppercase mb-4">
              How it works
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-tight">
              Four steps. We do most of them for you.
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 py-8 border-b border-foreground/10 last:border-0"
              >
                <span className="font-display text-3xl md:text-4xl text-primary/60 tabular-nums">
                  {s.num}
                </span>
                <div>
                  <h3 className="font-display text-xl md:text-2xl text-foreground mb-2">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. What your plot is likely worth — broken grid */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-7 md:col-start-1">
              <p className="text-primary font-medium text-xs tracking-[0.3em] uppercase mb-4">
                What it's worth
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-6">
                Texas plot values vary more than people expect.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Value depends on the specific cemetery, the section, the type of property — single, companion, or family estate — and what the cemetery itself currently charges for an equivalent space. A plot at a busy Houston memorial park behaves nothing like one in a small-town section in West Texas. We compare yours against actual recent sales, not a national average, and we tell you the truth even when it isn't what you hoped to hear.
              </p>
            </div>

            <div className="md:col-span-4 md:col-start-9">
              <div className="border border-foreground/10 bg-background p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/50 mb-5">
                  Illustrative ranges
                </p>
                <ul className="space-y-5">
                  {ranges.map((r) => (
                    <li key={r.label} className="border-b border-foreground/10 pb-4 last:border-0 last:pb-0">
                      <p className="text-sm text-muted-foreground">{r.label}</p>
                      <p className="font-display text-lg text-foreground mt-1">{r.value}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground/70 mt-6 leading-relaxed">
                  Ranges are illustrative of recent Texas comparables. Your property's value depends on the specific cemetery and section.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Why families choose us — paragraph, not a feature grid */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <p className="text-primary font-medium text-xs tracking-[0.3em] uppercase mb-4">
              Why families choose us
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-8">
              We're a small Texas firm doing one thing carefully.
            </h2>
            <p className="text-lg text-foreground/80 font-light leading-[1.7]">
              Most of our clients are sorting out an estate or selling a plot a parent purchased decades ago. They've never done this before, and they don't want a sales pitch — they want it handled. <span className="font-medium text-foreground">We work only in Texas.</span> <span className="font-medium text-foreground">We never charge upfront.</span> <span className="font-medium text-foreground">We handle the cemetery directly so you don't have to.</span> When the sale closes, we send your funds and you're done.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Testimonial */}
      <section className="py-24 border-y border-foreground/10 bg-card/40">
        <div className="container mx-auto px-6">
          <figure className="max-w-4xl mx-auto text-center">
            <blockquote className="font-display text-2xl md:text-4xl text-foreground leading-[1.3] italic font-light">
              &ldquo;After my mother passed, I had no idea what to do with the plots my parents bought in 1987. They handled everything. I never had to call the cemetery once.&rdquo;
            </blockquote>
            <figcaption className="mt-8 text-sm text-muted-foreground tracking-wide">
              Linda M. &middot; San Antonio, TX
            </figcaption>
          </figure>
        </div>
      </section>

      {/* The form — keep existing component */}
      <SellerQuoteForm />

      {/* 7. FAQ */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-primary font-medium text-xs tracking-[0.3em] uppercase mb-4">
              Common questions
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-tight mb-12">
              The things sellers actually ask.
            </h2>

            <Accordion type="single" collapsible className="border-t border-foreground/10">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-b border-foreground/10"
                >
                  <AccordionTrigger className="font-display text-base md:text-lg text-foreground hover:no-underline py-6 text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6 text-base max-w-2xl">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* 8. Final CTA — quiet */}
      <section className="py-24 border-t border-foreground/10">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-8">
              Ready to know what your plot is worth?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a
                href="#quote-form"
                className="inline-flex items-center px-7 py-4 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all"
              >
                Get a Free Valuation
              </a>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center gap-2 text-foreground/80 hover:text-foreground text-sm"
              >
                <Phone className="w-4 h-4" /> {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SellProperty;
