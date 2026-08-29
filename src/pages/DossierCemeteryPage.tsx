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
import DossierBuyerForm from "@/components/cemetery/DossierBuyerForm";
import RestlandGardenMap from "@/components/cemetery/RestlandGardenMap";
import { planMapFor } from "@/components/cemetery/cemeteryPlanMaps";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";

import { flagshipBySlug, money, type FlagshipCemetery } from "@/data/flagshipCemeteries";
import { bayCemeteries } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import type { DossierPhoto } from "@/data/sparkmanPhotos";
import fallbackHero from "@/assets/cemeteries/cemetery-grounds-1.jpg.asset.json";

const SITE = "https://texascemeterybrokers.com";

const NAV = [
  { href: "#market", label: "The market here" },
  { href: "#prices", label: "Prices" },
  { href: "#buy", label: "Buy a space" },
  { href: "#valuation", label: "Free valuation" },
  { href: "#grounds", label: "Photographs" },
  { href: "#sections", label: "Section plan" },
  { href: "#map", label: "Map" },
  { href: "#transfer", label: "Transfer & fees" },
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
  /** Optional original hero photograph. Falls back to a stock grounds frame. */
  hero?: { src: string; alt: string };
  /** Optional wide frame inside the article. */
  strip?: DossierPhoto;
  /** Optional photo essay. Omitted entirely when we have no original photography. */
  photos?: DossierPhoto[];
}

/**
 * "The Dossier" — deep, editorial cemetery profile: ink-navy page, gold rules,
 * a standing contents rail and a print-style price ledger. Built for the
 * flagship cemeteries where we want to own the search result.
 */
const DossierCemeteryPage = ({ cemetery, hero, strip, photos = [] }: Props) => {
  const path = `/cemeteries/${cemetery.slug}`;
  const planMap = planMapFor(cemetery.slug);
  const [active, setActive] = useState("market");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [stuck, setStuck] = useState(false);
  // Once the visitor starts the valuation form we drop the explainer column
  // and give the form the whole box.
  const [formStarted, setFormStarted] = useState(false);

  // Metro the cemetery belongs to — drives the coverage map, breadcrumbs and hub links.
  const metro =
    cemetery.region === "Greater Houston"
      ? { label: "Houston", regions: ["Greater Houston"], hub: "/cemetery-plots-for-sale-houston" }
      : cemetery.region === "Austin"
        ? { label: "Austin", regions: ["Austin", "Central Texas"], hub: "/cemetery-plots-for-sale-austin" }
        : { label: "Dallas–Fort Worth", regions: ["Dallas–Fort Worth"], hub: "/cemetery-plots-for-sale-dallas" };

  const heroImage = hero ?? { src: fallbackHero.url, alt: `Memorial grounds at ${cemetery.name} in ${cemetery.city}, Texas` };

  // Split the cemetery name into a lead line + italic gold second line, as in the
  // reference dossier ("Bluebonnet Hills / *Memorial Park*").
  const heroTitle = (() => {
    const name = cemetery.name;
    const suffix = name.match(/\s+(Memorial Park|Memorial Gardens|Funeral Home & Cemetery|Funeral Home and Cemetery|Cemetery)$/i);
    if (suffix && suffix.index !== undefined && suffix.index > 0) {
      return { lead: name.slice(0, suffix.index), rest: suffix[1] };
    }
    const words = name.split(" ");
    if (words.length > 2) {
      const cut = Math.ceil(words.length / 2);
      return { lead: words.slice(0, cut).join(" "), rest: words.slice(cut).join(" ") };
    }
    return { lead: name, rest: "" };
  })();
  const hasSectionPlan = Boolean(planMap) || cemetery.slug === "restland-memorial-park";
  const nav = NAV.filter((n) => {
    if (n.href === "#grounds") return photos.length > 0;
    if (n.href === "#sections") return hasSectionPlan;
    return true;
  });


  // Reading progress + sticky bar
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
      setStuck(h.scrollTop > 620);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = nav.map((n) => document.getElementById(n.href.slice(1))).filter(
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
  }, [cemetery.slug, photos.length]);

  const nearby = cemetery.nearby
    .map((s) => flagshipBySlug(s) ?? bayCemeteries.find((c) => slugify(c.name) === s))
    .filter(Boolean) as Array<{ name: string; city: string; slug?: string }>;

  // Quick facts under the hero. We never lead with resale-demand language.
  const factBand = [
    ...cemetery.facts.filter((f) => !/demand/i.test(f.label) && !/demand/i.test(f.value)),
    { label: "Spaces from", value: `${money(Math.min(...cemetery.pricing.map((p) => p.resale[0])))} resale` },
  ].slice(0, 4);

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
        { "@type": "ListItem", position: 3, name: metro.label, item: `${SITE}${metro.hub}` },
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
      associatedMedia: [...(strip ? [strip] : []), ...photos].map((p) => ({
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
    <div className="min-h-screen flex flex-col [&>footer]:mt-auto">
      {/* Editorial ground: warm radial light, engraved hairline grid, paper grain, vignette */}
      <div aria-hidden className="dossier-ground" />
      <div aria-hidden className="dossier-vignette" />
      <Seo title={cemetery.seo.title} description={cemetery.seo.description} path={path} jsonLd={jsonLd} />
      <Navbar forceScrolled dark />


      {/* Reading progress */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-[hsl(var(--gold))] origin-left transition-transform duration-150"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* Sticky context bar */}
      <div
        className={`fixed top-[64px] left-0 right-0 z-50 border-b border-[hsl(var(--gold)/0.28)] bg-[hsl(var(--ink-deep)/0.94)] backdrop-blur-md transition-all duration-300 ${
          stuck ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="container mx-auto max-w-[1440px] px-6 md:px-10 py-2.5 flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-[hsl(var(--parchment))] font-display text-base md:text-lg">
            {cemetery.name}
            <span className="hidden md:inline text-[hsl(var(--parchment)/0.6)] text-sm font-sans">
              {" "}· {cemetery.city}, TX · {money(cemetery.transferFee)} transfer fee
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a href="#buy" className={`${ghostBtn} px-4 py-2 text-[13px]`}>Buy</a>
            <a href="#valuation" className={`${goldBtn} px-4 py-2 text-[13px]`}>Free valuation</a>
          </div>
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section className="relative min-h-[620px] md:min-h-[760px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage.src} alt={heroImage.alt} className="w-full h-full object-cover scale-[1.04]" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--ink) / 0.96) 0%, hsl(var(--ink) / 0.78) 42%, hsl(var(--ink) / 0.24) 100%), linear-gradient(180deg, hsl(var(--ink) / 0.5) 0%, hsl(var(--ink) / 0) 30%, hsl(var(--ink) / 0.75) 100%)",
          }}
        />
        <div className="relative container mx-auto px-6 md:px-10 pt-32 pb-36 md:pt-36 md:pb-40 max-w-[1440px] w-full">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
            <p className={`${eyebrow} mb-6 tracking-[0.3em]`}>
              <Link to="/cemeteries" className="text-[hsl(var(--gold))] hover:text-[hsl(var(--parchment))]">
                Texas
              </Link>
              <span className="text-[hsl(var(--gold)/0.5)]"> / </span>
              {metro.label}
              <span className="text-[hsl(var(--gold)/0.5)]"> / </span>
              {cemetery.city}
            </p>
            <div aria-hidden className="w-24 h-px bg-[hsl(var(--gold))] mb-7" />
            <h1 className="font-display text-[#FFFDF9] text-[clamp(2.9rem,6.4vw,6rem)] leading-[0.96] tracking-[-0.01em]">
              {heroTitle.lead}
              {heroTitle.rest && (
                <>
                  <br />
                  <em className="italic text-[hsl(var(--gold))]">{heroTitle.rest}</em>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-[1.35rem] leading-[1.5] text-[#FFFDF9]/90 font-light">
              Plots for sale, prices and transfers in {cemetery.city}, Texas — {cemetery.tagline}.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={`/listings?cemetery=${cemetery.slug}`} className={goldBtn}>
                Buy a space here
              </Link>
              <a href="#valuation" className={ghostBtn}>
                Sell my space here
              </a>
            </div>
            <p className="mt-8 text-[15px] text-[hsl(var(--parchment)/0.62)]">
              <strong className="font-normal text-[hsl(var(--parchment)/0.85)]">Texas cemetery brokers</strong>
              {" "}· buying, selling &amp; transfers · same-day in-person showings ·{" "}
              <a href="tel:+12142304740" className="hover:text-[hsl(var(--parchment))]">(214) 230-4740</a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= FACT BAND — half-overlapping the photograph ================= */}
      <div className="relative z-10 container mx-auto max-w-[1440px] px-6 md:px-10 -mt-16 md:-mt-[68px]">
        <dl className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-[hsl(var(--gold)/0.28)] bg-[hsl(var(--ink-deep)/0.92)] backdrop-blur-md shadow-[0_24px_60px_-24px_hsl(var(--ink)/0.8)] overflow-hidden">
          {factBand.map((f, i) => (
            <div
              key={f.label}
              className={`px-6 py-6 md:px-8 md:py-7 ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "max-lg:border-t" : ""} ${i > 0 ? "lg:border-l" : ""} border-[hsl(var(--gold)/0.18)]`}
            >
              <dt className={eyebrow}>{f.label}</dt>
              <dd className="mt-2 text-lg text-[hsl(var(--parchment))] leading-snug">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ================= BODY: RAIL + ARTICLE ================= */}
      <div className="container mx-auto max-w-[1440px] px-0 grid lg:grid-cols-[288px_minmax(0,1fr)]">
        {/* Standing contents rail */}
        <aside className="hidden lg:block px-8 py-14 border-r border-[hsl(var(--gold)/0.22)] self-start sticky top-20">
          <p className={eyebrow}>Contents</p>
          <nav className="flex flex-col mt-5" aria-label="On this page">
            {nav.map((n) => (
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

            {strip && (
              <figure className="mt-10">
                <img
                  src={strip.src}
                  alt={strip.alt}
                  loading="lazy"
                  className="w-full h-[240px] md:h-[420px] object-cover rounded-[14px]"
                />
                <figcaption className="mt-3 text-sm text-[hsl(var(--parchment)/0.6)]">{strip.caption}</figcaption>
              </figure>
            )}
          </article>
        </div>
      </div>

      {/* ============ FULL WIDTH: everything below the rail ============ */}
      <div className="container mx-auto max-w-[1440px] px-0">
        <div>
          {/* ---------- Local notes ---------- */}
          <section className="px-6 md:px-10 pt-12">
            <div className="rounded-[14px] border border-[hsl(var(--gold)/0.26)] p-7 md:p-9">
              <p className={eyebrow}>Local notes</p>
              <ul className="mt-5 grid md:grid-cols-2 gap-x-10 gap-y-5">
                {cemetery.localNotes.map((n) => (
                  <li key={n} className="flex gap-4 text-[hsl(var(--parchment)/0.84)] leading-relaxed">
                    <span className="mt-2 h-px w-6 shrink-0 bg-[hsl(var(--gold))]" aria-hidden />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

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
                  <tr className={`${eyebrow} bg-[hsl(var(--ink-deep)/0.72)]`}>
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
                        <span className="flex items-center gap-3">
                          ~{saving(p.retail, p.resale)}%
                          <span className="hidden md:block h-[3px] w-24 rounded-full bg-[hsl(var(--gold)/0.2)]" aria-hidden>
                            <span
                              className="block h-full rounded-full bg-[hsl(var(--gold))]"
                              style={{ width: `${saving(p.retail, p.resale)}%` }}
                            />
                          </span>
                        </span>
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

          {/* ---------- Buyer enquiry ---------- */}
          <section id="buy" className="scroll-mt-28 px-6 md:px-10 pt-16">
            <DossierBuyerForm cemeteryName={cemetery.name} region={cemetery.region} />
          </section>



          {/* ---------- Free valuation (dark, editorial) ---------- */}
          <section id="valuation" className="scroll-mt-28 px-6 md:px-10 pt-16">
            <div
              className={`rounded-[20px] border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--ink-deep)/0.72)] p-7 md:p-10 grid gap-10 items-start transition-all duration-500 ${
                formStarted ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
              }`}
            >
              {!formStarted && (
                <div>
                  <p className={eyebrow}>Free valuation</p>
                  <h2 className="mt-4 font-display text-[clamp(1.8rem,2.8vw,2.5rem)] leading-tight text-[hsl(var(--parchment))]">
                    What is your space at {cemetery.name} worth?
                  </h2>
                  <p className="mt-4 text-[hsl(var(--parchment)/0.78)] leading-relaxed font-light">
                    Free and no obligation. A few short questions and we come back with a figure, usually within one
                    business day. No up-front cost, and you only pay when the sale closes.
                  </p>
                  <a
                    href="tel:+12142304740"
                    className={`${ghostBtn} mt-6 px-5 py-3 text-[15px] gap-2.5`}
                  >
                    <Phone className="w-4 h-4 text-[hsl(var(--gold))]" />
                    (214) 230-4740
                  </a>
                </div>
              )}
              <div className="rounded-[16px] bg-[hsl(var(--parchment))] p-5 md:p-7">
                <SellerQuoteForm defaultCemetery={cemetery.name} editorial onEngage={setFormStarted} />
              </div>
            </div>
          </section>

          {/* ---------- Photographs ---------- */}
          {photos.length > 0 && (
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
          )}

        </div>
      </div>

      {/* ================= FULL WIDTH: MAPS ================= */}
      <div className="container mx-auto max-w-[1440px] px-0">
        <div>
          {/* ---------- Restland's own garden plans + directory ---------- */}
          {cemetery.slug === "restland-memorial-park" && (
            <section id="sections" className="scroll-mt-28 px-6 md:px-10 pt-20">
              <div className="rounded-[28px] overflow-hidden bg-[hsl(var(--parchment))] p-3 sm:p-6">
                <RestlandGardenMap />
              </div>
            </section>
          )}

          {/* ---------- Section plan + map ---------- */}
          <div className={`grid gap-10 px-6 md:px-10 pt-20 ${planMap ? "xl:grid-cols-2" : ""}`}>

            {planMap && (
              <section id="sections" className="scroll-mt-28">
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
                    to={metro.hub}
                    className="mt-4 inline-block text-sm text-[hsl(var(--gold))] hover:text-[hsl(var(--parchment))]"
                  >
                    All {metro.label} cemeteries →
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* ---------- Metro map ---------- */}
          <section className="px-6 md:px-10 pt-16">
            <p className={eyebrow}>Across the metroplex</p>
            <h2 className="mt-4 mb-6 max-w-3xl font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight text-[hsl(var(--parchment))]">
              Every {metro.label} cemetery we broker.
            </h2>
            <div className="rounded-[28px] overflow-hidden bg-[hsl(var(--parchment))] p-3 sm:p-5">
              <MetroCemeteryMap regions={metro.regions} metro={metro.label} fullBleed={false} searchable compact hideTitle />
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

          {/* Byline / freshness signal */}
          <div className="mt-14 border-t border-border pt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Texas Cemetery Brokers · licensed Texas brokerage</span>
            <span>
              Researched on the grounds at {cemetery.name}. Prices and the {money(cemetery.transferFee)} transfer fee are
              reviewed quarterly, and whenever the cemetery changes its schedule.
            </span>
            <a href="tel:+12142304740" className="text-primary hover:underline">(214) 230-4740</a>
          </div>

        </div>
      </section>

      {/* Mobile action bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--ink-deep)/0.96)] backdrop-blur-md px-4 py-3 flex gap-2">
        <a href="tel:+12142304740" className={`${ghostBtn} flex-1 px-3 py-3 text-[14px]`}>
          <Phone className="w-4 h-4 text-[hsl(var(--gold))]" /> Call
        </a>
        <a href="#valuation" className={`${goldBtn} flex-1 px-3 py-3 text-[14px]`}>Free valuation</a>
      </div>
      <div className="lg:hidden h-[76px]" aria-hidden />

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
