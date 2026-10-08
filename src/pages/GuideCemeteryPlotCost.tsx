import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Phone, ExternalLink, MapPin, Receipt, Landmark, TrendingUp, Lightbulb, CircleHelp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import PreneedBlock from "@/components/PreneedBlock";
import PlotResaleCalculator from "@/components/PlotResaleCalculator";
import { RESTLAND_HERO, RESTLAND_STRIP } from "@/data/restlandDossierPhotos";
import { MotionConfig } from "framer-motion";



const PATH = "/cemetery-plot-cost-texas";
const SITE = "https://texascemeterybrokers.com";
const FULL = `${SITE}${PATH}`;
const TRENDS_URL = "https://bayercemeterybrokers.com/cemetery-grave-plot-price-increases-market-trend-analysis/";

const Section: React.FC<{
  id?: string;
  icon: typeof MapPin;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, icon: Icon, eyebrow, title, children }) => (
  <section id={id} className="cost-chapter scroll-mt-28 border-t border-border/60 pt-10 md:pt-14 pb-12 md:pb-16">
    <div className="grid md:grid-cols-12 gap-6 md:gap-10">
      <div className="md:col-span-3">
        <div className="md:sticky md:top-28">
          <Icon className="cost-chapter-label w-8 h-8 mb-4" strokeWidth={1.4} />
          <p className="text-[10px] uppercase tracking-[0.3em] cost-chapter-label font-medium">{eyebrow}</p>
        </div>
      </div>
      <div className="md:col-span-9">
        <h2 className="font-display text-3xl md:text-[2.6rem] tracking-normal text-foreground mb-6 leading-[1.05]">{title}</h2>
        <div className="prose prose-lg max-w-none text-foreground/80 [&_p]:leading-[1.8] [&_p]:mb-5 [&_strong]:text-foreground [&_strong]:font-medium">
          {children}
        </div>
      </div>
    </div>
  </section>
);

const cityPrices = [
  { city: "Dallas–Fort Worth", retail: "High", resale: "Well below retail", href: "/cemetery-plots-for-sale-dallas" },
  { city: "Houston", retail: "High", resale: "Well below retail", href: "/cemetery-plots-for-sale-houston" },
  { city: "Austin", retail: "High", resale: "Well below retail", href: "/cemetery-plots-for-sale-austin" },
  { city: "San Antonio", retail: "Moderate–high", resale: "Well below retail", href: "/cemetery-plots-for-sale-san-antonio" },
  { city: "El Paso", retail: "Moderate", resale: "Well below retail" },
  { city: "Corpus Christi", retail: "Moderate", resale: "Well below retail" },
  { city: "Lubbock & West Texas", retail: "Lower", resale: "Well below retail" },
  { city: "Waco & Central Texas", retail: "Moderate", resale: "Well below retail" },
];

const extras = [
  { t: "Opening and closing", d: "Charged by the cemetery at the time of burial, and normally one of the larger line items after the space itself. Cremation interments cost considerably less than a full ground burial.", n: "Required" },
  { t: "Outer burial container / vault", d: "Most Texas memorial parks require one; some older municipal and church cemeteries do not. Prices vary widely by material and warranty.", n: "Usually required" },
  { t: "Marker or monument", d: "Bronze, granite, flat or upright — the range here is enormous, and cemeteries set rules on what is permitted in each section.", n: "Optional timing" },
  { t: "Marker foundation / setting", d: "A separate cemetery fee to pour the base and install the marker.", n: "With marker" },
  { t: "Transfer / recording fee", d: "Paid to the cemetery when ownership changes hands. Across the Texas cemetery fee schedules we hold, most sit around $595–$995 per space, with the DFW memorial parks clustering near $595 and larger Houston and Dallas parks running from roughly $1,295 up to about $1,995. Small rural and church grounds can be nominal.", n: "On resale" },
  { t: "Endowment / perpetual care", d: "Usually bundled into the original purchase, though some cemeteries add a care contribution on a resale transfer.", n: "Varies" },
];

const faqs = [
  {
    q: "What does a burial plot cost in Texas?",
    a: "It depends almost entirely on the cemetery. Rural and small church cemeteries are inexpensive; established memorial parks in Dallas–Fort Worth, Houston and Austin are several times that, and premium gardens, mausoleum crypts and family estates sit higher again. Rather than quote a statewide average, we price each request against the specific cemetery and section.",
  },
  {
    q: "Why are resale plots priced below the cemetery's price?",
    a: "Because a resale space has to compete with everything a cemetery can offer. The cemetery is the first place a family goes when someone passes away, and it can bundle the space with opening and closing, a vault, a marker, care and financing in one appointment. A private seller or broker offers one thing: the space. Most families also don't know a secondary market exists — cemeteries have no reason to advertise it — so a resale plot has to be priced significantly below retail to be a genuinely attractive option for budget-conscious buyers.",
  },
  {
    q: "Can you sell a cemetery plot back to the cemetery?",
    a: "Sometimes, but rarely on good terms. Many Texas cemeteries decline buy-backs entirely, and those that do often offer the original purchase price rather than today's value, occasionally minus an administrative fee. An open-market resale usually recovers considerably more.",
  },
  {
    q: "Do cemetery plots go up in value?",
    a: "Cemetery retail pricing has risen steadily over time, and sold-out sections hold value best because no new supply can be created. Resale values track that retail curve at a discount. Our partner Bayer Cemetery Brokers publishes a detailed market-trend analysis of long-run grave plot price increases.",
  },
  {
    q: "What does it cost to transfer a cemetery plot in Texas?",
    a: "The cemetery sets its own recording or transfer fee, and the spread across Texas is wide — from nominal at some small cemeteries to well over a thousand dollars at others. We confirm the exact figure in writing with your cemetery before a sale completes, so it is never a surprise at closing.",
  },
];

const jsonLd: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How Much Does a Cemetery Plot Cost in Texas?",
    description:
      "What drives Texas cemetery plot prices, the fees cemeteries add on top, and why resale plots are priced below the cemetery's own counter price.",
    mainEntityOfPage: FULL,
    url: FULL,
    inLanguage: "en-US",
    author: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    publisher: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    about: ["Cemetery plot prices", "Burial costs", "Texas cemeteries"],
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
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
      { "@type": "ListItem", position: 3, name: "Cemetery Plot Costs in Texas", item: FULL },
    ],
  },
];

const GuideCemeteryPlotCost = () => (
  <MotionConfig reducedMotion="user"><div className="cost-guide min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="How Much Does a Cemetery Plot Cost in Texas? (2026)"
      description="What drives Texas cemetery plot prices, the fees cemeteries add on top, and why resale spaces are priced well below the cemetery's own price."
      path={PATH}
      type="article"
      jsonLd={jsonLd}
    />
    <Navbar forceScrolled />

    {/* Editorial masthead */}
    <section className="relative pt-28 pb-12 md:pb-16 overflow-hidden bg-valuation-ink text-primary-foreground">
      <img src={RESTLAND_HERO.src} alt={RESTLAND_HERO.alt} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-valuation-ink/65" />
      <div className="relative container mx-auto px-6 lg:px-10 max-w-[1280px]">
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase text-primary-foreground/50 hover:text-primary-foreground mb-12 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Guides
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="flex items-center gap-4 mb-8">
            <span className="h-px flex-1 max-w-[64px] bg-primary-foreground/25" />
            <p className="text-[10px] tracking-[0.34em] uppercase text-primary-foreground/55 font-medium">
              The Pricing Edition · Texas · 2026
            </p>
            <span className="h-px flex-1 bg-primary-foreground/15" />
          </div>
          <h1 className="font-display text-[2.75rem] sm:text-6xl md:text-7xl text-primary-foreground leading-[0.98] mb-8 tracking-normal">
            How much does a cemetery plot
            <span className="block italic font-light text-gold">cost in Texas?</span>
          </h1>
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            <p className="md:col-span-7 text-lg md:text-2xl text-primary-foreground/75 leading-[1.6] font-light">
              There is no single Texas price. A space in a small rural cemetery and a space in an established metro memorial
              park are different markets entirely. What follows is how cemeteries build their price, what they charge on top of
              the space itself, and why the same property sells for considerably less on the resale market.
            </p>
            <div className="md:col-span-5 grid sm:grid-cols-2 gap-6 md:pl-10 md:border-l md:border-border/70">
              <div className="text-sm text-primary-foreground/60 leading-relaxed">
                <p className="uppercase tracking-[0.2em] text-[10px] text-primary-foreground/45 mb-2">In this issue</p>
                <ol className="space-y-1.5 list-none pl-0">
                  <li><a href="#plot-value-calculator" className="text-gold hover:underline">Estimate your plot value <ArrowRight className="inline w-3 h-3" /></a></li>
                   <li><a href="#by-city" className="hover:text-primary transition-colors">What moves the price</a></li>
                  <li><a href="#extras" className="hover:text-primary transition-colors">The rest of the bill</a></li>
                  <li><a href="#type" className="hover:text-primary transition-colors">By property type</a></li>
                  <li><a href="#resale" className="hover:text-primary transition-colors">Why resale is cheaper</a></li>
                  <li><a href="#preneed" className="hover:text-primary transition-colors">Pre-need: locking today's price</a></li>

                  <li><a href="#map" className="hover:text-primary transition-colors">Texas coverage map</a></li>
                  <li><a href="#save" className="hover:text-primary transition-colors">Practical steps</a></li>
                  <li><a href="#faq" className="hover:text-primary transition-colors">Questions</a></li>

                </ol>
              </div>
              <div className="text-sm text-primary-foreground/60 leading-relaxed">
                <p className="uppercase tracking-[0.2em] text-[10px] text-primary-foreground/45 mb-2">By city</p>
                <ol className="space-y-1.5 list-none pl-0">
                  <li><Link to="/cemetery-plots-for-sale-houston" className="hover:text-primary transition-colors">Houston</Link></li>
                  <li><Link to="/cemetery-plots-for-sale-dallas" className="hover:text-primary transition-colors">Dallas–Fort Worth</Link></li>
                  <li><Link to="/cemetery-plots-for-sale-san-antonio" className="hover:text-primary transition-colors">San Antonio</Link></li>
                  <li><Link to="/cemetery-plots-for-sale-austin" className="hover:text-primary transition-colors">Austin</Link></li>
                  <li><Link to="/cemeteries" className="hover:text-primary transition-colors">All Texas cemeteries</Link></li>
                </ol>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-3 mt-10">
            <Link
              to="/contact#buy-inquiry"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-full font-medium text-[15px] shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Ask for a price in your cemetery
            </Link>
            <a
              href="tel:+12142304740"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-valuation-ink/60 backdrop-blur border border-primary-foreground/30 rounded-full font-medium text-[15px] text-primary-foreground hover:bg-valuation-ink transition-all"
            >
              <Phone className="w-4 h-4" /> (214) 230-4740
            </a>
          </div>
        </motion.div>
      </div>
    </section>

    <article className="container mx-auto px-6 lg:px-10 max-w-[1120px] pb-8">
      <div>

        <div className="min-w-0">
      <section className="my-10 md:my-14"><PlotResaleCalculator compact /></section>

      <Section id="by-city" icon={MapPin} eyebrow="City by city" title="What actually moves the price">
        <p>
          Location is the single biggest factor, followed by the section within the cemetery and how much unsold inventory
          remains. Sold-out and historic sections command the most, because nothing new can be created there.
        </p>
        <div className="not-prose mt-8 border-t border-border/70">
          {cityPrices.map((r) => (
            <div
              key={r.city}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 py-4 border-b border-border/50 group"
            >
              <span className="flex-1 font-display text-lg md:text-xl text-foreground leading-snug">
                {r.href ? (
                  <Link to={r.href} className="hover:text-primary transition-colors underline-offset-4 hover:underline">
                    {r.city}
                  </Link>
                ) : (
                  r.city
                )}
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-foreground/55">{r.retail} retail</span>
              <span className="text-sm font-display text-primary sm:text-right col-span-2 sm:col-span-1">{r.resale}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-foreground/55 leading-relaxed">
          We deliberately don't publish fixed figures — cemetery pricing changes, and quoting a number that's wrong for your
          cemetery helps no one. Tell us the cemetery and section and we'll give you the current range in writing.
        </p>
      </Section>

      <Section id="extras" icon={Receipt} eyebrow="The rest of the bill" title="What the cemetery charges on top of the space">
        <p>Families are often surprised that the space itself is only part of the total. These sit alongside it:</p>
        <div className="not-prose grid sm:grid-cols-2 gap-4 mt-8">
          {extras.map((e, i) => (
            <div key={e.t} className={`p-6 rounded-lg border border-border ${i % 3 === 0 ? "bg-valuation-surface" : i % 3 === 1 ? "bg-terracotta-light" : "bg-sage-light"}`}>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{e.n}</p>
              <h3 className="font-display text-xl text-foreground leading-snug mb-2">{e.t}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{e.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <figure className="my-8"><img src={RESTLAND_STRIP.src} alt={RESTLAND_STRIP.alt} loading="lazy" className="w-full aspect-[2/1] md:aspect-[3/1] object-cover rounded-lg" /><figcaption className="text-xs text-muted-foreground mt-3">{RESTLAND_STRIP.caption}</figcaption></figure>

      <Section id="type" icon={Landmark} eyebrow="By property type" title="Plots, niches, crypts and estates">
        <ul>
          <li><strong>Single ground plot</strong> — one interment; some cemeteries permit an additional cremated interment in the same space.</li>
          <li><strong>Companion / double-depth plot</strong> — two interments in one grave, priced above a single space but below two.</li>
          <li><strong>Cremation niche</strong> — typically the most affordable memorial-park option.</li>
          <li><strong>Lawn crypt</strong> — sold as a companion pair with the vault pre-installed.</li>
          <li><strong>Mausoleum crypt</strong> — priced by tier; eye-level and heart-level positions carry the highest prices.</li>
          <li><strong>Family estate</strong> — the top of the market, and the category where resale discounts are largest in absolute dollars.</li>
        </ul>
        <p>
          Compare them side by side on our{" "}
          <Link to="/property-types" className="text-primary underline-offset-4 hover:underline font-medium">
            cemetery property types
          </Link>{" "}
          page.
        </p>
      </Section>

      <Section id="resale" icon={TrendingUp} eyebrow="The secondary market" title="Why resale plots are priced below retail">
        <p>
          A cemetery isn't just selling a space. It has an entire inventory to offer a family in one appointment — the space,
          opening and closing, a vault, a marker, perpetual care, and financing terms — and it is the first place almost every
          family goes when someone passes away.
        </p>
        <p>
          A private seller or a broker competes with all of that while offering one thing. On top of that, most people never
          learn a secondary market exists: cemeteries have no reason to advertise it, so unless a buyer already knows to look,
          they never will. For a resale space to be a genuinely attractive proposition for a budget-conscious family, it has to
          be priced significantly below the cemetery's own price. That discount is the entire reason the market works.
        </p>
        <div className="not-prose my-8 p-7 md:p-9 rounded-lg bg-valuation-surface border border-border/60">
          <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-3">Market trend</p>
          <p className="font-display text-2xl md:text-3xl text-foreground leading-snug mb-4">
            Cemetery property has appreciated steadily, and sold-out sections hold value best.
          </p>
          <a
            href={TRENDS_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Read the grave plot price-increase analysis <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p>
          Selling back to the cemetery generally returns your original purchase price rather than today's value, and a
          classifieds listing leaves you to verify the buyer, handle funds and complete the transfer alone — the setting where
          most plot-sale fraud happens. Full detail in the{" "}
          <Link to="/sell-cemetery-plot-texas" className="text-primary underline-offset-4 hover:underline font-medium">
            guide to selling a cemetery plot in Texas
          </Link>
          .
        </p>
      </Section>

      <div className="border-t border-border/60 pt-10 md:pt-14">
        <PreneedBlock id="preneed" eyebrow="The cheapest it will ever be" />
      </div>



      <div className="border-t border-border/60">
        <MetroCemeteryMap
          regions={["Dallas–Fort Worth"]}
          metro="Dallas–Fort Worth"
          searchable
          blurb="Search any cemetery on the map to open its profile. Pricing, sections and the current transfer fee are recorded on each one."
        />
      </div>

      <Section id="save" icon={Lightbulb} eyebrow="Practical steps" title="How families keep the total sensible">
        <p>
          Almost none of this is about haggling. Most of the saving comes from knowing which decisions carry a price tag and
          making them deliberately rather than in the days after a death, when there is no time to compare anything.
        </p>
        <div className="not-prose grid sm:grid-cols-2 gap-4 mt-8">
          {[
            { t: "Buy before you need it", d: "Pre-need buyers can look at several cemeteries, compare sections and wait for the right resale space. At-need families rarely have that luxury, and price reflects it." },
            { t: "Consider the neighbouring town", d: "A cemetery twenty minutes further out can be materially less than the flagship park inside the metro, with the same standard of care and grounds." },
            { t: "Check what already transfers with the space", d: "A vault, an opening-and-closing credit or a paid marker foundation included in a resale purchase is real money that would otherwise be charged separately." },
            { t: "Ask about the section, not just the cemetery", d: "Within one park, older and outlying sections can sit far below the feature gardens while offering the same perpetual care." },
            { t: "Confirm the transfer fee in writing first", d: "It is the one cemetery charge people forget on a resale purchase. Get the figure from the cemetery before agreeing a price, not after." },
            { t: "Check veteran eligibility first", d: "Eligible veterans and spouses are entitled to burial at a national cemetery at no cost. It is always worth confirming before buying anything." },
          ].map((s) => (
            <div key={s.t} className="p-6 rounded-lg bg-sage-light border border-border/60 hover:border-primary/35 transition-colors">
              <h3 className="font-display text-xl text-foreground leading-snug mb-2">{s.t}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8">
          If you already own property and are wondering what it is worth today rather than what it cost, the{" "}
          <Link to="/sell-cemetery-plot-texas" className="text-primary underline-offset-4 hover:underline font-medium">
            selling guide
          </Link>{" "}
          walks through valuation and the transfer paperwork step by step.
        </p>
      </Section>

      <Section id="faq" icon={CircleHelp} eyebrow="Frequently asked" title="Cemetery plot cost questions">

        <div className="not-prose divide-y divide-border/60 border-t border-b border-border/60">
          {faqs.map((f, i) => (
            <details key={f.q} className="group py-6">
              <summary className="cursor-pointer list-none flex items-start gap-5">
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums pt-1.5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-display text-lg md:text-xl text-foreground leading-snug group-hover:text-primary transition-colors">
                  {f.q}
                </span>
                <span className="shrink-0 mt-1 w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground group-open:rotate-45 group-open:border-primary group-open:text-primary transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </summary>
              <p className="mt-4 pl-9 pr-12 text-foreground/75 leading-[1.8]">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
        </div>
        {/* CTA band replacing the old sticky rail */}
        <div className="mt-12 border-t border-border bg-valuation-blue text-primary-foreground p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-2xl md:text-3xl leading-snug mb-2">Ask for the price in your cemetery.</p>
            <p className="text-primary-foreground/80 text-sm md:text-base leading-relaxed max-w-xl">
              We reply within 24 hours with a current range and the cemetery's transfer fee in writing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Link to="/sell" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:-translate-y-0.5 transition-all">
              Free valuation <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="tel:+12142304740" className="inline-flex items-center gap-2 text-sm text-primary-foreground/90 hover:text-primary-foreground transition-colors">
              <Phone className="w-4 h-4" /> (214) 230-4740
            </a>
          </div>
        </div>
      </div>




      {/* City hubs — full width so every local page is one click from the guide */}
      <section aria-labelledby="city-hubs" className="mt-2 mb-4">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 id="city-hubs" className="font-display text-2xl md:text-3xl text-foreground tracking-normal">
            Plot prices in your city
          </h2>
          <Link to="/cemeteries" className="text-sm text-primary hover:underline underline-offset-4 whitespace-nowrap">
            Full directory
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { city: "Dallas–Fort Worth", href: "/cemetery-plots-for-sale-dallas", note: "52+ cemeteries covered" },
            { city: "Houston", href: "/cemetery-plots-for-sale-houston", note: "50+ cemeteries covered" },
            { city: "Austin", href: "/cemetery-plots-for-sale-austin", note: "Tightest market in Texas" },
            { city: "San Antonio", href: "/cemetery-plots-for-sale-san-antonio", note: "Historic family sections" },
          ].map((c) => (
            <Link
              key={c.href}
              to={c.href}
              className="group relative overflow-hidden p-6 rounded-lg bg-valuation-surface border border-border/60 hover:border-primary/40 hover:-translate-y-1 transition-all"
            >
              <p className="relative font-display text-xl text-foreground leading-snug mb-2">{c.city}</p>
              <p className="relative text-sm text-foreground/60">{c.note}</p>
              <span className="relative mt-4 inline-flex items-center gap-2 text-sm text-primary">
                View plots <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>


      <section className="mt-6 mb-10">
        <div className="relative overflow-hidden border-t border-border p-8 md:p-12 bg-valuation-blue text-primary-foreground">
          <p className="relative text-[10px] uppercase tracking-[0.3em] text-primary-foreground/70 mb-5">No obligation</p>
          <h2 className="relative font-display text-3xl md:text-5xl tracking-normal mb-5 leading-[1.02]">
            Want the number for <span className="italic font-light">your</span> cemetery?
          </h2>
          <p className="relative text-primary-foreground/85 text-lg leading-relaxed mb-8 max-w-2xl font-light">
            Tell us the cemetery and section and we'll come back within 24 hours with the current range, a realistic resale
            value, and the cemetery's exact transfer fee confirmed in writing.
          </p>
          <div className="relative flex flex-wrap gap-3">
            <Link
              to="/sell"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-full font-medium hover:-translate-y-0.5 transition-all"
            >
              Get a free valuation <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/cemeteries"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/15 backdrop-blur border border-primary-foreground/30 rounded-full font-medium hover:bg-background/25 transition-all"
            >
              Browse Texas cemeteries
            </Link>
          </div>
        </div>
      </section>
    </article>

    <Footer />
  </div></MotionConfig>
);

export default GuideCemeteryPlotCost;
