import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, Plus, CheckCircle2, MapPin, ShieldCheck, FileSearch, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import GuideCemeteryGallery, { guideGalleryJsonLd } from "@/components/guides/GuideCemeteryGallery";


const TEXAS_REGIONS = [
  "Dallas–Fort Worth",
  "Greater Houston",
  "Austin",
  "San Antonio",
  "Central Texas",
  "East Texas",
  "South Texas",
  "West & North Texas",
  "El Paso & West Texas",
];
import { cemeteryPath } from "@/lib/cemeterySlug";
import { EMAIL, jsonLd, checks, valueFactors, faqs, resources } from "./guide-selling-data";

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline font-medium">
    {children}
  </a>
);

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
  {
    n: "05",
    h: "We verify ownership before a plot ever reaches a buyer",
    p: [
      "Before we list a single space, we confirm the seller actually holds the right of sepulture and that the cemetery will accept the transfer. We check the original deed or certificate, verify the names on file at the cemetery office, confirm any co-owners have consented, and flag right-of-first-refusal clauses up front.",
      "That verification is what gives buyers the confidence to commit. When a family is choosing a resting place for someone they love, they need to know the plot is genuinely available, legally transferable, and that the cemetery will record the conveyance in their name once they pay. Every listing we represent has cleared that check — which is something a private seller on a classified site simply cannot offer.",
    ],
  },
];

// Pillars shown in the dedicated verification block
const verification = [
  { Icon: FileSearch, t: "Deed & certificate verified", d: "We review the original purchase paperwork and confirm the listed owner matches the seller." },
  { Icon: BadgeCheck, t: "Cemetery records confirmed", d: "We contact the cemetery office to make sure the space is on file, unused, and clear to transfer." },
  { Icon: ShieldCheck, t: "Co-owners & ROFR cleared", d: "We secure written consent from any co-owners and resolve any right-of-first-refusal before listing." },
];

const GuideSellingCemeteryPlot = () => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="How to Sell a Cemetery Plot in Texas (2026 Guide)"
      description="What your plot is worth today, the transfer steps Texas cemeteries require, and how to sell it without upfront fees. Free valuation in 24 hours."
      path="/sell-cemetery-plot-texas"
      type="article"
      jsonLd={[...jsonLd, guideGalleryJsonLd("https://texascemeterybrokers.com/sell-cemetery-plot-texas", "Texas cemeteries we serve")]}
    />
    <Navbar forceScrolled />

    {/* HERO */}
    <section className="relative pt-28 pb-24 overflow-hidden bg-[hsl(38_35%_95%)]">
      {/* Fresh layered background — sage + cream wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(145_25%_88%)] via-[hsl(38_35%_95%)] to-[hsl(40_45%_92%)]" />
      <div className="absolute top-0 right-0 w-[44rem] h-[44rem] rounded-full bg-[hsl(145_25%_55%)]/25 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[34rem] h-[34rem] rounded-full bg-[hsl(16_50%_70%)]/20 blur-3xl pointer-events-none" />
      {/* Dotted paper texture */}
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(hsl(28 20% 50% / 0.35) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
      {/* Botanical accents — six distinct tropicals, well spaced, no overlap */}
      {(() => {
        const FLOWERS = import.meta.glob("@/assets/flowers/*.asset.json", { eager: true, import: "default" }) as Record<string, { url: string }>;
        const byName = (n: string) => Object.entries(FLOWERS).find(([k]) => k.includes(n))?.[1]?.url;
        const scatter = [
          { top: "4%",  left: "-4%",  w: 220, rot: -14, op: 0.55, src: byName("palm-fan-clean") },
          { top: "8%",  right: "-3%", w: 240, rot:  18, op: 0.55, src: byName("banana-leaf-clean") },
          { bottom: "14%", right: "4%", w: 170, rot: -10, op: 0.6, src: byName("hibiscus-coral") },
          { bottom: "18%", left: "3%", w: 200, rot:  12, op: 0.55, src: byName("pink-branch") },
        ];
        return scatter.map((s, i) => s.src ? (
          <img loading="lazy" decoding="async"
            key={i}
            src={s.src}
            alt=""
            aria-hidden
            className="absolute pointer-events-none select-none hidden md:block"
            style={{ top: s.top, bottom: s.bottom, left: s.left, right: s.right, width: s.w, opacity: s.op, transform: `rotate(${s.rot}deg)` }}
          />
        ) : null);
      })()}
      <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-[1]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 Q360 80 720 40 T1440 40 L1440 80 L0 80 Z" className="fill-background" />
      </svg>

      <div className="relative container mx-auto px-6 max-w-5xl">
        {/* Back link */}
        <Link to="/guides" className="inline-flex items-center gap-1.5 text-xs tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Guides
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <p className="text-accent text-[11px] tracking-[0.24em] uppercase font-semibold">The Seller's Guide</p>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] text-foreground leading-[0.98] mb-7 tracking-tight">
            How to Sell a Cemetery Plot in <span className="italic text-primary">Texas</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/75 leading-relaxed mb-8 max-w-2xl font-light">
            Everything Texas families ask us — what your plot is really worth, the legal steps, and the fastest way to turn unwanted property into cash. Written by the brokers who handle these sales every day.
          </p>

          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-wide text-foreground/60 mb-9">
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> Texas Cemetery Brokers</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> Updated 2025</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> 9 min read</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> 7 chapters</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
            <a href="#contact" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Get a Free Plot Valuation
            </a>
            <a href="#why" className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/80 backdrop-blur border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
              Why Use a Broker <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* In-this-guide chapter chips */}
          <div className="pt-6 border-t border-border/50">
            <p className="text-[10px] tracking-[0.28em] uppercase font-semibold text-foreground/50 mb-3">In this guide</p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: "#can-you-sell", t: "Can you sell?" },
                { href: "#value", t: "What it's worth" },
                { href: "#why", t: "Why a broker" },
                { href: "#process", t: "The process" },
                { href: "#legal", t: "Legal side" },
                { href: "#cities", t: "Coverage" },
                { href: "#cemeteries", t: "Popular cemeteries" },

                { href: "#faq", t: "FAQ" },
              ].map((c) => (
                <a key={c.href} href={c.href} className="text-xs px-3 py-1.5 rounded-full bg-card border border-border/60 text-foreground/75 hover:border-primary/40 hover:text-primary transition-colors">
                  {c.t}
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* ARTICLE BODY */}
    <article className="py-16">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Intro */}
        <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-primary">
          Plans change. Families move to other cities or out of state, often people make alternative burial arrangements, or inherit plots they'll never use. The good news: cemetery properties located in Texas can legally be resold to another person who needs them, and the value of your asset can be released. The challenge is that, just like in other states, private resales on the secondary market can be slow and challenging. Many people assume that selling cemetery property is just like real estate, but plots are a unique type of asset with several important quirks when it comes to transferring ownership, which need to be carefully understood to be successful. This guide explains what affects your plot's value, the legal steps, and the most reliable way to sell it.
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
            Yes — typically you can sell grave plots, mausoleum crypts, cremation niches and urn spaces you own in Texas, and release the value of your cemetery property assets. In Texas, whoever initially bought your plot from the cemetery acquired the <strong className="text-foreground">exclusive right of sepulture</strong> — the legal right to bury someone in a specific grave space, or to entomb someone in a specific mausoleum crypt. The exclusive right to use that particular plot for its intended purpose is what is presumed to be the cemetery property asset.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            People often get confused and believe they own an actual piece of land at a cemetery, but that is not the case. To sum up, what is commonly referred to as a "grave plot" or "cemetery property" in Texas is the exclusive right of sepulture. If you own these cemetery property rights, you are entitled to sell or transfer them to a third party.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            However, it is not easy. Reselling cemetery property is typically far more complex than selling other personal assets. It tends to be very time-consuming and requires several highly specific steps to be followed for the transfer to be legal and for the sale to go through. The first step toward selling your Texas cemetery property is to find the answer to three key questions:
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

        {/* H2: Three key questions */}
        <section id="key-questions" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 01b · Before you list</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Three key questions before you <span className="italic text-primary">sell</span></h2>

          <h3 className="font-display text-2xl text-foreground mt-10 mb-4 leading-snug">1. Does your contract have a right-of-first-refusal clause?</h3>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Sometimes, Texas cemetery properties have a right-of-first-refusal clause. Begin by checking whether any pre-existing restrictions limit your ability to sell the plot. Start by examining the original purchase records and the certificate of ownership or deed. If your contract contains this kind of limitation, you can only resell your plot if the cemetery declines to take up their right of first refusal to buy it back. Depending on the exact language of the agreement, you will need the cemetery administration to first officially approve your property for transfer to a third party — a future buyer or other individual.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-5">
            So how does the cemetery decide how much they will give you to buy back your plot? The answer depends on the specific language in your original contract. Spoiler alert: it won't be 100% of the retail list price that the cemetery markets and sells comparable new plots for today. Depending on the cemetery's regulations and the specific language of your original agreement, the amount is determined according to a predetermined method. Formulas vary widely, but common buyback offers we see at Texas Cemetery Brokers determine the dollar amount to be:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Calculated as a certain percentage of the original purchase price paid, with adjustments for services performed, commodities, etc.",
              "Calculated as a ratio of the current retail price for comparable 'new' properties that the cemetery is selling today.",
              "A refund of the exact same dollar amount you originally paid for the plot when it was first bought from the cemetery — without any upward adjustment for inflation.",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Another important consideration we have noticed with cemetery buybacks is that property owners are often required to pay administrative fees upfront when initiating the transaction. These fees are non-refundable and apply even if you change your mind later in the process, or you do not complete the buyback transfer for some reason — for example, if you fail to provide the correct documents or co-signatures.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Finally, remember the buyback amount will be calculated on the price paid for the exclusive right of sepulture only — not for any additional services, interest charges, administration fees, and so on that you purchased along with the plot.
          </p>

          <h3 className="font-display text-2xl text-foreground mt-12 mb-4 leading-snug">2. Do all co-owners consent to the sale?</h3>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Texas has numerous and unique laws that govern how cemetery property is passed down within families. These laws concern who has a legal interest in the plot — whether that means an ownership share, the right to use the plot personally, or the authority to decide who is buried there. These Texas laws, such as the <Ext href="https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm">Health and Safety Code, Chapter 711</Ext>, were designed to make sure family members' rights are respected when it comes to who can "use" a particular plot, and who can authorize its sale or transfer.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-5">
            In practice, it means that owners of cemetery property often assume they can proceed with selling their plot, only to discover later that other individuals — typically their family members, their spouses, or other co-heirs — will need to be involved. Under Texas community property rules, written agreement and sign-off to transfer or sell cemetery property is frequently required from spouses, siblings, or even more distant family members because they qualify as co-owners. People can get surprised by these restrictions because they have no idea they apply in their situation. Common misunderstandings occur because these rules still apply even if:
          </p>
          <ul className="space-y-4 mb-6">
            {[
              { t: "The co-owners do not know they have an ownership interest in the property.", d: "A legal interest can exist whether or not the person is aware of it." },
              { t: "The co-owners have indicated they don't want the plot.", d: "Whether expressed verbally, written in personal correspondence, or documented in an informal will — unless the process of technically updating the owner(s) of record with the cemetery administration has been entirely completed (all documentation requirements met and fees paid, and the new ownership recorded), then as far as the cemetery is concerned, this likely still needs to take place in order for the cemetery to authorize the transfer of the property to a third party." },
              { t: "The plot was passed down informally within the family.", d: "Informal hand-downs to the 'current' owner do not change the cemetery's records — the recorded ownership is what counts." },
              { t: "A co-owner has never objected.", d: "Just because a co-owner never objected does not mean their rights will be ignored. Cemetery administrators will base their decision to authorize a transfer on adhering to the Texas Health and Safety Code and their own regulations — not on whether or not any co-owners intend to exercise their rights." },
            ].map((item, i) => (
              <li key={i} className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border/60">
                <span className="shrink-0 w-8 h-8 rounded-full bg-accent/15 text-accent font-display flex items-center justify-center text-sm mt-0.5">{String.fromCharCode(97 + i)}</span>
                <div>
                  <p className="font-medium text-foreground leading-snug mb-1">{item.t}</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="font-display text-2xl text-foreground mt-12 mb-4 leading-snug">3. What is the cemetery's transfer policy, documentation and fees?</h3>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Each Texas cemetery has its own regulations, quitclaim and conveyancing forms, documentation requirements, fees and policies for recording a transfer. These need to be understood and adhered to for any resale to go through.
          </p>
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

          {/* Verification pillars — buyer trust */}
          <div className="mt-10 rounded-3xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-accent/5">
            <div className="p-7 md:p-9 border-b border-primary/10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <Eyebrow>Verified before listed</Eyebrow>
                <p className="font-display text-2xl md:text-3xl text-foreground leading-snug">Every plot we list is verified — ownership confirmed, transfer cleared.</p>
                <p className="text-foreground/75 leading-relaxed mt-2">Buyers transacting on a private classified have no way to know if a plot is real, available, or transferable. When you list with us, that question is already answered — which is how families feel safe committing.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-primary/10">
              {verification.map(({ Icon, t, d }) => (
                <div key={t} className="p-6 md:p-7">
                  <Icon className="w-5 h-5 text-primary mb-3" strokeWidth={1.75} />
                  <p className="font-display text-base text-foreground mb-1.5">{t}</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
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
              { t: "We market and match it.", d: <>Your plot reaches our active buyer network and is cross-referenced against current inquiries from families, mortuaries and estate attorneys, backed by the nationwide reach of our partner <Ext href="https://bayercemeterybrokers.com/">Bayer Cemetery Brokers</Ext>.</> },
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
            A common question is whether you need a license to sell. You do not — selling your own plot requires no license. And while Texas once required third-party brokers to register with the <Ext href="https://www.dob.texas.gov/cemetery-prepaid-funeral-services">Texas Department of Banking</Ext>, that registration requirement was repealed effective <strong className="text-foreground">September 1, 2019</strong>. There is no state cemetery-broker license in Texas today.
          </p>
          <p className="text-foreground/80 mb-4">What still applies — and what a careful broker handles for you — comes from the <Ext href="https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm">Texas Health &amp; Safety Code, Chapter 711</Ext>:</p>
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
          <div className="rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 mb-8">
            <p className="text-foreground/85 leading-relaxed italic">
              This is why a broker matters even without a licensing requirement: a sale is not truly final until the cemetery records the transfer correctly. We make sure that happens — so the buyer is protected and you are fully and cleanly released from the property.
            </p>
          </div>
          <p className="text-foreground/75 leading-relaxed text-sm">
            Perpetual care cemeteries in Texas are regulated by the Department of Banking, which also publishes an <Ext href="https://www.dob.texas.gov/cemetery-prepaid-funeral-services/how-file-complaint">official complaint process</Ext> for families. Additional consumer resources are available from the <Ext href="https://tfsc.texas.gov/ConsumerInformation.html">Texas Funeral Service Commission</Ext>.
          </p>
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
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {c.parks.map((p, i) => (
                      <span key={p.label}>
                        {i > 0 && <span className="text-foreground/40"> · </span>}
                        {p.cemetery ? (
                          <Link to={cemeteryPath(p.cemetery)} className="text-foreground/80 hover:text-primary underline-offset-4 hover:underline transition-colors">
                            {p.label}
                          </Link>
                        ) : (
                          p.label
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-foreground/80 leading-relaxed">
            Looking to buy instead? See our <Link to="/buy" className="text-primary underline-offset-4 hover:underline font-medium">cemetery plots for sale in Texas</Link>.
          </p>
        </section>

        <GuideCemeteryGallery
          eyebrow="Chapter 06b · Where we sell"
          title={<>Cemeteries where we place <span className="italic text-primary">sellers' property</span></>}
          intro="If you own property in one of these memorial parks, we almost certainly have buyers asking for it. Each cemetery page explains the sections and gardens, the cemetery's own transfer fee and paperwork, and what owners there can realistically expect."
          footer={
            <>
              You can also <Link to="/cemeteries" className="text-primary underline-offset-4 hover:underline font-medium">browse every Texas cemetery we serve</Link>, read{" "}
              <Link to="/cemetery-plot-cost-texas" className="text-primary underline-offset-4 hover:underline font-medium">what cemetery plots cost in Texas</Link>, or{" "}
              <Link to="/sell" className="text-primary underline-offset-4 hover:underline font-medium">request a free valuation</Link> for your own property.
            </>
          }
        />



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

        {/* H2: Resources */}
        <section id="resources" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 08 · Resources</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Official Texas <span className="italic text-primary">resources</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            The authoritative sources behind everything on this page — useful if you want to verify anything yourself.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3">
            {resources.map((r) => (
              <li key={r.href}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-soft transition-all"
                >
                  <p className="font-display text-base text-foreground group-hover:text-primary transition-colors mb-1.5 leading-snug">
                    {r.label} <span className="inline-block align-middle ml-0.5 opacity-60 group-hover:translate-x-0.5 transition-transform">↗</span>
                  </p>
                  <p className="text-sm text-foreground/65 leading-relaxed">{r.note}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>

    <section className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10">
        <MetroCemeteryMap
          regions={["Dallas–Fort Worth"]}
          metro="Dallas–Fort Worth"
          searchable
          blurb="Find your cemetery on the map to see its profile, sections and recorded transfer fee before you list."
        />
      </div>
    </section>


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
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] hover:opacity-95 transition-all">
                Request a Free Valuation <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={`mailto:${EMAIL}`} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground rounded-2xl font-medium text-[15px] hover:bg-primary-foreground/15 transition-all">
                <Mail className="w-4 h-4" /> Email Us
              </a>
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
