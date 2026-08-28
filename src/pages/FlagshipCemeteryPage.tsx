import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  MapPin,
  ShieldCheck,
  Receipt,
  FileCheck,
  Clock3,
  Sparkles,
  ChevronDown,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import PlotValueCalculator from "@/components/cemetery/PlotValueCalculator";
import SectionExplorer from "@/components/cemetery/SectionExplorer";
import CemeteryLocationMap from "@/components/cemetery/CemeteryLocationMap";
import { useActiveListings } from "@/hooks/useActiveListings";
import { flagshipBySlug, money, range, type FlagshipCemetery } from "@/data/flagshipCemeteries";
import { bayCemeteries } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import imgMountains from "@/assets/hero/cemetery-mountains.jpg";

const SITE = "https://texascemeterybrokers.com";

const NAV = [
  { href: "#prices", label: "Prices" },
  { href: "#estimator", label: "Estimator" },
  { href: "#sections", label: "Sections" },
  { href: "#map", label: "Map" },
  { href: "#transfer", label: "Transfer & fees" },
  { href: "#faq", label: "FAQ" },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-6 text-left py-5 group"
      >
        <h3 className="font-display text-lg md:text-xl text-foreground group-hover:text-primary transition-colors">
          {q}
        </h3>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <p className="text-muted-foreground leading-relaxed pb-6 max-w-3xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FlagshipCemeteryPage = ({ cemetery }: { cemetery: FlagshipCemetery }) => {
  const { countFor } = useActiveListings();
  const liveCount = countFor(cemetery.name);
  const path = `/cemeteries/${cemetery.slug}`;

  const nearby = cemetery.nearby
    .map((s) => flagshipBySlug(s) ?? bayCemeteries.find((c) => slugify(c.name) === s))
    .filter(Boolean) as Array<{ name: string; city: string }>;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Cemetery",
      name: cemetery.name,
      alternateName: cemetery.alsoKnownAs,
      url: `${SITE}${path}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: cemetery.address.split(",")[0],
        addressLocality: cemetery.city,
        addressRegion: "TX",
        addressCountry: "US",
      },
      geo: { "@type": "GeoCoordinates", latitude: cemetery.lat, longitude: cemetery.lng },
      areaServed: cemetery.region,
      sameAs: [cemetery.website],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: `Cemetery plot brokerage at ${cemetery.name}`,
      areaServed: `${cemetery.city}, TX`,
      provider: { "@type": "Organization", name: "Texas Cemetery Brokers", telephone: "+1-214-230-4740" },
      offers: cemetery.pricing.map((p) => ({
        "@type": "AggregateOffer",
        name: `${p.type} at ${cemetery.name}`,
        priceCurrency: "USD",
        lowPrice: p.resale[0],
        highPrice: p.resale[1],
        availability: "https://schema.org/LimitedAvailability",
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Cemeteries", item: `${SITE}/cemeteries` },
        {
          "@type": "ListItem",
          position: 3,
          name: "Dallas–Fort Worth",
          item: `${SITE}/cemetery-plots-for-sale-dallas`,
        },
        { "@type": "ListItem", position: 4, name: cemetery.name, item: `${SITE}${path}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: cemetery.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title={cemetery.seo.title}
        description={cemetery.seo.description}
        path={path}
        jsonLd={jsonLd}
      />
      <Navbar forceScrolled />

      {/* ============ HERO ============ */}
      <section className="relative pt-28 md:pt-32 pb-12 md:pb-16 overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img src={imgMountains} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.16]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/65 to-background" />
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-sage-light/60 blur-3xl" />
          <div className="absolute top-16 right-0 w-[380px] h-[380px] rounded-full bg-terracotta-light/25 blur-3xl" />
        </div>

        <div className="container mx-auto px-6 relative">
          <Link
            to="/cemetery-plots-for-sale-dallas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-7"
          >
            <ArrowLeft className="w-4 h-4" /> Dallas–Fort Worth cemeteries
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">
              {cemetery.city}, Texas · {cemetery.tagline}
            </p>
            <h1 className="font-display text-[40px] leading-[1.03] md:text-6xl lg:text-[76px] text-foreground tracking-tight mb-5 max-w-4xl">
              {cemetery.seo.h1}
              <span className="block text-muted-foreground italic font-normal text-2xl md:text-4xl lg:text-[44px] mt-3">
                plots for sale, prices &amp; transfers.
              </span>
            </h1>

            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mb-7 flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1.5 text-primary shrink-0" />
              {cemetery.address}
            </p>

            {/* Quick facts rail */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-3xl overflow-hidden border border-border mb-8 max-w-4xl">
              {cemetery.facts.map((f) => (
                <div key={f.label} className="bg-card/90 backdrop-blur p-4 md:p-5">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{f.label}</p>
                  <p className="font-display text-base md:text-lg text-foreground leading-snug">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <Link
                to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="group flex-1 inline-flex items-center justify-between gap-3 px-6 py-4 bg-primary text-primary-foreground font-medium rounded-2xl hover:bg-primary/90 transition-all"
              >
                <span className="flex flex-col items-start">
                  <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">I want to</span>
                  <span className="text-base">Buy a space here</span>
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="group flex-1 inline-flex items-center justify-between gap-3 px-6 py-4 bg-foreground text-background font-medium rounded-2xl hover:bg-foreground/90 transition-all"
              >
                <span className="flex flex-col items-start">
                  <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">I want to</span>
                  <span className="text-base">Sell my space here</span>
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {liveCount > 0 && (
              <p className="mt-5 inline-flex items-center gap-2 text-sm text-primary font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                {liveCount} {liveCount === 1 ? "space" : "listings"} currently available at {cemetery.name}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Anchor nav */}
      <nav className="sticky top-[68px] z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {NAV.map((l) => (
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

      {/* ============ INTRO ============ */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6 grid lg:grid-cols-[1.45fr_1fr] gap-10 lg:gap-14 items-start">
          <div>
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">The market here</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.06] mb-6">
              Buying and selling at {cemetery.name}, <em className="italic font-normal text-muted-foreground">{cemetery.city}.</em>
            </h2>
            {cemetery.intro.map((p) => (
              <p key={p.slice(0, 24)} className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
                {p}
              </p>
            ))}
          </div>

          <div className="rounded-[28px] border border-border bg-gradient-to-br from-sage-light/70 to-card p-6 md:p-7">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">Local notes</p>
            <ul className="space-y-4">
              {cemetery.localNotes.map((n) => (
                <li key={n.slice(0, 24)} className="flex items-start gap-3">
                  <BadgeCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ PRICES ============ */}
      <section id="prices" className="py-12 md:py-16 bg-sand-light/40 border-y border-border/60 scroll-mt-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-8">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">
              {cemetery.name} prices
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.06] mb-4">
              What spaces actually cost here.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Cemetery counter pricing against what resale property at {cemetery.name} typically trades for. Ranges are
              estimates from our own transaction history — we quote a precise figure once we know the garden and space.
            </p>
          </div>

          {/* Mobile: stacked cards (a horizontal table is unreadable on a phone) */}
          <div className="md:hidden space-y-3">
            {cemetery.pricing.map((p) => {
              const pct = Math.round((1 - (p.resale[0] + p.resale[1]) / (p.retail[0] + p.retail[1])) * 100);
              return (
                <div key={p.type} className="rounded-3xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-display text-lg text-foreground leading-tight">{p.type}</h3>
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      ~{pct}% less
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">Cemetery retail</p>
                      <p className="text-sm text-muted-foreground line-through decoration-terracotta/50">{range(p.retail)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] tracking-[0.18em] uppercase text-primary mb-1">Typical resale</p>
                      <p className="font-display text-lg text-foreground">{range(p.resale)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-3xl border border-border bg-card">

            <table className="w-full text-left border-collapse min-w-[560px]">
              <caption className="sr-only">
                Estimated cemetery retail and resale prices by property type at {cemetery.name}
              </caption>
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="px-5 md:px-6 py-4 text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium">
                    Property type
                  </th>
                  <th scope="col" className="px-5 md:px-6 py-4 text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium">
                    Cemetery retail
                  </th>
                  <th scope="col" className="px-5 md:px-6 py-4 text-[11px] tracking-[0.18em] uppercase text-primary font-medium">
                    Typical resale
                  </th>
                  <th scope="col" className="px-5 md:px-6 py-4 text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium">
                    You save
                  </th>
                </tr>
              </thead>
              <tbody>
                {cemetery.pricing.map((p) => {
                  const pct = Math.round((1 - (p.resale[0] + p.resale[1]) / (p.retail[0] + p.retail[1])) * 100);
                  return (
                    <tr key={p.type} className="border-t border-border/70">
                      <th scope="row" className="px-5 md:px-6 py-4 font-display text-base md:text-lg text-foreground font-normal">
                        {p.type}
                      </th>
                      <td className="px-5 md:px-6 py-4 text-sm text-muted-foreground line-through decoration-terracotta/50">
                        {range(p.retail)}
                      </td>
                      <td className="px-5 md:px-6 py-4 text-sm font-medium text-foreground">{range(p.resale)}</td>
                      <td className="px-5 md:px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          ~{pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Prices exclude the cemetery's {money(cemetery.transferFee)} per-space transfer fee, opening/closing charges
            and any memorial or marker costs.
          </p>
        </div>
      </section>

      {/* ============ ESTIMATOR ============ */}
      <section id="estimator" className="py-12 md:py-16 scroll-mt-32">
        <div className="container mx-auto px-6 max-w-5xl">
          <PlotValueCalculator cemetery={cemetery} />
        </div>
      </section>

      {/* ============ SECTIONS ============ */}
      <section id="sections" className="py-12 md:py-16 bg-card/40 border-y border-border/60 scroll-mt-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-8">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Gardens &amp; sections</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.06] mb-4">
              The gardens at {cemetery.name}.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These are the gardens, courts and sections at {cemetery.name} that come up most often on the deeds and
              requests we handle. Open one to see what it means for price and availability.
            </p>
          </div>
          <SectionExplorer cemetery={cemetery} />

          {isRestland && (
            <div className="mt-10 md:mt-14">
              <RestlandGardenMap />
            </div>
          )}
        </div>
      </section>


      {/* ============ MAP ============ */}
      <section id="map" className="py-12 md:py-16 scroll-mt-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-7">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Find it</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.06]">
              {cemetery.name} on the map.
            </h2>
          </div>
          <CemeteryLocationMap
            name={cemetery.name}
            address={cemetery.address}
            lat={cemetery.lat}
            lng={cemetery.lng}
            note="Switch to satellite to see the gardens, drives and entrance before you visit. Ask us for the exact section location and we'll mark it for you."
          />
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href={cemetery.website}
              target="_blank"
              rel="noopener nofollow noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              Official {cemetery.name} site <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ============ TRANSFER & FEES ============ */}
      <section id="transfer" className="py-14 md:py-20 bg-foreground text-background scroll-mt-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">Transfer &amp; paperwork</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05] mb-5">
              The part everyone worries about,
              <br />
              <em className="italic font-normal opacity-70">handled for you.</em>
            </h2>
            <p className="text-background/70 text-lg leading-relaxed">
              {cemetery.name} records a transfer fee of {money(cemetery.transferFee)} per space. We confirm the live
              figure with the cemetery in writing, tell you who is paying it, and file the paperwork ourselves.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-background/10 rounded-3xl overflow-hidden border border-background/10">
            {[
              { icon: Receipt, n: "01", t: "Deed check", b: "We read your deed, confirm the section and lot and verify who is legally able to sell." },
              { icon: ShieldCheck, n: "02", t: "Buyer screening", b: "Funds verified before anything is signed. No cash-in-the-parking-lot arrangements." },
              { icon: FileCheck, n: "03", t: "Cemetery transfer", b: `We prepare and file ${cemetery.name}'s own transfer forms and pay the recording fee on completion.` },
              { icon: Clock3, n: "04", t: "Typical timeline", b: "Most DFW transfers complete in two to six weeks once both sides have signed." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-foreground p-6 md:p-7"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-display text-3xl text-primary">{s.n}</span>
                  <s.icon className="w-5 h-5 text-background/60" />
                </div>
                <h3 className="font-display text-lg mb-2">{s.t}</h3>
                <p className="text-sm text-background/70 leading-relaxed">{s.b}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Free valuation <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+12142304740"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/10 border border-background/20 font-medium rounded-full text-sm hover:bg-background/20 transition-colors"
            >
              <Phone className="w-4 h-4" /> (214) 230-4740
            </a>
          </div>
        </div>
      </section>

      {/* ============ VALUATION FORM ============ */}
      <section id="valuation" className="py-12 md:py-16 scroll-mt-32">
        <div className="container mx-auto px-6">
          <SellerQuoteForm compact defaultCemetery={cemetery.name} />
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-12 md:py-16 bg-sand-light/40 border-y border-border/60 scroll-mt-32">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="mb-8">
            <Sparkles className="w-5 h-5 text-primary mb-3" />
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Questions we get</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.06]">
              {cemetery.name}, answered.
            </h2>
          </div>
          <div>
            {cemetery.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ NEARBY ============ */}
      <section className="py-14">
        <div className="container mx-auto px-6">
          <div className="flex items-end justify-between mb-7 gap-4">
            <h2 className="font-display text-2xl md:text-3xl text-foreground">Also considered in Dallas–Fort Worth</h2>
            <Link
              to="/cemetery-plots-for-sale-dallas"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              All DFW cemeteries <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {nearby.map((c) => (
              <Link
                key={c.name}
                to={`/cemeteries/${slugify(c.name)}`}
                className="group block bg-card rounded-3xl p-6 border border-border hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-sage-light text-primary text-[11px] font-medium mb-3">
                  {c.city}
                </span>
                <h3 className="font-display text-lg text-foreground mb-3 group-hover:text-primary transition-colors">
                  {c.name}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-2.5 transition-all">
                  View profile <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3 flex gap-2">
        <Link
          to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-medium"
        >
          Free valuation
        </Link>
        <Link
          to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-full bg-foreground text-background text-sm font-medium"
        >
          Find a space
        </Link>
        <a
          href="tel:+12142304740"
          aria-label="Call Texas Cemetery Brokers"
          className="w-12 shrink-0 inline-flex items-center justify-center rounded-full border border-border text-foreground"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>

      <Footer />
    </div>
  );
};

export default FlagshipCemeteryPage;
