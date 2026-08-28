import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MapPin, ArrowRight, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import CemeteryLocationMap from "@/components/cemetery/CemeteryLocationMap";
import CemeteryPlanMap from "@/components/cemetery/CemeteryPlanMap";
import { planMapFor } from "@/components/cemetery/cemeteryPlanMaps";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";

import { flagshipBySlug, money, type FlagshipCemetery } from "@/data/flagshipCemeteries";
import { bayCemeteries } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import type { DossierPhoto } from "@/data/sparkmanPhotos";

const SITE = "https://texascemeterybrokers.com";

const NAV = [
  { href: "#market", label: "The market here" },
  { href: "#prices", label: "Prices" },
  { href: "#grounds", label: "Photographs" },
  { href: "#sections", label: "Section plan" },
  { href: "#map", label: "Map" },
  { href: "#transfer", label: "Transfer & fees" },
  { href: "#valuation", label: "Free valuation" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  { n: "01", t: "Deed check", b: "We read your deed, confirm the section and space and verify who is legally able to sell." },
  { n: "02", t: "Valuation & listing", b: "A realistic figure based on what property here actually trades for, then we market it — no up-front cost." },
  { n: "03", t: "Buyer & payment", b: "We screen the buyer and hold funds until the paperwork is right on both sides." },
  { n: "04", t: "Cemetery transfer", b: "We file the transfer with the cemetery office, pay the recording fee from proceeds and send you the net." },
];

interface Props {
  cemetery: FlagshipCemetery;
  hero: { src: string; alt: string };
  strip: DossierPhoto;
  photos: DossierPhoto[];
}

/**
 * "The Dossier" — deep, editorial cemetery profile: ink-navy page, gold rules,
 * a standing contents rail and a print-style price ledger. Built for the
 * flagship cemeteries where we want to own the search result.
 */
const DossierCemeteryPage = ({ cemetery, hero, strip, photos }: Props) => {
  const path = `/cemeteries/${cemetery.slug}`;
  const planMap = planMapFor(cemetery.slug);
  const [active, setActive] = useState("market");
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.href.slice(1))).filter(
      (el): el is HTMLElement => Boolean(el),
    );
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
  }, [cemetery.slug]);

  const nearby = cemetery.nearby
    .map((s) => flagshipBySlug(s) ?? bayCemeteries.find((c) => slugify(c.name) === s))
    .filter(Boolean) as Array<{ name: string; city: string; slug?: string }>;

  const saving = (r: [number, number], s: [number, number]) =>
    Math.round((1 - (s[0] + s[1]) / (r[0] + r[1])) * 100);

  const typicalSaving = Math.round(
    cemetery.pricing.reduce((acc, p) => acc + saving(p.retail, p.resale), 0) / cemetery.pricing.length,
  );

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Cemetery",
      name: cemetery.name,
      alternateName: cemetery.alsoKnownAs,
      url: `${SITE}${path}`,
      telephone: "+1-214-230-4740",
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
      makesOffer: cemetery.pricing.map((p) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Product", name: `${p.type} at ${cemetery.name}` },
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: p.resale[0],
          maxPrice: p.resale[1],
          priceCurrency: "USD",
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Cemeteries", item: `${SITE}/cemeteries` },
        { "@type": "ListItem", position: 3, name: "Dallas–Fort Worth", item: `${SITE}/cemetery-plots-for-sale-dallas` },
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
    {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name: `${cemetery.name} photographs — mausoleum, chapels and gardens`,
      about: cemetery.name,
      associatedMedia: [strip, ...photos].map((p) => ({
        "@type": "ImageObject",
        contentUrl: `${SITE}${p.src}`,
        caption: p.caption,
        description: p.alt,
        creditText: "Texas Cemetery Brokers",
        acquireLicensePage: `${SITE}${path}`,
        contentLocation: { "@type": "Place", name: cemetery.name, address: cemetery.address },
      })),
    },
  ];

  const eyebrow = "text-[11px] tracking-[0.3em] uppercase text-[hsl(var(--gold))]";
  const goldBtn =
    "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--gold))] px-7 py-4 text-[hsl(var(--ink))] font-medium hover:bg-[hsl(var(--parchment))] transition-colors";
  const ghostBtn =
    "inline-flex items-center justify-center gap-2 rounded-[10px] border border-[hsl(var(--gold)/0.55)] px-7 py-4 text-[hsl(var(--parchment))] font-medium hover:bg-[hsl(var(--gold)/0.14)] hover:border-[hsl(var(--gold))] transition-colors";

  return (
    <div className="min-h-screen bg-[hsl(var(--ink))] flex flex-col [&>footer]:mt-auto">
      <Seo title={cemetery.seo.title} description={cemetery.seo.description} path={path} jsonLd={jsonLd} />
      <Navbar forceScrolled />

      {/* ================= HERO ================= */}
      <section className="relative min-h-[560px] md:min-h-[640px] flex items-center">
        <div className="absolute inset-0">
          <img src={hero.src} alt={hero.alt} className="w-full h-full object-cover" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--ink)/0.96)] via-[hsl(var(--ink)/0.78)] to-[hsl(var(--ink)/0.3)]"
        />
        <div className="relative container mx-auto px-6 md:px-10 pt-28 pb-16 md:py-24 max-w-[1440px]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className={`${eyebrow} mb-5`}>
              <Link to="/cemeteries" className="text-[hsl(var(--gold))] hover:text-[hsl(var(--parchment))]">
                Texas
              </Link>{" "}
              · {cemetery.region} · {cemetery.city}
            </p>
            <h1 className="font-display text-[hsl(var(--parchment))] text-[clamp(2.6rem,5.6vw,5.1rem)] leading-[0.98] max-w-3xl">
              {cemetery.seo.h1}
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-xl leading-relaxed text-[hsl(var(--parchment)/0.88)] font-light">
              Plots, crypts and niches for sale in {cemetery.city}, Texas — {cemetery.tagline.toLowerCase()}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/listings?cemetery=${cemetery.slug}`} className={goldBtn}>
                Buy a space here
              </Link>
              <a href="#valuation" className={ghostBtn}>
                Sell my space here
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= BODY: RAIL + ARTICLE ================= */}
      <div className="container mx-auto max-w-[1440px] px-0 grid lg:grid-cols-[288px_minmax(0,1fr)]">
        {/* Standing contents rail */}
        <aside className="hidden lg:block px-8 py-14 border-r border-[hsl(var(--gold)/0.22)] self-start sticky top-20">
          <p className={eyebrow}>Contents</p>
          <nav className="flex flex-col mt-5" aria-label="On this page">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                aria-current={active === n.href.slice(1)}
                className={`py-3 border-t border-[hsl(var(--gold)/0.18)] text-[15px] last:border-b transition-colors ${
                  active === n.href.slice(1)
                    ? "text-[hsl(var(--parchment))]"
                    : "text-[hsl(var(--parchment)/0.7)] hover:text-[hsl(var(--gold))]"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="mt-10 rounded-[10px] border border-[hsl(var(--gold)/0.3)] p-6">
            <p className={eyebrow}>Transfer fee</p>
            <p className="mt-2 mb-4 font-display text-3xl text-[hsl(var(--parchment))] leading-tight">
              {money(cemetery.transferFee)}
              <span className="block text-lg text-[hsl(var(--parchment)/0.66)]">per space</span>
            </p>
            <p className="text-[15px] leading-relaxed text-[hsl(var(--parchment)/0.7)]">
              Paid to the cemetery to record the change of ownership. We confirm the live figure in writing before
              anyone signs.
            </p>
            <a href="#valuation" className={`${goldBtn} w-full mt-5`}>
              Free valuation
            </a>
          </div>
        </aside>

        <div>
          {/* ---------- The market here ---------- */}
          <article id="market" className="scroll-mt-28 px-6 md:px-10 pt-14">
            <p className={eyebrow}>The market here</p>
            <h2 className="mt-4 mb-8 max-w-4xl font-display text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.12] text-[hsl(var(--parchment))]">
              Buying and selling at {cemetery.name}, {cemetery.city}.
            </h2>
            {cemetery.intro.map((p) => (
              <p key={p} className="max-w-4xl mb-5 text-[19px] leading-[1.68] text-[hsl(var(--parchment)/0.84)] font-light">
                {p}
              </p>
            ))}

            <figure className="mt-10">
              <img
                src={strip.src}
                alt={strip.alt}
                loading="lazy"
                className="w-full h-[240px] md:h-[420px] object-cover rounded-[14px]"
              />
              <figcaption className="mt-3 text-sm text-[hsl(var(--parchment)/0.6)]">{strip.caption}</figcaption>
            </figure>

            <section className="mt-12 rounded-[14px] border border-[hsl(var(--gold)/0.26)] p-7 md:p-9">
              <p className={eyebrow}>Local notes</p>
              <ul className="mt-5 space-y-5">
                {cemetery.localNotes.map((n) => (
                  <li key={n} className="flex gap-4 text-[hsl(var(--parchment)/0.84)] leading-relaxed">
                    <span className="mt-2 h-px w-6 shrink-0 bg-[hsl(var(--gold))]" aria-hidden />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          </article>

          {/* ---------- Prices ---------- */}
          <section id="prices" className="scroll-mt-28 px-6 md:px-10 pt-16">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
              <div className="max-w-3xl">
                <p className={eyebrow}>{cemetery.name} prices</p>
                <h2 className="mt-4 mb-4 font-display text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.12] text-[hsl(var(--parchment))]">
                  What spaces actually cost here.
                </h2>
                <p className="text-[hsl(var(--parchment)/0.8)] leading-relaxed font-light">
                  Cemetery counter pricing against what resale property at {cemetery.name} typically trades for. Ranges
                  are estimates from our own transaction history — we quote a precise figure once we know the section
                  and space.
                </p>
              </div>
              <p className="shrink-0 flex items-end gap-3 text-[hsl(var(--parchment))]">
                <b className="font-display text-5xl text-[hsl(var(--gold))]">{typicalSaving}%</b>
                <span className="text-sm leading-tight text-[hsl(var(--parchment)/0.7)]">
                  Typical saving
                  <br />
                  on a burial space
                </span>
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-[14px] border border-[hsl(var(--gold)/0.26)]">
              <table className="w-full text-left border-collapse">
                <thead className="hidden md:table-header-group">
                  <tr className={`${eyebrow} bg-[hsl(var(--ink-deep))]`}>
                    <th className="p-4 font-normal">Property type</th>
                    <th className="p-4 font-normal">Cemetery retail</th>
                    <th className="p-4 font-normal">Typical resale</th>
                    <th className="p-4 font-normal">You save</th>
                  </tr>
                </thead>
                <tbody>
                  {cemetery.pricing.map((p) => (
                    <tr
                      key={p.type}
                      className="block md:table-row border-t border-[hsl(var(--gold)/0.18)] p-4 md:p-0 text-[hsl(var(--parchment)/0.86)]"
                    >
                      <td className="block md:table-cell md:p-4 font-display text-lg md:text-xl text-[hsl(var(--parchment))]">
                        {p.type}
                      </td>
                      <td className="block md:table-cell md:p-4 text-sm md:text-base line-through decoration-[hsl(var(--gold)/0.5)] text-[hsl(var(--parchment)/0.6)]">
                        {money(p.retail[0])} – {money(p.retail[1])}
                      </td>
                      <td className="block md:table-cell md:p-4">
                        {money(p.resale[0])} – {money(p.resale[1])}
                      </td>
                      <td className="block md:table-cell md:p-4 text-[hsl(var(--gold))]">
                        ~{saving(p.retail, p.resale)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-[hsl(var(--parchment)/0.6)] max-w-3xl">
              Prices exclude the cemetery's {money(cemetery.transferFee)} per-space transfer fee, opening and closing
              charges and any memorial or marker costs.
            </p>
          </section>

          {/* ---------- Photographs ---------- */}
          <section id="grounds" className="scroll-mt-28 px-6 md:px-10 pt-16">
            <p className={eyebrow}>Photographed on the grounds</p>
            <h2 className="mt-4 mb-8 max-w-3xl font-display text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.12] text-[hsl(var(--parchment))]">
              A walk through {cemetery.name}.
            </h2>
            <div className="grid md:grid-cols-6 gap-4">
              {photos.map((p, i) => {
                const spans = ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-2", "md:col-span-2", "md:col-span-3", "md:col-span-3", "md:col-span-6"];
                const heights = ["h-[280px] md:h-[460px]", "h-[280px] md:h-[460px]", "h-[240px] md:h-[320px]", "h-[240px] md:h-[320px]", "h-[240px] md:h-[320px]", "h-[260px] md:h-[380px]", "h-[260px] md:h-[380px]", "h-[300px] md:h-[440px]"];
                return (
                  <motion.figure
                    key={p.src}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.55, delay: (i % 3) * 0.05 }}
                    onClick={() => setLightbox(i)}
                    className={`group relative overflow-hidden rounded-[14px] border border-[hsl(var(--gold)/0.2)] cursor-zoom-in ${spans[i % spans.length]} ${heights[i % heights.length]}`}
                  >
                    <img
                      src={p.src}
                      alt={p.alt}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 p-4 md:p-5 bg-gradient-to-t from-[hsl(var(--ink-deep)/0.94)] via-[hsl(var(--ink-deep)/0.5)] to-transparent">
                      <span className={`${eyebrow} block mb-1.5`}>{p.kicker}</span>
                      <span className="block text-[hsl(var(--parchment))] text-sm md:text-[15px] leading-snug max-w-2xl">
                        {p.caption}
                      </span>
                    </figcaption>
                  </motion.figure>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-[hsl(var(--parchment)/0.6)]">
              Original photography of {cemetery.name} by Texas Cemetery Brokers. Tap any frame to enlarge.
            </p>
          </section>

          {/* ---------- Section plan + map ---------- */}
          <div className="grid xl:grid-cols-2 gap-10 px-6 md:px-10 pt-16">
            {planMap && (
              <section id="sections" className="scroll-mt-28">
                <p className={eyebrow}>Section plan</p>
                <h2 className="mt-4 mb-6 font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight text-[hsl(var(--parchment))]">
                  {cemetery.name}, mapped.
                </h2>
                <div className="rounded-[28px] overflow-hidden bg-[hsl(var(--parchment))]">
                  <CemeteryPlanMap cemeteryName={cemetery.name} map={planMap} />
                </div>
              </section>
            )}

            <section id="map" className="scroll-mt-28">
              <p className={eyebrow}>Find it</p>
              <h2 className="mt-4 mb-6 font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight text-[hsl(var(--parchment))]">
                {cemetery.name} on the map.
              </h2>
              <div className="rounded-[28px] overflow-hidden">
                <CemeteryLocationMap
                  name={cemetery.name}
                  address={cemetery.address}
                  lat={cemetery.lat}
                  lng={cemetery.lng}
                  heightClass="h-[320px] md:h-[420px]"
                />
              </div>

              <div className="mt-6 rounded-[14px] border border-[hsl(var(--gold)/0.26)] p-6">
                <p className="font-display text-2xl text-[hsl(var(--parchment))]">{cemetery.name}</p>
                <p className="mt-1 flex items-start gap-2 text-[hsl(var(--parchment)/0.72)] text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 text-[hsl(var(--gold))]" /> {cemetery.address}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to={`/listings?cemetery=${cemetery.slug}`} className={`${goldBtn} px-5 py-3 text-[15px]`}>
                    See spaces here
                  </Link>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(cemetery.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${ghostBtn} px-5 py-3 text-[15px]`}
                  >
                    Directions
                  </a>
                </div>
              </div>

              {nearby.length > 0 && (
                <div className="mt-6 rounded-[14px] border border-[hsl(var(--gold)/0.26)] p-6">
                  <p className={eyebrow}>Nearby cemeteries we broker</p>
                  <div className="mt-4 divide-y divide-[hsl(var(--gold)/0.18)]">
                    {nearby.map((n) => (
                      <Link
                        key={n.name}
                        to={`/cemeteries/${slugify(n.name)}`}
                        className="flex items-center justify-between gap-4 py-3 text-[hsl(var(--parchment)/0.82)] hover:text-[hsl(var(--gold))] transition-colors"
                      >
                        <span>
                          {n.name}, {n.city}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/cemetery-plots-for-sale-dallas"
                    className="mt-4 inline-block text-sm text-[hsl(var(--gold))] hover:text-[hsl(var(--parchment))]"
                  >
                    All Dallas–Fort Worth cemeteries →
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* ---------- Metro map ---------- */}
          <section className="px-6 md:px-10 pt-16">
            <p className={eyebrow}>Across the metroplex</p>
            <h2 className="mt-4 mb-6 max-w-3xl font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight text-[hsl(var(--parchment))]">
              Every Dallas–Fort Worth cemetery we broker.
            </h2>
            <div className="rounded-[28px] overflow-hidden bg-[hsl(var(--parchment))]">
              <MetroCemeteryMap regions={["Dallas–Fort Worth"]} metro="Dallas–Fort Worth" fullBleed={false} searchable compact hideTitle />
            </div>
          </section>
        </div>
      </div>

      {/* ================= LIGHT: TRANSFER, FAQ, VALUATION ================= */}
      <section id="transfer" className="scroll-mt-28 bg-[hsl(var(--parchment))] mt-20 py-16 md:py-24">
        <div className="container mx-auto max-w-[1440px] px-6 md:px-10">
          <p className="text-[11px] tracking-[0.3em] uppercase text-primary font-medium">Transfer &amp; paperwork</p>
          <h2 className="mt-4 mb-10 font-display text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.12] text-foreground max-w-3xl">
            The part everyone worries about, handled for you.
          </h2>

          <ol className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-[18px] border border-border bg-background p-6">
                <b className="font-display text-3xl text-primary">{s.n}</b>
                <strong className="block mt-3 font-display text-xl text-foreground">{s.t}</strong>
                <p className="mt-2 text-muted-foreground leading-relaxed text-[15px]">{s.b}</p>
              </li>
            ))}
          </ol>

          {/* FAQ */}
          <div id="faq" className="scroll-mt-28 mt-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-primary font-medium">Questions we get</p>
            <h2 className="mt-4 mb-8 font-display text-[clamp(1.8rem,2.8vw,2.5rem)] text-foreground">
              {cemetery.name}, answered.
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              {cemetery.faqs.map((f) => (
                <div key={f.q} className="rounded-[18px] border border-border bg-background p-6 md:p-7">
                  <h3 className="font-display text-xl md:text-[22px] leading-snug text-foreground">{f.q}</h3>
                  <span className="block w-10 h-px bg-primary/40 my-4" />
                  <p className="text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation */}
          <div id="valuation" className="scroll-mt-28 mt-16 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 items-start">
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-primary font-medium">Free valuation</p>
              <h2 className="mt-4 font-display text-[clamp(1.8rem,2.8vw,2.5rem)] leading-tight text-foreground">
                What is your space at {cemetery.name} worth?
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl">
                Free and no obligation. A few short questions and we come back with a figure, usually within one
                business day. No up-front cost, and you only pay when the sale closes.
              </p>
              <a
                href="tel:+12142304740"
                className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-background px-5 py-3 text-foreground hover:border-primary transition-colors"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-medium">(214) 230-4740</span>
              </a>
            </div>
            <SellerQuoteForm defaultCemetery={cemetery.name} editorial />
          </div>
        </div>
      </section>

      <Footer />

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && photos[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={photos[lightbox].caption}
            className="fixed inset-0 z-[100] bg-[hsl(var(--ink-deep)/0.95)] backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          >
            <button
              type="button"
              aria-label="Close photo"
              onClick={() => setLightbox(null)}
              className="absolute top-5 right-5 text-[hsl(var(--parchment)/0.8)] hover:text-[hsl(var(--parchment))]"
            >
              <X className="w-7 h-7" />
            </button>
            <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={photos[lightbox].src}
                alt={photos[lightbox].alt}
                className="w-full max-h-[78vh] object-contain rounded-2xl"
              />
              <figcaption className="mt-4 text-center text-sm text-[hsl(var(--parchment)/0.85)]">
                {photos[lightbox].caption}
              </figcaption>
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DossierCemeteryPage;
