import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  HandCoins,
  ClipboardList,
  Search,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries } from "@/data/cemeteries";
import { findCemeteryBySlug, slugify } from "@/lib/cemeterySlug";
import heroBg from "@/assets/hero/cemetery-mural.jpg";

const buyingSteps = [
  {
    icon: Search,
    title: "Tell us what you need",
    body: "Share the cemetery, plot type and how many spaces. We'll search active inventory and our private network of sellers.",
  },
  {
    icon: ClipboardList,
    title: "Receive matched options",
    body: "We send you verified plots with clear pricing — typically thousands less than the cemetery's retail price.",
  },
  {
    icon: ShieldCheck,
    title: "Close with full title transfer",
    body: "We coordinate paperwork, payment and the official cemetery transfer end-to-end. You only sign once.",
  },
];

const sellingSteps = [
  {
    icon: HandCoins,
    title: "Get a free valuation",
    body: "Send us your deed details. We'll give you a realistic, market-based estimate within one business day.",
  },
  {
    icon: ClipboardList,
    title: "List with no upfront cost",
    body: "We handle photos, listing copy, marketing and buyer screening. You only pay when your plot sells.",
  },
  {
    icon: CheckCircle2,
    title: "We close the sale",
    body: "We handle the buyer, escrow-style payment and the cemetery's transfer paperwork. You receive net proceeds.",
  },
];

const CemeteryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const cemetery = slug ? findCemeteryBySlug(slug) : undefined;

  if (!cemetery) return <Navigate to="/cemeteries" replace />;

  const related = bayCemeteries
    .filter((c) => c.region === cemetery.region && c.name !== cemetery.name)
    .slice(0, 4);

  const title = `Buy & Sell Cemetery Plots at ${cemetery.name} (${cemetery.city}, TX)`;
  const description = `Buying or selling a plot at ${cemetery.name} in ${cemetery.city}, Texas? Texas Cemetery Brokers handles valuation, listing, buyer matching and full title transfer.`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Cemetery",
      name: cemetery.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: cemetery.address,
        addressLocality: cemetery.city,
        addressRegion: "TX",
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: cemetery.lat,
        longitude: cemetery.lng,
      },
      areaServed: cemetery.region,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Cemeteries",
          item: "https://texascemeterybrokers.com/cemeteries",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: cemetery.name,
          item: `https://texascemeterybrokers.com/cemeteries/${slugify(cemetery.name)}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Can I buy a plot at ${cemetery.name} for less than the cemetery sells them?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes. Resale plots at ${cemetery.name} typically sell for 30–60% less than the cemetery's current retail price. We'll match you with verified plots from owners ready to sell.`,
          },
        },
        {
          "@type": "Question",
          name: `How do I sell a cemetery plot I own at ${cemetery.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Send us your deed information for a free, no-obligation valuation. If you list with us, we handle marketing, buyer screening, payment and the official ${cemetery.name} title transfer. You only pay when your plot sells.`,
          },
        },
        {
          "@type": "Question",
          name: `Does Texas Cemetery Brokers handle the transfer paperwork at ${cemetery.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes — we coordinate the full title transfer with the cemetery on behalf of both parties. You sign once and we manage the rest.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title={title}
        description={description}
        path={`/cemeteries/${slugify(cemetery.name)}`}
        jsonLd={jsonLd}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[60vh] overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/60 to-foreground/30" />
        <div className="relative container mx-auto px-6 pt-32 pb-16 flex flex-col justify-end min-h-[60vh]">
          <Link
            to="/cemeteries"
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 w-fit rounded-full bg-background/15 hover:bg-background/25 backdrop-blur-md border border-primary-foreground/30 text-primary-foreground text-sm font-medium shadow-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All Texas cemeteries
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-primary-foreground/80 text-xs tracking-[0.2em] uppercase font-medium mb-3 drop-shadow">
              {cemetery.region}
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-primary-foreground mb-4 drop-shadow-lg leading-tight">
              {cemetery.name}
            </h1>
            <p className="text-primary-foreground/90 text-base md:text-lg leading-relaxed drop-shadow-md flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {cemetery.address}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
              >
                Find a plot here <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/15 border border-primary-foreground/30 text-primary-foreground font-medium rounded-full text-sm backdrop-blur-sm hover:bg-primary-foreground/25 transition-colors"
              >
                Sell my plot here
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium mb-3">
              About this cemetery
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5">
              Cemetery plots at {cemetery.name}, {cemetery.city}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              {cemetery.name} is one of the cemeteries we actively serve in {cemetery.region}.
              Whether you're looking to <strong className="text-foreground">purchase a plot for less than retail</strong> or
              <strong className="text-foreground"> sell a plot you no longer need</strong>, our
              licensed Texas brokerage handles the full process — from valuation and matching to
              payment and the official cemetery title transfer.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Resale plots at established cemeteries like {cemetery.name} typically trade well below
              the cemetery's current retail prices, while still giving owners a fair market return.
              We're the bridge between the two.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Buying */}
      <section className="py-16 md:py-20 bg-sage-light/40">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium mb-3">
                Buying at {cemetery.name}
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5">
                Save thousands on a plot at {cemetery.name}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Many families don't realize they can buy directly from current plot owners at
                significantly lower prices than the cemetery charges. We match buyers with verified
                resale inventory and handle every step.
              </p>
              <Link
                to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
              >
                Request matching plots <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <div className="space-y-4">
              {buyingSteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex gap-4 bg-card p-5 rounded-2xl border border-border"
                >
                  <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Selling */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 items-start">
            <div className="space-y-4 order-2 lg:order-1">
              {sellingSteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex gap-4 bg-card p-5 rounded-2xl border border-border"
                >
                  <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="order-1 lg:order-2"
            >
              <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium mb-3">
                Selling at {cemetery.name}
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5">
                Sell your {cemetery.name} plot — no upfront cost
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We list and market your plot to qualified buyers, screen interest, handle payment
                and complete the cemetery's official transfer paperwork. You don't pay anything
                until your plot actually sells.
              </p>
              <Link
                to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
              >
                Get a free valuation <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 md:py-20 bg-card border-y border-border">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-10">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
              Why families choose us for {cemetery.name}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A licensed Texas brokerage backed by 29+ years of cemetery resale experience through
              our partner Bayer Cemetery Brokers.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { title: "Licensed & insured", body: "Fully licensed Texas cemetery brokerage." },
              { title: "No upfront fees", body: "Sellers pay nothing until the plot is sold." },
              { title: "Full title transfer", body: "We handle all cemetery paperwork end-to-end." },
            ].map((b) => (
              <div key={b.title} className="p-5 rounded-2xl bg-background border border-border">
                <CheckCircle2 className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-display text-lg text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-2xl md:text-3xl text-foreground mb-6">
              Other cemeteries in {cemetery.region}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((c) => (
                <Link
                  key={c.name}
                  to={`/cemeteries/${slugify(c.name)}`}
                  className="group block bg-card rounded-2xl p-5 border border-border hover:border-primary/40 hover:shadow-hover transition-all"
                >
                  <span className="inline-block px-2.5 py-1 rounded-full bg-sage-light text-primary text-[11px] font-medium mb-3">
                    {c.city}
                  </span>
                  <h3 className="font-display text-base text-foreground mb-2 group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-2.5 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="pb-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-sage rounded-2xl p-8 md:p-10 text-center"
          >
            <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">
              Talk to a Texas cemetery broker
            </h2>
            <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
              Quick, no-pressure conversation. We'll tell you exactly what we can do for you at{" "}
              {cemetery.name}.
            </p>
            <a
              href="tel:+14242341678"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              <Phone className="w-4 h-4" /> (424) 234-1678
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CemeteryDetail;
