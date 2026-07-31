import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const PATH = "/cemetery-plot-cost-texas";
const SITE = "https://texascemeterybrokers.com";
const FULL = `${SITE}${PATH}`;

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

const cityPrices = [
  { city: "Dallas–Fort Worth", retail: "$4,000 – $15,000", resale: "$1,900 – $7,000", href: "/cemetery-plots-for-sale-dallas" },
  { city: "Houston", retail: "$4,500 – $12,000", resale: "$2,200 – $6,500", href: "/cemetery-plots-for-sale-houston" },
  { city: "Austin", retail: "$5,000 – $14,000", resale: "$2,500 – $7,500", href: "/cemetery-plots-for-sale-austin" },
  { city: "San Antonio", retail: "$3,500 – $9,500", resale: "$1,600 – $4,800", href: "/cemetery-plots-for-sale-san-antonio" },
  { city: "El Paso", retail: "$2,800 – $7,500", resale: "$1,300 – $3,800" },
  { city: "Corpus Christi", retail: "$2,500 – $7,000", resale: "$1,200 – $3,500" },
  { city: "Lubbock & West Texas", retail: "$2,200 – $6,000", resale: "$1,000 – $3,000" },
  { city: "Waco & Central Texas", retail: "$2,500 – $7,500", resale: "$1,200 – $3,600" },
];

const extras = [
  { t: "Opening and closing", d: "$1,200 – $2,500 for a ground burial; less for a cremation interment. Paid to the cemetery at the time of burial, never included in the plot price.", n: "Required" },
  { t: "Outer burial container / vault", d: "$1,000 – $3,500. Most Texas memorial parks require one; older municipal cemeteries sometimes do not.", n: "Usually required" },
  { t: "Marker or monument", d: "$800 – $6,000 depending on bronze vs granite and size.", n: "Optional timing" },
  { t: "Marker foundation / setting fee", d: "$300 – $900, charged by the cemetery to install the marker.", n: "Required with marker" },
  { t: "Transfer / recording fee", d: "$150 – $695 per space. Set by the cemetery, payable when ownership changes hands.", n: "On resale" },
  { t: "Perpetual care", d: "Often bundled into the original purchase; occasionally added at 10–15% on a resale transfer.", n: "Varies" },
];

const faqs = [
  {
    q: "What is the average cost of a burial plot in Texas?",
    a: "Bought directly from a Texas cemetery, a single ground space averages roughly $3,000–$6,000, with major-metro memorial parks running $5,000–$15,000 and small rural cemeteries as little as $800–$1,500. On the resale market the same spaces typically trade 30–50% below the cemetery's current counter price.",
  },
  {
    q: "How much do cemetery brokers charge?",
    a: "Texas Cemetery Brokers charges sellers no upfront appraisal fee. Our commission is taken from the sale proceeds when the property actually sells, and optional premium listing placements are a flat fee ($99 or $299). Buyers pay no broker fee at all — the price you're quoted is the price you pay, plus the cemetery's own transfer fee.",
  },
  {
    q: "Why is a resale plot cheaper than buying from the cemetery?",
    a: "Cemeteries price new inventory at today's replacement cost and rarely discount. A family reselling a space bought fifteen years ago is pricing against what they can realistically get, not what the cemetery would like to charge — so resale sits well below counter price even in sold-out sections.",
  },
  {
    q: "Can you sell a cemetery plot back to the cemetery?",
    a: "Sometimes, but rarely on good terms. Most Texas cemeteries either decline buy-backs entirely or offer the original purchase price — not today's value — and some deduct an administrative fee on top. Selling on the open market almost always returns significantly more, which is why families use a broker.",
  },
  {
    q: "Do cemetery plots go up in value?",
    a: "Retail cemetery pricing rises steadily, typically ahead of inflation, and sold-out sections hold value best because no new supply exists. Resale values track that retail curve at a discount — a plot bought in the 1990s is usually worth several times what was paid, even after the discount.",
  },
  {
    q: "What does it cost to transfer a cemetery plot in Texas?",
    a: "The cemetery charges a recording or transfer fee, commonly $150–$695 per space. It's paid once, at closing, and we confirm the exact figure in writing with the cemetery before the sale completes.",
  },
];

const jsonLd: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How Much Does a Cemetery Plot Cost in Texas?",
    description:
      "Texas cemetery plot prices by city, the fees cemeteries add on top, what resale plots really sell for, and what brokers charge.",
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
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="How Much Does a Cemetery Plot Cost in Texas? (2026)"
      description="Texas cemetery plot prices by city, the fees cemeteries add on top, what resale spaces actually sell for, and how much cemetery brokers charge."
      path={PATH}
      type="article"
      jsonLd={jsonLd}
    />
    <Navbar forceScrolled />

    <section className="relative pt-28 pb-20 overflow-hidden bg-[hsl(38_35%_95%)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(16_50%_88%)] via-[hsl(38_35%_95%)] to-[hsl(40_45%_92%)]" />
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-[hsl(16_50%_70%)]/20 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
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
            <p className="text-accent text-[11px] tracking-[0.24em] uppercase font-semibold">Pricing Guide · Updated 2026</p>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.0] mb-7 tracking-tight">
            How much does a cemetery plot <span className="italic text-primary">cost in Texas?</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/75 leading-relaxed mb-8 max-w-2xl font-light">
            A single ground space in Texas averages <strong className="font-normal text-foreground">$3,000–$6,000</strong> at the cemetery counter, and
            <strong className="font-normal text-foreground"> $5,000–$15,000</strong> in the big-metro memorial parks. Here's what drives that number, what the cemetery adds on top, and what the same space costs on the resale market.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link to="/contact#buy-inquiry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Ask for a price in your cemetery
            </Link>
            <a href="tel:+12142304740" className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/80 backdrop-blur border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
              <Phone className="w-4 h-4" /> (214) 230-4740
            </a>
          </div>
        </motion.div>
      </div>
    </section>

    <article className="container mx-auto px-6 max-w-4xl pb-8">
      <Section id="by-city" eyebrow="City by city" title="Cemetery plot prices across Texas">
        <p>
          Location is the single biggest factor. The table below shows what one standard ground space typically costs bought new
          from the cemetery, against what the same space usually trades for on the resale market.
        </p>
        <div className="not-prose overflow-x-auto mt-6 rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Metro</th>
                <th className="px-4 py-3 font-medium text-foreground">Cemetery retail</th>
                <th className="px-4 py-3 font-medium text-foreground">Typical resale</th>
              </tr>
            </thead>
            <tbody>
              {cityPrices.map((r) => (
                <tr key={r.city} className="border-t border-border/50">
                  <td className="px-4 py-3 text-foreground/85">
                    {r.href ? (
                      <Link to={r.href} className="text-primary underline-offset-4 hover:underline font-medium">{r.city}</Link>
                    ) : (
                      r.city
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/75">{r.retail}</td>
                  <td className="px-4 py-3 text-primary font-medium">{r.resale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 text-sm text-foreground/60">
          Ranges are indicative of single ground spaces in 2026 and exclude opening/closing, vault and marker costs. Premium
          gardens, mausoleum crypts and family estates price well above these bands.
        </p>
      </Section>

      <Section id="extras" eyebrow="The rest of the bill" title="What the cemetery charges on top of the plot">
        <p>
          Families are often surprised that the plot is roughly half the total. These are the costs that sit alongside it:
        </p>
        <div className="not-prose grid sm:grid-cols-2 gap-3 mt-6">
          {extras.map((e) => (
            <div key={e.t} className="p-5 rounded-2xl bg-card border border-border/60">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-display text-lg text-foreground leading-snug">{e.t}</h3>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-muted text-foreground/60">{e.n}</span>
              </div>
              <p className="text-sm text-foreground/75 leading-relaxed">{e.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" eyebrow="By property type" title="Plots, niches, crypts and estates">
        <ul>
          <li><strong>Single ground plot</strong> — the baseline above. One interment (some cemeteries permit a second, cremated interment in the same space).</li>
          <li><strong>Companion / double-depth plot</strong> — usually 1.5–1.8× a single space, for two interments in one grave.</li>
          <li><strong>Cremation niche</strong> — $1,200–$5,000 retail; the most affordable memorial-park option.</li>
          <li><strong>Lawn crypt</strong> — $6,000–$14,000 for a companion pair, with the vault pre-installed.</li>
          <li><strong>Mausoleum crypt</strong> — $8,000–$35,000 depending on level; eye-level and heart-level tiers cost the most.</li>
          <li><strong>Family estate</strong> — $25,000 upward, and the category where resale discounts are largest.</li>
        </ul>
        <p>
          Compare them side by side on our <Link to="/property-types" className="text-primary underline-offset-4 hover:underline font-medium">cemetery property types</Link> page.
        </p>
      </Section>

      <Section id="broker-fees" eyebrow="Broker fees" title="How much do cemetery brokers charge?">
        <p>
          <strong>Buyers pay us nothing.</strong> The price quoted is the price paid, plus the cemetery's own transfer fee.
        </p>
        <p>
          <strong>Sellers pay no upfront appraisal fee.</strong> Valuation, listing and marketing cost nothing to start; our
          commission comes out of the proceeds only when the property actually sells. Optional premium placement — more
          exposure, priority buyer matching — is a flat $99 or $299, and is entirely optional.
        </p>
        <p>
          That matters, because the two common alternatives cost more than they look. Selling back to the cemetery generally
          returns your original purchase price rather than today's value, and selling on a classifieds site means you verify
          the buyer, handle funds and complete the transfer paperwork alone — the setting where most plot-sale fraud happens.
        </p>
        <p>
          Full detail in the <Link to="/sell-cemetery-plot-texas" className="text-primary underline-offset-4 hover:underline font-medium">guide to selling a cemetery plot in Texas</Link>.
        </p>
      </Section>

      <Section id="faq" eyebrow="Frequently asked" title="Cemetery plot cost FAQ">
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

      <section className="mt-10 mb-8">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
          <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4 leading-[1.05]">Want the number for your cemetery?</h2>
          <p className="text-primary-foreground/85 text-lg leading-relaxed mb-7 max-w-2xl">
            Tell us the cemetery and section and we'll come back within 24 hours with the current retail price, realistic resale
            value and the exact transfer fee.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sell" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-medium hover:-translate-y-0.5 transition-all">
              Get a free valuation <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/cemeteries" className="inline-flex items-center gap-2 px-6 py-3 bg-background/15 backdrop-blur border border-primary-foreground/30 rounded-2xl font-medium hover:bg-background/25 transition-all">
              Browse Texas cemeteries
            </Link>
          </div>
        </div>
      </section>
    </article>

    <Footer />
  </div>
);

export default GuideCemeteryPlotCost;
