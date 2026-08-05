import { useLocation, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Phone, Plus, ShieldCheck, Wallet, FileCheck2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";

import { getCityPage, CITY_PAGES } from "./city-page-data";
import dallasHeroArt from "@/assets/dallas-hero-illustration.png.asset.json";
import houstonHeroArt from "@/assets/houston-hero-illustration.png.asset.json";

const SITE = "https://texascemeterybrokers.com";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">{children}</p>
);

const Section: React.FC<{ id?: string; eyebrow?: string; title: React.ReactNode; children: React.ReactNode }> = ({ id, eyebrow, title, children }) => (
  <section id={id} className="py-12 md:py-16 scroll-mt-24">
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-6 leading-[1.05]">{title}</h2>
    <div className="prose prose-lg max-w-none text-foreground/85 [&_p]:leading-relaxed [&_p]:mb-5 [&_strong]:text-foreground">{children}</div>
  </section>
);

const CityPlotsPage = () => {
  const { pathname } = useLocation();
  const isCityRoute = pathname.startsWith("/cemetery-plots-for-sale-");
  const data = getCityPage(pathname.replace(/^\/cemetery-plots-for-sale-/, "").replace(/\/$/, ""));

  // During exit transitions this page can briefly render on another route —
  // never redirect unless we're genuinely on a city route.
  if (!data) return isCityRoute ? <Navigate to="/cemetery-plots-for-sale-texas" replace /> : null;


  const path = `/cemetery-plots-for-sale-${data.slug}`;
  const full = `${SITE}${path}`;

  const faqs = [
    {
      q: `How much does a cemetery plot cost in ${data.city}?`,
      a: `Bought directly from the cemetery, a single ground space in ${data.city} typically runs ${data.retailRange}, before opening/closing, a marker and the marker foundation. Mausoleum crypts, lawn crypts and feature locations go higher again. On the resale market a comparable space usually trades at ${data.resaleRange}, because you are buying from a family rather than the cemetery counter.`,
    },
    {
      q: `Can I sell a cemetery plot I own in ${data.city}?`,
      a: `Yes. In Texas you own the right of interment and you are free to transfer it. We value the property against current ${data.city} retail pricing, list it, find the buyer, and handle the cemetery's transfer paperwork. There is no upfront appraisal fee, and owners in established or sold-out gardens are often holding more value than they expect.`,
    },
    {
      q: `What are the transfer fees in ${data.city}?`,
      a: data.notes.find((n) => n.toLowerCase().includes("transfer fee")) ??
        `Each cemetery sets its own recording/transfer fee. Across the ${data.metro} cemetery profiles we maintain, they range from a nominal amount up to roughly $1,995 per space. We confirm the exact figure with the ${data.city} cemetery in writing before closing so there are no surprises.`,
    },

    {
      q: `Do you have plots in sold-out sections in ${data.city}?`,
      a: `Often, yes. When a section sells out the cemetery office cannot sell new spaces there, but individual owners still can. Much of our ${data.metro} inventory sits in closed and sold-out gardens, including spaces next to existing family plots.`,
    },
    {
      q: `How long does a ${data.city} plot sale take?`,
      a: `Listing to closed sale typically takes 4–12 months depending on the cemetery, section, and buyer demand. Once a buyer is agreed, the cemetery transfer itself usually records within two to four weeks.`,
    },

  ];

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Cemetery plot brokerage",
      name: `Cemetery Plots for Sale in ${data.city}, Texas`,
      description: data.description,
      url: full,
      areaServed: { "@type": "City", name: data.city, containedInPlace: { "@type": "State", name: "Texas" } },
      provider: {
        "@type": "LocalBusiness",
        name: "Texas Cemetery Brokers",
        telephone: "+1-214-230-4740",
        email: "info@texascemeterybrokers.com",
        priceRange: "$$",
        url: SITE,
        address: { "@type": "PostalAddress", addressLocality: data.city, addressRegion: "TX", addressCountry: "US" },
        areaServed: data.metro,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Cemetery Plots for Sale in Texas", item: `${SITE}/cemetery-plots-for-sale-texas` },
        { "@type": "ListItem", position: 3, name: `${data.city}`, item: full },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo title={data.title} description={data.description} path={path} type="article" jsonLd={jsonLd} />
      <Navbar forceScrolled />

      {/* HERO */}
      {data.slug === "houston" ? (
        <section className="relative overflow-hidden bg-[hsl(38_35%_95%)] pt-24 md:pt-28">
          <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-0">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="px-6 lg:pl-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))] lg:pr-12 pb-4"
            >
              <nav aria-label="Breadcrumb" className="mb-7 text-[11px] tracking-[0.18em] uppercase text-foreground/50">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <span className="mx-2">/</span>
                <Link to="/cemetery-plots-for-sale-texas" className="hover:text-foreground transition-colors">Texas Plots</Link>
                <span className="mx-2">/</span>
                <span className="text-foreground/80">{data.metro}</span>
              </nav>

              <p className="text-accent text-[11px] tracking-[0.28em] uppercase font-semibold mb-5">{data.metro}</p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-foreground leading-[1.06] tracking-tight [text-wrap:balance]">
                {data.h1Lead} {data.city}
              </h1>
              <p className="mt-7 text-base md:text-[17px] text-foreground/70 leading-relaxed font-light max-w-xl">
                {data.intro}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/buy" className="inline-flex items-center px-7 py-3.5 bg-primary text-primary-foreground rounded-full font-medium text-[15px] hover:opacity-90 transition-all">
                  Find a plot
                </Link>

                <Link to="/sell" className="inline-flex items-center px-7 py-3.5 rounded-full border border-accent/50 text-accent font-medium text-[15px] hover:bg-accent/5 transition-all">
                  Sell a plot
                </Link>
                <a href="tel:+12142304740" className="ml-1 text-sm tracking-[0.12em] text-foreground/65 hover:text-foreground transition-colors">
                  (214) 230-4740
                </a>
              </div>

              <dl className="mt-10 max-w-xl border-t border-foreground/10">
                {[
                  ["Cemetery retail", data.retailRange],
                  ["Typical resale", data.resaleRange],
                  ["Cemeteries covered", `${data.metroCemeteryCount}+ in ${data.metro}`],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-baseline gap-6 border-b border-foreground/10 py-4">
                    <dt className="w-44 shrink-0 text-[10px] uppercase tracking-[0.22em] text-foreground/45">{label}</dt>
                    <dd className="font-display text-xl md:text-2xl text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            <div className="relative h-full lg:self-stretch">
              <img
                src={houstonHeroArt.url}
                alt="Watercolor illustration of a Houston, Texas cemetery entrance sign with mausoleum, headstones and the downtown Houston skyline behind it"
                title="Cemetery plots for sale in Houston, Texas"
                width={1744}
                height={902}
                className="w-full h-full object-cover mix-blend-multiply"
                loading="eager"
                fetchPriority="high"
              />
              {/* Dissolve the artwork into the cream field on every edge */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 md:h-44 bg-gradient-to-b from-[hsl(38_35%_95%)] via-[hsl(38_35%_95%)]/70 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-28 md:w-48 bg-gradient-to-r from-[hsl(38_35%_95%)] via-[hsl(38_35%_95%)]/60 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-28 bg-gradient-to-l from-[hsl(38_35%_95%)] to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 md:h-40 bg-gradient-to-t from-[hsl(38_35%_95%)] via-[hsl(38_35%_95%)]/70 to-transparent" />
              <p className="absolute bottom-5 left-0 right-0 px-6 text-center text-[11px] tracking-[0.2em] uppercase text-foreground/55">
                {data.metroCemeteryCount}+ cemeteries covered · Same-day showings
              </p>
            </div>
          </div>

          {/* Blend the hero into the page below */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
        </section>
      ) : data.slug === "dallas" ? (
        <section className="relative overflow-hidden bg-[hsl(38_35%_95%)] pt-28 md:pt-32">
          <div className="relative container mx-auto px-6 lg:px-10 max-w-[1280px]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="mb-6 flex items-center justify-center gap-4">
                <span className="h-px w-12 bg-accent/40" />
                <p className="text-accent text-[11px] tracking-[0.28em] uppercase font-semibold">{data.metro}</p>
                <span className="h-px w-12 bg-accent/40" />
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-foreground leading-[1.08] tracking-tight [text-wrap:balance]">
                {data.h1Lead} <span className="text-foreground">{data.city}</span>
              </h1>
              <p className="mt-7 text-base md:text-[17px] text-foreground/70 leading-relaxed font-light max-w-2xl mx-auto [text-wrap:balance]">
                {data.intro}
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-full font-medium text-[15px] hover:opacity-90 transition-all">
                  Find a plot in {data.city}
                </Link>
                <Link to="/sell" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-accent/50 text-accent font-medium text-[15px] hover:bg-accent/5 transition-all">
                  Sell a plot in {data.city}
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Full-width illustration */}
          <div className="relative mt-12 md:mt-16">
            <img
              src={dallasHeroArt.url}
              alt="Illustration of a Dallas, Texas cemetery with the downtown Dallas skyline behind it"
              className="w-full object-cover mix-blend-multiply"
              loading="eager"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[hsl(38_35%_95%)] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-28 bg-gradient-to-r from-[hsl(38_35%_95%)] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-28 bg-gradient-to-l from-[hsl(38_35%_95%)] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[hsl(38_35%_95%)] to-transparent" />
          </div>

          {/* Figures */}
          <div className="relative container mx-auto px-6 lg:px-10 max-w-[1280px]">
            <div className="border-t border-foreground/10 pt-10 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/50 mb-2">Cemetery retail</p>
                <p className="font-display text-2xl md:text-[28px] text-foreground">{data.retailRange}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/50 mb-2">Typical resale</p>
                <p className="font-display text-2xl md:text-[28px] text-foreground">{data.resaleRange}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/50 mb-2">Cemeteries covered</p>
                <p className="font-display text-2xl md:text-[28px] text-foreground">{data.metroCemeteryCount}+ in {data.metro}</p>
              </div>
            </div>
          </div>
        </section>

      ) : (
      <section className="relative pt-28 pb-20 overflow-hidden bg-[hsl(38_35%_95%)]">

        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(16_50%_88%)] via-[hsl(38_35%_95%)] to-[hsl(40_45%_92%)]" />
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-[hsl(16_50%_70%)]/20 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-[1]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 Q360 80 720 40 T1440 40 L1440 80 L0 80 Z" className="fill-background" />
        </svg>

        <div className="relative container mx-auto px-6 lg:px-10 max-w-[1280px]">
          <nav aria-label="Breadcrumb" className="mb-8 text-xs tracking-[0.16em] uppercase text-foreground/55">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/cemetery-plots-for-sale-texas" className="hover:text-foreground transition-colors">Texas Plots</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground/80">{data.city}</span>
          </nav>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="grid lg:grid-cols-12 gap-10 xl:gap-16 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                <p className="text-accent text-[11px] tracking-[0.24em] uppercase font-semibold">{data.metro}</p>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.0] mb-7 tracking-tight">
                {data.h1Lead} <span className="italic text-primary">{data.city}</span>
              </h1>
              <p className="text-lg md:text-xl text-foreground/75 leading-relaxed mb-8 font-light">{data.intro}</p>

              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all">
                  <Plus className="w-4 h-4" /> Find a plot in {data.city}
                </Link>
                <Link to="/sell" className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/80 backdrop-blur border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
                  Sell a plot in {data.city} <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="tel:+12142304740" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
                  <Phone className="w-4 h-4" /> (214) 230-4740
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="rounded-2xl bg-background/80 backdrop-blur border border-border p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/55 mb-1.5">Cemetery retail</p>
                <p className="font-display text-2xl md:text-3xl text-foreground">{data.retailRange}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 border border-primary/25 p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary/80 mb-1.5">Typical resale</p>
                <p className="font-display text-2xl md:text-3xl text-primary">{data.resaleRange}</p>
              </div>
              <div className="rounded-2xl bg-background/60 backdrop-blur border border-border/70 p-6 sm:col-span-2 lg:col-span-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/55 mb-1.5">Cemeteries covered</p>
                <p className="font-display text-2xl md:text-3xl text-foreground">{data.metroCemeteryCount}+ in {data.metro}</p>
                <p className="text-xs text-foreground/55 mt-1.5">Part of 198 Texas cemetery profiles we maintain</p>
              </div>

            </div>
          </motion.div>
        </div>
      </section>
      )}





      {/* Coverage map */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-10">
          <MetroCemeteryMap
            regions={data.regions}
            metro={data.metro}
            fullBleed={false}
            blurb={`Every pin is a ${data.metro} cemetery we hold a profile for — pricing, section detail and the current transfer fee. Enter your address to see the closest cemeteries, or hover a pin to highlight it in the list.`}
          />
        </div>
      </section>

      <article className="container mx-auto px-6 lg:px-10 max-w-[1120px] pb-8">

        <div>

          <div className="min-w-0">
        {/* Cemeteries */}
        <Section id="cemeteries" eyebrow="Where we work" title={`Cemeteries we broker in ${data.metro}`}>
          <p>
            These are the {data.city}-area cemeteries we transact in most often. Availability changes weekly — if the cemetery you need isn't listed, we can still source it.
          </p>
          <div className="not-prose grid sm:grid-cols-2 gap-3 mt-6">
            {data.cemeteries.map((c) => (
              <Link
                key={c.slug}
                to={`/cemeteries/${c.slug}`}
                className="group flex items-start justify-between gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                <span>
                  <span className="block font-display text-lg text-foreground leading-snug">{c.name}</span>
                  <span className="block text-sm text-foreground/60 mt-0.5">{c.area}</span>
                </span>
                <ArrowRight className="w-4 h-4 mt-1.5 shrink-0 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </Section>





        {/* Pricing */}
        <Section id="pricing" eyebrow="What it costs" title={`Cemetery plot prices in ${data.city}`}>
          <p>
            A cemetery's counter price is not the market price. In {data.city} a single ground space bought new typically costs{" "}
            <strong>{data.retailRange}</strong>, while the same space on the resale market usually trades at{" "}
            <strong>{data.resaleRange}</strong>. Those are ground-space figures — lawn crypts, mausoleum crypts, private
            estates and feature locations sit well above the top of those ranges, in some parks by a considerable margin.
            Buyers should also budget for opening and closing, a marker and its foundation, and the cemetery's transfer fee;
            owners selling should know those extras are separate from what the property itself is worth.
          </p>
          <ul>
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          <p>
            For a full state-wide breakdown, see our{" "}
            <Link to="/cemetery-plot-cost-texas" className="text-primary underline-offset-4 hover:underline font-medium">
              guide to cemetery plot costs in Texas
            </Link>
            .
          </p>
        </Section>

        {/* Buyers / Sellers */}
        <Section id="how" eyebrow="How it works" title={`Buying and selling in ${data.city}`}>
          <div className="not-prose grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-card border border-border/60">
              <h3 className="font-display text-2xl text-foreground mb-3">If you're buying</h3>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex gap-3"><ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" /> We verify the seller genuinely holds the interment right before you pay anything.</li>
                <li className="flex gap-3"><MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" /> We meet you at the cemetery and walk the section with you.</li>
                <li className="flex gap-3"><FileCheck2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> We complete the cemetery's transfer forms and confirm it's recorded.</li>
              </ul>
              <Link to="/contact#buy-inquiry" className="mt-6 inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
                Tell us what you're looking for <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 rounded-3xl bg-card border border-border/60">
              <h3 className="font-display text-2xl text-foreground mb-3">If you're selling</h3>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex gap-3"><Wallet className="w-5 h-5 text-accent shrink-0 mt-0.5" /> Free valuation against current {data.city} retail pricing — no upfront appraisal fee.</li>
                <li className="flex gap-3"><ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" /> We market to real buyers, not a classifieds listing that invites scams.</li>
                <li className="flex gap-3"><FileCheck2 className="w-5 h-5 text-accent shrink-0 mt-0.5" /> We handle the paperwork, the funds and the cemetery transfer.</li>
              </ul>
              <Link to="/sell" className="mt-6 inline-flex items-center gap-2 text-accent font-medium hover:gap-3 transition-all">
                Get a free valuation <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Section>

        {/* Areas served */}
        <Section id="areas" eyebrow="Areas served" title={`Serving families across ${data.metro}`}>
          <div className="not-prose flex flex-wrap gap-2">
            {data.neighborhoods.map((n) => (
              <span key={n} className="px-4 py-2 rounded-full bg-muted/60 border border-border/60 text-sm text-foreground/75">{n}</span>
            ))}
          </div>
          <p className="mt-6">
            We also broker across the rest of the state — browse the{" "}
            <Link to="/cemeteries" className="text-primary underline-offset-4 hover:underline font-medium">Texas cemetery directory</Link>{" "}
            or read the{" "}
            <Link to="/sell-cemetery-plot-texas" className="text-primary underline-offset-4 hover:underline font-medium">guide to selling a cemetery plot in Texas</Link>.
          </p>
        </Section>

        {/* Price drivers */}
        <Section id="drivers" eyebrow="What moves the number" title={`What decides a plot's value in ${data.city}`}>
          <p>
            Two spaces in the same {data.city} cemetery can be worth very different amounts. These are the factors we weigh when we
            value a property:
          </p>
          <ul>
            <li><strong>The cemetery itself</strong> — established memorial parks inside the {data.metro} core price well above outlying and rural grounds.</li>
            <li><strong>The section and garden</strong> — sold-out and historic gardens hold the most value because the cemetery cannot create new supply there.</li>
            <li><strong>Property type</strong> — a cremation niche, a single ground space, a companion double-depth grave, a lawn crypt and a mausoleum crypt all sit at different points on the curve.</li>
            <li><strong>What's included</strong> — some spaces transfer with a vault, an opening/closing credit or an existing marker foundation already paid for, which lifts the value.</li>
            <li><strong>Whether they're adjacent</strong> — a pair or a set of four side by side is worth more per space than the same number scattered across a section.</li>
          </ul>
          <p>
            The full statewide breakdown, including what the cemetery charges on top of the space, is in our{" "}
            <Link to="/cemetery-plot-cost-texas" className="text-primary underline-offset-4 hover:underline font-medium">Texas cemetery plot cost guide</Link>.
          </p>
        </Section>

        {/* Timeline */}
        <Section id="timeline" eyebrow="What to expect" title={`How a ${data.city} sale runs, step by step`}>
          <div className="not-prose grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { n: "01", t: "Valuation", d: `We price your space against current ${data.city} cemetery retail and recent resale activity. Free, no obligation.` },
              { n: "02", t: "Listing", d: "Photographs, section detail and cemetery specifics go live, and we market directly to buyers already searching your cemetery." },
              { n: "03", t: "Buyer & agreement", d: "We verify the buyer, agree the price in writing and prepare the cemetery's transfer paperwork." },
              { n: "04", t: "Transfer & funds", d: "The cemetery records the new owner, funds are released, and you receive a copy of everything filed." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-2xl bg-card border border-border/60">
                <p className="font-display text-3xl text-primary/30 leading-none mb-3">{s.n}</p>
                <h3 className="font-display text-lg text-foreground mb-2 leading-snug">{s.t}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Property types locally */}
        <Section id="types" eyebrow="What's available" title={`Types of cemetery property in ${data.city}`}>
          <p>
            Not every family needs a traditional ground space, and in {data.city} the resale market carries the full range.
            What suits you depends on the service you want, whether cremation is part of the plan, and how many people the
            property needs to hold.
          </p>
          <div className="not-prose grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-6">
            {[
              { t: "Single ground space", d: "One interment. In many Texas parks a cremated interment may also be placed in the same space — worth asking, because it can serve two people." },
              { t: "Companion / double depth", d: "Two interments in one grave, one above the other. Priced above a single space but well below two, and the most common family purchase." },
              { t: "Side-by-side pair", d: "Two adjacent spaces. Sets of two and four bought decades ago are the property we resell most often in the metro." },
              { t: "Cremation niche", d: "A glass or granite-fronted niche in a columbarium wall or garden feature. Usually the most affordable memorial-park option." },
              { t: "Lawn crypt", d: "A pre-installed concrete crypt, normally sold as a companion pair, so the outer container cost is already covered." },
              { t: "Mausoleum crypt", d: "Indoor or garden mausoleum space, priced by tier — heart-level and eye-level positions carry the highest prices." },
            ].map((p) => (
              <div key={p.t} className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/35 transition-colors">
                <h3 className="font-display text-lg text-foreground leading-snug mb-2">{p.t}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6">
            Full comparison on the{" "}
            <Link to="/property-types" className="text-primary underline-offset-4 hover:underline font-medium">
              cemetery property types
            </Link>{" "}
            page.
          </p>
        </Section>

        {/* Veterans + practical notes */}
        <Section id="veterans" eyebrow="Good to know" title={`Practical notes for ${data.city} families`}>
          <div className="not-prose grid md:grid-cols-3 gap-4">
            {[
              {
                t: "Veterans and spouses",
                d: `National cemeteries serving ${data.metro} provide burial at no cost to eligible veterans and their spouses, and those spaces are never resold. If eligibility applies, that is almost always the right route — we will tell you so rather than sell you a space you don't need.`,
              },
              {
                t: "Religious and parish grounds",
                d: "Catholic, Jewish and parish-run cemeteries often set their own eligibility and transfer rules. We confirm whether a buyer qualifies with the cemetery in writing before any money changes hands.",
              },
              {
                t: "Buying beside family",
                d: `If a relative is already interred in a ${data.city} cemetery, tell us the section and garden. Adjacent spaces come up through families more often than through the cemetery office, and we can watch for them.`,
              },
            ].map((n) => (
              <div key={n.t} className="p-6 rounded-3xl bg-secondary/40 border border-border/60">
                <h3 className="font-display text-xl text-foreground leading-snug mb-2.5">{n.t}</h3>
                <p className="text-sm text-foreground/75 leading-relaxed">{n.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" eyebrow="Frequently asked" title={`${data.city} questions`}>
          <div className="space-y-4 not-prose">
            {faqs.map((f) => (
              <details key={f.q} className="group p-5 rounded-2xl bg-card border border-border/60 open:border-primary/30 transition-colors">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <span className="font-display text-lg text-foreground leading-snug">{f.q}</span>
                  <span className="shrink-0 mt-1 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center group-open:rotate-45 transition-transform">
                    <Plus className="w-4 h-4" />
                  </span>
                </summary>
                <p className="mt-4 text-foreground/80 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>
          </div>
          {/* CTA band replacing the old sticky rail */}
          <div className="mt-12 rounded-3xl bg-primary text-primary-foreground p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="font-display text-2xl md:text-3xl leading-snug mb-2">Talk to a {data.city} broker.</p>
              <p className="text-primary-foreground/80 text-sm md:text-base leading-relaxed max-w-xl">
                Tell us the cemetery and we'll come back within 24 hours with real numbers — free, no obligation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:-translate-y-0.5 transition-all">
                Contact us <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="tel:+12142304740" className="inline-flex items-center gap-2 text-sm text-primary-foreground/90 hover:text-primary-foreground transition-colors">
                <Phone className="w-4 h-4" /> (214) 230-4740
              </a>
            </div>
          </div>
        </div>


        {/* Other metros — full width, keeps every city page one click apart */}
        <section aria-labelledby="other-metros" className="mt-4 mb-2">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 id="other-metros" className="font-display text-2xl md:text-3xl text-foreground tracking-tight">
              Cemetery plots in other Texas metros
            </h2>
            <Link to="/cemeteries" className="text-sm text-primary hover:underline underline-offset-4 whitespace-nowrap">
              Full directory
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CITY_PAGES.filter((c) => c.slug !== data.slug).map((c) => (
              <Link
                key={c.slug}
                to={`/cemetery-plots-for-sale-${c.slug}`}
                className="group relative overflow-hidden p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 hover:-translate-y-1 transition-all"
              >
                <span className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-primary/5 group-hover:bg-accent/10 transition-colors" />
                <p className="relative text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">{c.metro}</p>
                <p className="relative font-display text-xl text-foreground leading-snug mb-3">{c.city}</p>
                <p className="relative text-sm text-foreground/60">{c.metroCemeteryCount}+ cemeteries covered</p>
                <span className="relative mt-4 inline-flex items-center gap-2 text-sm text-primary">
                  View plots <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
            <Link
              to="/cemetery-plots-for-sale-texas"
              className="group p-6 rounded-3xl bg-secondary/50 border border-border/60 hover:border-accent/40 hover:-translate-y-1 transition-all sm:col-span-2 lg:col-span-1"
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">Statewide</p>
              <p className="font-display text-xl text-foreground leading-snug mb-3">All of Texas</p>
              <p className="text-sm text-foreground/60">198 cemetery profiles statewide</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm text-accent">
                Buyer's guide <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </section>


        {/* CTA */}
        <section className="mt-10 mb-8">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4 leading-[1.05]">Talk to a {data.city} broker</h2>
            <p className="text-primary-foreground/85 text-lg leading-relaxed mb-7 max-w-2xl">
              Whether you're looking for a space or ready to sell one, tell us the cemetery and we'll come back within 24 hours with real numbers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-medium hover:-translate-y-0.5 transition-all">
                Contact us <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="tel:+12142304740" className="inline-flex items-center gap-2 px-6 py-3 bg-background/15 backdrop-blur border border-primary-foreground/30 rounded-2xl font-medium hover:bg-background/25 transition-all">
                Call (214) 230-4740
              </a>
            </div>
          </div>
        </section>
      </article>

      <Footer />
    </div>
  );
};

export default CityPlotsPage;
