import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  HeartHandshake,
  ListChecks,
  Phone,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import GuidesCarousel from "@/components/GuidesCarousel";
import { ALL_TEXAS_REGIONS } from "@/data/metroRegions";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import plumeriaCluster from "@/assets/flowers/plumeria-cluster.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";
import leafVeined from "@/assets/flowers/leaf-veined.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import metroDallas from "@/assets/parks/local/park-30.jpg";
import metroHouston from "@/assets/parks/local/park-47.jpg";
import metroAustin from "@/assets/parks/local/park-23.jpg";
import metroSanAntonio from "@/assets/parks/local/park-57.jpg";
import metroEastTexas from "@/assets/parks/local/park-36.jpg";
import metroWestTexas from "@/assets/parks/local/park-50.jpg";

const PATH = "/guides/planning-a-funeral-in-texas";
const SITE = "https://texascemeterybrokers.com";
const FULL = `${SITE}${PATH}`;
const FTC = "https://www.ftc.gov/business-guidance/resources/complying-funeral-rule";
const TFSC = "https://www.tfsc.texas.gov/";
const REPORT_FRAUD = "https://reportfraud.ftc.gov/";
const VA_BURIAL = "https://www.va.gov/burials-memorials/eligibility/";
const SSA_SURVIVORS = "https://www.ssa.gov/survivor";
const TEXAS_HEALTH_DEATH_CERTIFICATES = "https://www.dshs.texas.gov/vital-statistics/death-records";
const PRICE_SHEET = "/downloads/funeral-price-comparison-sheet.pdf";
const MetroCemeteryMap = lazy(() => import("@/components/MetroCemeteryMap"));

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
  >
    {children}
  </a>
);

const In = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
  >
    {children}
  </Link>
);

/** Planned guide — rendered as plain emphasised text until the page exists. */
const Upcoming = ({ children }: { children: React.ReactNode }) => (
  <span className="font-medium text-foreground/70 underline decoration-dotted decoration-foreground/25 underline-offset-4">
    {children}
  </span>
);

const SECTIONS: { id: string; label: string }[] = [
  { id: "first", label: "What has to happen first" },
  { id: "three-things", label: "Three things to know" },
  { id: "ten-things", label: "Ten things that help" },
  { id: "own-vs-need", label: "Own a plot vs. need a plot" },
  { id: "cemetery-map", label: "Find cemeteries near you" },
  { id: "toolkit", label: "The phone call" },
  { id: "rights", label: "Three rights you have" },
  { id: "sheet", label: "Price comparison sheet" },
  { id: "overspend", label: "Where families overspend" },
  { id: "prices", label: "What things cost in DFW" },
  { id: "local-help", label: "Local help" },
  { id: "faq", label: "Questions" },
  { id: "series", label: "Other guides" },
];

const Section = ({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section id={id} className="relative scroll-mt-28 border-t border-border/60 py-10 md:py-14">
    <img
      src={pinkBranch.url}
      alt=""
      aria-hidden
      loading="lazy"
      className="pointer-events-none absolute -right-20 -top-14 hidden w-52 rotate-12 opacity-[0.14] lg:block"
    />
    <div className="relative">
      <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        <span className="h-px w-10 bg-primary/40" />
        {eyebrow}
      </p>
      <h2 className="mb-7 font-display text-3xl leading-[1.08] text-foreground md:text-[2.4rem]">{title}</h2>
      <div className={`prose prose-lg max-w-none text-foreground/80 [&_h3]:mt-10 [&_h3]:font-display [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:text-foreground md:[&_h3]:text-2xl [&_li]:leading-relaxed [&_p]:mb-5 [&_p]:leading-[1.8] [&_strong]:font-semibold [&_strong]:text-foreground ${id === "ten-things" || id === "help-costs" ? "[&_h3]:border-t [&_h3]:border-border [&_h3]:pt-8 [&_h3]:text-[1.65rem] md:[&_h3]:text-3xl" : ""}`}>
        {children}
      </div>
    </div>
  </section>
);

const TimelineStep = ({ n, title, children, last = false }: { n: string; title: string; children: React.ReactNode; last?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45 }}
    className="relative grid gap-5 pb-10 md:grid-cols-[5.5rem_1fr] md:gap-8 md:pb-14"
  >
    {!last && <span className="absolute bottom-0 left-6 top-12 hidden w-px bg-border md:block" />}
    <div className="relative flex items-start">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background text-sm font-semibold text-primary shadow-sm">
        {n.padStart(2, "0")}
      </span>
    </div>
    <div className="border-b border-border/70 pb-9 md:pb-12">
      <h3 className="m-0 mb-3 font-display text-2xl leading-tight text-foreground md:text-[1.7rem]">{title}</h3>
      <div className="text-[1rem] leading-[1.8] text-foreground/72">{children}</div>
    </div>
  </motion.div>
);

const GuideStep = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-70px" }}
    transition={{ duration: 0.45 }}
    className="not-prose grid gap-4 border-t border-border py-9 sm:grid-cols-[5rem_1fr] sm:gap-7 md:py-11"
  >
    <span className="font-display text-5xl leading-none text-primary/70 sm:text-6xl">{String(n).padStart(2, "0")}</span>
    <div>
      <h3 className="mb-3 font-display text-2xl leading-tight text-foreground md:text-3xl">{title}</h3>
      <div className="space-y-4 text-[1rem] leading-[1.8] text-foreground/75 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  </motion.div>
);

type PhotoLayout = "cinematic" | "portrait" | "split" | "postcard" | "strip" | "window";

/** Editorial photo break with intentionally varied compositions. */
const PhotoBreak = ({ src, alt, caption, layout = "cinematic" }: { src: string; alt: string; caption: string; layout?: PhotoLayout }) => (
  <motion.figure
    initial={{ opacity: 0, scale: 0.985 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7 }}
    className={`my-12 md:my-16 ${layout === "portrait" ? "md:ml-auto md:w-[72%]" : layout === "postcard" ? "md:mr-auto md:w-[82%]" : ""}`}
  >
    {layout === "split" ? (
      <div className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[1.25fr_0.75fr]">
        <img src={src} alt={alt} loading="lazy" className="h-64 w-full object-cover md:h-80" />
        <figcaption className="flex items-center p-7 font-display text-xl leading-snug text-foreground md:p-9 md:text-2xl">{caption}</figcaption>
      </div>
    ) : layout === "strip" ? (
      <div>
        <img src={src} alt={alt} loading="lazy" className="h-40 w-full rounded-xl object-cover md:h-52" />
        <figcaption className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">{caption}</figcaption>
      </div>
    ) : layout === "window" ? (
      <div className="grid items-end gap-5 md:grid-cols-[0.7fr_1.3fr]">
        <figcaption className="order-2 border-l-2 border-primary/35 pl-5 font-display text-xl leading-snug text-foreground md:order-1 md:pb-6 md:text-2xl">{caption}</figcaption>
        <img src={src} alt={alt} loading="lazy" className="order-1 h-72 w-full rounded-t-[5rem] object-cover md:order-2 md:h-[26rem]" />
      </div>
    ) : (
      <div className={`relative overflow-hidden shadow-lg ${layout === "portrait" ? "rounded-t-[6rem] rounded-b-2xl" : layout === "postcard" ? "rotate-[-0.7deg] rounded-lg border-[10px] border-card" : "rounded-3xl"}`}>
        <img src={src} alt={alt} loading="lazy" className={`w-full object-cover ${layout === "portrait" ? "h-[28rem] md:h-[36rem]" : layout === "postcard" ? "h-72 md:h-80" : "h-64 md:h-96"}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
        {layout === "cinematic" && <img src={hibiscusCoral.url} alt="" aria-hidden className="pointer-events-none absolute right-4 top-4 w-20 rotate-12 opacity-90 drop-shadow-md md:w-24" />}
        <figcaption className="absolute bottom-0 left-0 max-w-2xl p-6 font-display text-lg leading-snug text-background md:p-8 md:text-2xl">{caption}</figcaption>
      </div>
    )}
  </motion.figure>
);

const Cta = ({
  heading,
  copy,
  actions,
}: {
  heading: string;
  copy: string;
  actions: { label: string; to: string; primary?: boolean }[];
}) => (
  <aside className="my-12 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.07] p-7 md:p-9">
    <h2 className="mb-3 font-display text-2xl text-foreground md:text-[1.75rem]">{heading}</h2>
    <p className="mb-6 max-w-2xl text-[1.02rem] leading-[1.75] text-foreground/75">{copy}</p>
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <Link
          key={a.to + a.label}
          to={a.to}
          className={
            a.primary
              ? "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              : "inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
          }
        >
          {a.label} <ArrowRight className="h-4 w-4" />
        </Link>
      ))}
    </div>
  </aside>
);

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const PHONE_SCRIPT = `Hello. Someone in my family has died and we're comparing funeral homes. Could you give me some prices over the phone, please?

- What is your price for a direct cremation with a basic container?
- What is your price for an immediate burial?
- Does that price include the cremation itself, the permit, and transport to your funeral home? How far do you travel before extra mileage charges start?
- Are there extra charges for weight, refrigeration, or weekend services?
- What is your basic services fee?
- What would a viewing and a funeral service at your funeral home cost, including embalming?
- What is your least expensive casket?
- Could you email me your General Price List?`;

const SCRIPT_QUESTIONS = [
  "What is your price for a direct cremation with a basic container?",
  "What is your price for an immediate burial?",
  "Does that price include the cremation itself, the permit, and transport to your funeral home? How far do you travel before extra mileage charges start?",
  "Are there extra charges for weight, refrigeration, or weekend services?",
  "What is your basic services fee? (This matters if you want anything beyond direct cremation or immediate burial.)",
  "What would a viewing and a funeral service at your funeral home cost, including embalming?",
  "What is your least expensive casket?",
  "Could you email me your General Price List?",
];

const PRICE_ROWS = [
  ["Price After.com (Dallas)", "Direct cremation", "$995"],
  ["Thrash Funeral Chapel (Lewisville)", "Direct cremation with basic container", "$1,400"],
  ["Allen Funeral Home (Wylie)", "Immediate burial, casket provided by family", "$2,195"],
  [
    "Typical DFW retail funeral home",
    "Direct cremation, as reported by the Funeral Consumers Alliance of North Texas",
    "About $3,000",
  ],
  ["One large Dallas funeral home", "Direct cremation, same legally defined service", "About $6,200"],
  ["Peaceful Rest Funeral Home (Dallas)", "Embalming", "$1,300"],
];

const SHEET_ROWS = [
  "Name and phone",
  "Direct cremation",
  "Immediate burial",
  "Basic services fee",
  "Embalming",
  "Viewing and service",
  "Least expensive casket",
  "Extra fees (mileage, weight, weekends)",
  "Will they email a price list?",
];

const OVERSPEND = [
  {
    t: "The casket room.",
    d: "Caskets are one of the largest costs. Funeral homes must show you their casket price list before showing you the caskets themselves — ask to see it first, and ask for the least expensive options, which aren't always on display.",
  },
  {
    t: "“Protective” caskets and vaults.",
    d: "You may be offered sealed or “protective” models at a higher price. Funeral homes are required to tell you there is no evidence that a casket with protective features, such as a gasket, will preserve a body.",
  },
  {
    t: "Embalming presented as routine.",
    d: "Embalming is generally not required by Texas law. If it isn't needed for what you've chosen, you can decline it.",
  },
  {
    t: "Packages.",
    d: "Packages can be good value, but some include items you don't want, and some funeral homes give no refund for package items you don't use. Compare the package with buying only what you need.",
  },
  {
    t: "Newspaper obituaries.",
    d: "A printed obituary in a major newspaper can cost hundreds of dollars — one Dallas funeral home lists the Dallas Morning News at $275 and up. Free alternatives include the funeral home's own website and social media.",
  },
  {
    t: "Extras added one at a time.",
    d: "Memorial videos, printed programmes, flowers, limousines and keepsakes each seem small but add up. It's fine to say “Let's leave that out.”",
  },
  {
    t: "Timing and distance charges.",
    d: "Price lists often include extra fees for Saturday or evening services, for travelling beyond a set distance, and for each additional day of refrigeration. Ask which would apply.",
  },
  {
    t: "Being offered a plan for yourself.",
    d: "Some funeral homes use the arrangement meeting to offer prepaid plans for surviving family members. Whatever its merits, it's not a decision to make this week.",
  },
];

const FAQS = [
  {
    q: "How much does a funeral cost in Texas?",
    a: "In the Dallas–Fort Worth area, the same basic direct cremation ranges from under $1,000 to over $6,000 depending on the funeral home — for the same legally defined service. A simple burial (immediate burial plus plot, opening and closing, liner and marker) typically totals roughly $7,000–$12,000 in DFW, mostly because of cemetery costs. Prices vary enormously, so always compare by phone.",
  },
  {
    q: "What are my rights when buying funeral services?",
    a: "Under the federal Funeral Rule, every funeral home must give you prices over the phone, hand you an itemised General Price List if you visit, let you buy only the items you want, show you a casket price list before showing you any casket, and accept a casket you bought elsewhere with no extra fee. The only fee you can't refuse is the basic services fee.",
  },
  {
    q: "Is embalming required in Texas?",
    a: "Generally no. Embalming is not required by Texas law except in limited circumstances, and it may be needed for a public viewing — but if it isn't required for what you've chosen, you can decline it in writing.",
  },
  {
    q: "Who has the legal right to make funeral arrangements in Texas?",
    a: "First, anyone the deceased named in a signed written document. Without one, the order is: surviving spouse, then an adult child, then a parent, then an adult brother or sister, and so on. If the family disagrees, it helps to know who has the final say — and to agree early on one person as the main contact with the funeral home.",
  },
  {
    q: "What financial help is available for funeral costs in Texas?",
    a: "Eligible veterans (and often spouses) can be buried at no cost in a VA national cemetery or Texas State Veterans Cemetery — call the VA at 800-827-1000. A surviving spouse or child may qualify for Social Security's one-time $255 death payment plus survivor benefits. If the death was caused by a crime, Texas Crime Victims' Compensation can pay up to $6,500 toward the funeral (1-800-983-9933). And Texas counties provide burial or cremation when families can't pay.",
  },
];

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

const jsonLd: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Planning a Funeral in Texas When You Don't Know Where to Start",
    description:
      "Just lost someone and don't know what to do first? A plain-English Texas guide: your rights, real DFW prices, phone scripts, and where families overspend.",
    mainEntityOfPage: FULL,
    url: FULL,
    inLanguage: "en-US",
    datePublished: "2026-09-22",
    dateModified: "2026-09-22",
    author: {
      "@type": "Person",
      name: "Simon James",
      description:
        "Simon James writes about cemetery law and funeral planning for Texas Cemetery Brokers.",
      worksFor: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    },
    publisher: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    about: ["Funeral planning in Texas", "Funeral costs Dallas Fort Worth", "FTC Funeral Rule", "Cemetery plots"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
      { "@type": "ListItem", position: 3, name: "Planning a Funeral in Texas", item: FULL },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const GuidePlanningFuneralTexas = () => {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [tocOpen, setTocOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(PHONE_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background [&>footer]:mt-auto">
      <Seo
        title="Planning a Funeral in Texas: Where to Start | TCB"
        description="Just lost someone and don't know what to do first? A plain-English Texas guide: your rights, real DFW prices, phone scripts, and where families overspend."
        path={PATH}
        type="article"
        jsonLd={jsonLd}
      />
      <Navbar forceScrolled />

      {/* ---------------------------------------------------------- HERO */}
      <header className="relative overflow-hidden border-b border-border/50 bg-secondary/40 pb-16 pt-28 md:pb-24">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(hsl(var(--stone)/0.22)_1px,transparent_1px)] [background-size:22px_22px]" />
        {/* Warm colour washes */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        {/* Floral arrangement — same flowers as the other guides */}
        <motion.img
          src={bananaLeaf.url}
          alt=""
          aria-hidden
          initial={{ opacity: 0, y: 16, rotate: -24 }}
          animate={{ opacity: 0.55, y: 0, rotate: -18 }}
          transition={{ duration: 0.9 }}
          className="pointer-events-none absolute right-0 top-0 w-64 md:w-96"
        />
        <motion.img
          src={palmFan.url}
          alt=""
          aria-hidden
          initial={{ opacity: 0, y: 20, rotate: 14 }}
          animate={{ opacity: 0.5, y: 0, rotate: 8 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="pointer-events-none absolute bottom-0 right-24 hidden w-64 md:block lg:right-40"
        />
        <motion.img
          src={hibiscusCoral.url}
          alt=""
          aria-hidden
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 0.9, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="pointer-events-none absolute bottom-6 right-6 w-28 sm:w-36 md:bottom-10 md:right-16 md:w-44"
        />
        <motion.img
          src={plumeriaCluster.url}
          alt=""
          aria-hidden
          initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
          animate={{ opacity: 0.85, scale: 1, rotate: 4 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="pointer-events-none absolute right-40 top-16 hidden w-24 md:block lg:right-72 lg:w-28"
        />
        <motion.img
          src={leafVeined.url}
          alt=""
          aria-hidden
          initial={{ opacity: 0, y: -14, rotate: -30 }}
          animate={{ opacity: 0.45, y: 0, rotate: -22 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="pointer-events-none absolute left-0 top-24 hidden w-44 lg:block"
        />
        <motion.img
          src={pinkBranch.url}
          alt=""
          aria-hidden
          initial={{ opacity: 0, x: -16, rotate: 12 }}
          animate={{ opacity: 0.5, x: 0, rotate: 6 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="pointer-events-none absolute left-0 bottom-0 hidden w-56 lg:block"
        />
        <span className="absolute bottom-0 left-0 h-1 w-1/3 bg-primary/50" />
        <div className="container relative mx-auto max-w-[1280px] px-6 lg:px-10">
          <Link
            to="/guides"
            className="mb-10 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All guides
          </Link>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-16 bg-primary/40" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
                The Starting-Point Guide
              </p>
            </div>
            <h1 className="max-w-4xl font-display text-[2.5rem] leading-[1.02] text-foreground sm:text-5xl md:text-6xl lg:text-[4.4rem]">
              Planning a Funeral in Texas When You{" "}
              <span className="italic text-primary">Don’t Know Where to Start</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg font-light leading-relaxed text-foreground/75 md:text-xl">
              If someone you love has just died, this guide explains how things work, gives you the exact words to use
              when you call funeral homes, and shows you where families most often overspend.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/70 pt-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">By Simon James, Texas Cemetery Brokers</span>
              <span>September 2026</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> 14 min read
              </span>
            </div>
          </motion.div>
        </div>
      </header>

      <main>
        <div className="container mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="mx-auto max-w-4xl">
            {/* ------------------------------------------------ TOC */}
            <nav aria-label="Table of contents" className="pt-8 lg:pt-10">
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                aria-expanded={tocOpen}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40"
              >
                <span className="inline-flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> In this guide
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${tocOpen ? "rotate-180" : ""}`} />
              </button>
              {tocOpen && (
                <ul className="mt-2 grid gap-x-6 gap-y-1 rounded-xl border border-border bg-card/60 p-4 shadow-sm sm:grid-cols-2">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={() => setTocOpen(false)}
                        className={`block border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                          active === s.id
                            ? "border-primary font-medium text-primary"
                            : "border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </nav>

            {/* ------------------------------------------------ ARTICLE */}
            <article className="min-w-0 pb-10">
              <div className="border-b border-border py-10 md:py-12">
                <p className="text-xl leading-[1.75] text-foreground/85 first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-primary">
                  If someone you love has just died, we’re very sorry. You may now be facing decisions you’ve never made
                  before, at the moment you least feel able to make them.
                </p>
                <p className="mt-6 text-[1.05rem] leading-[1.8] text-foreground/75">
                  This guide won’t tell you what kind of funeral to have. It explains how things work, gives you the
                  exact words to use when you call funeral homes, and shows you where families most often end up
                  spending more than they meant to — so you can make choices that feel right, without being rushed.
                  Whether you’re planning a funeral in Texas for the first time or the fifth, the steps below work the
                  same way.
                </p>
              </div>

              {/* ------------------- THREE THINGS (near the top) */}
              <section id="three-things" className="scroll-mt-28 py-10">
                <h2 className="mb-6 font-display text-2xl text-foreground md:text-3xl">
                  If you only have a few minutes, know these three things
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: Clock,
                      t: "You have time.",
                      d: "Once your loved one is in a funeral home’s care, most decisions can wait a day or two while your family talks.",
                    },
                    {
                      icon: Phone,
                      t: "You can compare prices by phone, without giving your name.",
                      d: "In the Dallas–Fort Worth area, the same basic cremation can cost anywhere from under $1,000 to over $6,000 depending on where you go. A few phone calls can save thousands.",
                    },
                    {
                      icon: Wallet,
                      t: "You only have to buy what you want.",
                      d: "Apart from one basic fee, everything a funeral home offers is optional.",
                    },
                  ].map((c, i) => (
                    <motion.div
                      key={c.t}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.5, delay: i * 0.12 }}
                      className={`rounded-xl border p-6 shadow-sm transition-transform hover:-translate-y-1 ${
                        i === 0
                          ? "border-primary/30 bg-primary/[0.07]"
                          : i === 1
                            ? "border-accent/40 bg-accent/[0.10]"
                            : "border-border/70 bg-secondary/50"
                      }`}
                    >
                      <span
                        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full ${
                          i === 1 ? "bg-accent/25 text-accent-foreground" : "bg-primary/12 text-primary"
                        }`}
                      >
                        <c.icon className="h-5 w-5" />
                      </span>
                      <h3 className="mb-2 font-display text-lg leading-snug text-foreground">{c.t}</h3>
                      <p className="text-[0.95rem] leading-[1.7] text-foreground/70">{c.d}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* ------------------- FIRST 48 HOURS */}
              <Section id="first" eyebrow="The first 48 hours" title="What actually has to happen first — and what can wait">
                <p>
                  In the first hours after a death in Texas, only two things are truly urgent, and neither of them is
                  choosing a funeral. The first is getting your loved one into someone’s care: if the death happened at
                  home under hospice, you call the hospice; otherwise you call the funeral home you want to handle the
                  transport, or the county medical examiner if the death was unexpected. The second is telling the
                  funeral home, plainly, if your faith requires burial within a day or two — they are used to this and
                  will move at your pace.
                </p>
                <p>
                  Everything else can be sequenced. Here is the order that saves Texas families the most money and
                  stress, based on what we’ve seen go wrong:
                </p>
                <div className="not-prose relative mt-10 rounded-2xl border border-border/70 bg-card/35 px-6 pb-2 pt-8 md:px-10 md:pt-10">
                  <div className="mb-10 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    <span className="h-px flex-1 bg-primary/25" /> A calm order of decisions <span className="h-px flex-1 bg-primary/25" />
                  </div>
                  <TimelineStep n="1" title="Day 1: secure the paperwork, not the package">
                    Find out who has the legal right to decide (see item 3 below), and look for any prepaid contract,
                    plot deed, or Appointment of Agent form before you sit down with anyone selling you something.
                    Families who discover a prepaid contract after the arrangement meeting have sometimes bought — and
                    paid for — services twice.
                  </TimelineStep>
                  <TimelineStep n="2" title="Day 2: price the funeral home, price the cemetery separately">
                    These are two different bills from two different businesses. Get the funeral home’s numbers using
                    the <a href="#toolkit" className="font-medium text-primary underline decoration-primary/30 underline-offset-4">phone script below</a>, then compare the cemetery separately. You can also browse the <In to="/cemeteries">Texas cemetery directory</In> before making the plot decision.
                  </TimelineStep>
                  <TimelineStep n="3" title="Day 3 and after: the service itself" last>
                    Once the body is cared for, the prices are compared, and the decision-maker is settled, the ceremony
                    choices — viewing, service, obituary, flowers — can be made without anyone’s clock running but
                    yours. A funeral home that pressures you to decide everything in the first meeting is telling you
                    something about itself.
                  </TimelineStep>
                </div>
              </Section>

              {/* ------------------- TEN THINGS */}
              <Section
                id="ten-things"
                eyebrow="Part 1"
                title="Ten things that will help when planning a funeral in Texas"
              >
                <GuideStep n={1} title="You have more time than it feels like">
                <p>
                  Funeral homes can keep a body refrigerated while you think, so you don’t have to decide everything in
                  the first call. If your faith calls for a quick burial, say so straight away — funeral homes are used
                  to that. Otherwise, it’s fine to say: “We’d like a day to talk as a family before we decide.”
                </p>
                </GuideStep>

                <GuideStep n={2} title="Check whether plans already exist">
                <p>Before choosing anything, look for:</p>
                <ul>
                  <li>
                    A prepaid funeral contract or burial insurance. In Texas, the family handling arrangements is
                    entitled to a copy of any prepaid agreement the funeral home holds for the person who died. Ask.
                  </li>
                  <li>A cemetery plot they already own, or a family plot. If the paperwork is missing, start with our <In to="/cemetery-transfer-process-texas">Texas cemetery ownership and transfer guide</In>.</li>
                  <li>Written wishes, a will, or an Appointment of Agent form naming who should decide.</li>
                  <li>Military service — veterans may be entitled to free burial.</li>
                  <li>Life insurance, or death benefits through an employer, union or association.</li>
                </ul>
                </GuideStep>

                <GuideStep n={3} title="Know who has the right to decide">
                <p>
                  Texas law sets the order. First comes anyone your loved one named in a signed written document.
                  Without one, it’s the surviving spouse, then an adult child, then a parent, then an adult brother or
                  sister, and so on. If the family disagrees, it helps to know who has the final say — and to agree
                  early on one person as the main contact with the funeral home.
                </p>
                </GuideStep>

                <GuideStep n={4} title="You’re entitled to prices — and to compare">
                <p>
                  Under the federal <Ext href={FTC}>Funeral Rule</Ext>, every funeral home must give you prices over the
                  phone, hand you an itemised price list if you visit, and let you choose only the items you want. The
                  one fee you can’t refuse is the basic services fee for the funeral director and staff. Part 2 of this
                   guide gives you a <a href="#toolkit">script for those calls</a>, and our <In to="/cemetery-plot-cost-texas">Texas cemetery cost guide</In> explains the separate cemetery charges.
                </p>
                </GuideStep>

                <GuideStep n={5} title="Bring someone with you">
                <p>
                  If you meet a funeral home in person, take a friend or relative who’s a little less close to the loss.
                  They can take notes, ask questions, and say “Can we think about that?” when too much is being asked at
                  once. You can always leave without signing anything.
                </p>
                </GuideStep>

                <GuideStep n={6} title="The simplest options cost the least — and you can still say goodbye">
                <p>
                  Every funeral home must offer direct cremation (no viewing or ceremony at the funeral home) and
                  immediate burial (burial without a ceremony at the funeral home). These are usually the least
                  expensive choices, and choosing one doesn’t mean going without a farewell. Many families hold their
                  own memorial or celebration of life later — at home, a place of worship, a park or a favourite
                  restaurant.
                </p>
                </GuideStep>

                <GuideStep n={7} title="You don’t have to buy everything from the funeral home">
                <ul>
                  <li>
                    Embalming is generally not required by law in Texas. It may be needed for a public viewing, but you
                    usually have the right to an arrangement that doesn’t need it.
                  </li>
                  <li>
                    You can buy a casket or urn elsewhere, and the funeral home must accept it without an extra fee.
                  </li>
                  <li>For cremation, a simple container is enough. You don’t need a casket.</li>
                </ul>
                </GuideStep>

                <GuideStep n={8} title="The cemetery is a separate bill">
                <p>
                  If you choose burial, the cemetery charges separately for the plot, opening and closing the grave, a
                  vault or grave liner (often required by the cemetery, not by law), and the marker.
                </p>
                <p>
                  If you need a plot, consider a resale plot. Plots bought from their current owners are typically
                  around 30% less expensive than buying directly from the cemetery. A resale plot has never been used —
                  someone bought it years ago and no longer needs it. A cemetery broker can find one and handle the
                   transfer with the cemetery, so it’s worth checking with a broker first. Our <In to="/cemetery-plots-for-sale-texas">guide to buying a resale cemetery plot</In> explains what to verify before paying.
                </p>
                </GuideStep>
              </Section>

              <PhotoBreak
                src={metroAustin}
                alt="Landscaped cemetery grounds representing the Austin metro area"
                caption="Ten steady steps beat one panicked afternoon — take them in order."
                layout="split"
              />

              {/* ------------------- OWN VS NEED */}
              <Section
                id="own-vs-need"
                eyebrow="The cemetery decision"
                title="Own a plot vs. need a plot: two different decision paths"
              >
                <p>
                  Whether your family already owns a cemetery plot changes almost every decision downstream, and it’s
                  worth sorting out which family you are before you call anyone.
                </p>
                <p>
                  <strong>If you already own a plot</strong> — perhaps your parents bought several decades ago, or
                  there’s a family section — your first job is finding the paperwork: the deed or certificate of
                  ownership, and the cemetery’s name. Call the cemetery (not the funeral home) and ask three things: is
                  the plot still recorded in your family member’s name, what will the opening and closing of the grave
                  cost now, and does the cemetery require a vault or liner and a marker installation fee. Families are
                  often surprised that a “paid-for” plot still carries thousands in opening, closing, and liner charges.
                  If no one can find the deed, ask the cemetery what proof of ownership they’ll accept — and if there’s
                  a disagreement about who inherits the plot, our guide on{" "}
                  <In to="/cemetery-transfer-process-texas">who actually owns a cemetery plot in Texas</In> walks
                  through it.
                </p>
                <p>
                  <strong>If you need to buy a plot</strong>, you have more leverage than most families realise. The
                  cemetery’s price is not the only price: plots bought from their current owners through a broker are
                  typically around 30% less than buying directly from the cemetery, and the plot itself is identical —
                  it has never been used. Because the cemetery still collects its opening-and-closing and transfer fees
                  either way, some families worry a resale plot will be treated differently. It won’t be: the cemetery’s
                  obligations to you are the same. And if your family owns plots elsewhere that you don’t need, selling
                  one can offset the costs you’re facing now — see our{" "}
                  <In to="/sell-cemetery-plot-texas">sell-a-plot page</In>.
                </p>
                <p>
                  Either way, settle the plot question before the arrangement meeting. Walking in already knowing where
                  the burial will happen takes the single most expensive decision off the table, and it takes it off
                  while you’re calm.
                </p>
              </Section>

              <Cta
                heading="Need a burial plot?"
                copy="Resale plots from current owners typically cost around 30% less than buying from the cemetery — and the plot itself is identical."
                actions={[
                  { label: "Browse resale plots", to: "/cemeteries", primary: true },
                  { label: "Selling a plot you don’t need?", to: "/sell-cemetery-plot-texas" },
                ]}
              />

              <section
                id="cemetery-map"
                className="relative left-1/2 my-16 w-[min(calc(100vw-3rem),1280px)] -translate-x-1/2 scroll-mt-28 border-y border-border/60 py-12 md:my-20 md:py-16"
              >
                <div className="mb-8 max-w-3xl">
                  <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                    <span className="h-px w-10 bg-primary/40" /> Texas cemetery map
                  </p>
                  <h2 className="font-display text-3xl leading-[1.08] text-foreground md:text-[2.4rem]">
                    Find a cemetery near your family
                  </h2>
                  <p className="mt-4 max-w-2xl text-[1rem] leading-[1.8] text-foreground/70">
                    Choose a metro area to focus the map, search by cemetery or city, or enter an address to sort the nearest options first.
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="grid h-[28rem] place-items-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
                      Loading Texas cemetery map…
                    </div>
                  }
                >
                  <MetroCemeteryMap
                    regions={ALL_TEXAS_REGIONS}
                    metro="Texas"
                    searchable
                    fullBleed={false}
                    hideTitle
                    compact
                    metroTabs
                    widget
                  />
                </Suspense>
              </section>

              <PhotoBreak
                src={metroHouston}
                alt="Tree-shaded cemetery grounds representing Greater Houston"
                caption="Settle the plot question early, and the most expensive decision is off the table."
                layout="portrait"
              />

              <Section id="help-costs" eyebrow="Part 1 continued" title="Help with the costs, and the paperwork after">
                <GuideStep n={9} title="Ask about help with the costs">
                <ul>
                  <li>
                    <strong>Veterans:</strong> eligible veterans, and often spouses, can be buried at no cost in a <Ext href={VA_BURIAL}>VA
                    national cemetery</Ext> or a Texas State Veterans Cemetery. Call the VA at{" "}
                    <a href="tel:18008271000" className="font-medium text-primary underline decoration-primary/30 underline-offset-4">
                      800-827-1000
                    </a>
                    .
                  </li>
                  <li>
                    <strong>Social Security:</strong> a surviving spouse or child may qualify for a one-time $255 death
                    payment and ongoing survivor benefits. Review <Ext href={SSA_SURVIVORS}>Social Security survivor benefits</Ext>.
                  </li>
                  <li>
                    <strong>If the death was caused by a crime:</strong> the Texas Crime Victims’ Compensation Program
                    can pay up to $6,500 toward the funeral. Call{" "}
                    <a href="tel:18009839933" className="font-medium text-primary underline decoration-primary/30 underline-offset-4">
                      1-800-983-9933
                    </a>
                    . Our guide to <Upcoming>help with funeral costs after a crime in Texas</Upcoming> is coming soon.
                  </li>
                  <li>
                    <strong>If you can’t afford a funeral at all:</strong> contact your county. Texas counties provide
                    for burial or cremation when families can’t pay, under rules each county sets.
                  </li>
                </ul>
                </GuideStep>

                <GuideStep n={10} title="Order enough death certificates — and look after yourselves">
                <p>
                  You’ll need certified copies of the death certificate for banks, insurance, pensions, property and
                  utilities. The funeral home usually orders them; ordering several at once is easier than going back
                  for more. Texas also explains how to request certified copies through <Ext href={TEXAS_HEALTH_DEATH_CERTIFICATES}>Vital Statistics</Ext>.
                </p>
                <p>
                  And let people help. Friends can bring food, make calls and handle errands. There’s no right way to
                  grieve and no timetable for it — when you’re ready,{" "}
                  <Upcoming>finding support in Dallas–Fort Worth</Upcoming> lists grief support by type of loss, and{" "}
                  <Upcoming>what is a death doula</Upcoming> explains the non-medical help available at the end of life.
                </p>
                </GuideStep>
              </Section>

              {/* ------------------- PHONE SCRIPT */}
              <PhotoBreak
                src={metroDallas}
                alt="Landscaped cemetery grounds representing Dallas–Fort Worth"
                caption="A few calm phone calls can save a family thousands of dollars."
                layout="cinematic"
              />
              <Section id="toolkit" eyebrow="Part 2 · Your toolkit" title="The phone call: what to say">
                <p>
                  Many families never compare prices because they don’t know what to say. You don’t need to explain
                  yourself, and you don’t need to give your name. You can simply say:
                </p>
                <div className="not-prose my-8 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.05]">
                  <div className="flex items-center justify-between gap-4 border-b border-primary/20 px-6 py-4">
                    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                      <Phone className="h-3.5 w-3.5" /> Phone script
                    </p>
                    <button
                      type="button"
                      onClick={copyScript}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-background/70 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy script"}
                    </button>
                  </div>
                  <div className="px-6 py-6">
                    <p className="font-display text-xl leading-[1.6] text-foreground md:text-2xl">
                      “Hello. Someone in my family has died and we’re comparing funeral homes. Could you give me some
                      prices over the phone, please?”
                    </p>
                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/50">
                      Then ask whichever of these apply
                    </p>
                    <ul className="mt-4 space-y-3">
                      {SCRIPT_QUESTIONS.map((q) => (
                        <li key={q} className="flex gap-3 text-[0.98rem] leading-[1.7] text-foreground/80">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          <span>“{q}”</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p>
                  If a funeral home won’t give prices over the phone, that’s itself a breach of the federal Funeral Rule
                  — and a good reason to call somewhere else.
                </p>
              </Section>

              {/* ------------------- RIGHTS */}
              <Section
                id="rights"
                eyebrow="Your rights"
                title="Three rights families don’t know they have — and how to use them"
              >
                <p>
                  The federal Funeral Rule gives you specific rights, but rights you can’t picture using are just words.
                  Here’s what they look like in practice at a Texas funeral home:
                </p>
                <h3>You can walk out of the casket room.</h3>
                <p>
                  The law requires the funeral home to show you a printed casket price list before showing you any
                  casket, and to show you the least expensive options — which, in our experience, are frequently not on
                  the showroom floor. If you’re taken straight to the display room, say: “Could we see the casket price
                  list first, please, starting with the least expensive?” You can also buy the casket anywhere — online,
                  from a warehouse store — and the funeral home must accept it with no extra fee. Families who price a
                  casket elsewhere first routinely find the funeral home’s least expensive option suddenly becomes
                  easier to see.
                </p>
                <h3>You can buy nothing but the basics, and they have to let you.</h3>
                <p>
                  Apart from the basic services fee, every single item is optional — including embalming, which Texas
                  law generally does not require. If embalming is presented as standard or expected, the question to ask
                  is: “Is embalming required for what we’ve chosen, or is it optional?” If it’s optional, you can
                  decline it in writing. No funeral home can refuse to serve you because you declined extras.
                </p>
                <h3>You can report a violation, and it matters.</h3>
                <p>
                  If a funeral home won’t give prices over the phone, pressures you to buy a package to get a price
                  list, or charges a fee for accepting a casket you bought elsewhere, that’s a Funeral Rule violation.
                  Complaints go to the FTC at <Ext href={REPORT_FRAUD}>ReportFraud.ftc.gov</Ext> and, for Texas
                  licensing issues, to the <Ext href={TFSC}>Texas Funeral Service Commission</Ext>, which licenses every
                  funeral home in the state. You don’t have to file a complaint to benefit from the rule — but knowing
                  you can changes the dynamic of the conversation.
                </p>
              </Section>

              <PhotoBreak
                src={metroSanAntonio}
                alt="Mature trees across cemetery grounds representing San Antonio"
                caption="Your rights don't expire at the funeral home door — they travel with you."
                layout="window"
              />

              {/* ------------------- COMPARISON SHEET */}
              <Section id="sheet" eyebrow="Print this" title="Price comparison sheet">
                <p>Print this or copy it onto paper, and fill it in as you call.</p>
                <div className="not-prose my-8 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                    <caption className="border-b border-border bg-muted/40 px-5 py-3 text-left text-xs text-muted-foreground">
                      Fill one column in per funeral home as you call.
                    </caption>
                    <thead>
                      <tr className="bg-muted/30 text-[11px] uppercase tracking-[0.14em] text-foreground/60">
                        <th scope="col" className="px-5 py-3 font-semibold">
                          &nbsp;
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">Funeral home 1</th>
                        <th scope="col" className="px-5 py-3 font-semibold">Funeral home 2</th>
                        <th scope="col" className="px-5 py-3 font-semibold">Funeral home 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SHEET_ROWS.map((r) => (
                        <tr key={r} className="border-t border-border/70">
                          <th scope="row" className="px-5 py-3 text-left font-medium text-foreground">
                            {r}
                          </th>
                          <td className="px-5 py-3 text-foreground/30">—</td>
                          <td className="px-5 py-3 text-foreground/30">—</td>
                          <td className="px-5 py-3 text-foreground/30">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="not-prose">
                  <a
                    href={PRICE_SHEET}
                    download
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    <Download className="h-4 w-4" /> Download the blank sheet (PDF)
                  </a>
                </p>
              </Section>

              {/* ------------------- OVERSPEND */}
              <Section
                id="overspend"
                eyebrow="Where the money goes"
                title="Eight moments where families often spend more than they meant to"
              >
                <p>
                  None of these means anyone is doing anything wrong. They’re simply the points where decisions get made
                  quickly, and where knowing your options helps.
                </p>
                <ol className="not-prose mt-8 space-y-4">
                  {OVERSPEND.map((o, i) => (
                    <li key={o.t} className="flex gap-4 rounded-xl border border-border/70 bg-card/50 p-5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm text-primary">
                        {i + 1}
                      </span>
                      <p className="text-[0.98rem] leading-[1.75] text-foreground/75">
                        <strong className="font-semibold text-foreground">{o.t}</strong> {o.d}
                        {i === 7 && (
                          <>
                            {" "}
                            (When you’re ready to think about your own plans, see our guide to{" "}
                            <Upcoming>prepaid funeral plans in Texas</Upcoming>.)
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              </Section>

              <PhotoBreak
                src={metroEastTexas}
                alt="Cemetery lawns and monuments representing East Texas"
                caption="The families who overspend aren't careless — they're rushed. Slow the moment down."
                layout="strip"
              />

              {/* ------------------- PRICES */}
              <Section
                id="prices"
                eyebrow="Part 3"
                title="Funeral costs in Dallas–Fort Worth — what things actually cost"
              >
                <p>
                  These figures come from funeral homes’ own published price lists and from the Funeral Consumers
                  Alliance of North Texas. They’re examples to help you judge what you’re quoted, not recommendations.
                  Always check current prices.
                </p>
                <div className="not-prose my-8 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <caption className="border-b border-border bg-muted/40 px-5 py-3 text-left text-xs text-muted-foreground">
                      Prices from funeral homes’ published lists; always confirm current prices.
                    </caption>
                    <thead>
                      <tr className="bg-muted/30 text-[11px] uppercase tracking-[0.14em] text-foreground/60">
                        <th scope="col" className="px-5 py-3 font-semibold">Where</th>
                        <th scope="col" className="px-5 py-3 font-semibold">What</th>
                        <th scope="col" className="px-5 py-3 font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRICE_ROWS.map(([where, what, price]) => (
                        <tr key={where + what} className="border-t border-border/70">
                          <th scope="row" className="px-5 py-3 text-left font-medium text-foreground">
                            {where}
                          </th>
                          <td className="px-5 py-3 text-foreground/75">{what}</td>
                          <td className="whitespace-nowrap px-5 py-3 font-semibold text-foreground">{price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  <strong>Why the difference is so large:</strong> the Funeral Consumers Alliance of North Texas notes
                  that about 20 crematories serve more than 200 DFW funeral homes. So families paying very different
                  prices are often using the same small number of state-inspected crematories. What you’re mostly
                  choosing between is the funeral home’s price, not the cremation itself.
                </p>
                <p>
                  A simple burial — immediate burial, a plot, opening and closing the grave, a liner and a marker —
                  typically adds up to roughly $7,000–$12,000 in DFW, because of the cemetery costs.
                </p>

                <h3>What to do with this information</h3>
                <p>
                  Knowing that the cremation itself is often identical changes how you shop. It means the phone script
                  in Part 2 isn’t just about politeness — it’s the whole strategy. When twenty funeral homes are selling
                  access to the same small number of crematories, the only thing you’re really comparing is their markup
                  and their service: how quickly they collect your loved one, how they treat you on the phone, whether
                  they email the price list without a fuss.
                </p>
                <p>
                  One practical consequence: don’t assume a higher price means better care of your loved one. The
                  crematory is state-inspected regardless of which funeral home’s van drives there. What a higher price
                  can buy is nicer facilities for a viewing, more staff time, or a brand name — all legitimate things to
                  want, but things you should choose consciously rather than pay for by default. And the reverse is
                  worth knowing too: some of the lowest-priced providers in DFW are high-volume cremation specialists
                  who do this one thing well. The right question isn’t “why is this so cheap” but “what exactly is
                  included, and what would cost extra” — which is what the comparison sheet above is for.
                </p>
              </Section>

              {/* ------------------- LOCAL HELP */}
              <PhotoBreak
                src={metroWestTexas}
                alt="Peaceful cemetery grounds representing West Texas"
                caption="Texas families help each other through this. Here is who to call."
                layout="postcard"
              />
              <Section id="local-help" eyebrow="Dallas–Fort Worth" title="Local help">
                <ul>
                  <li>
                    <strong>Funeral Consumers Alliance of North Texas</strong> — a nonprofit, all-volunteer consumer
                    group with advice on funeral homes, cremation, green burial, home funerals and body donation, and a
                    list of DFW cremation providers that consumers have reported favourably. It advises checking that
                    any provider shows its Texas Funeral Service Commission licence number.
                  </li>
                  <li>
                    <strong>Dallas–Fort Worth National Cemetery</strong> — 2000 Mountain Creek Parkway, Dallas 75211 ·
                    214-467-3374. Free burial for eligible veterans and often spouses.
                  </li>
                  <li>
                    <strong>Texas Funeral Service Commission</strong> — licenses Texas funeral homes and handles
                    complaints.
                  </li>
                  <li>
                    Facing an end-of-life decision now? <Upcoming>Choosing a hospice in Texas</Upcoming> covers what to
                    ask.
                  </li>
                </ul>
              </Section>

              <Cta
                heading="Still sorting out the cemetery side?"
                copy="We help Texas families find resale plots and handle the transfer paperwork with the cemetery."
                actions={[{ label: "Talk to us", to: "/contact", primary: true }]}
              />

              {/* ------------------- FAQ */}
              <Section id="faq" eyebrow="Questions" title="Frequently asked questions">
                <div className="not-prose divide-y divide-border border-y border-border">
                  {FAQS.map((f, i) => {
                    const open = openFaq === i;
                    return (
                      <div key={f.q}>
                        <h3 className="m-0">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenFaq(open ? null : i)}
                            className="flex w-full items-center justify-between gap-6 px-0 py-6 text-left text-base font-semibold text-foreground transition-colors hover:text-primary md:text-lg"
                          >
                            {f.q}
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-primary transition-transform ${open ? "rotate-180" : ""}`}
                            />
                          </button>
                        </h3>
                        {open && (
                          <p className="max-w-3xl pb-7 pr-10 text-[0.98rem] leading-[1.8] text-foreground/75">{f.a}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* ------------------- 988 */}
              <aside className="my-12 flex gap-5 rounded-2xl border border-border bg-secondary/40 p-7">
                <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-primary" />
                <div>
                  <h2 className="mb-2 font-display text-xl text-foreground">If you need someone right now</h2>
                  <p className="text-[1rem] leading-[1.75] text-foreground/75">
                    If grief feels like more than you can bear, you can call or text{" "}
                    <a href="tel:988" className="font-semibold text-primary underline decoration-primary/30 underline-offset-4">
                      988
                    </a>
                    , the Suicide &amp; Crisis Lifeline, any time, day or night.
                  </p>
                </div>
              </aside>

              {/* ------------------- AUTHOR */}
              <section className="my-12 rounded-2xl border border-border/70 bg-card/60 p-7">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">About the author</p>
                <h2 className="mb-2 font-display text-xl text-foreground">Simon James, Texas Cemetery Brokers</h2>
                <p className="max-w-2xl text-[0.98rem] leading-[1.75] text-foreground/70">
                  Simon James writes about cemetery law and funeral planning for Texas Cemetery Brokers, the family-run
                  Texas company that helps families buy and sell cemetery plots. His guides translate Texas rules and
                  funeral paperwork into plain English.
                </p>
              </section>

              <p className="border-t border-border/70 pt-6 text-xs leading-relaxed text-muted-foreground">
                This guide is general information, not legal advice. Prices, rules and providers change; please confirm
                details directly. Inclusion of any business is not an endorsement. Last reviewed: September 2026.
              </p>
            </article>
          </div>
        </div>
        <div id="series" className="scroll-mt-28">
          <GuidesCarousel />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuidePlanningFuneralTexas;
