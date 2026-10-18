import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, Plus, CheckCircle2, MapPin, ShieldCheck, FileSearch, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import GuideCemeteryGallery, { guideGalleryJsonLd } from "@/components/guides/GuideCemeteryGallery";
import PlotResaleCalculator from "@/components/PlotResaleCalculator";


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
import { SPARKMAN_HERO } from "@/data/sparkmanPhotos";
import { BLUEBONNET_HERO } from "@/data/bluebonnetPhotos";
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
      description="What your plot is worth today, the transfer steps Texas cemeteries require, and listing packages from $299. Free valuation in 24 hours."
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
            <span data-simon-review>When someone comes to me and says they’ve got a cemetery plot they’d like to sell, I nearly always ask a little bit about the history — when it was originally purchased, and the thinking behind selling it.</span>
          </p>

          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-wide text-foreground/60 mb-9">
            <span data-simon-review className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> Simon James · Texas Cemetery Brokers</span>
            <span data-simon-review className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary" /> Updated October 2026</span>
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
                { href: "#plans-change", t: "Why people sell" },
                { href: "#selling-options", t: "Five options" },
                { href: "#selling-patience", t: "How long?" },
                { href: "#key-questions", t: "Before you list" },
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
        <p data-simon-review className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-primary">
          For most people coming into this, it’s brand new. It’s not a business or an industry that you experience multiple times. Unlike selling a car — you might buy and sell ten different cars over a lifetime — cemetery plots are probably a once-in-a-lifetime experience. Most people who come into the situation just don’t know how the system works, and neither should they. That’s understandable. So as brokers we often have to explain how the industry is structured: the role of a broker, the role of a cemetery, the role of a funeral director, and how all these different people can help.
        </p>

        <section id="plans-change" className="scroll-mt-24 my-12 space-y-5 text-lg leading-relaxed">
          <h2 data-simon-review className="font-display text-3xl md:text-4xl">Plans change — why people sell</h2>
          <p data-simon-review>You get a broad range of stories. At one end, I’ve had a family whose great-great-grandparent bought plots in the 1920s, lots of plots for everybody, and everybody’s plans changed and moved and evolved. The deeds still exist, the plots are still there, they’re unused, and they certainly have value.</p>
          <p data-simon-review>At the other end, I’ve come across people who purchased a plot last year and something’s changed in their life, and they don’t want the plot anymore. That’s actually a harder one to deal with.</p>
          <p data-simon-review>The most common reason, in my experience, is people moving. People buy plots thinking they’ll be in one location, and 10, 20 years later — life evolves in such an odd way, it’s so hard to predict for all of us — they’re in a different state, and their connection back to the original location and the original cemetery is pretty weak. Maybe relatives and children tell their parents they won’t be able to visit, and ask them to pick a closer location.</p>
          <p data-simon-review>There’s also been a bit of an evolution toward cremation. Many people bought plots, or groups of plots, really for caskets, and what they want to do has changed. Another factor is just the overall cost of funerals. It’s expensive, and many people are saying they just want a much cheaper solution.</p>
          <h3 data-simon-review className="font-display text-2xl">Discovering you own a plot</h3>
          <p data-simon-review>Often people come to me and they’ve just found that they are an owner, or part-owner, of a plot. They’re going through the records of a recently deceased relative — I probably get two or three of these a week. Maybe they’re the executor of the will, or there’s a trust. Maybe it’s a parent, and you’re just looking through collections of paperwork, and suddenly there’s the deed, and you realize there’s cemetery property and wonder what you’re going to do with it.</p>
          <p data-simon-review>If you as a descendant don’t want to use that property, then you’re looking to see if you can in some way get some value from it. Finding the deed is the starting point; who owns the rights and who must sign still need to be checked.</p>
        </section>

        {/* Short answer callout */}
        <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 overflow-hidden my-12">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/15 blur-2xl" />
          <Eyebrow>The short answer</Eyebrow>
          <p className="relative text-lg md:text-xl text-foreground/90 leading-relaxed">
            Yes, you can sell a cemetery plot in Texas. Check your purchase contract for a right-of-first-refusal clause, confirm any co-owners agree, then list privately or work with a cemetery broker who finds the buyer, prices it correctly, and completes the legal transfer with the cemetery for you.
          </p>
        </div>

        {/* Editorial photo band — flagship Dallas cemeteries */}
        <div className="grid sm:grid-cols-2 gap-4 md:gap-5 my-14">
          {[
            {
              src: SPARKMAN_HERO.src,
              alt: "The fountain garden at Sparkman-Hillcrest Memorial Park on Northwest Highway in Dallas, Texas",
              kicker: "Dallas · Northwest Highway",
              name: "Sparkman-Hillcrest Memorial Park",
              slug: "sparkman-hillcrest-memorial-park",
            },
            {
              src: BLUEBONNET_HERO.src,
              alt: "The lake and fountain at Bluebonnet Hills Memorial Park in Colleyville, Texas, with walkways and memorial benches",
              kicker: "Colleyville · Harwood Road",
              name: "Bluebonnet Hills Memorial Park",
              slug: "bluebonnet-hills-memorial-park",
            },
          ].map((p) => (
            <Link key={p.slug} to={`/cemeteries/${p.slug}`} className="group relative block overflow-hidden rounded-3xl border border-border/60 shadow-soft">
              <figure className="m-0">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img loading="lazy" decoding="async" src={p.src} alt={p.alt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/70 mb-1.5">{p.kicker}</p>
                    <p className="font-display text-xl md:text-2xl text-white leading-tight">{p.name}</p>
                  </figcaption>
                </div>
              </figure>
            </Link>
          ))}
        </div>

        {/* H2: Can you sell */}
        <section id="can-you-sell" className="scroll-mt-24 mt-16">
          <Eyebrow>Chapter 01</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Can you sell a cemetery plot in <span className="italic text-primary">Texas?</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            Yes — typically you can sell grave plots, mausoleum crypts, cremation niches and urn spaces you own in Texas, and release the value of your cemetery property assets. In Texas, whoever initially bought your plot from the cemetery acquired the <strong className="text-foreground">exclusive right of sepulture</strong> — the legal right to bury someone in a specific grave space, or to entomb someone in a specific mausoleum crypt. The exclusive right to use that particular plot for its intended purpose is what is presumed to be the cemetery property asset.
          </p>
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-6 text-lg">
            Most people think cemetery property is real estate and can be thought of and dealt with just like real estate. That’s not surprising — we use the same language. We say it’s property. But you don’t get to own the land and exercise choice over how that land is presented. What you actually have as an asset is the right to have your remains interred in that plot — sometimes two interments, or even more, where permitted. That’s essentially what the asset is. A sale transfers those rights, subject to applicable law and the cemetery’s rules.
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
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-5">
            When you make the decision to sell your plot, clearly read the original contract. There are a few cemeteries — a minority in my experience — that have specific clauses around right of first refusal. They tend to be more religion-based, and sometimes municipal ones — city or local-government owned. They have clauses giving them the right to potentially buy it back at a certain price. So double-check that. The exact contract wording determines whether, and on what terms, a third-party sale can proceed.
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
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-5">
            When you work with a cemetery, they might well ask to have administrative fees paid up front. In one case I know of, the cemetery requires — if the plot is in the name of a deceased individual — that it be put into a living relative’s name before it can be transferred to a third party. Check which fees are refundable and what steps your cemetery requires; this is not the same at every cemetery.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Finally, remember the buyback amount will be calculated on the price paid for the exclusive right of sepulture only — not for any additional services, interest charges, administration fees, and so on that you purchased along with the plot.
          </p>

          <h3 className="font-display text-2xl text-foreground mt-12 mb-4 leading-snug">2. Do all co-owners consent to the sale?</h3>
          <p className="text-foreground/80 leading-relaxed mb-5">
            Texas has numerous and unique laws that govern how cemetery property is passed down within families. These laws concern who has a legal interest in the plot — whether that means an ownership share, the right to use the plot personally, or the authority to decide who is buried there. These Texas laws, such as the <Ext href="https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm">Health and Safety Code, Chapter 711</Ext>, were designed to make sure family members' rights are respected when it comes to who can "use" a particular plot, and who can authorize its sale or transfer.
          </p>
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-5">
            You will almost certainly need to work out who the signers, the co-owners — and maybe the co-signers, they can be different things — are to sell the plot. If you have a group of co-owners, you need everybody’s approval, and it has to be written; it can’t just be a verbal okay. In multi-generational cases, cousins can be in different parts of the world, and sometimes we’ve lost contact with them. Generally, the absence of a required co-signer isn’t going to fly with the cemetery. Saying you just can’t find one of the cousins is not a substitute for their required consent. The exact signing requirements depend on the ownership, family facts, Texas cemetery and inheritance law, and cemetery rules. These issues can arise even if:
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
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-5">
            Always worth checking the cemetery’s transfer policy — the cemetery should willingly give this out. It may have its own forms; sometimes they accept third-party forms. A classic case is the affidavit of heirship: you can find a well-written document online, but the cemetery could say no, they want their own one. The form also needs to fit your family’s legal situation; it is not a universal substitute for probate.
          </p>
          <p data-simon-review className="mb-5 leading-relaxed">You may come across the phrase “quitclaim” — a quitclaim form essentially says: I’m transferring my claim from this to someone else. The cemetery may be able to arrange notarization if you transfer there. If you’re doing a transfer remotely and mailing documents, ask which signatures must be notarized. A bank or a notary service may be able to help; confirm the current charge rather than assume a fixed fee.</p>
        </section>

        {/* H2: Value factors */}
        <section id="value" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 02 · Valuation</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">What affects your plot's <span className="italic text-primary">value</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-5 text-lg">
            The value of your memorial property will depend on many factors, including the type of plot, the number of interments included, where it is located, and even how the current ownership is structured and recorded with the cemetery. There is no general rule of thumb for valuing Texas cemetery property that can be applied to all plots, nor is there a simple universal formula to determine current market value.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            However, whether your plot is at <Link to={cemeteryPath("Sparkman/Hillcrest Memorial Park")} className="text-primary underline-offset-4 hover:underline font-medium">Sparkman–Hillcrest</Link> in Dallas, <Link to={cemeteryPath("Forest Park Lawndale Cemetery")} className="text-primary underline-offset-4 hover:underline font-medium">Forest Park Lawndale</Link> in Houston, or anywhere in between, it will have a unique value that can be determined when all the relevant factors are taken into account. Two plots in the same cemetery can be worth very different amounts. The main factors are:
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
        <section className="my-12 md:my-16" aria-label="Estimate your cemetery plot resale value">
          <PlotResaleCalculator compact />
        </section>

        <section id="selling-options" className="scroll-mt-24 mt-20 space-y-5 text-lg leading-relaxed">
          <h2 data-simon-review className="font-display text-3xl md:text-4xl">My advice: five options for selling</h2>
          <p data-simon-review>When someone comes to me and says they’ve got such a property and they want my advice, I pretty much say the same things. If you want to get some money back for the plot or plots, or find someone who can actually use the plot, then my advice is as follows.</p>
          <h3 data-simon-review className="font-display text-2xl">1. Check friends and family first</h3>
          <p data-simon-review>Firstly, I would contact friends and family — extended friends and extended family — and potentially use social media, and give that a few weeks or months. You may be pleasantly surprised that someone in your extended circle comes back, is very grateful, has a great need, and you’re able to make an arrangement that works out great for both of you. I have seen that happen, and I always advise everybody to do that first. As a broker, clearly I’d love to help people find a third-party buyer, but I always advise: check friends and family first.</p>
          <h3 data-simon-review className="font-display text-2xl">2. Ask the cemetery</h3>
          <p data-simon-review>Most people I speak to have already done it — it’s one of the first things they think of. Most cemeteries I deal with will not purchase a plot from a customer and bring it back into the cemetery’s ownership. It’s logical: they’re in the business of selling plots, not buying them. They’re trying to develop new lawns and sell the plots in those lawns, and they view buying plots in older lawns as going backwards.</p>
          <p data-simon-review>It’s rare, but I have had cases where the cemetery came back and said, we can buy your plot and give you a decent price for it. If you get that offer and the price is better than you can get from a broker or a third-party sale, go ahead and take it — that’s a great option. More commonly, the cemetery offers the price originally paid, probably minus some fees. But I always say try it out and check — just see what happens.</p>
          <h3 data-simon-review className="font-display text-2xl">3. Use a broker</h3>
          <p data-simon-review>The third option is to use a broker. Obviously we are brokers, so I’m going to talk more about what we do and our role and how we can help. But before I get into that in more detail, options four and five.</p>
          <h3 data-simon-review className="font-display text-2xl">4. Arrange a private sale</h3>
          <p data-simon-review>There are a bunch of internet-based marketplaces and sites focused just on cemetery plots. You have the freedom to say what you want about your plot; usually you can pick your own price and put up your own pictures. So that part is attractive. Check each site’s current listing rules before paying or posting.</p>
          <p data-simon-review>You also have to put up with scam artists and members of the public who aren’t going to behave honorably. It’s very difficult to verify people and legitimize their interest in your plots, and you get a lot of individuals who aren’t serious about buying. You have to be very cautious of scams — there’s a large amount of money involved. Be very, very cautious.</p>
          <p data-simon-review>The other headache is the paperwork. It doesn’t matter whether you sell your plot to your brother, to a third party, or go through a broker. There’s a lot of paperwork to get through. Cemeteries want to be very precise, making sure the person selling has the full and complete authority, and that any other co-owners or individuals give the required consent.</p>
          <p data-simon-review>If you’re dealing on a marketplace, you’re going to have to organize all that paperwork yourself. I’ll be honest — it’s tough even for a broker, and we see so many cases and deal with so many cemeteries. You have to be pretty cautious about that part.</p>
          <h3 data-simon-review className="font-display text-2xl">5. Consider a donation</h3>
          <p data-simon-review>The fifth way is a donation, which I see people do — clearly a very honorable and good thing to do. Churches and other institutions may accept plots. If you want the tax benefit of a donation, you’ve got to be very careful with the paperwork and valuation requirements. Ask a tax adviser whether the gift qualifies and whether a qualified appraisal is required. You still need to transfer the plots, even to a church — which means the cemetery’s paperwork again.</p>
        </section>

        <section id="selling-patience" className="scroll-mt-24 mt-16 space-y-5 text-lg leading-relaxed">
          <h2 data-simon-review className="font-display text-3xl md:text-4xl">How long will it take to sell?</h2>
          <p data-simon-review>I always urge patience. This is probably the number one question I get: how quickly can you sell the plot? Markets change. Back in the COVID times there was, if anything, greater demand than supply for plots — maybe not surprisingly, and sadly. In the post-COVID market I’ve been seeing more sellers than buyers. Part of that is that buyers don’t even know you can get resale plots — so there’s an education part to this.</p>
          <p data-simon-review>I’ve seen terrific plots take a long time to sell, and plots that surprisingly sell quickly. A plot can sell in as little as a month, but frankly it can take a year — I’ve seen fantastic plots take way over a year to sell. Those are my experiences, not a promise of a buyer or a deadline for your property.</p>
          <p data-simon-review>It’s a very, very personal decision. You’re looking at something you’re potentially buying for yourself, or for a loved one, or someone recently deceased — you could be suffering a bereavement. Some want to be near a tree, others want to be as far away as possible. Some want to be near a curb, some don’t. Some would like a slope with a view, others want to be as flat as possible. There’s a great deal about relatives visiting and the ease of getting to the plot.</p>
          <p data-simon-review>You have a buyer come, look at the plot, and say it’s an absolute perfect fit — but another family can come along and it just doesn’t work for them.</p>
        </section>

        <section id="why" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03 · The case for a broker</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Why selling through Texas Cemetery Brokers is the <span className="italic text-primary">safest, fastest route</span></h2>
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-10 text-lg">So those are the five options I mention to most people who want to sell a plot. Now let’s talk more about the broker option — what we do and how we help people.</p>

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
            Texas law sets out how cemetery interment rights are conveyed and recorded. Before a sale, check the ownership record, any co-owner or heir interests and the cemetery’s transfer requirements.
          </p>
          <p className="text-foreground/80 mb-4">The transfer rules, and what a careful broker handles for you, are set out in the <Ext href="https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm">Texas Health &amp; Safety Code, Chapter 711</Ext>:</p>
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
