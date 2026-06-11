import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Plus, MapPin, ShieldCheck, Eye, Wallet, Search, FileCheck2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline font-medium">
    {children}
  </a>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">{children}</p>
);

const cities: { city: string; parks: string[] }[] = [
  { city: "Dallas–Fort Worth", parks: ["Restland", "Hillcrest", "Sparkman/Hillcrest", "Laurel Land", "Greenwood"] },
  { city: "Greater Houston", parks: ["Forest Park (Lawndale, Westheimer, East)", "Memorial Oaks", "Earthman", "Brookside", "Rosewood"] },
  { city: "Austin & Central Texas", parks: ["Cook-Walden", "Capital Parks", "Austin Memorial Park", "College Station"] },
  { city: "San Antonio", parks: ["Mission Burial Park", "Sunset Memorial", "San Jose Burial Park", "Roselawn"] },
  { city: "El Paso & West Texas", parks: ["Restlawn", "Evergreen", "Mount Carmel"] },
];

const propertyTypes = [
  { t: "Burial plots", d: "Single or companion (side-by-side) ground spaces." },
  { t: "Cremation niches", d: "Indoor or outdoor columbarium spaces for an urn." },
  { t: "Lawn crypts", d: "Pre-installed underground vaults, often sold as companion pairs." },
  { t: "Mausoleum crypts", d: "Above-ground entombment, from single to family-sized." },
  { t: "Family estates", d: "Larger private sections for multiple family members." },
];

const trustReasons = [
  { Icon: ShieldCheck, t: "We verify ownership and the property", d: "Before you ever pay, we confirm the seller actually holds the right of sepulture and that the cemetery will record the transfer." },
  { Icon: Wallet, t: "We handle payment and the transfer", d: "Funds, paperwork and the cemetery's recorded conveyance — all run through a proper, documented process." },
  { Icon: Eye, t: "We show you the plot in person", d: "We walk the grounds with you. You should feel certain about a final resting place, not rushed." },
  { Icon: FileCheck2, t: "We complete the cemetery paperwork", d: "Each cemetery has its own forms, transfer fees and recording rules. We know them, and we do them." },
];

const faqs = [
  {
    q: "How much can I save buying a cemetery plot through a broker?",
    a: "Most buyers save 30–50% compared with buying directly from the cemetery, and sometimes more on premium or sold-out sections. The savings come from the resale market — current owners selling below today's cemetery retail price.",
  },
  {
    q: "Can I buy a plot in a cemetery section that's sold out?",
    a: "Often, yes. When a cemetery section is sold out the cemetery office can't sell new spaces there, but individual owners still have plots to sell. We hold resale inventory in many closed and sold-out sections, including spaces beside existing family plots.",
  },
  {
    q: "Can I see the plot before I buy it?",
    a: "Yes. We meet you at the cemetery and walk the grounds with you so you can see the exact location and understand how sections differ. We're happy to show a plot more than once before you decide.",
  },
  {
    q: "Do you offer financing on cemetery plots?",
    a: "For pre-need (planning-ahead) purchases we offer our best pricing plus financing — as little as 20% down with 0% interest. At-need purchases are handled as quickly as possible to avoid delaying a burial.",
  },
  {
    q: "Is buying through a broker safer than Craigslist or a marketplace?",
    a: "Yes. On a marketplace you verify the seller, confirm the plot, handle payment and do the transfer paperwork yourself — and plot-sale scams are common. We verify ownership, manage payment, show you the property in person, and complete the recorded transfer for you.",
  },
  {
    q: "What's the difference between buying at-need and pre-need?",
    a: "At-need means buying now because a death has occurred; we move quickly to complete the transfer. Pre-need means planning ahead, which unlocks our best pricing and financing and spares your family the decision later.",
  },
];

const PATH = "/cemetery-plots-for-sale-texas";
const FULL = `https://texascemeterybrokers.com${PATH}`;

const jsonLd: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cemetery Plots for Sale in Texas",
    description: "Buy cemetery plots, niches and crypts across Texas for 30–50% below cemetery prices — verified resale inventory, in-person showings and 0% pre-need financing.",
    mainEntityOfPage: FULL,
    url: FULL,
    inLanguage: "en-US",
    author: { "@type": "Organization", name: "Texas Cemetery Brokers", url: "https://texascemeterybrokers.com/" },
    publisher: { "@type": "Organization", name: "Texas Cemetery Brokers", url: "https://texascemeterybrokers.com/" },
    about: ["Cemetery plots", "Burial property resale", "Texas cemeteries"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Cemetery plot brokerage",
    name: "Buy Cemetery Plots in Texas",
    areaServed: { "@type": "State", name: "Texas" },
    url: FULL,
    provider: {
      "@type": "LocalBusiness",
      name: "Texas Cemetery Brokers",
      telephone: "+1-214-230-4740",
      email: "info@texascemeterybrokers.com",
      priceRange: "$$",
      address: { "@type": "PostalAddress", addressRegion: "TX", addressCountry: "US" },
      areaServed: "Texas",
      sameAs: ["https://bayercemeterybrokers.com/"],
    },
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
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
      { "@type": "ListItem", position: 2, name: "Buy Property", item: "https://texascemeterybrokers.com/buy" },
      { "@type": "ListItem", position: 3, name: "Cemetery Plots for Sale in Texas", item: FULL },
    ],
  },
];

const Section: React.FC<{ id?: string; eyebrow?: string; title: React.ReactNode; children: React.ReactNode }> = ({ id, eyebrow, title, children }) => (
  <section id={id} className="py-12 md:py-16 scroll-mt-24">
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground mb-6 leading-[1.05]">{title}</h2>
    <div className="prose prose-lg max-w-none text-foreground/85 [&_p]:leading-relaxed [&_p]:mb-5 [&_strong]:text-foreground">{children}</div>
  </section>
);

const GuideBuyingCemeteryPlot = () => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="Cemetery Plots for Sale in Texas | Up to 50% Off Retail"
      description="Buy cemetery plots, niches & crypts across Texas for 30–50% below cemetery prices. Verified resale inventory, in-person showings & 0% pre-need financing."
      path={PATH}
      type="article"
      jsonLd={jsonLd}
    />
    <Navbar forceScrolled />

    {/* HERO */}
    <section className="relative pt-28 pb-24 overflow-hidden bg-[hsl(38_35%_95%)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(16_50%_88%)] via-[hsl(38_35%_95%)] to-[hsl(40_45%_92%)]" />
      <div className="absolute top-0 right-0 w-[44rem] h-[44rem] rounded-full bg-[hsl(16_50%_70%)]/25 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[34rem] h-[34rem] rounded-full bg-[hsl(145_25%_55%)]/15 blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(hsl(28 20% 50% / 0.35) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
      {/* Botanical accents — same six flowers, mixed placement so nothing repeats */}
      {(() => {
        const FLOWERS = import.meta.glob("@/assets/flowers/*.asset.json", { eager: true, import: "default" }) as Record<string, { url: string }>;
        const byName = (n: string) => Object.entries(FLOWERS).find(([k]) => k.includes(n))?.[1]?.url;
        const scatter = [
          { top: "6%",  left: "-4%",  w: 230, rot:  12, op: 0.55, src: byName("plumeria-cluster") },
          { top: "4%",  right: "-3%", w: 220, rot: -16, op: 0.55, src: byName("leaf-veined") },
          { bottom: "12%", right: "3%", w: 200, rot:  10, op: 0.55, src: byName("palm-fan-clean") },
          { bottom: "16%", left: "4%", w: 180, rot: -12, op: 0.55, src: byName("hibiscus-coral") },
        ];
        return scatter.map((s, i) => s.src ? (
          <img key={i} src={s.src} alt="" aria-hidden
               className="absolute pointer-events-none select-none hidden md:block"
               style={{ top: s.top, bottom: s.bottom, left: s.left, right: s.right, width: s.w, opacity: s.op, transform: `rotate(${s.rot}deg)` }} />
        ) : null);
      })()}
      <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-[1]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 Q360 80 720 40 T1440 40 L1440 80 L0 80 Z" className="fill-background" />
      </svg>

      <div className="relative container mx-auto px-6 max-w-5xl">
        <Link to="/guides" className="inline-flex items-center gap-1.5 text-xs tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Guides
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <p className="text-accent text-[11px] tracking-[0.24em] uppercase font-semibold">The Buyer's Guide</p>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] text-foreground leading-[0.98] mb-7 tracking-tight">
            Cemetery Plots for Sale in <span className="italic text-primary">Texas</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/75 leading-relaxed mb-8 max-w-2xl font-light">
            Buy plots, niches and crypts across Texas for typically 30–50% below cemetery retail. Verified resale inventory, in-person showings, and a guided transfer from start to finish.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-wide text-foreground/60 mb-9">
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> Texas Cemetery Brokers</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> Updated 2026</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> 8 min read</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> 10 chapters</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
            <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Request a Buyer Concierge
            </Link>
            <Link to="/buy" className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/80 backdrop-blur border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
              Browse Available Plots <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="pt-6 border-t border-border/50">
            <p className="text-[10px] tracking-[0.28em] uppercase font-semibold text-foreground/50 mb-3">In this guide</p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: "#how", t: "How to buy" },
                { href: "#savings", t: "Why it costs less" },
                { href: "#sold-out", t: "Sold-out sections" },
                { href: "#in-person", t: "See it in person" },
                { href: "#timing", t: "At-need vs pre-need" },
                { href: "#vs-marketplace", t: "Broker vs Craigslist" },
                { href: "#what-you-buy", t: "What you're buying" },
                { href: "#types", t: "Property types" },
                { href: "#coverage", t: "Coverage" },
                { href: "#faq", t: "FAQ" },
              ].map((c) => (
                <a key={c.href} href={c.href} className="text-xs px-3 py-1.5 rounded-full bg-card border border-border/60 text-foreground/75 hover:border-primary/40 hover:text-primary transition-colors">
                  {c.t}
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-foreground/55">
              Need to sell a plot instead? <Link to="/sell-cemetery-plot-texas" className="text-primary underline-offset-4 hover:underline font-medium">Read the seller's guide →</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </section>

    {/* ARTICLE BODY */}
    <article className="py-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-primary">
          Buying a cemetery plot is one of the few major purchases most families make with no experience and, often, no time. Whether you're planning ahead or facing an unexpected loss, the price the cemetery quotes is rarely the only option — and almost never the lowest. Across Texas, families are buying the exact same plots, niches and crypts on the resale market for 30–50% less than cemetery retail, in the cemetery and section they actually want. This guide explains how it works, what to watch for, and why buying through a broker is safer and cheaper than a marketplace or a private listing.
        </p>

        {/* Short answer */}
        <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 overflow-hidden my-12">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/15 blur-2xl" />
          <Eyebrow>The short answer</Eyebrow>
          <p className="relative text-lg md:text-xl text-foreground/90 leading-relaxed">
            You can buy a cemetery plot in Texas directly from the cemetery, or for far less on the resale market — where current owners sell plots they no longer need. A broker like Texas Cemetery Brokers matches you to verified resale plots at the right cemetery and section, shows you the property in person, handles the entire transfer, and passes on savings of typically 30–50% versus buying from the cemetery.
          </p>
        </div>

        <Section id="how" eyebrow="The path most families take" title="How to buy a cemetery plot in Texas">
          <p>There are two ways to buy: directly from the cemetery at full retail, or on the <strong>resale market</strong>, where you buy from an owner who no longer needs their plot. Resale is where the savings are. Here's the path most families take:</p>
          <ul className="space-y-3 mb-6">
            <li><strong>Decide what you need.</strong> A single plot, companion (side-by-side) plots, a cremation niche, a mausoleum crypt, or a family estate. Each has its own market and price.</li>
            <li><strong>Pick the cemetery and area.</strong> Closeness to family, a particular faith section, or a specific garden often matters most.</li>
            <li><strong>Compare retail to resale.</strong> Get the cemetery's current price, then see what the same property sells for secondhand.</li>
            <li><strong>Verify ownership and the cemetery's transfer rules.</strong> Every cemetery has its own forms, transfer fee and process.</li>
            <li><strong>Complete the transfer correctly.</strong> The sale isn't final until the cemetery records the new owner — the step private buyers most often get wrong.</li>
          </ul>
          <p>A broker compresses all of this into one guided process. We do the searching, the verification, the showing and the paperwork, so you make one decision: the right plot, at the right price.</p>
          <div className="mt-6 p-5 rounded-2xl bg-accent/10 border border-accent/25 flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-foreground/90 m-0">Tell us what you're looking for and we'll hand-pick matching plots — free, no obligation.</p>
            <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:-translate-y-0.5 transition-all">
              Request a buyer concierge <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Section>

        <Section id="savings" eyebrow="The honest reason resale costs less" title="Why cemetery plots cost less through a broker">
          <p>If you searched for a <strong>cheap or affordable cemetery plot</strong>, here's the honest reason resale costs less: cemeteries sell new plots at today's retail price, which rises almost every year. A family who bought years ago — or who is selling an inherited or unneeded plot — is usually willing to sell below that current price. You get the identical property for less, and the savings come from the market, not from cutting any corner.</p>
          <ul className="space-y-3">
            <li><strong>Typically 30–50% below cemetery retail</strong>, sometimes more on premium or sold-out sections.</li>
            <li><strong>No price markup from us to you</strong> — we work on the resale market and pass the savings on.</li>
            <li><strong>The same deed, the same cemetery, the same section</strong> — just a lower price.</li>
          </ul>
          <p>This is why families increasingly compare resale before buying direct. The plot is the same; the price is not.</p>
        </Section>

        <Section id="sold-out" eyebrow="Off-market inventory" title="Plots the cemetery can't sell you">
          <p>This is the part most buyers don't realize. When a cemetery's section is <strong>sold out</strong>, the cemetery office can no longer sell you a space there — even if that's the exact garden where your family is, or the view or shade you wanted. But individual owners in those sold-out sections still have plots they're ready to sell.</p>
          <p>That's where a broker becomes essential. We hold <strong>resale inventory in cemeteries and sections that are closed or sold out at the cemetery office</strong>, including spaces beside existing family plots. If you've been told "that section is full," there may still be a way in through the resale market — and we can often find it.</p>
          <ul className="space-y-3">
            <li><strong>Access to sold-out and closed sections</strong> no longer sold by the cemetery.</li>
            <li><strong>Spaces near a specific feature</strong> — a tree, a fountain, a chapel, or an existing family plot.</li>
            <li><strong>Off-market property</strong> that never appears on the cemetery's own price list.</li>
          </ul>
        </Section>

        <Section id="in-person" eyebrow="No photos, no pressure" title="See the plot in person before you decide">
          <p>A final resting place is deeply personal, and most families want to stand on the ground before they commit. We don't expect you to choose from a photo. We <strong>meet you at the cemetery and walk the grounds with you</strong>, showing the exact location, explaining how sections and gardens differ, and answering every question on the spot.</p>
          <p>It's not unusual for us to show a single plot several times — to different families, on different days — before the right family decides it's the place for them. That patience is the point: you should feel certain, not rushed. A marketplace listing or a private seller simply can't offer this.</p>
        </Section>

        <Section id="timing" eyebrow="At-need or pre-need" title="Buying now for a loss, or planning ahead">
          <p><strong>Buying at-need (a loved one has passed).</strong> When time is short and emotions are high, the last thing a family needs is a complicated, uncertain purchase. Because we know each cemetery's process and work directly with their offices, we can move quickly — finding an appropriate plot and completing the transfer as fast as possible, so the burial isn't held up.</p>
          <p><strong>Buying pre-need (planning ahead).</strong> Planning early is the single best way to save and to spare your family a difficult decision later. Pre-need buyers get our <strong>best pricing</strong>, plus the option to spread the cost: <strong>as little as 20% down and 0% interest financing</strong>. You lock in today's resale price, pay over time with no interest, and take that worry off the table for good.</p>
          <ul className="space-y-3">
            <li><strong>At-need:</strong> fast, guided, transfer completed as quickly as the cemetery allows.</li>
            <li><strong>Pre-need:</strong> best pricing, 20% down, 0% interest financing, no pressure.</li>
          </ul>
        </Section>

        {/* Trust pillars — visual block */}
        <section id="vs-marketplace" className="my-16 scroll-mt-24">
          <Eyebrow>Broker vs Craigslist or marketplace</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground mb-6 leading-[1.05]">A marketplace charges you to do the hard part yourself</h2>
          <p className="text-foreground/85 text-lg leading-relaxed mb-8 max-w-3xl">
            You'll find cemetery plots listed on Craigslist, eBay and for-sale-by-owner sites. They can look cheaper at a glance — but the price on the screen isn't the whole story, and the risks are real. On a marketplace <strong>you do everything yourself</strong>: verify the seller is the real owner, confirm the plot exists and isn't already used, arrange payment safely, and figure out the cemetery's transfer paperwork on your own. Plot-sale scams are common, and once money changes hands incorrectly it's very hard to undo.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {trustReasons.map(({ Icon, t, d }) => (
              <div key={t} className="p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg mb-2 text-foreground">{t}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-foreground/85 leading-relaxed">We're reachable and accountable — not an anonymous listing that vanishes after the sale.</p>
        </section>

        <Section id="what-you-buy" eyebrow="The right of sepulture" title="What you're actually buying">
          <p>When you "buy a cemetery plot" in Texas, you aren't buying the land itself. You're buying the <strong>exclusive right of sepulture</strong> — the legal right to bury someone in a specific space — while the cemetery keeps and maintains the land. That's why every transfer runs through the cemetery and why correct paperwork matters so much.</p>
          <p>A few things to confirm on any purchase:</p>
          <ul className="space-y-3">
            <li><strong>What's included</strong> — the space(s), and whether a vault, marker or opening-and-closing is part of the deal.</li>
            <li><strong>The cemetery's transfer fee</strong>, paid to the cemetery to record the new owner.</li>
            <li><strong>Whether the cemetery is a perpetual-care cemetery</strong>, meaning it maintains a trust fund for long-term upkeep — see the <Ext href="https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm">Texas Health &amp; Safety Code Ch. 711</Ext> and the <Ext href="https://www.dob.texas.gov/cemetery-prepaid-funeral-services">Texas Department of Banking</Ext>.</li>
          </ul>
          <p>We confirm all of this for you as part of every transaction.</p>
        </Section>

        <Section id="types" eyebrow="Compare what fits" title="Property types you can buy">
          <div className="grid sm:grid-cols-2 gap-4 not-prose">
            {propertyTypes.map((p) => (
              <div key={p.t} className="p-5 rounded-2xl bg-card border border-border/60">
                <p className="font-display text-lg text-foreground mb-1">{p.t}</p>
                <p className="text-sm text-foreground/70 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6">Not sure which is right? <Link to="/property-types" className="text-primary underline-offset-4 hover:underline font-medium">Compare property types →</Link></p>
        </Section>

        <Section id="coverage" eyebrow="Statewide coverage" title="Where we help buyers across Texas">
          <p>We match buyers to verified resale plots statewide, with deep inventory in every major metro:</p>
          <div className="grid sm:grid-cols-2 gap-4 not-prose">
            {cities.map((c) => (
              <div key={c.city} className="p-5 rounded-2xl bg-card border border-border/60">
                <p className="inline-flex items-center gap-2 font-display text-lg text-foreground mb-2">
                  <MapPin className="w-4 h-4 text-primary" /> {c.city}
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed">{c.parks.join(" · ")}</p>
              </div>
            ))}
          </div>
          <p className="mt-6">Wherever you're looking, we likely already have inventory or active sellers nearby. <Link to="/cemeteries" className="text-primary underline-offset-4 hover:underline font-medium">Browse every cemetery we serve →</Link></p>
        </Section>

        {/* Four-step process */}
        <section className="my-16 scroll-mt-24">
          <Eyebrow>How buying works</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground mb-8 leading-[1.05]">Four simple steps</h2>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 not-prose">
            {[
              { Icon: Search, n: "01", t: "Tell us what you need", d: "Property type, cemetery or area, budget and timeline. Use our free buyer concierge." },
              { Icon: Sparkles, n: "02", t: "We do the legwork", d: "We search resale inventory and active sellers, verify availability and ownership, and bring you matches — including off-market and sold-out sections." },
              { Icon: Eye, n: "03", t: "Review and visit", d: "We show you options and pricing with no pressure, and walk the cemetery with you in person." },
              { Icon: FileCheck2, n: "04", t: "Close with confidence", d: "We manage payment, the cemetery paperwork and the recorded transfer from start to finish." },
            ].map((s) => (
              <li key={s.n} className="p-6 rounded-2xl bg-card border border-border/60 relative overflow-hidden">
                <p className="font-display text-5xl text-primary/15 absolute top-2 right-4 leading-none">{s.n}</p>
                <s.Icon className="w-6 h-6 text-primary mb-3" />
                <p className="font-display text-lg text-foreground mb-1">{s.t}</p>
                <p className="text-sm text-foreground/70 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all">
              Request a buyer concierge — free, response within 24 hours <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <Section id="faq" eyebrow="Frequently asked" title="Buyer FAQ">
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

        {/* Closing CTA */}
        <section id="contact" className="mt-16 mb-8 scroll-mt-24">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4 leading-[1.05]">Ready to find the right plot?</h2>
            <p className="text-primary-foreground/85 text-lg leading-relaxed mb-7 max-w-2xl">
              Tell our buyer concierge what you're looking for. We'll come back within 24 hours with matched, verified options — at the cemetery and price that work for your family.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-medium hover:-translate-y-0.5 transition-all">
                Request a buyer concierge <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="tel:+12142304740" className="inline-flex items-center gap-2 px-6 py-3 bg-background/15 backdrop-blur border border-primary-foreground/30 rounded-2xl font-medium hover:bg-background/25 transition-all">
                Call (214) 230-4740
              </a>
              <Link to="/buy" className="inline-flex items-center gap-2 px-6 py-3 bg-background/15 backdrop-blur border border-primary-foreground/30 rounded-2xl font-medium hover:bg-background/25 transition-all">
                Browse available plots
              </Link>
            </div>
            <p className="mt-8 text-xs text-primary-foreground/65 max-w-2xl leading-relaxed">
              Texas Cemetery Brokers operates in partnership with <Ext href="https://bayercemeterybrokers.com/">Bayer Cemetery Brokers</Ext>, a licensed California brokerage (CEB 1512). Texas has no cemetery-broker license requirement (the registration was repealed September 1, 2019). Any client reviews or ratings shown elsewhere on this site referencing Bayer are reviews of our partner brokerage. This page is informational and is not legal advice; cemetery rules and fees vary by location.
            </p>
          </div>
        </section>
      </div>
    </article>

    <Footer />
  </div>
);

export default GuideBuyingCemeteryPlot;
