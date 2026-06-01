import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Phone, Mail, CheckCircle2, MapPin, Clock3, Users, Heart, Megaphone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import blogHeroBg from "@/assets/hero/cemetery-cathedral.jpg";
import springCleaningImg from "@/assets/blog/spring-cleaning-hero.jpg";
import sellPlotTexasImg from "@/assets/blog/sell-cemetery-plot-texas-hero.jpg";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: React.ReactNode;
  image: string;
  extraJsonLd?: Record<string, unknown>[];
  noindex?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    slug: "spring-cleaning-cemetery-property",
    title: "A Simple Task That Makes a Big Difference",
    date: "February 26, 2026",
    readTime: "4 min read",
    excerpt: "Spring is a time for fresh starts, clean slates, and checking off those lingering items on your to-do list. One item is often overlooked: unused or unwanted cemetery property.",
    image: springCleaningImg,
    content: (
      <>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Spring is a time for fresh starts, clean slates, and checking off those lingering items on your to-do list. Often, we organize closets, review finances, and simplify our lives – but one item is often overlooked: <strong className="text-foreground">unused or unwanted cemetery property</strong>.
        </p>
        <p className="text-lg leading-relaxed text-foreground/80 mb-8">
          If you or your family own cemetery plots, mausoleum crypts, or cremation niches that are no longer needed, this spring is the perfect time to take action.
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">Why Cemetery Property Often Goes Unused</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Life changes. Families relocate, burial plans evolve, and properties purchased years ago may no longer fit your wishes. Instead of letting that property sit idle, reselling it can bring both financial relief and peace of mind.
        </p>
        <div className="bg-gradient-sage rounded-2xl p-8 my-10">
          <h3 className="font-display text-xl text-foreground mb-4">Selling unwanted cemetery property can help you:</h3>
          <ul className="space-y-3">
            {["Free yourself from ongoing maintenance or ownership concerns.", "Recover funds that can be used for current priorities.", "Simplify estate planning and reduce burdens on loved ones.", "Start your spring feeling organized and in control."].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80">
                <span className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
                <span className="text-base leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-lg leading-relaxed text-foreground/80 mb-8">For many families, it's not just about the money – it's about <em>closure and clarity</em>.</p>
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">How Can We Help You</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">Selling cemetery property can be complicated. Working with our team of Texas professionals — backed by 27+ years of resale experience through our partnership with Bayer Cemetery Brokers — gives you peace of mind and a stress-free process.</p>
        <p className="text-lg leading-relaxed text-foreground/80 mb-8">Texas Cemetery Brokers has growing knowledge of the state's leading memorial parks, including <strong className="text-foreground">Restland Memorial Park</strong> Dallas, <strong className="text-foreground">Sparkman/Hillcrest</strong> Dallas, <strong className="text-foreground">Mount Olivet Cemetery</strong> Fort Worth, <strong className="text-foreground">Forest Park Lawndale</strong> Houston, <strong className="text-foreground">Memorial Oaks</strong> Houston, <strong className="text-foreground">Glenwood Cemetery</strong> Houston, <strong className="text-foreground">Texas State Cemetery</strong> Austin, <strong className="text-foreground">Mission Burial Park</strong> San Antonio and many others across Texas.</p>
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">Start This Spring with One Less Thing to Worry About</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">As you look at your to-do list this spring, consider adding — and checking off — this important task. A fresh start begins with letting go of what no longer fits, and spring is the perfect time to do just that.</p>
        <div className="bg-card rounded-2xl p-8 shadow-soft border border-border/50 my-10">
          <p className="text-lg text-foreground mb-4">Please reach out to us. We can list your unwanted cemetery property on consignment and handle the sale for you.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="tel:+13108049586" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"><Phone className="w-4 h-4" /> (310) 804-9586</a>
            <a href="mailto:info@texascemeterybrokers.com" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all"><Mail className="w-4 h-4" /> info@texascemeterybrokers.com</a>
          </div>
        </div>
      </>
    ),
  },
  {
    slug: "sell-cemetery-plot-texas",
    title: "How to Sell a Cemetery Plot in Texas",
    date: "March 12, 2026",
    readTime: "9 min read",
    excerpt: "If you own a cemetery plot you'll never use, it has real value. A complete guide to what affects your plot's value, the legal steps in Texas, and the most reliable way to sell it.",
    image: sellPlotTexasImg,
    noindex: false,
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Cemetery Plot Resale Brokerage",
        serviceType: "Cemetery property resale",
        areaServed: { "@type": "State", name: "Texas" },
        provider: {
          "@type": "LocalBusiness",
          name: "Texas Cemetery Brokers",
          telephone: "+1-310-804-9586",
          email: "info@texascemeterybrokers.com",
          sameAs: ["https://bayercemeterybrokers.com/"],
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Can you sell a cemetery plot in Texas?", acceptedAnswer: { "@type": "Answer", text: "Yes. If you own the right of sepulture in a plot, you can sell it. Check your contract for a right-of-first-refusal clause, confirm co-owners agree, then sell privately or through a broker who handles valuation, buyers, paperwork and the transfer." } },
          { "@type": "Question", name: "How much is my cemetery plot worth in Texas?", acceptedAnswer: { "@type": "Answer", text: "It depends on the cemetery, the section and current demand, so the best way to know is a valuation rather than a fixed figure. Resale plots typically sell below the cemetery's current retail price, which is what attracts buyers. We provide a free, plot-specific valuation." } },
          { "@type": "Question", name: "Do I need a license to sell my own cemetery plot in Texas?", acceptedAnswer: { "@type": "Answer", text: "No. Selling your own plot needs no license, and Texas no longer requires cemetery brokers to register either — that requirement was repealed effective September 1, 2019. Brokers must still follow the code's rules for recording the conveyance and remitting cemetery fees." } },
          { "@type": "Question", name: "How long does it take to sell a cemetery plot in Texas?", acceptedAnswer: { "@type": "Answer", text: "It depends on the cemetery and your price. High-demand metro plots can sell in weeks; rural or oversupplied locations may take longer. Accurate pricing and reaching active buyers shortens the timeline." } },
          { "@type": "Question", name: "Will the cemetery buy my plot back?", acceptedAnswer: { "@type": "Answer", text: "Sometimes, but often only at the price you originally paid rather than today's value — and many will not buy back at all. An open-market resale usually recovers more of your plot's worth." } },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
          { "@type": "ListItem", position: 2, name: "Journal", item: "https://texascemeterybrokers.com/blog" },
          { "@type": "ListItem", position: 3, name: "How to Sell a Cemetery Plot in Texas", item: "https://texascemeterybrokers.com/blog/sell-cemetery-plot-texas" },
        ],
      },
    ],
    content: (
      <>
        {/* Short answer */}
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Plans change. Families relocate, choose cremation, or inherit plots they'll never use. The good news: a cemetery plot you own can be sold — and it is often worth more than people expect. The challenge is that selling privately in Texas can be slow and uncertain. This guide explains what affects your plot's value, the legal steps, and the most reliable way to sell it.
        </p>
        <div className="bg-gradient-sage rounded-2xl p-8 my-10 border border-primary/15">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mb-3">The short answer</p>
          <p className="text-lg leading-relaxed text-foreground/90">
            Yes, you can sell a cemetery plot in Texas. Check your purchase contract for a right-of-first-refusal clause, confirm any co-owners agree, then list privately or work with a cemetery broker who finds the buyer, prices it correctly, and completes the legal transfer with the cemetery for you.
          </p>
        </div>

        {/* Can you sell */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">Can you sell a cemetery plot in Texas?</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          When you buy a cemetery plot, you typically receive the <strong className="text-foreground">exclusive right of sepulture</strong> — the right to use that space for burial or interment. That right is transferable, which means you can sell it. Three things to check first:
        </p>
        <ul className="space-y-4 mb-10">
          {[
            { t: "Read your original contract.", d: "Some cemeteries include a right of first refusal, meaning you must offer the plot back to them before selling to anyone else." },
            { t: "Confirm co-owner consent.", d: "Plots bought jointly with a spouse, sibling, or as a family group need written agreement from all owners under Texas community-property rules." },
            { t: "Check the cemetery's transfer policy.", d: "Each cemetery has its own conveyance forms, transfer fee, and procedure for recording a resale." },
          ].map((it, i) => (
            <li key={i} className="flex items-start gap-4 bg-card border border-border/60 rounded-2xl p-5">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">{it.t}</p>
                <p className="text-foreground/75 leading-relaxed">{it.d}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* What affects value */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">What affects your plot's value</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Pricing a cemetery plot is not like checking a home's value — there is no public listing database, and two plots in the same cemetery can be worth very different amounts.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            { Icon: MapPin, t: "The cemetery & metro", d: "Established, in-demand parks in larger metros carry stronger resale value than rural or remote locations." },
            { Icon: Users, t: "The section & position", d: "Spaces near trees, water, chapels, gardens or entrances, and plots in well-regarded sections, are more sought after." },
            { Icon: CheckCircle2, t: "The property type", d: "Single graves, companion or double-depth spaces, mausoleum crypts and cremation niches each have their own market." },
            { Icon: Heart, t: "What's included", d: "Vaults, markers, opening-and-closing rights and transfer fees all affect the net value to a buyer." },
            { Icon: Megaphone, t: "Current demand", d: "What buyers are actively looking for in that exact cemetery, right now, sets the real ceiling on price." },
          ].map(({ Icon, t, d }, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-2xl p-5">
              <Icon className="w-5 h-5 text-primary mb-3" />
              <p className="font-medium text-foreground mb-1">{t}</p>
              <p className="text-sm text-foreground/75 leading-relaxed">{d}</p>
            </div>
          ))}
          <div className="sm:col-span-2 rounded-2xl p-6 bg-primary text-primary-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl mb-1">Don't guess — get a valuation</p>
              <p className="text-primary-foreground/80 text-sm">Free, plot-specific, no obligation.</p>
            </div>
            <a href="#contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-foreground text-primary font-medium rounded-full text-sm hover:opacity-90 transition-all">Request yours — free <ArrowRight className="w-4 h-4" /></a>
          </div>
        </div>

        {/* Why use us */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4 mt-12">Why sell through Texas Cemetery Brokers</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Selling back to the cemetery is simple, but many decline or pay only what you originally paid. Listing it yourself puts every part of the job on your shoulders — pricing, inquiries, judging who's genuine, negotiating, and the cemetery's transfer paperwork — a process that can stretch on for many months. A broker is built to protect both your value and your peace of mind.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            { n: "01", t: "Reach", h: "We put your property in front of the right buyers.", d: "We do far more than post a listing and wait. We cross-reference your plot against the live inquiries we already hold — from funeral homes, estate attorneys and families searching for specific cemeteries. We issue regular inventory bulletins to mortuaries and promote through Google Ads, radio, print and in-person outreach. Your plot is marketed, not just listed." },
            { n: "02", t: "Speed", h: "We're experts in the transfer — when speed matters most.", d: "Many families come to us at the hardest possible moment, needing a resting place quickly. Because we know each cemetery's transfer process in detail and work hand in hand with cemetery offices, we complete a transfer as quickly and smoothly as possible. When something unexpected comes up in the paperwork, our experience keeps the sale on track." },
            { n: "03", t: "Presence", h: "We show the plot in person and explain every difference.", d: "Choosing a final resting place is deeply personal, and most families want to see the space before they commit. We meet buyers at the cemetery and walk the grounds with them, explaining sections, position and options. It's not unusual to show a single plot more than five times before the right family decides it's the place." },
            { n: "04", t: "Care", h: "We're trained to care for families, not just close a sale.", d: "Our team includes people specifically trained to support grieving families with patience and compassion, alongside specialists who explain the paperwork, the cemetery rules and the small distinctions that matter. That trust is the foundation of every successful sale." },
          ].map((c) => (
            <div key={c.n} className="bg-card border border-border/60 rounded-2xl p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-primary font-display text-2xl">{c.n}</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{c.t}</span>
              </div>
              <p className="font-medium text-foreground mb-2">{c.h}</p>
              <p className="text-sm text-foreground/75 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-6 bg-accent/10 border border-accent/30 my-8">
          <p className="text-foreground/85 leading-relaxed italic">
            In short: a private sale asks you to be the marketer, the negotiator, the paperwork expert and the guide all at once. We are already all of those things, every day — which is how we turn a plot you no longer need into a completed, worry-free sale.
          </p>
        </div>

        {/* Process */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-6 mt-12">How the process works with us</h2>
        <ol className="relative border-l-2 border-primary/30 ml-4 space-y-8 mb-10">
          {[
            { t: "Free valuation.", d: "Tell us the cemetery, section and spaces. We assess your plot and explain what it can realistically sell for — no obligation." },
            { t: "We market and match it.", d: "Your plot reaches our active buyer network and is cross-referenced against current inquiries from families, mortuaries and estate attorneys — backed by the nationwide reach of our partner Bayer Cemetery Brokers: family-owned, A+ BBB-accredited, 27+ years in memorial care." },
            { t: "We handle the paperwork and the showing.", d: "We meet interested buyers at the cemetery, answer their questions, and prepare and record the conveyance with the cemetery correctly." },
            { t: "You get paid.", d: "Funds are released once the transfer is confirmed and complete." },
          ].map((s, i) => (
            <li key={i} className="pl-6 relative">
              <span className="absolute -left-[1.05rem] top-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-sm">{i + 1}</span>
              <p className="font-medium text-foreground mb-1">{s.t}</p>
              <p className="text-foreground/75 leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>

        {/* Legal */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4 mt-12">Selling a plot in Texas, legally</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-4">
          Selling your own plot needs <strong className="text-foreground">no license</strong>. Texas <strong className="text-foreground">repealed the third-party cemetery-broker registration requirement effective September 1, 2019</strong> (S.B. 614) — there is no state cemetery-broker license today.
        </p>
        <p className="text-lg leading-relaxed text-foreground/80 mb-4">What still applies under the Texas Health &amp; Safety Code:</p>
        <ul className="space-y-3 mb-6">
          {[
            "The conveyance (often a quitclaim) must be on a cemetery-accepted form and recorded with the cemetery — generally within three business days.",
            "Cemetery transfer fees must be collected and remitted.",
            "The seller must keep records of the sale.",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-foreground/80">
              <span className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
              <span className="text-base leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
        <div className="bg-gradient-sage rounded-2xl p-6 border border-primary/15 my-8">
          <p className="text-foreground/85 leading-relaxed">
            A sale is not truly final until the cemetery records the transfer correctly. We make sure that happens — so the buyer is protected and you are fully and cleanly released from the property.
          </p>
        </div>

        {/* Areas */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4 mt-12">We help sellers across Texas</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            ["Houston", "Forest Park, Earthman Resthaven, Brookside, Memorial Oaks, San Jacinto"],
            ["Dallas–Fort Worth", "Restland, Sparkman–Hillcrest, Laurel Land, Bluebonnet Hills, Greenwood"],
            ["Austin", "Cook–Walden Capital Parks"],
            ["San Antonio", "Citywide coverage"],
            ["College Station", "& the Brazos Valley"],
          ].map(([city, list]) => (
            <div key={city} className="bg-card border border-border/60 rounded-2xl p-4">
              <p className="font-display text-foreground">{city}</p>
              <p className="text-sm text-foreground/70 mt-1">{list}</p>
            </div>
          ))}
        </div>
        <p className="text-foreground/80 mb-10">
          Looking to buy instead? See our <Link to="/buy" className="text-primary underline underline-offset-4">cemetery plots for sale in Texas</Link>.
        </p>

        {/* FAQ */}
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4 mt-12">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mb-12">
          {[
            { q: "Can you sell a cemetery plot in Texas?", a: "Yes. If you own the right of sepulture in a plot, you can sell it. Check your contract for a right-of-first-refusal clause, confirm co-owners agree, then sell privately or through a broker who handles valuation, buyers, paperwork and the transfer." },
            { q: "How much is my cemetery plot worth in Texas?", a: "It depends on the cemetery, the section and current demand, so the best way to know is a valuation rather than a fixed figure. Resale plots typically sell below the cemetery's current retail price, which is what attracts buyers. We provide a free, plot-specific valuation." },
            { q: "Do I need a license to sell my own cemetery plot in Texas?", a: "No. Selling your own plot needs no license, and Texas no longer requires cemetery brokers to register either — that requirement was repealed effective September 1, 2019. Brokers must still follow the code's rules for recording the conveyance and remitting cemetery fees." },
            { q: "How long does it take to sell a cemetery plot in Texas?", a: "It depends on the cemetery and your price. High-demand metro plots can sell in weeks; rural or oversupplied locations may take longer. Accurate pricing and reaching active buyers shortens the timeline." },
            { q: "Will the cemetery buy my plot back?", a: "Sometimes, but often only at the price you originally paid rather than today's value — and many will not buy back at all. An open-market resale usually recovers more of your plot's worth." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left font-medium text-foreground">{f.q}</AccordionTrigger>
              <AccordionContent className="text-foreground/75 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Final CTA */}
        <div id="contact" className="rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground relative overflow-hidden my-10">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-accent/30 blur-3xl" />
          <h3 className="font-display text-2xl md:text-3xl mb-3 relative">Find out what your plot is worth — free</h3>
          <p className="text-primary-foreground/85 leading-relaxed mb-6 relative max-w-2xl">
            Send us the cemetery and section details and we'll give you a no-obligation valuation, then handle the sale from listing to transfer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 relative">
            <a href="tel:+13108049586" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"><Phone className="w-4 h-4" /> Call (310) 804-9586</a>
            <a href="mailto:info@texascemeterybrokers.com" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground text-primary font-medium rounded-full text-sm hover:opacity-90 transition-all"><Mail className="w-4 h-4" /> Email Us</a>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic mt-8 leading-relaxed">
          This article is general information about selling cemetery property in Texas and is not legal advice. Cemetery policies and applicable rules vary by location; confirm specifics with the cemetery and, where needed, a licensed Texas attorney.
        </p>
      </>
    ),
  },
];

const BlogIndex = () => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="The Journal | Texas Cemetery Brokers Insights & Guidance"
      description="Expert advice on Texas cemetery property, estate planning, the resale process, and helping families navigate end-of-life decisions with care."
      path="/blog"
      noindex
    />
    <Navbar forceScrolled />

    {/* Hero — magazine-style with photo background */}
    <section className="relative pt-28 pb-14 overflow-hidden">
      <img src={blogHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/45" />
      <div className="relative container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl">
          <p className="text-primary-foreground/70 text-xs tracking-[0.3em] uppercase font-medium mb-3 drop-shadow">The Journal</p>
          <h1 className="font-display text-4xl md:text-6xl text-primary-foreground mb-3 drop-shadow-lg">Insights & Guidance</h1>
          <p className="text-primary-foreground/85 text-lg font-light max-w-xl drop-shadow-md">Expert advice on cemetery property, estate planning, and the resale process.</p>
        </motion.div>
      </div>
    </section>

    {/* Articles Grid */}
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
          {blogPosts.map((post, i) => (
            <motion.div key={post.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}>
              <Link to={`/blog/${post.slug}`} className="group block bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 border border-border/60">
                <div className="h-52 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  </div>
                  <h2 className="font-display text-xl text-foreground mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1.5 text-primary font-medium text-sm group-hover:gap-2 transition-all">Read article <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

const BlogArticle = ({ post }: { post: BlogPost }) => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title={`${post.title} | Texas Cemetery Brokers Journal`}
      description={post.excerpt}
      path={`/blog/${post.slug}`}
      type="article"
      noindex
      image={post.image}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.excerpt,
        image: post.image,
        datePublished: post.date,
        author: { "@type": "Organization", name: "Texas Cemetery Brokers" },
        publisher: { "@id": "https://texascemeterybrokers.com/#organization" },
        mainEntityOfPage: `https://texascemeterybrokers.com/blog/${post.slug}`,
      }}
    />
    <Navbar forceScrolled />

    {/* Article Hero — photo with dark overlay */}
    <section className="relative pt-28 pb-12 overflow-hidden">
      <img src={blogHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/75 to-foreground/55" />
      <div className="relative container mx-auto px-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-primary-foreground/70 text-sm font-medium mb-6 hover:text-primary-foreground transition-colors drop-shadow">← Back to journal</Link>
          <div className="flex items-center gap-3 mb-4 text-sm text-primary-foreground/70 drop-shadow">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{post.date}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.readTime}</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl text-primary-foreground leading-tight drop-shadow-lg">{post.title}</h1>
        </motion.div>
      </div>
    </section>

    {/* Feature image */}
    <div className="container mx-auto px-6 -mt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-hover -mb-8 relative z-10">
        <img src={post.image} alt={post.title} className="w-full h-64 md:h-80 object-cover" />
      </motion.div>
    </div>

    <article className="py-14 pt-16">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="max-w-3xl mx-auto">
          <div className="w-16 h-px bg-primary/40 mb-10" />
          <div className="prose-custom">{post.content}</div>
        </motion.div>
      </div>
    </article>

    <Footer />
  </div>
);

const Blog = () => {
  const { slug } = useParams();
  if (slug) {
    const post = blogPosts.find(p => p.slug === slug);
    if (!post) return <BlogIndex />;
    return <BlogArticle post={post} />;
  }
  return <BlogIndex />;
};

export default Blog;
