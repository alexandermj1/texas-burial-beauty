import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Phone, Mail, Plus, CheckCircle2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { PHONE_DISPLAY, EMAIL, jsonLd, checks, valueFactors, faqs } from "./guide-selling-data";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">{children}</p>
);

// Parks → cemetery name in src/data/cemeteries.ts (slugified via cemeteryPath)
const cities: { city: string; parks: { label: string; cemetery?: string }[] }[] = [
  {
    city: "Houston",
    parks: [
      { label: "Forest Park", cemetery: "Forest Park Lawndale Cemetery" },
      { label: "Earthman Resthaven", cemetery: "Earthman Resthaven Cemetery" },
      { label: "Brookside", cemetery: "Brookside Memorial Park" },
      { label: "Memorial Oaks", cemetery: "Memorial Oaks Cemetery" },
      { label: "San Jacinto" },
    ],
  },
  {
    city: "Dallas–Fort Worth",
    parks: [
      { label: "Restland", cemetery: "Restland Memorial Park" },
      { label: "Sparkman–Hillcrest", cemetery: "Sparkman/Hillcrest Memorial Park" },
      { label: "Laurel Land", cemetery: "Laurel Land Memorial Park (Dallas)" },
      { label: "Bluebonnet Hills", cemetery: "Bluebonnet Hills Memorial Park" },
      { label: "Greenwood", cemetery: "Greenwood Cemetery" },
    ],
  },
  { city: "San Antonio", parks: [{ label: "Citywide coverage across major parks and gardens" }] },
  { city: "Austin", parks: [{ label: "Cook–Walden Capital Parks and surrounding memorial parks" }] },
  { city: "College Station", parks: [{ label: "Brazos Valley and surrounding communities" }] },
];



const brokerReasons = [
  {
    n: "01",
    h: "We put your property in front of the right buyers",
    p: [
      "We do far more than post a listing and wait. Texas Cemetery Brokers works directly with mortuaries, funeral directors, estate attorneys and individuals throughout the funeral industry to place your property where the right buyers actually are.",
      "We cross-reference your plot against the live inquiries we already hold — from funeral homes, estate attorneys and families searching for property in specific cemeteries — so your space can be matched to people who are genuinely looking for it. We also issue regular inventory bulletins to mortuaries featuring our newest available plots, and we promote actively through Google Ads, radio, print and in-person outreach. Your plot is marketed, not just listed.",
    ],
  },
  {
    n: "02",
    h: "We are experts in the transfer — and speed matters most when it's needed most",
    p: [
      "Many families come to us at the hardest possible moment: a loved one has passed, and they need a resting place quickly. Because we know each cemetery's transfer process in detail and work hand in hand with cemetery offices, we are able to complete a transfer as quickly and smoothly as possible, so the family is cared for without added stress.",
      "That speed and certainty are very hard to match in a private sale. When something unexpected comes up in the paperwork or the process — as it sometimes does — our experience means we can step in and keep the sale on track rather than leaving a buyer or seller stuck.",
    ],
  },
  {
    n: "03",
    h: "We show the plot in person and explain every difference",
    p: [
      "Choosing a final resting place is deeply personal, and most families want to see the space before they commit. We meet buyers at the cemetery and walk the grounds with them, explaining the differences between sections, the position of a plot, and the options available.",
      "It is not unusual for us to show a single plot more than five times to different families before the right one decides it is the place for them. A private seller listing online simply cannot offer that, and it is a major reason brokered plots find the right buyer.",
    ],
  },
  {
    n: "04",
    h: "We are trained to care for families, not just close a sale",
    p: [
      "Our team includes people specifically trained to support grieving families with patience and compassion, alongside specialists who can explain the finer points — the paperwork, the cemetery rules, and the small distinctions that matter.",
      "For a seller, that means your property is represented thoughtfully and respectfully. For a buyer, it means they feel informed, confident and looked after. That trust is the foundation of every successful sale, and it is the hardest thing to create between two strangers transacting on their own.",
    ],
  },
];

const GuideSellingCemeteryPlot = () => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="How to Sell a Cemetery Plot in Texas | Texas Cemetery Brokers"
      description="Selling a cemetery plot in Texas? Learn what affects your plot's value, the legal steps, and how a broker sells it fast across Houston, Dallas & Austin."
      path="/sell-cemetery-plot-texas"
      type="article"
      jsonLd={jsonLd}
    />
    <Navbar forceScrolled />

    {/* HERO */}
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-[hsl(var(--primary)/0.12)] via-[hsl(var(--accent)/0.05)] to-background">
      <div className="absolute top-0 right-0 w-[44rem] h-[44rem] rounded-full bg-primary/12 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute top-20 left-0 w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl -translate-x-1/3 pointer-events-none" />
      <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 Q360 80 720 40 T1440 40 L1440 80 L0 80 Z" className="fill-background" />
      </svg>

      <div className="relative container mx-auto px-6 max-w-3xl">
        {/* Back link — aligned with article column */}
        <Link to="/guides" className="inline-flex items-center gap-1.5 text-xs tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Guides
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-accent" />
            <p className="text-accent text-[11px] tracking-[0.28em] uppercase font-semibold">Guide · For Sellers</p>
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-foreground leading-[1.05] mb-6 tracking-tight">
            How to Sell a Cemetery Plot in <span className="italic text-primary">Texas</span>
          </h1>
          <p className="text-foreground/65 text-sm tracking-wide mb-8">Texas Cemetery Brokers · Updated 2025 · 9 min read</p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_8px_24px_-6px_hsl(var(--accent)/0.5)] hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Get a Free Plot Valuation
            </a>
            <a href="#why" className="inline-flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
              Why Use a Broker
            </a>
          </div>
        </motion.div>
      </div>
    </section>

    {/* ARTICLE BODY */}
    <article className="py-16">
      <div className="container mx-auto px-6 max-w-3xl">
        {/* Intro */}
        <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-primary">
          Plans change. Families relocate, choose cremation, or inherit plots they'll never use. The good news: a cemetery plot you own can be sold — and it is often worth more than people expect. The challenge is that selling privately in Texas can be slow and uncertain. This guide explains what affects your plot's value, the legal steps, and the most reliable way to sell it.
        </p>

        {/* Short answer callout */}
        <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 overflow-hidden my-12">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/15 blur-2xl" />
          <Eyebrow>The short answer</Eyebrow>
          <p className="relative text-lg md:text-xl text-foreground/90 leading-relaxed">
            Yes, you can sell a cemetery plot in Texas. Check your purchase contract for a right-of-first-refusal clause, confirm any co-owners agree, then list privately or work with a cemetery broker who finds the buyer, prices it correctly, and completes the legal transfer with the cemetery for you.
          </p>
        </div>

        {/* H2: Can you sell */}
        <section id="can-you-sell" className="scroll-mt-24 mt-16">
          <Eyebrow>Chapter 01</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Can you sell a cemetery plot in <span className="italic text-primary">Texas?</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            Yes. When you bought your plot, you acquired the <strong className="text-foreground">exclusive right of sepulture</strong> — the legal right to bury someone in a specific space. That right is presumed to be your property, and you are entitled to sell or transfer it. Before listing, three quick checks save time and trouble:
          </p>
          <ol className="space-y-4">
            {checks.map((c, i) => (
              <li key={c.t} className="flex gap-4 items-start">
                <span className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary font-display flex items-center justify-center text-base mt-0.5">{i + 1}</span>
                <div>
                  <p className="font-medium text-foreground text-lg leading-snug">{c.t}</p>
                  <p className="text-foreground/70 leading-relaxed">{c.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* H2: Value factors */}
        <section id="value" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 02 · Valuation</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">What affects your plot's <span className="italic text-primary">value</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            Pricing a cemetery plot is not like checking a home's value — there is no public listing database, and two plots in the same cemetery can be worth very different amounts. The main factors are:
          </p>
          <div className="space-y-4 mb-8">
            {valueFactors.map(({ Icon, t, d }) => (
              <motion.div key={t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="flex gap-5 items-start p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-display text-lg text-foreground mb-1">{t}</p>
                  <p className="text-foreground/75 leading-relaxed">{d}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-foreground/80 leading-relaxed text-lg">
            Because all of these move the number, the most reliable way to find out what your plot is worth is a valuation rather than a guess. <a href="#contact" className="text-primary underline-offset-4 hover:underline font-medium">We provide a free, plot-specific valuation</a> with no obligation.
          </p>
        </section>

        {/* H2: Why a broker */}
        <section id="why" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03 · The case for a broker</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Why selling through Texas Cemetery Brokers is the <span className="italic text-primary">safest, fastest route</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-5 text-lg">
            You have a few options for selling a plot, and it helps to understand what each one really asks of you.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-5">
            <strong className="text-foreground">Selling it back to the cemetery</strong> is the simplest, but many cemeteries either decline or pay only what you originally paid — often well below today's value.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-5">
            <strong className="text-foreground">Listing it yourself</strong> on a classified or auction site can look appealing at first, but these sites usually charge you a fee just to post — and once you've paid, the entire sale is still yours to manage. You set the price, field the inquiries, sort genuine buyers from time-wasters, handle the negotiation, and work out the cemetery's transfer paperwork on your own. Many private listings sit for months, and it is not unusual for a plot to take years to sell this way — if it ever sells at all. You can spend money on listing fees and still be left with the property.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-10">
            <strong className="text-foreground">Working with a broker</strong> is the option built to take all of that off your hands. We do the pricing, the marketing, the buyer screening, the showings and the paperwork for you — which gives your property a far better chance of actually selling, and often for more than you would achieve alone. Here is what that looks like with us.
          </p>

          <div className="space-y-8">
            {brokerReasons.map((r) => (
              <motion.div key={r.n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="border-l-2 border-primary/40 pl-6 md:pl-8">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-display text-2xl text-primary">{r.n}</span>
                </div>
                <h3 className="font-display text-2xl text-foreground mb-4 leading-snug">{r.h}</h3>
                {r.p.map((para, i) => (
                  <p key={i} className="text-foreground/80 leading-relaxed mb-3 last:mb-0">{para}</p>
                ))}
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl p-7 md:p-8 bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 mt-10">
            <Eyebrow>In short</Eyebrow>
            <p className="text-foreground/90 leading-relaxed text-lg italic">
              A private sale asks you to be the marketer, the negotiator, the paperwork expert and the guide all at once — and can drag on for years with no result. We are already all of those things, every day — which is how we turn a plot you no longer need into a completed, worry-free sale.
            </p>
          </div>
        </section>

        {/* H2: Process */}
        <section id="process" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 04 · The process</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-8 leading-tight">How the process works with <span className="italic text-primary">us</span></h2>
          <ol className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-accent before:via-primary before:to-primary/30">
            {[
              { t: "Free valuation.", d: "Tell us the cemetery, section and spaces. We assess your plot and explain what it can realistically sell for — no obligation." },
              { t: "We market and match it.", d: "Your plot reaches our active buyer network and is cross-referenced against current inquiries from families, mortuaries and estate attorneys, backed by the nationwide reach of our partner Bayer Cemetery Brokers." },
              { t: "We handle the paperwork and the showings.", d: "We meet interested buyers at the cemetery, answer their questions, and prepare and record the conveyance with the cemetery correctly." },
              { t: "You get paid.", d: "Funds are released once the transfer is confirmed and complete." },
            ].map((s, i) => (
              <li key={i} className="relative pl-14">
                <span className="absolute left-0 top-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)]">{i + 1}</span>
                <p className="font-display text-xl text-foreground mb-1">{s.t}</p>
                <p className="text-foreground/75 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* H2: Legal */}
        <section id="legal" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 05 · Legal</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">The legal side of selling a plot in <span className="italic text-primary">Texas</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-5 text-lg">
            A common question is whether you need a license to sell. You do not — selling your own plot requires no license. And while Texas once required third-party brokers to register with the Department of Banking, that registration requirement was repealed effective <strong className="text-foreground">September 1, 2019</strong>. There is no state cemetery-broker license in Texas today.
          </p>
          <p className="text-foreground/80 mb-4">What still applies — and what a careful broker handles for you — comes from the Texas Health &amp; Safety Code:</p>
          <ul className="space-y-3 mb-8">
            {[
              "The conveyance (often a quitclaim) must be on a form the cemetery accepts and recorded with the cemetery, generally within three business days of the sale.",
              "Any cemetery transfer fees must be collected and remitted to the cemetery.",
              "The seller must keep proper records of the sale.",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15">
            <p className="text-foreground/85 leading-relaxed italic">
              This is why a broker matters even without a licensing requirement: a sale is not truly final until the cemetery records the transfer correctly. We make sure that happens — so the buyer is protected and you are fully and cleanly released from the property.
            </p>
          </div>
        </section>

        {/* H2: Cities */}
        <section id="cities" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 06 · Coverage</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">We help sellers <span className="italic text-primary">across Texas</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            We assist families selling plots, crypts and niches statewide:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {cities.map((c) => (
              <div key={c.city} className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border/60">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="font-display text-lg text-foreground">{c.city}</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{c.parks}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-foreground/80 leading-relaxed">
            Looking to buy instead? See our <Link to="/buy" className="text-primary underline-offset-4 hover:underline font-medium">cemetery plots for sale in Texas</Link>.
          </p>
        </section>

        {/* H2: FAQ */}
        <section id="faq" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 07 · Questions</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-8 leading-tight">Frequently <span className="italic text-primary">asked</span></h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-2xl bg-card border border-border/60 open:border-primary/40 open:shadow-soft transition-all">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-6 py-5 font-medium text-foreground">
                  <span>{f.q}</span>
                  <Plus className="w-5 h-5 text-primary shrink-0 group-open:rotate-45 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-foreground/75 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </article>

    {/* FINAL CTA */}
    <section id="contact" className="pb-28">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground p-10 md:p-16">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-primary-foreground/70 mb-4">Find out what it's worth</p>
            <h2 className="font-display text-4xl md:text-5xl mb-5 leading-[1.05]">A free valuation — handled by humans.</h2>
            <p className="text-primary-foreground/85 leading-relaxed mb-8 text-lg">
              Send us the cemetery and section details and we'll give you a no-obligation valuation, then handle the sale from listing to transfer.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`tel:${PHONE_DISPLAY.replace(/\D/g, "")}`} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] hover:opacity-95 transition-all">
                <Phone className="w-4 h-4" /> Call {PHONE_DISPLAY}
              </a>
              <a href={`mailto:${EMAIL}`} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-foreground text-primary rounded-2xl font-medium text-[15px] hover:opacity-95 transition-all">
                <Mail className="w-4 h-4" /> Email Us
              </a>
              <Link to="/sell" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-transparent border border-primary-foreground/40 text-primary-foreground rounded-2xl font-medium text-[15px] hover:bg-primary-foreground/10 transition-all">
                Start Online <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-primary-foreground/60 italic mt-8 leading-relaxed max-w-xl">
              This guide is general information about selling cemetery property in Texas and is not legal advice. Cemetery policies and applicable rules vary by location; confirm specifics with the cemetery and, where needed, a licensed Texas attorney.
            </p>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default GuideSellingCemeteryPlot;
