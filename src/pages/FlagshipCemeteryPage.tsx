import { useEffect, useState } from "react";
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
import CemeteryLocationMap from "@/components/cemetery/CemeteryLocationMap";
import RestlandGardenMap from "@/components/cemetery/RestlandGardenMap";
import CemeteryPlanMap from "@/components/cemetery/CemeteryPlanMap";
import { planMapFor } from "@/components/cemetery/cemeteryPlanMaps";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import GardenSignMarker from "@/components/cemetery/GardenSignMarker";

import { useActiveListings } from "@/hooks/useActiveListings";
import { flagshipBySlug, money, range, type FlagshipCemetery } from "@/data/flagshipCemeteries";
import { bayCemeteries } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import imgMountains from "@/assets/hero/cemetery-mountains.jpg";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import plumeriaCluster from "@/assets/flowers/plumeria-cluster.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";
import { RESTLAND_MAPS as RESTLAND_MAP_DOWNLOADS } from "@/components/cemetery/restlandMaps";
import { photoEssayFor } from "@/data/cemeteryPhotos";
import CemeteryPhotoEssay from "@/components/cemetery/CemeteryPhotoEssay";

const SITE = "https://texascemeterybrokers.com";


const NAV = [
  { href: "#prices", label: "Prices" },
  { href: "#sections", label: "Sections" },
  { href: "#map", label: "Map" },
  { href: "#nearby-map", label: "Dallas map" },
  { href: "#transfer", label: "Transfer & fees" },
  { href: "#valuation", label: "Free valuation" },
  { href: "#faq", label: "FAQ" },
];

const FaqItem = ({ q, a, index, defaultOpen = false }: { q: string; a: string; index: number; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-[22px] border transition-colors ${
        open ? "border-primary/40 bg-background shadow-soft" : "border-border/70 bg-background/60 hover:border-primary/30"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-4 md:gap-5 text-left p-5 md:p-6 group"
      >
        <span
          className={`shrink-0 mt-0.5 w-8 h-8 rounded-full grid place-items-center text-[11px] font-medium tracking-wider transition-colors ${
            open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="flex-1 font-display text-lg md:text-[22px] leading-snug text-foreground group-hover:text-primary transition-colors">
          {q}
        </h3>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 mt-1.5 transition-transform ${open ? "rotate-180 text-primary" : ""}`}
        />
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
            <div className="px-5 md:px-6 pb-6 md:pl-[4.6rem]">
              <span className="block w-10 h-px bg-primary/40 mb-4" />
              <p className="text-muted-foreground leading-relaxed max-w-3xl">{a}</p>
            </div>
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
  const isRestland = cemetery.slug.startsWith("restland");
  const planMap = planMapFor(cemetery.slug);
  const hasSectionMap = isRestland || Boolean(planMap);
  const photoEssay = photoEssayFor(cemetery.slug);
  const [active, setActive] = useState<string>("");
  const baseNav = hasSectionMap ? NAV : NAV.filter((n) => n.href !== "#sections");
  const navLinks = photoEssay
    ? [...baseNav.slice(0, 2), { href: "#grounds", label: "Photos" }, ...baseNav.slice(2)]
    : baseNav;


  // Scroll-spy so the jump bar always shows where you are on the page.
  useEffect(() => {
    const ids = navLinks.map((n) => n.href.slice(1));
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isRestland, hasSectionMap]);


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
    // Image + map assets, so Google can index the photography and the garden plans.
    ...(photoEssay
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ImageGallery",
            name: `${cemetery.name} photos — gardens, sections and grounds`,
            about: cemetery.name,
            associatedMedia: [
              ...photoEssay.photos.map((p) => ({
                "@type": "ImageObject",
                contentUrl: `${SITE}${p.src}`,
                caption: p.caption,
                description: p.alt,
                creditText: "Texas Cemetery Brokers",
                license: `${SITE}/privacy`,
                acquireLicensePage: `${SITE}${path}`,
                contentLocation: { "@type": "Place", name: cemetery.name, address: cemetery.address },
              })),
              ...(isRestland
                ? RESTLAND_MAP_DOWNLOADS.map((m) => ({
                    "@type": "ImageObject",
                    contentUrl: `${SITE}${m.src}`,
                    caption: m.caption,
                    description: m.alt,
                    creditText: "Texas Cemetery Brokers",
                    encodingFormat: "image/png",
                    acquireLicensePage: `${SITE}${path}`,
                  }))
                : []),
            ],
          },
        ]
      : []),
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
          <img src={imgMountains} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.14]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/78 via-background/68 to-background" />
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-sage-light/60 blur-3xl" />
          <div className="absolute top-16 right-0 w-[380px] h-[380px] rounded-full bg-terracotta-light/25 blur-3xl" />
          <img
            src={hibiscusCoral.url}
            alt=""
            className="hidden lg:block absolute -right-16 top-14 w-[26rem] opacity-[0.16] rotate-[8deg]"
          />
          <img
            src={pinkBranch.url}
            alt=""
            className="hidden lg:block absolute right-[22rem] -top-10 w-[16rem] opacity-[0.10] -rotate-12"
          />
        </div>

        <div className="container mx-auto px-6 relative">
          <Link
            to="/cemetery-plots-for-sale-dallas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-7"
          >
            <ArrowLeft className="w-4 h-4" /> Dallas–Fort Worth cemeteries
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Editorial masthead line, in the style of our guides */}
            <div className="flex items-center gap-4 mb-6 max-w-4xl">
              <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-medium shrink-0">
                {cemetery.city}, Texas
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground shrink-0 hidden sm:inline">
                {cemetery.tagline}
              </span>
            </div>
            <h1 className="font-display text-[42px] leading-[0.98] md:text-6xl lg:text-[82px] text-foreground tracking-tight mb-5 max-w-4xl">
              {cemetery.seo.h1}
              <span className="block text-muted-foreground italic font-normal text-2xl md:text-4xl lg:text-[46px] mt-3">
                plots for sale, prices &amp; transfers.
              </span>
            </h1>
            <span className="block w-20 h-[3px] bg-primary/70 rounded-full mb-6" />


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

      {/* Anchor nav — jump to any part of the page */}
      <nav className="sticky top-[68px] z-30 bg-background/92 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 py-2.5 flex items-center gap-3">
          <span className="hidden md:inline shrink-0 text-[10px] tracking-[0.28em] uppercase text-muted-foreground pr-2 border-r border-border">
            Jump to
          </span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {navLinks.map((l) => {
              const isActive = active === l.href.slice(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
          </div>
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

      {/* ============ SECTION MAPS ============ */}
      {hasSectionMap && (
        <section id="sections" className="relative py-12 md:py-16 bg-card/40 border-y border-border/60 scroll-mt-32 overflow-hidden">
          <div className="relative container mx-auto px-6">
            <GardenSignMarker label="Section maps" className="mb-6" />
            {isRestland ? (
              <RestlandGardenMap />
            ) : (
              planMap && <CemeteryPlanMap cemeteryName={cemetery.name} map={planMap} />
            )}
          </div>
        </section>
      )}

      {/* ============ PHOTO ESSAY (original broker photography) ============ */}
      {photoEssay && <CemeteryPhotoEssay essay={photoEssay} cemeteryName={cemetery.name} />}



      {/* ============ MAP ============ */}
      <section id="map" className="py-12 md:py-16 scroll-mt-32">
        <div className="container mx-auto px-6 grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-center">
          <div className="max-w-xl">
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Find it</p>
            <h2 className="font-display text-3xl md:text-[42px] text-foreground leading-[1.06] mb-4">
              {cemetery.name} on the map.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The satellite view shows the drives, gardens and entrance so you can orient yourself before you visit.
              Ask us for the exact section and we'll mark it for you.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                to={`/buy?cemetery=${encodeURIComponent(cemetery.name)}`}
                className="inline-flex items-center gap-1.5 text-foreground font-medium hover:text-primary transition-colors"
              >
                See spaces here <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
          <CemeteryLocationMap
            name={cemetery.name}
            address={cemetery.address}
            lat={cemetery.lat}
            lng={cemetery.lng}
            heightClass="h-[240px] md:h-[300px]"
          />
        </div>
      </section>


      {/* ============ DFW COVERAGE MAP ============ */}
      <section
        id="nearby-map"
        className="relative py-12 md:py-16 bg-gradient-warm border-y border-border/60 scroll-mt-32 overflow-hidden"
      >
        <img
          src={bananaLeaf.url}
          alt=""
          aria-hidden
          className="hidden md:block absolute -left-52 bottom-0 w-[26rem] opacity-[0.09] -rotate-12 pointer-events-none select-none"
        />
        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl mb-7">
            <GardenSignMarker label="Coverage" className="mb-5" />
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Nearby cemeteries</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.06] mb-3">
              Every cemetery we broker around {cemetery.city}.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Search by name or city, tap a pin for transfer fees and showing availability, or open directions.
            </p>
          </div>
          <MetroCemeteryMap
            regions={["Dallas–Fort Worth"]}
            metro="Dallas–Fort Worth"
            searchable
            hideTitle
            compact
          />
        </div>
      </section>

      {/* ============ TRANSFER & FEES ============ */}
      <section id="transfer" className="relative py-14 md:py-20 scroll-mt-32 overflow-hidden">
        <img
          src={pinkBranch.url}
          alt=""
          aria-hidden
          className="hidden md:block absolute right-[3%] top-16 w-24 lg:w-32 opacity-40 -rotate-6 pointer-events-none select-none"
        />
        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl mb-10 md:mb-14">
            <GardenSignMarker label="Transfers" className="mb-5" />
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-4">Transfer &amp; paperwork</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.05] mb-5">
              The part everyone worries about,
              <br />
              <em className="italic font-normal text-muted-foreground">handled for you.</em>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {cemetery.name} records a transfer fee of {money(cemetery.transferFee)} per space. We confirm the live
              figure with the cemetery in writing, tell you who is paying it, and file the paperwork ourselves.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-9 border-t border-border/70 pt-9">
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
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display text-3xl text-primary italic">{s.n}</span>
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg text-foreground mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.b}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-11 flex flex-wrap gap-3">
            <Link
              to={`/sell?cemetery=${encodeURIComponent(cemetery.name)}`}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Free valuation <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+12142304740"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-border text-foreground font-medium rounded-full text-sm hover:border-primary transition-colors"
            >
              <Phone className="w-4 h-4" /> (214) 230-4740
            </a>
          </div>
        </div>
      </section>

      {/* ============ VALUATION FORM ============ */}
      <section
        id="valuation"
        className="relative py-14 md:py-20 bg-sand-light border-y border-border/60 scroll-mt-32 overflow-hidden"
      >
        <img
          src={hibiscusCoral.url}
          alt=""
          aria-hidden
          className="hidden md:block absolute right-6 lg:right-16 top-10 w-28 lg:w-40 opacity-90 rotate-6 pointer-events-none select-none"
        />
        <img
          src={palmFan.url}
          alt=""
          aria-hidden
          className="hidden lg:block absolute right-[14%] top-40 w-32 opacity-30 rotate-[18deg] pointer-events-none select-none"
        />
        <img
          src={plumeriaCluster.url}
          alt=""
          aria-hidden
          className="hidden lg:block absolute -left-20 bottom-6 w-56 opacity-50 -rotate-12 pointer-events-none select-none"
        />
        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl mb-9">
            <GardenSignMarker label="Valuation" className="mb-5" />
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-3">Free, no obligation</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.05]">
              What is your space at {cemetery.name}{" "}
              <em className="italic font-normal text-primary">worth?</em>
            </h2>
          </div>
          <SellerQuoteForm editorial defaultCemetery={cemetery.name} />
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="relative py-14 md:py-20 bg-sand-light/40 border-y border-border/60 scroll-mt-32 overflow-hidden">
        <img
          src={palmFan.url}
          alt=""
          aria-hidden
          className="hidden lg:block absolute -left-24 bottom-0 w-[22rem] opacity-[0.10] -rotate-12 pointer-events-none"
        />
        <div className="container mx-auto px-6 relative grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-36">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium">Questions we get</span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.04] mb-4">
              {cemetery.name}, <span className="italic text-muted-foreground">answered.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
              The questions families actually ask us about buying, selling and transferring property here.
            </p>
            <a
              href="tel:+12142304740"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:bg-primary transition-colors"
            >
              Ask us directly — (214) 230-4740
            </a>
          </div>

          <div className="space-y-3">
            {cemetery.faqs.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} index={i} defaultOpen={i === 0} />
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
