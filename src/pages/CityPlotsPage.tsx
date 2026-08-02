import { useLocation, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Phone, Plus, ShieldCheck, Wallet, FileCheck2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";

import { getCityPage, CITY_PAGES } from "./city-page-data";

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
  const data = getCityPage(pathname.replace(/^\/cemetery-plots-for-sale-/, "").replace(/\/$/, ""));

  if (!data) return <Navigate to="/cemetery-plots-for-sale-texas" replace />;

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
      a: `Listing to closed sale is commonly 30–90 days depending on the cemetery and section. Once a buyer is agreed, the cemetery transfer itself usually records within two to four weeks.`,
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
      <section className="relative pt-28 pb-20 overflow-hidden bg-[hsl(38_35%_95%)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(16_50%_88%)] via-[hsl(38_35%_95%)] to-[hsl(40_45%_92%)]" />
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-[hsl(16_50%_70%)]/20 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-[1]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 Q360 80 720 40 T1440 40 L1440 80 L0 80 Z" className="fill-background" />
        </svg>

        <div className="relative container mx-auto px-6 lg:px-10 max-w-7xl">
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

      <article className="container mx-auto px-6 lg:px-10 max-w-7xl pb-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem] gap-10 xl:gap-16 items-start">
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

        <MetroCemeteryMap
          regions={data.regions}
          metro={data.metro}
          blurb={`Every pin is a ${data.metro} cemetery we hold a profile for — pricing, section detail and the current transfer fee. Hover a pin or a name to see where it sits, then open the cemetery for detail.`}
        />


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

          {/* Sticky rail */}
          <aside className="hidden lg:block lg:sticky lg:top-28 space-y-6">
            <div className="rounded-3xl border border-border/70 bg-card p-6">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-4">{data.city} at a glance</p>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-foreground/55">Cemetery retail</dt>
                  <dd className="font-display text-lg text-foreground leading-snug">{data.retailRange}</dd>
                </div>
                <div>
                  <dt className="text-foreground/55">Typical resale</dt>
                  <dd className="font-display text-lg text-primary leading-snug">{data.resaleRange}</dd>
                </div>
                <div>
                  <dt className="text-foreground/55">Typical time to sale</dt>
                  <dd className="font-display text-lg text-foreground leading-snug">30–90 days</dd>
                </div>
                <div>
                  <dt className="text-foreground/55">Valuation</dt>
                  <dd className="font-display text-lg text-foreground leading-snug">Free, no obligation</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-border/70 bg-secondary/40 p-6">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-4">On this page</p>
              <ol className="space-y-2 text-sm list-none pl-0 text-foreground/75">
                <li><a href="#cemeteries" className="hover:text-primary transition-colors">Cemeteries we broker</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">What it costs</a></li>
                <li><a href="#how" className="hover:text-primary transition-colors">Buying and selling</a></li>
                <li><a href="#areas" className="hover:text-primary transition-colors">Areas served</a></li>
                <li><a href="#drivers" className="hover:text-primary transition-colors">What decides value</a></li>
                <li><a href="#timeline" className="hover:text-primary transition-colors">Step by step</a></li>
                <li><a href="#faq" className="hover:text-primary transition-colors">Questions</a></li>
              </ol>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-6">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-4">Other Texas cities</p>
              <ul className="space-y-2.5 text-sm list-none pl-0">
                {CITY_PAGES.filter((c) => c.slug !== data.slug).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/cemetery-plots-for-sale-${c.slug}`} className="group inline-flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors">
                      {c.city} <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
                <li><Link to="/cemetery-plot-cost-texas" className="text-primary underline-offset-4 hover:underline">Texas plot cost guide</Link></li>
              </ul>
            </div>

            <div className="rounded-3xl bg-primary text-primary-foreground p-6">
              <p className="font-display text-xl leading-snug mb-3">Talk to a {data.city} broker.</p>
              <p className="text-primary-foreground/80 text-sm leading-relaxed mb-5">
                Tell us the cemetery and we'll come back within 24 hours with real numbers.
              </p>
              <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:-translate-y-0.5 transition-all">
                Contact us <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="tel:+12142304740" className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground transition-colors">
                <Phone className="w-4 h-4" /> (214) 230-4740
              </a>
            </div>
          </aside>
        </div>

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
