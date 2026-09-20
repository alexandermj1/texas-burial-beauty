import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, FileText, Phone, Scale, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { SPARKMAN_HERO } from "@/data/sparkmanPhotos";
import { BLUEBONNET_HERO } from "@/data/bluebonnetPhotos";
import transferBotanical from "@/assets/transfer-guide-botanical.png";
import transferCemetery from "@/assets/transfer-guide-cemetery.jpg";
import transferCemeteryRecords from "@/assets/transfer-guide-cemetery-records.jpg";

const PATH = "/cemetery-transfer-process-texas";
const SITE = "https://texascemeterybrokers.com";
const FULL = `${SITE}${PATH}`;
const HS_711 = "https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm";
const ES = "https://statutes.capitol.texas.gov/Docs/ES/htm/ES.";

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
    {children}
  </a>
);

const Section = ({ id, num, eyebrow, title, children }: { id: string; num: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-28 border-t border-border/60 py-12 md:py-16">
    <div className="grid gap-6 md:grid-cols-12 md:gap-10">
      <div className="relative md:col-span-3 md:min-h-[240px] md:border-r md:border-border/50 md:pr-8">
        <div className="relative z-10 md:sticky md:top-28">
          <p className="font-display text-5xl leading-none text-primary/25">{num}</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
          <span className="mt-8 hidden h-20 w-px bg-gradient-to-b from-primary/30 to-transparent md:block" />
        </div>
        <img src={transferBotanical} alt="" aria-hidden width={1024} height={1024} loading="lazy" className="pointer-events-none absolute bottom-2 left-0 hidden w-40 opacity-[0.24] md:block" />
      </div>
      <div className="md:col-span-9">
        <h2 className="mb-6 font-display text-3xl leading-[1.08] text-foreground md:text-[2.7rem]">{title}</h2>
        <div className="prose prose-lg max-w-none text-foreground/80 [&_li]:leading-relaxed [&_p]:leading-[1.8] [&_p]:mb-5 [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
      </div>
    </div>
  </section>
);

const faqs = [
  { q: "Who inherits a cemetery plot in Texas?", a: "The answer depends on the ownership record, any specific disposition in a will or declaration, whether the owner is buried in the plot, the surviving spouse's protected burial right, the heirs identified under Texas law, and the cemetery's own requirements." },
  { q: "Can a surviving spouse sell a cemetery plot alone?", a: "Not always. If the deceased owner is buried in the plot, Texas Health and Safety Code § 711.039 generally requires the surviving spouse and the heirs-at-law to join unless the space was specifically disposed of by will or a declaration recorded with the cemetery." },
  { q: "Where is a cemetery plot deed recorded in Texas?", a: "The cemetery organization maintains the controlling ownership records. A family's certificate is important evidence, but cemetery plots are not ordinarily handled like land deeds recorded with the county clerk." },
  { q: "Does every inherited cemetery plot require probate?", a: "No single answer fits every file. Some cemeteries accept an affidavit or other evidence in a straightforward case; others require a court determination or additional documents. Eligibility and legal effect vary, so confirm the cemetery's requirements and obtain legal advice when heirship is disputed or complex." },
  { q: "Can part of a family block be sold?", a: "Not automatically. Under § 711.0381(d), collectively conveyed interment rights may not be divided for resale without the cemetery organization's consent." },
];

const jsonLd: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org", "@type": "Article",
    headline: "Who Actually Owns Grandma's Cemetery Plot? A Texas Guide",
    description: "A plain-English guide to who owns an inherited cemetery plot in Texas, who must sign a transfer, and how cemetery, heirship and spousal rights work together.",
    mainEntityOfPage: FULL, url: FULL, inLanguage: "en-US",
    dateModified: "2026-09-20",
    author: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    publisher: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    about: ["Texas cemetery plot inheritance", "Cemetery plot transfer", "Right of sepulture", "Texas heirship"],
  },
  {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
      { "@type": "ListItem", position: 3, name: "Texas Cemetery Transfer Process", item: FULL },
    ],
  },
  {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

const GuideCemeteryTransferProcess = () => (
  <div className="flex min-h-screen flex-col bg-background [&>footer]:mt-auto">
    <Seo title="Who Owns an Inherited Cemetery Plot in Texas?" description="Who inherits a Texas cemetery plot, who must sign its transfer, and how spousal rights, heirs and cemetery rules work together." path={PATH} type="article" jsonLd={jsonLd} />
    <Navbar forceScrolled />

    <header className="relative overflow-hidden border-b border-border/50 bg-secondary/40 pb-20 pt-28 md:pb-28">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(hsl(var(--stone)/0.22)_1px,transparent_1px)] [background-size:22px_22px]" />
      <img src={transferBotanical} alt="" aria-hidden width={1024} height={1024} className="pointer-events-none absolute -right-24 top-10 w-[460px] opacity-55 md:right-0 md:top-4 md:w-[570px] lg:right-6 lg:w-[650px]" />
      <span className="absolute bottom-0 left-0 h-1 w-1/3 bg-primary/50" />
      <div className="container relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <Link to="/guides" className="mb-12 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All guides
        </Link>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
          <div className="mb-8 flex items-center gap-4">
            <span className="h-px w-16 bg-primary/40" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">Issue N°05 · The Transfer Edition</p>
          </div>
          <h1 className="max-w-4xl font-display text-[2.9rem] leading-[0.98] text-foreground sm:text-6xl md:text-7xl lg:text-[5.25rem]">
            Who Actually Owns Grandma’s <span className="italic text-primary">Cemetery Plot?</span>
          </h1>
           <div className="mt-9 grid max-w-4xl gap-8 md:grid-cols-12 md:items-end">
             <p className="text-lg font-light leading-relaxed text-foreground/75 md:col-span-8 md:text-2xl">
              A friendly Texas guide to the three authorities that decide who owns an unused cemetery space, who has to sign, and why the cemetery gets the final word.
            </p>
            <div className="border-l border-border pl-6 text-sm leading-relaxed text-muted-foreground md:col-span-4">
              <p>Texas Cemetery Brokers</p><p>Updated September 2026</p><p>17 min read · 8 chapters</p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/sell" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">Have us review your plot <ArrowRight className="h-4 w-4" /></Link>
            <a href="tel:+12142304740" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"><Phone className="h-4 w-4" /> (214) 230-4740</a>
          </div>
        </motion.div>
      </div>
    </header>

    <main>
      <article className="container mx-auto max-w-[1120px] px-6 pb-12 lg:px-10">
        <div className="grid overflow-hidden border-b border-border py-10 md:grid-cols-[1fr_240px_250px] md:items-stretch md:py-12">
          <p className="pr-8 text-xl leading-[1.75] text-foreground/85 first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-primary">
            Here’s a question that sounds simple and isn’t: your father died, he owned four cemetery plots, only one got used, and your family wants to sell the other three. Who signs?
          </p>
          <nav aria-label="Article chapters" className="mt-8 border-l border-border pl-6 text-sm text-muted-foreground md:mt-0">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/50">In this guide</p>
            {[['nature','What a plot is'],['health-code','Health & Safety Code'],['owner-buried','Who signs?'],['estates-code','Heirs-at-law'],['sample-scenario','Sample family'],['cemetery','The cemetery'],['file','Your actual file'],['faq','Questions']].map(([id,label]) => <a key={id} href={`#${id}`} className="block py-1.5 transition-colors hover:text-primary">{label}</a>)}
          </nav>
          <figure className="relative mt-8 min-h-52 overflow-hidden rounded-md md:mt-0">
            <img src={transferCemetery} alt="A peaceful Texas memorial garden" width={1536} height={1024} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-foreground/75 px-4 py-3 text-xs leading-relaxed text-background">The cemetery’s own record is where every transfer begins.</figcaption>
          </figure>
        </div>

        <div className="relative my-10 overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-7 md:p-9">
          <img src={transferBotanical} alt="" aria-hidden width={1024} height={1024} loading="lazy" className="pointer-events-none absolute -right-24 -top-28 w-72 opacity-[0.18]" />
          <div className="relative">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">The honest answer</p>
          <p className="font-display text-2xl leading-snug text-foreground md:text-3xl">Three different authorities must line up before anything happens.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              { Icon: Scale, n: '01', t: 'Texas cemetery law', d: 'Chapter 711 creates special rules for interment rights.' },
              { Icon: Users, n: '02', t: 'Texas inheritance law', d: 'The Estates Code tells you who counts as an heir.' },
              { Icon: Building2, n: '03', t: 'The cemetery', d: 'Its records, forms and approval complete the transfer.' },
            ].map(({Icon,n,t,d}) => <div key={n} className="border-t border-primary/25 pt-4"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-primary"/><span className="text-[10px] font-bold tracking-[0.2em] text-primary">{n}</span></div><h2 className="mt-3 font-display text-xl text-foreground">{t}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p></div>)}
          </div>
          <p className="mt-7 text-base leading-relaxed text-foreground/80">Families routinely get two out of three and wonder why nothing is moving. So let’s take them in order.</p>
          </div>
        </div>

        <Section id="nature" num="I" eyebrow="The nature of the interest" title="First, a plot isn’t really property">
          <p>This trips people up immediately, so let’s clear it up.</p>
          <p>When you “buy a cemetery plot” in Texas, you don’t buy the land. You buy something called the <strong>exclusive right of sepulture</strong> — a right to bury someone in a particular spot. The cemetery still owns the dirt. Texas courts have described what you hold as something closer to an easement or a licence than to real estate.</p>
          <p>Practically, this means the deed isn’t at the county clerk’s office. It’s at the cemetery. The certificate of ownership in your father’s filing cabinet is a copy; the cemetery’s records are the original, and they’re what control.</p>
          <div className="not-prose mt-8 grid overflow-hidden rounded-lg border border-border md:grid-cols-2">
            <div className="bg-card p-6"><FileText className="h-6 w-6 text-primary"/><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">The family holds</p><p className="mt-2 font-display text-xl text-foreground">The certificate and supporting papers</p></div>
            <div className="border-t border-border bg-secondary/30 p-6 md:border-l md:border-t-0"><Building2 className="h-6 w-6 text-primary"/><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">The cemetery holds</p><p className="mt-2 font-display text-xl text-foreground">The controlling ownership record</p></div>
          </div>
        </Section>

        <Section id="health-code" num="II" eyebrow="Authority one" title="The Texas Health and Safety Code">
          <p>Chapter 711 of the Health and Safety Code is where cemetery plots live, and <Ext href={`${HS_711}#711.039`}>§ 711.039</Ext> is the section that decides almost everything. It’s worth knowing what’s in it, because several of its rules will surprise you.</p>
          <h3>Surprise one: it’s separate property</h3>
          <p>Subsection (a) says a plot is presumed to be the separate property of whoever is named as grantee on the certificate.</p>
          <p>If you know anything about Texas marital property, that should raise an eyebrow. Normally, assets acquired during a marriage with marital money are community property, and community property passes entirely to the surviving spouse when the couple’s children are all children of both spouses. That’s the rule most families expect.</p>
          <p>Cemetery plots don’t follow it. The statute carves them out. Which means a surviving spouse who assumed the plots were simply hers now finds the children have an interest too.</p>
          <h3>Surprise two: the spouse has a right nobody can take away</h3>
          <p>Subsection (b) gives the spouse of the plot owner a <strong>vested right of interment</strong> — a right to actually be buried there. It attaches while they’re married, or if they’re married when the owner dies.</p>
          <p>And subsection (c) puts teeth in it: an attempted conveyance or other action without the spouse’s joinder or written, attached consent doesn’t divest that right. So if the children sell the plots out from under the widow, the buyer takes the plots subject to her right to be buried in one. Which is exactly the kind of mess nobody wants to discover later.</p>
          <p>That right ends in only two ways, under subsection (d): a final divorce decree, unless the decree says otherwise, or the spouse being buried somewhere else.</p>
          <div className="not-prose mt-8 rounded-lg border border-accent/30 bg-accent/10 p-6">
            <p className="font-semibold text-foreground">A burial right is not exactly the same thing as ownership.</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">The spouse’s protected right can remain attached even when ownership interests pass to heirs. That distinction is one reason a transfer needs careful document review.</p>
          </div>
        </Section>

        <section id="owner-buried" className="scroll-mt-28 border-t border-border/60 py-12 md:py-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">The single most useful question</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl leading-tight text-foreground md:text-5xl">Is the owner buried in the plot?</h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-foreground/75">This is the question that determines who signs.</p>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">Yes</div>
              <h3 className="mt-5 font-display text-2xl text-foreground">The owner is buried there</h3>
              <p className="mt-4 leading-relaxed text-foreground/75">Subsection (g) applies. Unless there is a specific disposition by express reference to the space in the owner’s will or in a written declaration filed with the cemetery:</p>
              <div className="mt-5 flex items-center gap-3 border-t border-primary/20 pt-5 text-foreground"><Users className="h-5 w-5 text-primary"/><strong>Surviving spouse + heirs-at-law sign together</strong></div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Read that “and” carefully. The widow alone can’t sell. The children alone can’t sell. Everyone signs.</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">No</div>
              <h3 className="mt-5 font-display text-2xl text-foreground">The owner is not buried there</h3>
              <p className="mt-4 leading-relaxed text-foreground/75">Subsection (h) applies. Absent a specific disposition, the right vests on death in the heirs-at-law and may be conveyed by them:</p>
              <div className="mt-5 flex items-center gap-3 border-t border-accent/20 pt-5 text-foreground"><Users className="h-5 w-5 text-accent"/><strong>The heirs-at-law sign</strong></div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">One grave, niche or crypt remains reserved for the surviving spouse.</p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-card p-5"><Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary"/><p className="text-sm leading-relaxed text-foreground/75"><strong className="text-foreground">Same family, same plots, different signature list</strong> — depending on where Dad ended up.</p></div>
        </section>

        <Section id="children" num="III" eyebrow="Interment rights" title="And the children have their own rights">
          <p>Subsection (e) covers what happens where the owner is buried in the plot and left no specific instructions. One space is reserved for the surviving spouse. And the owner’s children, “in order of need,” may be buried in the remaining spaces without the consent of anyone claiming an interest in the plot.</p>
          <p>“In order of need” is a wonderfully Texan phrase that means, essentially, whoever dies first. It’s not a queue you can jump or reserve.</p>
          <p>The practical effect is that a child can occupy a space over the objections of siblings who wanted to sell it. Which is a good reason to have the family conversation early.</p>
          <h3>Waivers</h3>
          <p>Subsection (f) is the pressure valve. A surviving spouse or a child may waive their right of interment — but only in favour of a relative of the owner or of the owner’s spouse.</p>
          <p>So the widow can pass her reserved space to a grandchild. She cannot waive it in favour of a stranger who wants to buy it. The waiver is a family-facing tool, not a sales tool, and the distinction tells you something about how the legislature viewed these rights.</p>
        </Section>

        <div className="my-4 grid gap-4 sm:grid-cols-2">
          {[{src:transferCemeteryRecords,alt:'A fountain and memorial garden in a Texas cemetery',name:'The cemetery record is the starting point',caption:'Every transfer begins by confirming exactly how the cemetery has the ownership recorded.'},{src:transferCemetery,alt:'A tree-lined Texas memorial garden with flat bronze markers',name:'The cemetery is also the gatekeeper',caption:'Its forms, fees and consent requirements decide what will be accepted and recorded.'}].map((p)=><figure key={p.name} className="overflow-hidden rounded-lg border border-border bg-card"><img src={p.src} alt={p.alt} width={1536} height={1024} className="aspect-[16/10] w-full object-cover" loading="lazy"/><figcaption className="p-5"><p className="font-display text-xl text-foreground">{p.name}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.caption}</p></figcaption></figure>)}
        </div>

        <Section id="estates-code" num="IV" eyebrow="Authority two" title="The Texas Estates Code">
          <p>Notice that § 711.039 keeps using the phrase “heirs-at-law” and never defines it. That’s deliberate — it’s borrowing the definition from elsewhere.</p>
          <p>That elsewhere is <Ext href={`${ES}201.htm`}>Estates Code Chapter 201</Ext>, the intestate succession rules. And because of the separate property presumption we met earlier, you’ll generally be in the separate-property provisions rather than the community property ones — which is precisely why children end up with a share that families don’t expect.</p>
          <p>Working out exactly who the heirs are can require a <Ext href={`${ES}202.htm`}>determination of heirship under Chapter 202</Ext>, or in some cases evidence under <Ext href={`${ES}203.htm`}>Chapter 203</Ext>. A <Ext href={`${ES}205.htm`}>small estate affidavit under Chapter 205</Ext> has specific eligibility rules and is not a universal substitute for probate. Many cemeteries will accept an affidavit rather than making you open a probate, which saves considerable time and money — but that’s their choice, not your right.</p>
          <p>One thing to watch: heirs are determined as of the date of death. If a child predeceased the owner, that child’s own children may step into the slot. Families who assume the list is “Mom and the three of us” sometimes discover it’s actually “Mom, two of us, and four grandchildren scattered across three states.”</p>
          <div className="not-prose my-8 rounded-lg border border-border bg-secondary/35 p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">An unsettled corner</p>
            <h3 className="mt-3 font-display text-2xl text-foreground">Real property or personal property?</h3>
            <p className="mt-4 leading-relaxed text-foreground/75">Texas applies different intestacy fractions to real property and personal property. Given that courts describe the right of sepulture as more like an easement or licence than land, there is an argument either way. If the shares matter — usually because the family disagrees — this is a question for a lawyer, not for a blog post.</p>
          </div>
        </Section>

        <section id="sample-scenario" className="relative my-6 scroll-mt-28 overflow-hidden rounded-lg border border-primary/20 bg-secondary/40 p-6 md:p-10">
          <img src={transferBotanical} alt="" aria-hidden width={1024} height={1024} loading="lazy" className="pointer-events-none absolute -right-14 -top-14 w-64 opacity-20" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/20 pb-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Sample scenario · Sample Cemetery</p>
                <h2 className="mt-3 max-w-3xl font-display text-3xl leading-tight text-foreground md:text-5xl">One deed. Three generations. Nine people in the signing path.</h2>
              </div>
              <span className="rounded-full border border-primary/25 bg-background/70 px-4 py-2 text-xs font-semibold text-primary">Fictional example</span>
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
              <div>
                <p className="text-base leading-relaxed text-foreground/75">Eleanor Whitaker owned four unused spaces at Sample Cemetery. She died without leaving the plots to anyone specifically. Her husband Thomas is living. Their son Daniel is living and married to Rebecca. Their daughter Susan died first, leaving Olivia and Marcus; Olivia is married to Noah, while Marcus has an existing durable power of attorney naming Elena. Their daughter Linda is living and married to Carlos.</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Following the same review process we use for seller files, the signing path includes Eleanor’s surviving spouse, each living child, Susan’s branch through her children, every current spouse, and Marcus’s attorney-in-fact.</p>

                <div className="mt-7 rounded-lg border border-border bg-background/80 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">What the family facts mean</p>
                  <p className="mt-3 font-display text-2xl text-foreground">The family cannot solve this with one signature.</p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/70">Thomas signs in his own right. Daniel and Linda inherit their branches. Olivia and Marcus step into Susan’s branch. Rebecca, Noah and Carlos join their spouses. Elena signs in Marcus’s name under his existing authority.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-5 md:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Family path</p>
                <div className="mt-5 flex justify-center"><div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-center"><p className="font-semibold text-foreground">Eleanor Whitaker</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Deed owner · deceased</p></div></div>
                <div className="mx-auto h-5 w-px bg-border" />
                <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center text-xs">
                  <div><p className="font-semibold text-foreground">Thomas</p><p className="text-muted-foreground">husband</p></div>
                  <div><p className="font-semibold text-foreground">Daniel</p><p className="text-muted-foreground">son</p><div className="mt-2 rounded bg-primary/5 px-1.5 py-1 text-primary">+ Rebecca</div></div>
                  <div><p className="font-semibold text-foreground">Linda</p><p className="text-muted-foreground">daughter</p><div className="mt-2 rounded bg-primary/5 px-1.5 py-1 text-primary">+ Carlos</div></div>
                </div>
                <div className="mx-auto mt-3 h-5 w-px bg-border" />
                <div className="rounded-md border border-dashed border-border bg-secondary/50 p-3 text-center text-xs"><p className="font-semibold text-foreground">Susan · daughter · deceased</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded bg-background p-2"><strong>Olivia</strong><br/><span className="text-muted-foreground">+ Noah</span></div><div className="rounded bg-background p-2"><strong>Marcus</strong><br/><span className="text-muted-foreground">Elena signs for him</span></div></div></div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Individual signer', 'Thomas Whitaker'],
                ['Joint signer pair', 'Daniel & Rebecca Whitaker'],
                ['Joint signer pair', 'Olivia & Noah Reed'],
                ['Signer through agent', 'Marcus Reed · Elena signs'],
                ['Joint signer pair', 'Linda Flores & Carlos Flores'],
                ['Supporting family record', 'Susan’s death certificate'],
              ].map(([kind, names]) => <div key={names} className="rounded-md border border-border bg-card p-4"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{kind}</p><p className="mt-2 text-sm font-semibold text-foreground">{names}</p></div>)}
            </div>

            <div className="mt-7 flex flex-col gap-5 rounded-lg border-l-4 border-primary bg-background/80 p-6 md:flex-row md:items-center md:justify-between">
              <div><p className="font-display text-2xl text-foreground">This is exactly where a broker saves the family time.</p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">The broker turns the family story into the right signer list, checks the cemetery’s own requirements, and keeps one missing branch from holding up the transfer.</p></div>
              <Link to="/sell" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Work through your family’s file <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">This sample is illustrative, not a legal conclusion for another family. Sample Cemetery and every person named above are fictional. The result follows our current review rules and would still be checked against the actual cemetery record.</p>
          </div>
        </section>

        <Section id="cemetery" num="V" eyebrow="Authority three" title="The cemetery organization">
          <p>You can have § 711.039 memorised and every heir lined up, and still get nowhere, because the cemetery has its own rulebook.</p>
          <p>Cemeteries maintain the ownership records, so they’re the gatekeeper. Their rules commonly include transfer fees, approval rights over who can buy, and sometimes a right of first refusal that means they buy it back rather than letting you sell to a third party. Some won’t permit resale to outsiders at all.</p>
          <p>There’s also a statutory rule worth knowing: under <Ext href={`${HS_711}#711.0381`}>§ 711.0381(d)</Ext>, interment rights that were conveyed collectively — a family block of six, say — may not be divided on resale without the cemetery’s consent. So selling two out of six isn’t automatically yours to do.</p>
          <p>And § 711.0381 sets out the paperwork: the conveyance has to name the person on the certificate as seller, plus the purchaser and any broker assisting, and it must be filed and recorded with the cemetery within three business days of the sale.</p>
          <p>There’s one more provision families hit unexpectedly. Under <Ext href={`${HS_711}#711.0395`}>§ 711.0395</Ext>, a cemetery may not make more than one interment in a plot unless each owner consents. If three siblings jointly hold the plots, each burial needs all three to agree.</p>
          <p>The uncomfortable truth is that cemeteries tend to be conservative, because they’re the ones who get sued if a forgotten heir turns up in five years. So they’ll often ask for more signatures than the statute strictly requires. That’s their risk management, not a statement of law — but arguing with them rarely pays.</p>
          <div className="not-prose mt-9 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {[['1','Confirm the cemetery record','Ask whose name appears on the controlling record and whether every space is unused.'],['2','Ask for its transfer rules','Get its forms, fee, right-of-first-refusal terms and buyer restrictions.'],['3','Identify every required signer','Compare the owner’s burial location, spouse, will and heirs with the cemetery’s requirements.'],['4','Record the completed transfer','The sale is not finished until the cemetery accepts and records the conveyance.']].map(([n,t,d])=><div key={n} className="bg-card p-6"><span className="text-[10px] font-bold tracking-[0.2em] text-primary">STEP {n}</span><h3 className="mt-3 font-display text-xl text-foreground">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p></div>)}
          </div>
        </Section>

        <Section id="file" num="VI" eyebrow="Before anyone signs" title="Get someone to look at your actual file">
          <p>If you’ve read this far, you’ve probably noticed something uncomfortable: a single plot worth a few thousand dollars can generate a genuinely complicated legal question.</p>
          <p>Three overlapping authorities, a statute that inverts the marital property rules you thought you knew, a signature list that flips depending on where the deceased is buried, and a cemetery with its own view of all of it.</p>
          <p>And everything in this article is the general shape of the law. Your situation turns on particulars that no article can anticipate — exactly how the names read on the certificate, whether there’s a will with an express reference to the plot, whether a child predeceased, whether the plots were conveyed as a block, and what your specific cemetery requires.</p>
          <div className="not-prose my-8 rounded-lg border border-border bg-card p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Bring these first</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {['Certificate of ownership or deed','Owner’s death certificate','Will or recorded declaration, if any','Names of spouse, children and deceased children','Cemetery correspondence and forms','Any prior transfer or waiver documents'].map((x)=><div key={x} className="flex items-start gap-3 text-sm text-foreground/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><span>{x}</span></div>)}
            </div>
          </div>
          <p>So the right next step isn’t more reading. It’s putting the actual documents in front of someone who does this work.</p>
          <p>A Texas probate or estates attorney is the right call if there’s any disagreement in the family, if a spouse or heir won’t sign, if the heir list is complicated by remarriages or predeceased children, or if there’s meaningful money involved. An hour of proper advice costs less than a defective conveyance, and far less than litigation among relatives.</p>
          <p>A cemetery broker with real experience is often the better and cheaper first call when the family agrees and you simply want the transfer done. A good broker has dealt with your particular cemetery before, knows its forms and its quirks, and will frequently know its rules better than the statute does. They’ll tell you promptly whether your situation is routine or whether it needs a lawyer.</p>
          <p>Either way, the cost of asking is small and the cost of getting it wrong is not. Cemetery plots are one of those rare assets where the paperwork outlives everyone involved — which is exactly why it’s worth getting right the first time.</p>
        </Section>

        <section className="relative my-8 overflow-hidden rounded-lg border border-primary/20 bg-primary/10 px-7 py-9 text-foreground md:px-10 md:py-11">
          <img src={transferBotanical} alt="" aria-hidden width={1024} height={1024} loading="lazy" className="pointer-events-none absolute -bottom-16 -right-10 w-64 opacity-20" />
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative"><ShieldCheck className="h-7 w-7 text-primary"/><h2 className="mt-4 font-display text-3xl md:text-4xl">Get help from a cemetery broker.</h2><p className="mt-4 max-w-2xl leading-relaxed text-foreground/70">If the family agrees and the goal is a clean sale, we can check the cemetery record, identify the likely signers and explain the transfer requirements before you commit to anything.</p></div>
            <Link to="/sell" className="relative inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">Work through your file <ArrowRight className="h-4 w-4"/></Link>
          </div>
        </section>

        <Section id="faq" num="VII" eyebrow="Common questions" title="Texas cemetery plot inheritance FAQs">
          <div className="not-prose divide-y divide-border border-y border-border">
            {faqs.map((f)=><details key={f.q} className="group py-5"><summary className="cursor-pointer list-none pr-8 font-display text-xl text-foreground marker:hidden">{f.q}</summary><p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/70">{f.a}</p></details>)}
          </div>
        </Section>

        <aside className="mb-16 border-t border-border pt-7 text-xs leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">Educational information only.</strong> This guide is general information, not legal advice. Texas statutes can change, and a cemetery may impose additional requirements. Review the current law through the official Texas statutes links above and consult a licensed Texas probate or estates attorney about your facts.</p>
        </aside>
      </article>
    </main>
    <Footer />
  </div>
);

export default GuideCemeteryTransferProcess;
