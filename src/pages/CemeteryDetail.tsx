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
  TrendingDown,
  Banknote,
  FileCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import { bayCemeteries } from "@/data/cemeteries";
import { findCemeteryBySlug, slugify } from "@/lib/cemeterySlug";
import heroBg from "@/assets/hero/cemetery-mural.jpg";
import imgMountains from "@/assets/hero/cemetery-mountains.jpg";
import imgPalms from "@/assets/hero/cemetery-palms.jpg";

// Animated SVG: rolling hills with a slow drifting sun (on-theme, calm).
const HillsScene = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 600 220" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--sand-light))" />
        <stop offset="100%" stopColor="hsl(var(--background))" />
      </linearGradient>
      <linearGradient id="hill1" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--sage))" stopOpacity="0.45" />
        <stop offset="100%" stopColor="hsl(var(--sage))" stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="hill2" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    <rect width="600" height="220" fill="url(#sky)" />
    <motion.circle
      cx="120" cy="70" r="28"
      fill="hsl(var(--terracotta))" fillOpacity="0.35"
      animate={{ cy: [70, 60, 70] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <path d="M0 160 Q150 100 300 150 T600 130 V220 H0 Z" fill="url(#hill1)" />
    <path d="M0 190 Q120 140 260 175 T520 165 T600 175 V220 H0 Z" fill="url(#hill2)" />
    {/* Tiny trees */}
    {[80, 180, 320, 430, 520].map((x, i) => (
      <g key={x} transform={`translate(${x} ${175 - (i % 2) * 6})`}>
        <line x1="0" y1="0" x2="0" y2="-14" stroke="hsl(var(--foreground))" strokeOpacity="0.5" />
        <circle cx="0" cy="-18" r="6" fill="hsl(var(--primary))" fillOpacity="0.55" />
      </g>
    ))}
  </svg>
);

// Animated falling leaves accent
const LeafAccent = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden="true" fill="none">
    {[0, 1, 2].map((i) => (
      <motion.path
        key={i}
        d="M40 20 C 60 40, 60 80, 40 100 C 20 80, 20 40, 40 20 Z"
        fill="hsl(var(--primary))"
        fillOpacity={0.18 + i * 0.08}
        initial={{ y: -20 + i * 10, x: i * 50, rotate: i * 30 }}
        animate={{ y: [-20 + i * 10, 30 + i * 10, -20 + i * 10], rotate: [i * 30, i * 30 + 25, i * 30] }}
        transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}
  </svg>
);

const buyingSteps = [
  {
    icon: Search,
    label: "01",
    title: "Tell us what you need",
    body: "Share the cemetery, plot type and how many spaces. We search active inventory and our private network.",
  },
  {
    icon: ClipboardList,
    label: "02",
    title: "Receive matched options",
    body: "Verified plots with clear pricing — typically thousands less than the cemetery's retail price.",
  },
  {
    icon: ShieldCheck,
    label: "03",
    title: "Close with full title transfer",
    body: "We coordinate paperwork, payment and the official cemetery transfer end-to-end.",
  },
];

const sellingSteps = [
  {
    icon: HandCoins,
    label: "01",
    title: "Get a free valuation",
    body: "Send us your deed details. Realistic, market-based estimate within one business day.",
  },
  {
    icon: ClipboardList,
    label: "02",
    title: "List with no upfront cost",
    body: "We handle photos, listing copy, marketing and buyer screening. You only pay when it sells.",
  },
  {
    icon: CheckCircle2,
    label: "03",
    title: "We close the sale",
    body: "Buyer screening, escrow-style payment and the cemetery's transfer paperwork — all handled.",
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
      geo: { "@type": "GeoCoordinates", latitude: cemetery.lat, longitude: cemetery.lng },
      areaServed: cemetery.region,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
        { "@type": "ListItem", position: 2, name: "Cemeteries", item: "https://texascemeterybrokers.com/cemeteries" },
        {
          "@type": "ListItem", position: 3, name: cemetery.name,
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
            text: `Yes. Resale plots at ${cemetery.name} typically sell for 30–60% less than the cemetery's current retail price.`,
          },
        },
        {
          "@type": "Question",
          name: `How do I sell a cemetery plot I own at ${cemetery.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Send us your deed information for a free, no-obligation valuation. If you list with us, we handle marketing, buyer screening, payment and the official ${cemetery.name} title transfer.`,
          },
        },
        {
          "@type": "Question",
          name: `Does Texas Cemetery Brokers handle the transfer paperwork at ${cemetery.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes — we coordinate the full title transfer with the cemetery on behalf of both parties.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo title={title} description={description} path={`/cemeteries/${slugify(cemetery.name)}`} jsonLd={jsonLd} />
      <Navbar forceScrolled />

      {/* Hero — editorial split with ambient nature backdrop (hills + drifting leaves) */}
      <section className="relative pt-28 md:pt-32 pb-12 md:pb-14 overflow-hidden border-b border-border/60">
        {/* Ambient backdrop — sits behind everything, doesn't change layout */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-sage-light/50 via-sand-light/30 to-transparent" />
          <div className="absolute -top-16 -left-20 w-[420px] h-[420px] rounded-full bg-sage-light/60 blur-3xl" />
          <div className="absolute top-20 right-0 w-[360px] h-[360px] rounded-full bg-terracotta-light/30 blur-3xl" />
          <HillsScene className="absolute bottom-0 inset-x-0 w-full h-40 opacity-40" />
          <LeafAccent className="absolute top-24 right-[8%] w-40 h-40 opacity-50 hidden md:block" />
          <LeafAccent className="absolute bottom-10 left-[6%] w-32 h-32 opacity-40 hidden md:block" />
        </div>

        <div className="container mx-auto px-6 relative">
          <Link
            to="/cemeteries"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> All Texas cemeteries
          </Link>

          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">
                {cemetery.region} · Cemetery profile
              </p>
              <h1 className="font-display text-4xl md:text-6xl lg:text-[64px] text-foreground leading-[1.02] mb-5 tracking-tight">
                {cemetery.name}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl flex items-start gap-2 mb-7">
                <MapPin className="w-4 h-4 mt-1.5 text-primary shrink-0" />
                {cemetery.address}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <Link
                  to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
                  className="group flex-1 inline-flex items-center justify-between gap-3 px-6 py-4 bg-primary text-primary-foreground font-medium rounded-2xl hover:bg-primary/90 transition-all"
                >
                  <span className="flex flex-col items-start">
                    <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">I want to</span>
                    <span className="text-base">Buy a plot here</span>
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
                  className="group flex-1 inline-flex items-center justify-between gap-3 px-6 py-4 bg-foreground text-background font-medium rounded-2xl hover:bg-foreground/90 transition-all"
                >
                  <span className="flex flex-col items-start">
                    <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">I want to</span>
                    <span className="text-base">Sell my plot here</span>
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>

            {/* Editorial image collage */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative h-[360px] md:h-[440px] hidden md:block"
            >
              <div className="absolute top-0 right-0 w-[78%] h-[72%] rounded-3xl overflow-hidden shadow-xl">
                <img src={heroBg} alt={`${cemetery.name} memorial grounds`} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 left-0 w-[55%] h-[48%] rounded-3xl overflow-hidden shadow-xl border-4 border-background">
                <img src={imgPalms} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 right-4 bg-card border border-border rounded-2xl px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Avg. resale savings</p>
                <p className="font-display text-2xl text-foreground">30–60%<span className="text-primary"> off</span></p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Anchor jump bar */}
      <nav className="sticky top-[68px] z-30 bg-background/85 backdrop-blur-xl border-y border-border/50">
        <div className="container mx-auto px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { href: "#about", label: "About" },
            { href: "#buying", label: "Buying" },
            { href: "#selling", label: "Selling" },
            { href: "#valuation", label: "Free valuation" },
            { href: "#why", label: "Why us" },
            { href: "#contact", label: "Contact" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
      </nav>

      {/* About — editorial intro with side stat */}
      <section id="about" className="py-12 md:py-16 scroll-mt-32">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">
                About this cemetery
              </p>
              <h2 className="font-display text-3xl md:text-5xl text-foreground mb-6 leading-tight">
                Cemetery plots at {cemetery.name}, <em className="italic font-normal text-muted-foreground">{cemetery.city}.</em>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                {cemetery.name} is one of the cemeteries we actively serve in {cemetery.region}.
                Whether you're looking to <strong className="text-foreground">purchase a plot for less than retail</strong> or
                <strong className="text-foreground"> sell a plot you no longer need</strong>, our licensed Texas brokerage handles
                the full process — from valuation and matching to payment and the official cemetery title transfer.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Resale plots at established cemeteries like {cemetery.name} typically trade well below the cemetery's current retail
                prices, while still giving owners a fair market return. We're the bridge between the two.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-sage-light to-card"
            >
              <HillsScene className="w-full h-44" />
              <div className="p-6">
                <p className="text-[11px] tracking-[0.2em] uppercase text-primary font-medium mb-3">By the numbers</p>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                    <span className="text-sm text-muted-foreground">Region</span>
                    <span className="font-display text-lg text-foreground">{cemetery.region}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                    <span className="text-sm text-muted-foreground">Avg. resale savings</span>
                    <span className="font-display text-lg text-foreground">30–60%</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Years of experience</span>
                    <span className="font-display text-lg text-foreground">29+</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BUYING — bold, dark editorial band */}
      <section id="buying" className="relative py-14 md:py-20 bg-foreground text-background overflow-hidden scroll-mt-32">
        <LeafAccent className="absolute -top-10 -right-10 w-72 h-72 opacity-60" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mb-14">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">
              For buyers · {cemetery.name}
            </p>
            <h2 className="font-display text-4xl md:text-6xl mb-5 leading-[1.05]">
              Save thousands<br />
              <em className="italic font-normal opacity-70">on the plot you want.</em>
            </h2>
            <p className="text-background/70 text-lg leading-relaxed max-w-xl">
              Most families don't realize they can buy directly from current plot owners — at far lower prices than the cemetery
              charges. We match buyers with verified resale inventory and handle every step.
            </p>
          </div>

          {/* Step rail */}
          <div className="grid md:grid-cols-3 gap-px bg-background/10 rounded-3xl overflow-hidden border border-background/10">
            {buyingSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-foreground p-7 md:p-8 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-display text-3xl text-primary">{step.label}</span>
                  <step.icon className="w-5 h-5 text-background/60" />
                </div>
                <h3 className="font-display text-xl mb-2">{step.title}</h3>
                <p className="text-sm text-background/70 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Request matching plots <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+14242341678"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/10 border border-background/20 text-background font-medium rounded-full text-sm hover:bg-background/20 transition-colors"
            >
              <Phone className="w-4 h-4" /> Talk to a broker
            </a>
          </div>
        </div>
      </section>

      {/* SELLING — light editorial with image inset */}
      <section id="selling" className="py-14 md:py-20 scroll-mt-32 bg-sand-light/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center mb-14">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative h-[360px] rounded-3xl overflow-hidden shadow-xl"
            >
              <img src={imgMountains} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-background">
                <p className="text-[10px] tracking-[0.2em] uppercase opacity-80 mb-1">No upfront cost</p>
                <p className="font-display text-2xl">You only pay when your plot sells.</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">
                For sellers · {cemetery.name}
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-foreground mb-5 leading-[1.05]">
                Sell with confidence,<br />
                <em className="italic font-normal text-muted-foreground">no upfront fees.</em>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                We list and market your plot to qualified buyers, screen interest, handle payment and complete the cemetery's
                official transfer paperwork.
              </p>
              <Link
                to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
              >
                Get a free valuation <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Seller steps — alternating zig-zag */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {sellingSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={`flex items-start gap-5 bg-card rounded-3xl border border-border p-6 md:p-7 ${
                  i % 2 === 1 ? "md:ml-16" : "md:mr-16"
                }`}
              >
                <span className="font-display text-4xl text-primary leading-none w-14 shrink-0">{step.label}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="w-4 h-4 text-primary" />
                    <h3 className="font-display text-lg text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Embedded valuation form — sellers convert here without leaving */}
      <section id="valuation" className="py-14 md:py-20 scroll-mt-32 bg-background border-y border-border/50">
        <div className="container mx-auto px-6">
          <SellerQuoteForm compact defaultCemetery={cemetery.name} />
        </div>
      </section>

      {/* Why us — feature ribbon */}
      <section id="why" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <Sparkles className="w-5 h-5 text-primary mx-auto mb-3" />
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Why families choose us</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-tight">
              The trusted way to handle <em className="italic font-normal text-muted-foreground">{cemetery.name}.</em>
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, title: "Licensed & insured", body: "Fully licensed Texas cemetery brokerage." },
              { icon: Banknote, title: "No upfront fees", body: "Sellers pay nothing until the plot is sold." },
              { icon: FileCheck, title: "Full title transfer", body: "We handle all cemetery paperwork end-to-end." },
            ].map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative p-7 rounded-3xl bg-card border border-border overflow-hidden group hover:border-primary/40 transition-colors"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <b.icon className="w-6 h-6 text-primary mb-4 relative" />
                <h3 className="font-display text-xl text-foreground mb-2 relative">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative">{b.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-16 bg-card/50 border-y border-border/60">
          <div className="container mx-auto px-6">
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-display text-2xl md:text-3xl text-foreground">
                Other cemeteries in {cemetery.region}
              </h2>
              <Link to="/cemeteries" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((c, i) => (
                <Link
                  key={c.name}
                  to={`/cemeteries/${slugify(c.name)}`}
                  className="group block bg-background rounded-2xl p-5 border border-border hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display text-2xl text-primary">{c.name.charAt(0)}</span>
                    <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-sage-light text-primary text-[11px] font-medium mb-2">
                    {c.city}
                  </span>
                  <h3 className="font-display text-base text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
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

      {/* Contact CTA */}
      <section id="contact" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-sage rounded-3xl p-10 md:p-14 overflow-hidden"
          >
            <LeafAccent className="absolute top-0 right-0 w-56 h-56 opacity-50" />
            <div className="relative max-w-2xl">
              <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Talk to us</p>
              <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4 leading-tight">
                Quick, no-pressure conversation about <em className="italic font-normal">{cemetery.name}.</em>
              </h2>
              <p className="text-muted-foreground mb-7 max-w-xl">
                We'll tell you exactly what we can do for you — buying or selling — at this specific cemetery.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="tel:+14242341678"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-foreground text-background font-medium rounded-full text-sm hover:bg-primary transition-colors"
                >
                  <Phone className="w-4 h-4" /> (424) 234-1678
                </a>
                <Link
                  to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-background border border-border text-foreground font-medium rounded-full text-sm hover:border-primary transition-colors"
                >
                  Free valuation <TrendingDown className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CemeteryDetail;
