import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, Plus, CheckCircle2, MapPin, ShieldCheck, FileSearch, BadgeCheck, Footprints } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import singlePlot from "@/assets/property-types/single-plot.png";
import companionPlot from "@/assets/property-types/companion-plot.png";
import mausoleumPlot from "@/assets/property-types/mausoleum.png";
import cremationNiche from "@/assets/property-types/cremation-niche.png";
import memorialPark from "@/assets/guides/preneed-memorial-park.jpg.asset.json";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import MetroCemeteryMap from "@/components/MetroCemeteryMap";
import GuideCemeteryGallery, { guideGalleryJsonLd } from "@/components/guides/GuideCemeteryGallery";
import { cemeteryPath } from "@/lib/cemeterySlug";
import { SPARKMAN_HERO } from "@/data/sparkmanPhotos";
import { BLUEBONNET_HERO } from "@/data/bluebonnetPhotos";
import teamWalkthroughAsset from "@/assets/team/tcb-plot-walkthrough-v2.jpg.asset.json";
const TEAM_WALKTHROUGH = teamWalkthroughAsset.url;
import { DiscountTable, FinancingGraphic, PriceAppreciationChart } from "@/components/guides/PreneedSavingsGraphics";
import PreneedInquiryForm from "@/components/guides/PreneedInquiryForm";
import { EMAIL, jsonLd, reasons, priceFactors, myths, faqs, resources } from "./guide-preneed-data";

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline font-medium">
    {children}
  </a>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">{children}</p>
);

const cities: { city: string; parks: { label: string; cemetery?: string }[] }[] = [
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
  {
    city: "Houston",
    parks: [
      { label: "Forest Park", cemetery: "Forest Park Lawndale Cemetery" },
      { label: "Earthman Resthaven", cemetery: "Earthman Resthaven Cemetery" },
      { label: "Brookside", cemetery: "Brookside Memorial Park" },
      { label: "Memorial Oaks", cemetery: "Memorial Oaks Cemetery" },
    ],
  },
  { city: "San Antonio", parks: [{ label: "Citywide coverage across the major parks and gardens" }] },
  { city: "Austin", parks: [{ label: "Cook–Walden Capital Parks and surrounding memorial parks" }] },
  { city: "College Station", parks: [{ label: "Brazos Valley and surrounding communities" }] },
];

const buyerReasons = [
  {
    n: "01",
    h: "We show you the space in person before you commit",
    p: [
      "Choosing a resting place is deeply personal, and almost nobody wants to decide from a photograph. We meet you at the cemetery and walk the grounds — the section, the position, what is beside it, what the view is like on a normal Tuesday afternoon.",
      "It is not unusual for us to walk a family through several spaces across more than one visit before something feels right. That is the whole point of buying preneed: there is time to be sure.",
    ],
  },
  {
    n: "02",
    h: "We verify ownership before a space is ever offered to you",
    p: [
      "Buying by owner is where the savings are, and it is also where the risk sits if nobody checks. Before we represent a space, we review the original deed or certificate, confirm the names on file at the cemetery office, secure written consent from any co-owners, and clear any right-of-first-refusal held by the cemetery.",
      "That is the difference between a verified resale space and a classified listing from a stranger. When you pay, the cemetery records the conveyance in your name — because we confirmed in advance that it could.",
    ],
  },
  {
    n: "03",
    h: "We know each cemetery's paperwork, so the transfer actually completes",
    p: [
      "Every Texas cemetery has its own conveyance forms, documentation requirements, transfer fee and recording procedure. A sale is not truly final until the cemetery records the transfer correctly, and that is where private purchases most often stall.",
      "We prepare and record the conveyance with the cemetery for you, and we remit the cemetery's fees. You end up holding property that is properly on file, in your name.",
    ],
  },
  {
    n: "04",
    h: "You can spread the cost, at 0% interest",
    p: [
      "Preneed buying should not require the whole amount up front. We offer interest-free payment plans over up to 24 months, so a family can secure the exact space they want now and pay for it comfortably.",
      "It is one of the practical reasons preneed works: the decision is made while there is time to plan, not in the week of a funeral when everything is due at once.",
    ],
  },
  {
    n: "05",
    h: "We are trained to look after families, not to close a sale",
    p: [
      "Our team includes people who spend their days with grieving families, alongside specialists who can explain the finer points — the cemetery's rules, the paperwork, the small distinctions between two sections that look identical on a map.",
      "Nobody here will push you toward a more expensive space. If the honest answer is that the section you are asking about is not worth the premium, we will tell you.",
    ],
  },
];

const verification = [
  { Icon: FileSearch, t: "Deed & certificate verified", d: "We review the original purchase paperwork and confirm the recorded owner matches the seller." },
  { Icon: BadgeCheck, t: "Cemetery records confirmed", d: "We contact the cemetery office to confirm the space is on file, unused, and clear to transfer." },
  { Icon: ShieldCheck, t: "Co-owners & ROFR cleared", d: "Written consent from every co-owner, and any right-of-first-refusal resolved, before the space is offered." },
];

const mastheadStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const mastheadRise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

/** Kraft discount tag, drawn in SVG so it stays crisp at any size. */
const DiscountTag = () => (
  <span className="flex items-center justify-center gap-3 sm:gap-4" aria-hidden="true">
    <span className="h-px w-10 sm:w-20 bg-gradient-to-r from-transparent to-accent/50" />
    <svg viewBox="0 0 190 54" className="preneed-tag w-32 sm:w-40 shrink-0" role="img" aria-label="Up to 50% off cemetery retail">
      <path d="M31 3h151a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H31L6 27Z" fill="hsl(var(--accent))" />
      <path d="M34 8h144a3 3 0 0 1 3 3v32a3 3 0 0 1-3 3H34L14 27Z" fill="none" stroke="hsl(var(--accent-foreground) / .5)" strokeWidth="1" />
      <circle cx="22" cy="27" r="5" fill="hsl(var(--background))" />
      <text x="108" y="23" textAnchor="middle" className="font-display" fontSize="12" letterSpacing="3" fill="hsl(var(--accent-foreground))" opacity=".9">UP TO</text>
      <text x="108" y="42" textAnchor="middle" className="font-display" fontSize="20" letterSpacing="1.2" fill="hsl(var(--accent-foreground))">50% OFF</text>
    </svg>
    <span className="h-px w-10 sm:w-20 bg-gradient-to-l from-transparent to-accent/50" />
  </span>
);

const GuidePreneedCemeteryPlots = () => {
  const reduceMotion = useReducedMotion();
  return (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="Discounted Preneed Cemetery Plots in Texas | Up to 50% Off Retail"
      description="Cheap preneed cemetery plots in Texas — verified by-owner spaces at up to 50% off cemetery retail, sold-out sections sourced, in-person showings and 0% interest for 24 months."
      path="/preneed-cemetery-plots-texas"
      type="article"
      jsonLd={[...jsonLd, guideGalleryJsonLd("https://texascemeterybrokers.com/preneed-cemetery-plots-texas", "Texas cemeteries where we place buyers")]}
    />
    <Navbar forceScrolled />

    {/* Editorial preneed masthead — Vogue-style, over a watercolour wash. */}
    <section aria-labelledby="preneed-title" className="preneed-masthead relative overflow-hidden bg-background pt-24 sm:pt-28 pb-8">
      <div className="mx-auto max-w-screen-2xl px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4 border-b border-foreground/20 pb-3 text-[10px] sm:text-xs uppercase text-muted-foreground">
          <Link to="/guides" className="inline-flex items-center gap-2 hover:text-primary transition-colors"><ArrowLeft className="h-3.5 w-3.5" /> All Guides</Link>
          <span className="hidden sm:flex items-center gap-3 text-accent/70">
            <span className="h-px w-8 bg-foreground/15" />
            <svg viewBox="0 0 12 12" className="h-2 w-2 fill-current" aria-hidden="true"><path d="M6 0l1.5 4.5L12 6 7.5 7.5 6 12 4.5 7.5 0 6l4.5-1.5z" /></svg>
            <span className="h-px w-8 bg-foreground/15" />
          </span>
          <span>The Preneed Edition · 2026</span>
        </div>

        <motion.div variants={mastheadStagger} initial={reduceMotion ? false : "hidden"} animate="show" className="pt-6 sm:pt-8">
          <div className="grid grid-cols-12 gap-x-8 gap-y-8 lg:gap-x-12">
            {/* Headline column — left aligned, fills the width the article uses below */}
            <div className="col-span-12 lg:col-span-7">
              <motion.p variants={mastheadRise} className="mb-4 flex items-center gap-3 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-primary">
                <span className="h-px w-8 bg-primary/30" />
                Texas Cemetery Brokers · Planning ahead
              </motion.p>

              <motion.h1 id="preneed-title" variants={mastheadRise} className="font-display leading-[0.92] text-foreground">
                <span className="block text-xl sm:text-2xl lg:text-3xl italic text-accent">
                  <span className="relative inline-block px-1">
                    Discounted
                    <motion.svg viewBox="0 0 260 14" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-1.5 left-0 h-3 w-full text-accent/55">
                      <motion.path d="M4 10C58 3 150 2 256 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }} />
                    </motion.svg>
                  </span>
                </span>
                <span className="mt-1 block text-balance text-[clamp(2.6rem,calc(5.2vw_-_6px),4.7rem)]">Preneed Cemetery Plots</span>
                <span className="block text-balance text-[clamp(2.6rem,calc(5.2vw_-_6px),4.7rem)] italic text-primary">in Texas.</span>
              </motion.h1>

              <motion.div variants={mastheadRise} className="mt-5">
                <DiscountTag />
              </motion.div>

              <motion.p variants={mastheadRise} className="mt-5 max-w-2xl text-base sm:text-lg text-foreground/75 leading-relaxed">
                Buy the space before it is needed — at a discount. Verified by-owner plots at up to <strong className="text-foreground font-medium">50% below cemetery retail</strong>, access to sections the cemetery has sold out, someone from our team walking the grounds with you in person, all the paperwork completed by us, and 0% interest financing for up to two years where we can offer it.
              </motion.p>

              <motion.div variants={mastheadRise} className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="w-full sm:w-auto"><Link to="/buy">See Discounted Spaces <ArrowRight /></Link></Button>
                <Button asChild variant="link" size="lg"><a href="#discounts">See The Discounts <ArrowRight /></a></Button>
              </motion.div>
              <motion.p variants={mastheadRise} className="mt-2 text-[11px] text-muted-foreground">Updated 2026 · 8 min read</motion.p>
            </div>

            {/* Grounds photograph — the space the old centred layout left empty */}
            <motion.figure variants={mastheadRise} className="col-span-12 m-0 flex min-w-0 flex-col gap-4 lg:col-span-5">
              <div className="relative min-h-[18rem] flex-1 overflow-hidden rounded-2xl border border-border/60 shadow-soft">
                <img src={memorialPark.url} alt="Sunlit memorial park grounds on rolling green lawns, with flat grave markers set into the turf and trees framing the view" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-3 pt-12 text-[10px] uppercase tracking-[0.22em] text-white/90">
                  Every space is shown in person before you commit
                </figcaption>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Burial property illustrations">
                {[
                  { src: singlePlot, label: "Burial plots", alt: "Watercolour burial headstone with small white flowers" },
                  { src: companionPlot, label: "Companion spaces", alt: "Watercolour companion burial space for two" },
                  { src: mausoleumPlot, label: "Mausoleum crypts", alt: "Watercolour mausoleum crypts with arched openings" },
                  { src: cremationNiche, label: "Cremation niches", alt: "Watercolour memorial niches for cremation" },
                ].map((property) => (
                  <figure key={property.label} className="preneed-plate m-0 min-w-0">
                    <img src={property.src} alt={property.alt} loading="lazy" className="mx-auto h-14 w-full object-contain sm:h-20" />
                    <figcaption className="mt-1 text-center text-[9px] leading-snug text-muted-foreground sm:text-[11px]">{property.label}</figcaption>
                  </figure>
                ))}
              </div>
            </motion.figure>
          </div>

          <motion.div variants={mastheadRise} className="mt-8 grid grid-cols-2 gap-y-4 border-y border-foreground/20 py-4 sm:grid-cols-4">
            {[
              { k: "Up to 50%", v: "below cemetery retail" },
              { k: "0%", v: "interest for up to 24 months" },
              { k: "Sold-out", v: "sections we can still source" },
              { k: "100%", v: "of the paperwork done by us" },
            ].map((stat) => (
              <div key={stat.k} className="px-3 even:border-l even:border-border sm:[&:not(:first-child)]:border-l">
                <p className="font-display text-3xl italic leading-none text-primary sm:text-4xl">{stat.k}</p>
                <p className="mx-auto mt-2 max-w-40 text-[11px] leading-snug text-muted-foreground">{stat.v}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <nav aria-label="In this guide" className="mt-5">
          <p className="mb-3 text-[10px] uppercase text-muted-foreground">In this guide</p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {[
              { href: "#what-is-preneed", t: "What preneed means" },
              { href: "#why-ahead", t: "Why buy ahead" },
              { href: "#by-owner", t: "By owner vs cemetery" },
              { href: "#discounts", t: "The discounts" },
              { href: "#financing", t: "0% financing" },
              { href: "#sold-out", t: "Sold-out sections" },
              { href: "#cost", t: "What it costs" },
              { href: "#enquire", t: "Get options" },
              { href: "#how", t: "How it works with us" },
              { href: "#myths", t: "Myths" },
              { href: "#cities", t: "Coverage" },
              { href: "#cemeteries", t: "Popular cemeteries" },
              { href: "#faq", t: "FAQ" },
            ].map((chapter) => (
              <a key={chapter.href} href={chapter.href} className="text-xs text-foreground/75 underline-offset-4 hover:text-primary hover:underline transition-colors">{chapter.t}</a>
            ))}
          </div>
        </nav>
      </div>
    </section>

    {/* ARTICLE BODY */}
    <article className="py-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-primary">
          Almost nobody plans to buy cemetery property. Most families we meet are doing it in the two days after a death, in an office, with a price list in front of them and no idea whether the number they are being shown is reasonable. It is the single most expensive decision people make while least able to make it. Buying preneed — before the property is needed — turns that around completely: you choose the cemetery, walk the section, compare what is genuinely available, and pay today's price rather than whatever the price list says in ten years. And because cemetery property in Texas can legally be resold by its owner, preneed buyers have a second market to shop in, one the cemetery office will never mention.
        </p>

        <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 overflow-hidden my-12">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/15 blur-2xl" />
          <Eyebrow>The short answer</Eyebrow>
          <p className="relative text-lg md:text-xl text-foreground/90 leading-relaxed">
            Preneed means buying cemetery property before a death, at today's price, in your own time. In Texas you can buy new from the cemetery, or buy an existing space from its owner — by-owner resale spaces are normally the lower-priced route, and a broker verifies the ownership and completes the cemetery transfer so the space is properly recorded in your name.
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

        {/* Chapter 01 */}
        <section id="what-is-preneed" className="scroll-mt-24 mt-16">
          <Eyebrow>Chapter 01</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">What "preneed" actually means in <span className="italic text-primary">Texas</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            Preneed is the industry's word for arranging things in advance. In practice it covers two quite different purchases, and it helps to separate them.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            The first is <strong className="text-foreground">preneed funeral services</strong> — the casket, the service, the funeral director's work. Those are prepaid contracts, regulated in Texas by the <Ext href="https://www.dob.texas.gov/cemetery-prepaid-funeral-services">Department of Banking</Ext>, and they are bought from a funeral home.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            The second is <strong className="text-foreground">preneed cemetery property</strong> — the actual space. That is what this guide is about, and it works differently. When you buy cemetery property in Texas you are not buying land. You are buying the <strong className="text-foreground">exclusive right of sepulture</strong>: the legal right to bury someone in one specific grave space, or to entomb someone in one specific crypt or niche. That right is recorded in your name with the cemetery, it does not expire, and — importantly — it can be transferred or sold later.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            That single legal fact is what makes preneed buying interesting. Because the right of sepulture is an asset that can change hands, there are two ways to buy a space in the cemetery you want:
          </p>
          <ol className="space-y-4">
            {[
              { t: "New, from the cemetery.", d: "You buy from the cemetery's current inventory at the price list they are using today, plus their fees. Simple, but you pay retail." },
              { t: "By owner, on the secondary market.", d: "You buy an existing space from the family that owns it. The cemetery records the conveyance and the space becomes yours — usually at a lower figure than the cemetery's own retail price for a comparable space." },
            ].map((c, i) => (
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

        {/* Chapter 02 */}
        <section id="why-ahead" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 02 · The case for planning</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Why families buy <span className="italic text-primary">before they need to</span></h2>
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-6 text-lg">
            People buy plots thinking they’ll be in one location, and ten or twenty years later — life evolves in such an odd way, it’s so hard to predict — they’re in a different state. Relatives and children may tell their parents they won’t be able to visit, and ask them to pick a closer location. Planning ahead is a chance to think about where your family is now and how easy it will be to visit.
          </p>
          <p data-simon-review className="mb-6 text-lg leading-relaxed">There’s also been a bit of an evolution toward cremation. Many people bought plots, or groups of plots, really for caskets, and what they want to do has changed. Planning ahead is also a chance to talk about those wishes, rather than assume everyone still wants the same thing.</p>
          <p data-simon-review className="text-foreground/80 leading-relaxed mb-6 text-lg">
            Some want to be near a tree, others want to be as far away as possible. Some would like a slope with a view, others want it as flat as possible. People look at where the plot is positioned, how it’s being kept and looked after, and whether it’s a place they feel a bond with. Buying ahead gives you time to look at those differences, rather than make that decision during a bereavement.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            Whatever your personal wishes, buying ahead of time provides the chance to be honored exactly as you intend, whether that is within a particular garden or section, or surrounded by your loved ones in contiguous spaces within a family plot. Your peace of mind is assured, too, when choosing a Perpetual Care cemetery in Texas: the cemetery is legally required to maintain an endowment fund from which the long-term upkeep and maintenance of the park is paid, so the grounds are cared for in the future without worry.
          </p>
          <div className="space-y-4 mb-8">
            {reasons.map(({ Icon, t, d }) => (
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
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            The comparison worth making is not preneed versus nothing. It is preneed versus at-need — the same purchase, made in the same cemetery, but under a deadline, without the chance to shop the secondary market, and at whatever the price list says that week.
          </p>
          <div className="rounded-3xl border border-border/60 bg-muted/30 p-7 md:p-9 mt-8">
            <Eyebrow>Planning ahead</Eyebrow>
            <h3 className="font-display text-2xl md:text-3xl text-foreground mb-4 leading-snug">So how do you begin to plan ahead?</h3>
            <p className="text-foreground/80 leading-relaxed mb-5">
              In Texas, the steps are quite straightforward. Begin by considering these two questions:
            </p>
            <ol className="space-y-4 mb-6">
              <li className="flex gap-4 items-start">
                <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-display flex items-center justify-center text-sm mt-0.5">1</span>
                <p className="text-foreground/80 leading-relaxed"><strong className="font-medium text-foreground">What type of interment would you like?</strong> For example, traditional burial in the ground, entombment in a mausoleum crypt, or cremation with a memorial niche.</p>
              </li>
              <li className="flex gap-4 items-start">
                <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-display flex items-center justify-center text-sm mt-0.5">2</span>
                <p className="text-foreground/80 leading-relaxed"><strong className="font-medium text-foreground">Which location do you want your memorial to be?</strong> Perhaps your preferred cemetery is the one closest to where your family resides, or is located at a meaningful place dear to you.</p>
              </li>
            </ol>
            <p className="text-foreground/70 leading-relaxed">
              Once you have thought about these two questions you are ready to begin the search, bearing in mind that people commonly change their minds from their original ideas as they start exploring options and see the wealth of choices available.
            </p>
          </div>
        </section>

        {/* Chapter 03 */}
        <section id="by-owner" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03 · Where the savings are</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Buying <span className="italic text-primary">by owner</span> versus buying from the cemetery</h2>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            A great many people searching for "cemetery plots for sale by owner" are doing exactly the right thing and are not quite sure why. The reason is straightforward: the cemetery sells its own new inventory at its current retail price, while owners who no longer need their spaces sell the identical property in the identical section for less. Same cemetery, same garden, same view — different seller.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            There is a catch, and it is worth being honest about. On a classified or auction site, nobody has checked anything. The person listing the space may not be the recorded owner. There may be co-owners under Texas community property rules who have to consent in writing. The cemetery may hold a right of first refusal. The space may have been informally handed down within a family and never actually recorded. Any one of those will stop a transfer, usually after the buyer has already paid.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            That is the entire reason we exist. We take the by-owner price and remove the by-owner risk — every space we represent has been checked before it is offered.
          </p>

          <div className="rounded-3xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-accent/5">
            <div className="p-7 md:p-9 border-b border-primary/10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <Eyebrow>Verified before offered</Eyebrow>
                <p className="font-display text-2xl md:text-3xl text-foreground leading-snug">Every space we offer is verified — ownership confirmed, transfer cleared.</p>
                <p className="text-foreground/75 leading-relaxed mt-2">Before a preneed buyer ever sees it, we have confirmed the space is real, unused, legally transferable and that the cemetery will record it in your name.</p>
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

          <p className="text-foreground/80 leading-relaxed mt-8 text-lg">
            Read more about the market itself in our buyer's guide to <Link to="/cemetery-plots-for-sale-texas" className="text-primary underline-offset-4 hover:underline font-medium">cemetery plots for sale in Texas</Link>, or see <Link to="/cemetery-plot-cost-texas" className="text-primary underline-offset-4 hover:underline font-medium">what cemetery plots cost across Texas cities</Link>.
          </p>
        </section>

        {/* Chapter 03b — discounts */}
        <section id="discounts" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03b · The numbers</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">How <span className="italic text-primary">cheap</span> is a discounted resale plot, really?</h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            People search for cheap cemetery plots, discount burial plots, affordable grave spaces — all of it describes the same thing: the secondary market. Our prices run up to 50% below what the cemetery charges for a comparable new space, because the seller is a family that no longer needs the property rather than a cemetery working from a price list.
          </p>
          <DiscountTable />
        </section>

        {/* Chapter 03b-ii — price appreciation */}
        <section id="price-growth" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03b · The clock</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Every year you wait, the space gets <span className="italic text-primary">more expensive</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            Cemetery retail prices do not drift — they climb, and they have climbed for decades. A space that retails for $10,000 today is on the historic trend to cost close to $20,000 within about seven years. Buying preneed through us flips that curve in your favour: you pay roughly a third off today's price, not the doubled price later, and you pay it interest-free over up to 24 months.
          </p>
          <PriceAppreciationChart />
        </section>

        {/* Chapter 03c — financing */}
        <section id="financing" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03c · Paying for it</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">A discount, and <span className="italic text-primary">0% interest</span> — stacked together</h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            The two savings compound. First you pay a by-owner price instead of retail. Then, where we can offer it, you spread that price interest-free over up to 24 months. Compared with an at-need family paying the cemetery's current price in full in the same week as a funeral, the difference is not small.
          </p>
          <FinancingGraphic />
          <p className="text-xs text-foreground/55 leading-relaxed mt-5">
            Example figures for illustration only. Financing availability depends on the property and the plan agreed; the property transfers into your name once the balance is settled.
          </p>
        </section>

        {/* Chapter 03d — sold-out sections & sourcing */}
        <section id="sold-out" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 03d · Sold-out gardens</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">The cemetery says <span className="italic text-primary">"sold out."</span> We can usually still get you in.</h2>
          <p className="text-foreground/80 leading-relaxed mb-6 text-lg">
            The most common call we take starts the same way: a family wants to be beside a mother, a husband, a plot bought decades ago — and the cemetery office says the lawn or garden has been sold out for years. That is true of the cemetery's own inventory. It says nothing about the spaces already owned by families in that section, and many of those families will never use them.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            So we source it. Tell us the exact garden, lawn or crypt level you need and we will go looking for an owner there — and we will keep looking. The same works if you are simply price-sensitive: we can hold your requirements on file and come back to you when a space in that section comes up at a discount worth taking.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { n: "01", t: "Name the exact section", d: "The garden, the lawn, the crypt level, the space beside a specific family member. The more precise, the better we can hunt." },
              { n: "02", t: "We search the ownership records", d: "We work through owners in that section and approach them directly — spaces that were never publicly for sale." },
              { n: "03", t: "You wait for the right one", d: "No pressure and no deadline. Families often sit on our list for months waiting for the position, or the price, that is worth it." },
            ].map((c) => (
              <motion.div key={c.n} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="rounded-2xl bg-card border border-border/60 p-6 hover:border-primary/30 transition-colors">
                <p className="font-display text-2xl text-primary mb-3">{c.n}</p>
                <p className="font-display text-lg text-foreground mb-2 leading-snug">{c.t}</p>
                <p className="text-sm text-foreground/70 leading-relaxed">{c.d}</p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-accent/5 p-7 md:p-9 mt-8">
            <div className="grid md:grid-cols-[minmax(0,1fr)_300px] gap-7 md:gap-9 items-start">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                  <Footprints className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <div>
                  <Eyebrow>Walked, not clicked</Eyebrow>
                  <p className="font-display text-2xl md:text-3xl text-foreground leading-snug mb-2">Someone from Texas Cemetery Brokers will walk the sections with you.</p>
                  <p className="text-foreground/75 leading-relaxed">
                    We meet you at the cemetery and show you the spaces in person — where they sit, what is beside them, what the section is actually like to stand in. And from that point, the transfer paperwork is ours: we verify the ownership, obtain co-owner consent, clear any right of first refusal, complete the cemetery's conveyance forms and coordinate the recording with the cemetery office. The seller does not fill out your paperwork; we do all of it, for both sides, and only offer property that is verified and available to transfer.
                  </p>
                </div>
              </div>
              <figure className="m-0 md:pt-1">
                <div className="overflow-hidden rounded-2xl border border-border/60 shadow-soft">
                  <img loading="lazy" decoding="async" src={TEAM_WALKTHROUGH} alt="A Texas Cemetery Brokers team member on the grounds of a Texas cemetery, ready to walk a family through available burial plots in person" className="w-full aspect-[16/10] object-cover" />
                </div>
                <figcaption className="mt-2.5 text-xs text-foreground/55 leading-snug">We meet you at the cemetery and show you the space in person before you commit to anything.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Chapter 04 */}
        <section id="cost" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 04 · Cost</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">What moves the price of a <span className="italic text-primary">preneed space</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            There is no single Texas price, and anybody quoting you one has not asked enough questions. Two spaces in the same cemetery can differ substantially. These are the factors that decide it:
          </p>
          <div className="space-y-4 mb-8">
            {priceFactors.map(({ Icon, t, d }) => (
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
          <p className="text-foreground/80 leading-relaxed mb-5 text-lg">
            Two practical points families often miss. First, the space is not the only line item — the cemetery's opening-and-closing charge, the marker and its foundation, endowment care and the transfer fee all sit alongside it, and they are charged when the space is used rather than when it is bought. Second, an interest-free plan changes what is affordable: spreading a preneed purchase over up to 24 months at 0% costs the same in total as paying at once.
          </p>
          <p className="text-foreground/80 leading-relaxed text-lg">
            Tell us the cemetery you have in mind and we will put a real figure in writing, including the cemetery's own fees, with no obligation.
          </p>
        </section>

        {/* Chapter 05 */}
        <section id="how" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 05 · Working with us</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Why buy your preneed property through <span className="italic text-primary">Texas Cemetery Brokers</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-10 text-lg">
            We represent buyers as carefully as we represent sellers. Here is what that means in practice.
          </p>
          <div className="space-y-8">
            {buyerReasons.map((r) => (
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

          <h3 className="font-display text-2xl text-foreground mt-14 mb-6 leading-snug">The process, step by step</h3>
          <ol className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-accent before:via-primary before:to-primary/30">
            {[
              { t: "Tell us the cemetery and what you need.", d: "One space or several, burial or cremation, together or apart. We check what is genuinely available there — both resale spaces and, where it makes sense, the cemetery's own." },
              { t: "We send you verified options in writing.", d: <>Each one with the section, the position, what is included and the total cost including the cemetery's fees — backed by the nationwide reach of our partner <Ext href="https://bayercemeterybrokers.com/">Bayer Cemetery Brokers</Ext>.</> },
              { t: "We walk the grounds with you.", d: "In person, at the cemetery, as many times as you need. This is the part families tell us mattered most." },
              { t: "You choose how to pay.", d: "In full, or interest-free over up to 24 months. Nothing is committed until you are certain." },
              { t: "We complete the transfer.", d: "We prepare and record the conveyance with the cemetery and remit their fees, so the property is properly on file in your name." },
            ].map((s, i) => (
              <li key={i} className="relative pl-14">
                <span className="absolute left-0 top-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)]">{i + 1}</span>
                <p className="font-display text-xl text-foreground mb-1">{s.t}</p>
                <p className="text-foreground/75 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl p-7 md:p-8 bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 mt-10">
            <Eyebrow>In short</Eyebrow>
            <p className="text-foreground/90 leading-relaxed text-lg italic">
              At-need buying asks a grieving family to make a permanent decision in 48 hours, at retail. Preneed buying asks you to make the same decision once, calmly, at today's price — and lets you shop a market the cemetery office will never point you toward.
            </p>
          </div>
        </section>

        {/* Chapter 06 */}
        <section id="myths" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 06 · Straight answers</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-8 leading-tight">Four things families get <span className="italic text-primary">told</span> that aren't true</h2>
          <ul className="space-y-4">
            {myths.map((m, i) => (
              <li key={i} className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border/60">
                <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                <div>
                  <p className="font-medium text-foreground leading-snug mb-1">{m.t}</p>
                  <p className="text-foreground/70 leading-relaxed">{m.d}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-foreground/80 leading-relaxed mt-8">
            If you already own property you no longer need, the other side of this market is covered in our <Link to="/sell-cemetery-plot-texas" className="text-primary underline-offset-4 hover:underline font-medium">guide to selling a cemetery plot in Texas</Link>.
          </p>
        </section>

        {/* Coverage */}
        <section id="cities" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 07 · Coverage</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">We help buyers <span className="italic text-primary">across Texas</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            We place families in plots, crypts and niches statewide:
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
            City guides: <Link to="/cemetery-plots-for-sale-dallas" className="text-primary underline-offset-4 hover:underline font-medium">Dallas–Fort Worth</Link>,{" "}
            <Link to="/cemetery-plots-for-sale-houston" className="text-primary underline-offset-4 hover:underline font-medium">Houston</Link>,{" "}
            <Link to="/cemetery-plots-for-sale-austin" className="text-primary underline-offset-4 hover:underline font-medium">Austin</Link> and{" "}
            <Link to="/cemetery-plots-for-sale-san-antonio" className="text-primary underline-offset-4 hover:underline font-medium">San Antonio</Link>.
          </p>
        </section>

        <GuideCemeteryGallery
          eyebrow="Chapter 07b · Where we place buyers"
          title={<>Cemeteries families ask us for <span className="italic text-primary">most often</span></>}
          intro="If you are considering one of these memorial parks, we almost certainly have owners with spaces there. Each cemetery page explains the sections and gardens, the cemetery's own transfer fee and paperwork, and what buyers there can realistically expect."
          footer={
            <>
              You can also <Link to="/cemeteries" className="text-primary underline-offset-4 hover:underline font-medium">browse every Texas cemetery we serve</Link>, or{" "}
              <Link to="/buy" className="text-primary underline-offset-4 hover:underline font-medium">tell us what you are looking for</Link> and we will send verified options.
            </>
          }
        />

        {/* Inline buyer form */}
        <section id="enquire" className="scroll-mt-24 mt-20">
          <Eyebrow>Start here</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">Ask us what is <span className="italic text-primary">available — and for how much less</span></h2>
          <p className="text-foreground/80 leading-relaxed mb-8 text-lg">
            One short form. We come back with verified spaces in the cemetery you named, the real total including the cemetery's own fees, and whether 0% financing is available on it.
          </p>
          <PreneedInquiryForm />
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 08 · Questions</Eyebrow>
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

        {/* Resources */}
        <section id="resources" className="scroll-mt-24 mt-20">
          <Eyebrow>Chapter 09 · Resources</Eyebrow>
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
          blurb="Find the cemetery you have in mind on the map to see its profile, sections and recorded transfer fee."
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
            <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-primary-foreground/70 mb-4">Plan it once, properly</p>
            <h2 className="font-display text-4xl md:text-5xl mb-5 leading-[1.05]">Tell us the cemetery. We'll find the space.</h2>
            <p className="text-primary-foreground/85 leading-relaxed mb-8 text-lg">
              Verified by-owner spaces, in-person showings, and 0% interest over up to 24 months. No obligation and no pressure — most families take months to decide, and that is exactly the point.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/buy" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] hover:opacity-95 transition-all">
                Find a Preneed Space <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={`mailto:${EMAIL}`} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground rounded-2xl font-medium text-[15px] hover:bg-primary-foreground/15 transition-all">
                <Mail className="w-4 h-4" /> Email Us
              </a>
            </div>
            <p className="text-xs text-primary-foreground/60 italic mt-8 leading-relaxed max-w-xl">
              This guide is general information about buying cemetery property in Texas and is not legal advice. Cemetery policies, fees and applicable rules vary by location; confirm specifics with the cemetery and, where needed, a licensed Texas attorney.
            </p>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
  );
};

export default GuidePreneedCemeteryPlots;
