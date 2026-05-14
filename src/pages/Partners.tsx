import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Phone,
  Mail,
  ShieldCheck,
  Users,
  Network,
  Clock,
  Award,
  Handshake,
  MapPin,
  Sparkles,
  Star,
  ExternalLink,
  CheckCircle2,
  Quote,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import partnersHeroBg from "@/assets/hero/cemetery-mountains.jpg";
import lorenBayerPhoto from "@/assets/partners/loren-bayer.png";
import simonJamesPhoto from "@/assets/partners/simon-james.png";

const bayerTeam = [
  {
    name: "Loren Bayer",
    title: "Founder, Bayer Cemetery Brokers",
    photo: lorenBayerPhoto,
    bio: "Loren founded Bayer Cemetery Brokers in 1998, pioneering a transparent resale model that has since helped more than 10,000 families navigate cemetery property transactions with honesty and care.",
  },
  {
    name: "Simon James",
    title: "CEO, Bayer Cemetery Brokers",
    photo: simonJamesPhoto,
    bio: "Simon leads Bayer Cemetery Brokers today, carrying forward 27 years of brokerage expertise while expanding the company's national reach — including the Texas Cemetery Brokers partnership.",
  },
];

const BAYER_URL = "https://bayercemeterybrokers.com";

const stats = [
  { value: "27", suffix: "yrs", label: "In business since 1998" },
  { value: "4.9", suffix: "★", label: "Average client rating" },
  { value: "10,000+", suffix: "", label: "Transactions completed" },
  { value: "2,500+", suffix: "", label: "Plots currently listed" },
];

const pillars = [
  {
    icon: Clock,
    label: "27 Years",
    title: "Established Expertise",
    desc: "Bayer Cemetery Brokers has operated as a licensed, full-service brokerage for 27 years — nearly three decades of refining a process that protects families on both sides of every transaction.",
  },
  {
    icon: Star,
    label: "4.9 ★ Reviewed",
    title: "Trusted by Families",
    desc: "An average rating of 4.9 stars across more than a thousand verified client testimonials. Reputation is the only currency in this industry — and Bayer has spent decades earning theirs.",
  },
  {
    icon: Users,
    label: "10,000+ Sales",
    title: "Proven at Scale",
    desc: "Our partner network has guided more than 10,000 families through cemetery resales — saving sellers from carrying costs and saving buyers 20–80% versus direct cemetery pricing.",
  },
  {
    icon: Network,
    label: "2,500+ Plots Live",
    title: "Active Inventory Network",
    desc: "Bayer maintains over 2,500 currently available plots — the kind of buyer attention and search traffic that turns a Texas listing into a closed sale far faster than going it alone.",
  },
];

const advantages = [
  {
    title: "Faster Time to Sale",
    desc: "Pooled buyer demand from a 2,500-plot national catalog means most Texas listings find a qualified buyer in 30–60 days — substantially faster than a single regional seller could achieve alone.",
  },
  {
    title: "Texas-First, Network-Backed",
    desc: "Texas Cemetery Brokers is operated locally in Dallas, with deep coverage of DFW, Houston, Austin and San Antonio — fully supported by Bayer's 27-year resale playbook.",
  },
  {
    title: "Honest, Transparent Pricing",
    desc: "Free valuations grounded in verified comparable sales. No upfront fees, no surprises. Sellers only pay when their property closes — the same model Bayer has used since 1998.",
  },
  {
    title: "End-to-End Coordination",
    desc: "From cemetery paperwork and deed retrieval to buyer qualification and closing — our combined operations team handles every step on your behalf.",
  },
];

const milestones = [
  { year: "1998", text: "Bayer Cemetery Brokers founded as a full-service cemetery resale brokerage." },
  { year: "2010s", text: "Expanded into one of the largest cemetery property marketplaces in the United States." },
  { year: "10,000+", text: "Families served — and counting — across more than 27 years of continuous operation." },
  { year: "Today", text: "Texas Cemetery Brokers launches in Dallas, extending Bayer's trusted process to families across Texas." },
];

const testimonialPoints = [
  "Licensed brokerage infrastructure",
  "10,000+ completed transactions",
  "2,500+ live listings nationally",
  "4.9 ★ average client rating",
  "27 years of resale experience",
  "Local Texas operations team",
];

const Partners = () => {
  useEffect(() => {
    document.title = "Our Partnership with Bayer Cemetery Brokers | Texas Cemetery Brokers";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Our Partnership with Bayer Cemetery Brokers | Texas Cemetery Brokers"
        description="Texas Cemetery Brokers operates in partnership with Bayer Cemetery Brokers — 27+ years, 4.9★ rated, 10,000+ transactions and 2,500+ active plots. Trusted Texas resale."
        path="/partners"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <motion.img
          src={partnersHeroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/90 via-foreground/75 to-foreground/55" />
        <div className="relative container mx-auto px-6 pt-36 pb-24 md:pt-40 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground/85 text-xs tracking-[0.25em] uppercase font-medium mb-6 backdrop-blur-sm">
              <Handshake className="w-3.5 h-3.5" />
              Strategic Partnership
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-[1.05] mb-6 drop-shadow-lg">
              Texas Cemetery Brokers, in partnership with{" "}
              <span className="italic font-light">Bayer Cemetery Brokers</span>
            </h1>
            <p className="text-primary-foreground/85 text-lg md:text-xl font-light leading-relaxed max-w-2xl drop-shadow-md mb-8">
              Two brokerages, one shared mission: help Texas families buy and sell cemetery property faster, fairer, and with the wisdom of 27 years and 10,000+ completed sales behind every transaction.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
              >
                Sell Your Property <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground font-medium rounded-full text-sm hover:bg-primary-foreground/20 transition-all backdrop-blur-sm"
              >
                Browse Properties
              </Link>
              <a
                href={BAYER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/5 border border-primary-foreground/20 text-primary-foreground/90 font-medium rounded-full text-sm hover:bg-primary-foreground/15 transition-all backdrop-blur-sm"
              >
                Visit Bayer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="relative border-y border-border/50 bg-card">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="px-4 py-8 md:py-10 text-center"
              >
                <div className="font-display text-4xl md:text-5xl text-foreground tracking-tight">
                  {s.value}
                  <span className="text-primary text-2xl md:text-3xl ml-1 align-baseline">{s.suffix}</span>
                </div>
                <p className="text-[11px] md:text-xs tracking-[0.2em] uppercase text-muted-foreground mt-3 font-medium">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-logo lockup */}
      <section className="py-14 border-b border-border/50 bg-card/40">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-12 items-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center md:text-right"
            >
              <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Texas Operations</p>
              <p className="font-display text-2xl md:text-3xl text-foreground leading-tight">Texas Cemetery Brokers</p>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center md:justify-end gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Dallas, TX
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Handshake className="w-5 h-5 text-primary" />
              </div>
            </motion.div>

            <motion.a
              href={BAYER_URL}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center md:text-left group"
            >
              <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Partner Brokerage · Est. 1998</p>
              <p className="font-display text-2xl md:text-3xl text-foreground leading-tight group-hover:text-primary transition-colors inline-flex items-center gap-2">
                Bayer Cemetery Brokers
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
              </p>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center md:justify-start gap-1.5">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" /> 4.9 ★ · 27 Years · 10,000+ Sales
              </p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* The story */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-4">Why this partnership</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight">
              The trust of a 27-year brokerage. The focus of a Texas team.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="prose prose-lg max-w-none text-muted-foreground space-y-5 leading-relaxed"
          >
            <p>
              Texas families deserve the same caliber of cemetery resale expertise that families across the country have relied on for nearly three decades. Rather than start from scratch, we partnered with one of the nation's most established cemetery brokerages —{" "}
              <a href={BAYER_URL} target="_blank" rel="noopener noreferrer" className="text-foreground font-medium underline-offset-4 hover:underline">
                Bayer Cemetery Brokers
              </a>{" "}
              — to bring their proven process to Dallas, Houston, Austin and beyond.
            </p>
            <p>
              The result is <strong className="text-foreground font-medium">Texas Cemetery Brokers</strong>: a Dallas-headquartered operation with local representatives on the ground in Texas, fully backed by Bayer's 27-year track record, 10,000+ completed transactions, an active inventory of more than 2,500 plots, and a 4.9-star reputation built one family at a time.
            </p>
            <p>
              For sellers, this means your property is marketed through a national buyer pool the day it's listed. For buyers, it means access to off-market inventory and 20–80% savings versus buying direct from cemeteries. For every family we serve, it means working with people who have done this thousands of times — and who care about getting it right.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-gradient-warm">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14 max-w-2xl mx-auto"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">What we bring together</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Four pillars of the partnership</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative bg-card rounded-2xl p-7 border border-border/60 shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <p.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-medium">{p.label}</span>
                  </div>
                  <h3 className="font-display text-xl text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">What it means for you</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">A measurable advantage on every sale</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {advantages.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="border-l-2 border-primary/40 pl-6 py-2"
              >
                <h3 className="font-display text-lg text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {a.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust checklist */}
      <section className="py-20 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">Why it works</span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-4">
                Six reasons Texas families choose us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                When you list with Texas Cemetery Brokers, you're not testing a new venture — you're tapping into the most established resale operation in the industry, applied locally by people who know your market.
              </p>
            </motion.div>
            <motion.ul
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="grid sm:grid-cols-2 gap-3"
            >
              {testimonialPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 bg-card rounded-xl border border-border/60 px-4 py-3.5 shadow-soft"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground leading-snug">{point}</span>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">A shared history</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Built on nearly three decades of trust</h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative pl-10 pb-8 last:pb-0"
              >
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm" />
                <p className="font-display text-lg text-foreground mb-1">{m.year}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20 md:py-24 bg-card border-y border-border/40">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Quote className="w-8 h-8 text-primary/40 mx-auto mb-6" />
            <blockquote className="font-display text-2xl md:text-3xl text-foreground/85 italic leading-relaxed">
              "Our partnership is simple — combine the experience of a 27-year, 4.9-star brokerage with a Texas team that lives and works alongside the families it serves. The outcome is faster sales, fairer prices, and total peace of mind."
            </blockquote>
            <p className="text-sm text-muted-foreground mt-6 tracking-wide">— Texas Cemetery Brokers · Bayer Cemetery Brokers</p>
          </motion.div>
        </div>
      </section>

      {/* Bayer Leadership */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">The Bayer Leadership</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">The people behind 27 years of trust</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Meet the leadership of Bayer Cemetery Brokers — the team whose decades of experience power every Texas Cemetery Brokers transaction.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {bayerTeam.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-soft hover:shadow-hover transition-all"
              >
                <div className="aspect-[4/5] bg-muted overflow-hidden">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl text-foreground">{member.name}</h3>
                  <p className="text-sm text-primary font-medium mt-1">{member.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-sage">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Award className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              Put the partnership to work for your family
            </h2>
            <p className="text-muted-foreground text-lg font-light mb-8">
              Whether you're buying or selling cemetery property anywhere in Texas, you get the full strength of both brokerages — at no extra cost.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="tel:+14242341678"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
              >
                <Phone className="w-4 h-4" /> (424) 234-1678
              </a>
              <a
                href="mailto:Help@TexasCemeteryBrokers.com"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-foreground/15 text-foreground font-medium rounded-full text-sm hover:bg-foreground/5 transition-all"
              >
                <Mail className="w-4 h-4" /> Email Us
              </a>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-8">
              Learn more about our partner at{" "}
              <a
                href={BAYER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                bayercemeterybrokers.com
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
