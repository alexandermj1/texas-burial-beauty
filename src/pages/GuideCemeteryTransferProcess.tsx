import { ArrowLeft, ArrowRight, Building2, CheckCircle2, FileText, Phone, Scale, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import PlotResaleCalculator from "@/components/PlotResaleCalculator";
import CemeteryTransferDirectory from "@/components/guides/CemeteryTransferDirectory";
import TransferIllustratedNavigation from "@/components/guides/TransferIllustratedNavigation";
import { Button } from "@/components/ui/button";
import { TRANSFER_GUIDE_SEO } from "@/data/publicSeoUpgrades";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import transferBotanical from "@/assets/transfer-guide-botanical.png";
import restlandLawn from "@/assets/restland/restland-hero-lawn.jpg.asset.json";
import resthavenOakPath from "@/assets/resthaven/resthaven-oak-path.jpg.asset.json";

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

const Section = ({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode }) => (
  <section id={id} className="relative scroll-mt-28 border-t border-foreground/20 py-9 md:py-11">
    <div className="relative">
      <div className="mb-6"><p className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        <span className="h-px w-10 bg-primary/40" />{eyebrow}
      </p>
      <div className="flex items-center gap-6"><h2 className="font-display text-3xl leading-[1.08] text-foreground md:text-5xl">{title}</h2><span aria-hidden="true" className="hidden h-px min-w-12 flex-1 bg-foreground/15 md:block" /></div></div>
      <div className="min-w-0 text-base text-foreground/80 [&_p]:mb-4 [&_p]:leading-[1.75] [&_li]:leading-relaxed [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&>p:last-child]:mb-0">{children}</div>
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
    headline: "How to transfer your cemetery plot in Texas",
    description: TRANSFER_GUIDE_SEO.description,
    mainEntityOfPage: FULL, url: FULL, inLanguage: "en-US",
    dateModified: "2026-10-17",
    author: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    publisher: { "@type": "Organization", name: "Texas Cemetery Brokers", url: `${SITE}/` },
    about: ["Texas cemetery plot inheritance", "Cemetery plot transfer", "Right of sepulture", "Texas heirship", "Recorded cemetery transfer fees", "Texas cemetery addresses"],
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
  <div className="flex min-h-screen flex-col bg-sand-light [&>footer]:mt-auto">
    <Seo {...TRANSFER_GUIDE_SEO} path={PATH} type="article" jsonLd={jsonLd} />
    <Navbar forceScrolled />

    <header className="relative overflow-hidden pb-10 pt-24 md:pb-14 md:pt-28">
      <img src={bananaLeaf.url} alt="" aria-hidden onError={(event) => event.currentTarget.classList.add("invisible")} width={1024} height={1024} className="pointer-events-none absolute -left-60 top-24 hidden w-[28rem] -rotate-12 opacity-10 md:block" />
      <img src={palmFan.url} alt="" aria-hidden onError={(event) => event.currentTarget.classList.add("invisible")} width={1024} height={1024} className="pointer-events-none absolute -right-44 top-24 hidden w-[26rem] rotate-6 opacity-10 lg:block" />
      <img src={hibiscusCoral.url} alt="" aria-hidden onError={(event) => event.currentTarget.classList.add("invisible")} width={1024} height={1024} className="pointer-events-none absolute right-[3%] top-24 hidden w-24 rotate-6 opacity-80 md:block" />
      <div className="container relative mx-auto px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-x-6 gap-y-8 md:gap-y-10">
          <div className="col-span-12">
            <Button asChild variant="link" className="h-auto p-0 text-xs text-muted-foreground"><Link to="/guides"><ArrowLeft className="mr-2 h-3.5 w-3.5" />All guides</Link></Button>
          </div>
          <div className="col-span-12 text-left lg:text-center">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-accent">A guide for Texas families · Ownership & transfers</p>
            <h1 className="font-display text-[2.5rem] leading-[0.95] text-foreground sm:text-6xl md:text-7xl lg:text-8xl xl:text-[7.5rem]">
              <span className="block">How to transfer</span><span className="block">your <span className="font-medium italic text-primary">cemetery</span> plot.</span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-5 lg:col-start-2">
            <p className="text-base font-light leading-relaxed text-foreground/80 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-6xl first-letter:leading-none first-letter:text-primary md:text-lg">This guide will ensure that you have all the information you need to transfer your cemetery property in accordance with Texas cemetery law, inheritance law and cemetery rules. It also guides you on how to make the process as seamless and cost-efficient as possible, from our experience as a cemetery broker.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"><span>By Texas Cemetery Brokers</span><span className="h-px w-8 bg-foreground/20" /><span>October 2026</span></div>
          </div>
          <aside className="col-span-12 border-l border-foreground/20 pl-6 md:col-span-6 lg:col-span-4 lg:col-start-8">
            <p className="font-display text-2xl italic leading-snug text-foreground/85">The deed. The family. The cemetery.<br />A clear transfer starts with all three.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3"><Button asChild size="sm"><Link to="/sell">Review my plot <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="link" size="sm" className="px-0"><a href="tel:+12142304740"><Phone className="mr-2 h-3.5 w-3.5" />(214) 230-4740</a></Button></div>
          </aside>
          
        </div>
      </div>
    </header>

    <main>
      <div className="container mx-auto max-w-[1328px] px-6 pb-10"><TransferIllustratedNavigation /></div>
      <article className="container mx-auto max-w-[1328px] px-6 pb-12">
        <nav aria-label="Guide chapters" className="flex flex-wrap gap-x-6 gap-y-3 border-b border-foreground/20 pb-8 text-xs text-muted-foreground">
          {[['transfer-timing','Appointments & timing'],['save-on-fees','Save on fees'],['cemetery-transfer-fees','Fees & addresses'],['nature','The deed'],['owner-buried','Who signs?'],['faq','Questions']].map(([id,label]) => <a key={id} href={`#${id}`} className="border-b border-primary/25 py-2 transition-colors hover:text-primary">{label}</a>)}
        </nav>

        <section id="transfer-timing" className="scroll-mt-28 border-b border-foreground/20 py-9 md:py-11">
          <div className="space-y-5">
            <div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Plan the appointment</p><h2 className="font-display text-4xl leading-[1.08] text-foreground md:text-6xl">When do you <span className="italic text-primary">need the space?</span></h2></div>
            <p className="text-base leading-relaxed text-muted-foreground">An immediate need following a death and a transfer arranged ahead of time follow different schedules. Call the cemetery first: its availability, paperwork and appointment rules determine the timing.</p>
          </div>
          <div className="mt-7 grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="border-t border-primary/30 pt-6"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">At need · Following a death</p><p className="mt-4 font-display text-5xl text-foreground md:text-6xl">1–2 <span className="text-3xl italic">days</span></p><h3 className="mt-5 font-display text-2xl text-foreground">Usually a quicker transfer.</h3><p className="mt-3 leading-relaxed text-muted-foreground">At-need cemetery transfers can usually be completed within one or two days, and sometimes you do not even need an appointment. Call the cemetery first to check its requirements and whether the documents are ready.</p></div>
            <div className="border-t border-accent/30 pt-6"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Planning ahead · No immediate need</p><p className="mt-4 font-display text-5xl text-foreground md:text-6xl">2 weeks <span className="text-3xl italic">to a month</span></p><h3 className="mt-5 font-display text-2xl text-foreground">Book an appointment in advance.</h3><p className="mt-3 leading-relaxed text-muted-foreground">When the buyer does not need to use the space immediately following a death, an advance appointment with the cemetery is required. In Texas Cemetery Brokers’ experience, you can typically expect an appointment in two weeks to a month; at busier cemeteries, the wait can sometimes be upwards of a month.</p></div>
          </div>
          <p className="mt-7 text-xs leading-relaxed text-muted-foreground">These are typical experiences, not guaranteed deadlines. Cemetery availability and the completeness of the ownership documents can affect the schedule.</p>
        </section>

        <Section id="save-on-fees" eyebrow="A little planning can save money" title={<>One deed. One transfer. <span className="italic text-primary">Fewer repeat fees.</span></>}>
          <p>Families are often shocked by the size of transfer fees, sometimes being in the thousands. Many ask us if there is any way they can get out of paying the fee or get a reduction, particularly for plots bought a long time ago, where the fee can now be larger than the price paid for the plot.</p>
          <p>Unfortunately, these fees are almost never waived in our experience. Most cemeteries we work with consider it unfair and discriminatory to waive the fee for some customers and not others.</p>
          <p>Because of this, our advice is that if you wish to save money on a cemetery property transfer, you ensure that you transfer all the plots on the deed at the same time. While you generally cannot avoid paying the fee at least once, you can reduce the number of times you pay it where the cemetery charges per deed or per transfer.</p>
          <p>Confirm the fee basis with the cemetery first: some cemeteries charge per space, so transferring everything together may not reduce that charge. The cemetery must also agree to the transfer and any division of collectively conveyed spaces.</p>
        </Section>

        <CemeteryTransferDirectory />


        <div className="relative my-10 overflow-hidden border-y border-primary/20 py-8 md:py-10">
          <img src={transferBotanical} alt="" aria-hidden onError={(event) => event.currentTarget.classList.add("invisible")} width={1024} height={1024} loading="lazy" className="pointer-events-none absolute -right-24 -top-28 w-72 opacity-[0.18]" />
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

        <Section id="nature" eyebrow="The nature of the interest" title="A cemetery plot is not the same as a real estate deed">
          <p>When you own a deed to a cemetery plot, you don’t own the land. Instead, you own the <strong>right of burial</strong> in that particular piece of land. This difference creates a unique situation and is why cemetery property often has its own laws governing its use and ownership in Texas and across the United States.</p>
          <p>In court disputes over these rights, the right of burial has been described as something closer to a licence or an easement than a real estate deed.</p>
          <p>In terms of how this affects a cemetery plot owner, it means that ownership records are generally not kept by the county clerk. Instead, these records are kept by the cemetery.</p>
          <p>It also means that a cemetery property owner should be aware of the rules and regulations of their particular cemetery. Alongside applicable law, these rules govern how their burial rights can be used and transferred, and there is much more latitude for the cemetery to impose its own rules than property owners are often aware.</p>
          <div className="not-prose mt-8 grid border-y border-foreground/20 md:grid-cols-2">
            <div className="bg-card p-6"><FileText className="h-6 w-6 text-primary"/><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">The family holds</p><p className="mt-2 font-display text-xl text-foreground">The certificate and supporting papers</p></div>
            <div className="border-t border-border bg-secondary/30 p-6 md:border-l md:border-t-0"><Building2 className="h-6 w-6 text-primary"/><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">The cemetery holds</p><p className="mt-2 font-display text-xl text-foreground">The controlling ownership record</p></div>
          </div>
        </Section>

        <Section id="planning-deeds" eyebrow="Fewer names, simpler paperwork" title={<>Plan the deed <span className="italic text-primary">before you buy.</span></>}>
          <p>It is also our advice that, when purchasing cemetery plots, families put the fewest number of people on the deed as possible, or get separate deeds for separate plots. This way, when it comes to a transfer, there are fewer signers and the transfer is more likely to go through at the cemetery without requiring additional paperwork.</p>
          <p>For example, if you are purchasing three plots for three siblings, instead of asking for one deed and putting all three siblings on it, request three separate deeds with each sibling on their own deed.</p>
          <p>The reasons for doing so are explained further down in the <a href="#sample-scenario" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">diagram of the signatures that are required</a>. Separate deeds do not remove a spouse’s protected burial rights or future inheritance requirements, and the cemetery must approve how the plots are deeded. Ask about any additional deed or transfer charges before deciding.</p>
        </Section>

        <Section id="health-code" eyebrow="Authority one" title="The Texas Health and Safety Code">
          <p>Chapter 711 of the Health and Safety Code is where cemetery plots live, and <Ext href={`${HS_711}#711.039`}>§ 711.039</Ext> is the section that decides almost everything. It’s worth knowing what’s in it, because several of its rules will surprise you.</p>
          <h3>Surprise one: it’s separate property</h3>
          <p>Subsection (a) says a plot is presumed to be the separate property of whoever is named as grantee on the certificate.</p>
          <p>If you know anything about Texas marital property, that should raise an eyebrow. Normally, assets acquired during a marriage with marital money are community property, and community property passes entirely to the surviving spouse when the couple’s children are all children of both spouses. That’s the rule most families expect.</p>
          <p>Cemetery plots don’t follow it. The statute carves them out. Which means a surviving spouse who assumed the plots were simply hers now finds the children have an interest too.</p>
          <h3>Surprise two: the spouse has a right nobody can take away</h3>
          <p>Subsection (b) gives the spouse of the plot owner a <strong>vested right of interment</strong> — a right to actually be buried there. It attaches while they’re married, or if they’re married when the owner dies.</p>
          <p>And subsection (c) puts teeth in it: an attempted conveyance or other action without the spouse’s joinder or written, attached consent doesn’t divest that right. So if the children sell the plots out from under the widow, the buyer takes the plots subject to her right to be buried in one. Which is exactly the kind of mess nobody wants to discover later.</p>
          <p>That right ends in only two ways, under subsection (d): a final divorce decree, unless the decree says otherwise, or the spouse being buried somewhere else.</p>
          <div className="not-prose mt-8 border-l-2 border-accent/40 pl-6">
            <p className="font-semibold text-foreground">A burial right is not exactly the same thing as ownership.</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">The spouse’s protected right can remain attached even when ownership interests pass to heirs. That distinction is one reason a transfer needs careful document review.</p>
          </div>
        </Section>

        <section id="owner-buried" className="scroll-mt-28 border-t border-border/60 py-12 md:py-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">The single most useful question</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl leading-tight text-foreground md:text-5xl">Is the owner buried in the plot?</h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-foreground/75">This is the question that determines who signs.</p>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            <div className="border-y border-primary/30 py-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">Yes</div>
              <h3 className="mt-5 font-display text-2xl text-foreground">The owner is buried there</h3>
              <p className="mt-4 leading-relaxed text-foreground/75">Subsection (g) applies. Unless there is a specific disposition by express reference to the space in the owner’s will or in a written declaration filed with the cemetery:</p>
              <div className="mt-5 flex items-center gap-3 border-t border-primary/20 pt-5 text-foreground"><Users className="h-5 w-5 text-primary"/><strong>Surviving spouse + heirs-at-law sign together</strong></div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Read that “and” carefully. The widow alone can’t sell. The children alone can’t sell. Everyone signs.</p>
            </div>
            <div className="border-y border-accent/30 py-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">No</div>
              <h3 className="mt-5 font-display text-2xl text-foreground">The owner is not buried there</h3>
              <p className="mt-4 leading-relaxed text-foreground/75">Subsection (h) applies. Absent a specific disposition, the right vests on death in the heirs-at-law and may be conveyed by them:</p>
              <div className="mt-5 flex items-center gap-3 border-t border-accent/20 pt-5 text-foreground"><Users className="h-5 w-5 text-accent"/><strong>The heirs-at-law sign</strong></div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">One grave, niche or crypt remains reserved for the surviving spouse.</p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 border-b border-foreground/20 py-5"><Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary"/><p className="text-sm leading-relaxed text-foreground/75"><strong className="text-foreground">Same family, same plots, different signature list</strong> — depending on where Dad ended up.</p></div>
        </section>

        <Section id="children" eyebrow="Interment rights" title="And the children have their own rights">
          <p>Subsection (e) covers what happens where the owner is buried in the plot and left no specific instructions. One space is reserved for the surviving spouse. And the owner’s children, “in order of need,” may be buried in the remaining spaces without the consent of anyone claiming an interest in the plot.</p>
          <p>“In order of need” is a wonderfully Texan phrase that means, essentially, whoever dies first. It’s not a queue you can jump or reserve.</p>
          <p>The practical effect is that a child can occupy a space over the objections of siblings who wanted to sell it. Which is a good reason to have the family conversation early.</p>
          <h3>Waivers</h3>
          <p>Subsection (f) is the pressure valve. A surviving spouse or a child may waive their right of interment — but only in favour of a relative of the owner or of the owner’s spouse.</p>
          <p>So the widow can pass her reserved space to a grandchild. She cannot waive it in favour of a stranger who wants to buy it. The waiver is a family-facing tool, not a sales tool, and the distinction tells you something about how the legislature viewed these rights.</p>
        </Section>

        <div className="my-4 grid gap-4 sm:grid-cols-2">
          {[{src:resthavenOakPath.url,alt:'Oak-lined path at Resthaven Memorial Park in Texas',name:'The cemetery record is the starting point',caption:'Every transfer begins by confirming exactly how the cemetery has the ownership recorded.'},{src:restlandLawn.url,alt:'The lawn at Restland Memorial Park in Dallas',name:'The cemetery is also the gatekeeper',caption:'Its forms, fees and consent requirements decide what will be accepted and recorded.'}].map((p)=><figure key={p.name} className="overflow-hidden border-b border-foreground/20"><img src={p.src} alt={p.alt} width={1536} height={1024} className="aspect-[16/10] w-full object-cover" loading="lazy"/><figcaption className="py-5"><p className="font-display text-xl text-foreground">{p.name}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.caption}</p></figcaption></figure>)}
        </div>

        <Section id="estates-code" eyebrow="Authority two" title="The Texas Estates Code">
          <p>Notice that § 711.039 keeps using the phrase “heirs-at-law” and never defines it. That’s deliberate — it’s borrowing the definition from elsewhere.</p>
          <p>That elsewhere is <Ext href={`${ES}201.htm`}>Estates Code Chapter 201</Ext>, the intestate succession rules. And because of the separate property presumption we met earlier, you’ll generally be in the separate-property provisions rather than the community property ones — which is precisely why children end up with a share that families don’t expect.</p>
          <p>Working out exactly who the heirs are can require a <Ext href={`${ES}202.htm`}>determination of heirship under Chapter 202</Ext>, or in some cases evidence under <Ext href={`${ES}203.htm`}>Chapter 203</Ext>. A <Ext href={`${ES}205.htm`}>small estate affidavit under Chapter 205</Ext> has specific eligibility rules and is not a universal substitute for probate. Many cemeteries will accept an affidavit rather than making you open a probate, which saves considerable time and money — but that’s their choice, not your right.</p>
          <p>One thing to watch: heirs are determined as of the date of death. If a child predeceased the owner, that child’s own children may step into the slot. Families who assume the list is “Mom and the three of us” sometimes discover it’s actually “Mom, two of us, and four grandchildren scattered across three states.”</p>
          <div className="not-prose my-8 border-l-2 border-primary/30 pl-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">An unsettled corner</p>
            <h3 className="mt-3 font-display text-2xl text-foreground">Real property or personal property?</h3>
            <p className="mt-4 leading-relaxed text-foreground/75">Texas applies different intestacy fractions to real property and personal property. Given that courts describe the right of sepulture as more like an easement or licence than land, there is an argument either way. If the shares matter — usually because the family disagrees — this is a question for a lawyer, not for a blog post.</p>
          </div>
        </Section>

        <section id="sample-scenario" className="relative my-6 scroll-mt-28 overflow-hidden border-y border-foreground/20 py-10 md:py-14">
          <img src={transferBotanical} alt="" aria-hidden onError={(event) => event.currentTarget.classList.add("invisible")} width={1024} height={1024} loading="lazy" className="pointer-events-none absolute -right-14 -top-14 w-64 opacity-20" />
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

        <Section id="cemetery" eyebrow="Authority three" title="The cemetery organization">
          <p data-simon-review>“Always worth checking the cemetery’s transfer policy — the cemetery should willingly give this out,” Simon James advises. “It may have its own forms; sometimes they accept third-party forms.” You can find an affidavit of heirship online, but the cemetery could say no: it wants its own one. Acceptance of a form does not, by itself, settle a disputed inheritance.</p>
          <p>Cemeteries maintain the ownership records, so they’re the gatekeeper. Their rules commonly include transfer fees, approval rights over who can buy, and sometimes a right of first refusal that means they buy it back rather than letting you sell to a third party. Some won’t permit resale to outsiders at all.</p>
          <p>There’s also a statutory rule worth knowing: under <Ext href={`${HS_711}#711.0381`}>§ 711.0381(d)</Ext>, interment rights that were conveyed collectively — a family block of six, say — may not be divided on resale without the cemetery’s consent. So selling two out of six isn’t automatically yours to do.</p>
          <p>And § 711.0381 sets out the paperwork: the conveyance has to name the person on the certificate as seller, plus the purchaser and any broker assisting, and it must be filed and recorded with the cemetery within three business days of the sale.</p>
          <p>There’s one more provision families hit unexpectedly. Under <Ext href={`${HS_711}#711.0395`}>§ 711.0395</Ext>, a cemetery may not make more than one interment in a plot unless each owner consents. If three siblings jointly hold the plots, each burial needs all three to agree.</p>
          <p data-simon-review>That’s especially true in multi-generational situations — grandparents who gave plots to their children, who in turn gave them to their children, and potentially cousins and extended family, relatives living overseas, who may have a claim on these plots. As Simon puts it: “Cemeteries have to be super cautious; they have to get it absolutely right.”</p>
          <p data-simon-review>“In one case I know of, the cemetery requires — if the plot is in the name of a deceased individual — that it be put into a living relative’s name before it can be transferred to a third party.” That is one cemetery’s requirement, not a universal rule. Ask about the steps and administrative fees before starting.</p>
          <div className="not-prose mt-9 grid gap-x-8 gap-y-6 border-y border-foreground/20 py-5 sm:grid-cols-2">
            {[['1','Confirm the cemetery record','Ask whose name appears on the controlling record and whether every space is unused.'],['2','Ask for its transfer rules','Get its forms, fee, right-of-first-refusal terms and buyer restrictions.'],['3','Identify every required signer','Compare the owner’s burial location, spouse, will and heirs with the cemetery’s requirements.'],['4','Record the completed transfer','The sale is not finished until the cemetery accepts and records the conveyance.']].map(([n,t,d])=><div key={n} className="border-t border-foreground/15 py-5"><span className="text-[10px] font-bold tracking-[0.2em] text-primary">STEP {n}</span><h3 className="mt-3 font-display text-xl text-foreground">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p></div>)}
          </div>
        </Section>
        <Section id="file" eyebrow="Before anyone signs" title="Get someone to look at your actual file">
          <p>If you’ve read this far, you’ve probably noticed something uncomfortable: a single plot worth a few thousand dollars can generate a genuinely complicated legal question.</p>
          <p>Three overlapping authorities, a statute that inverts the marital property rules you thought you knew, a signature list that flips depending on where the deceased is buried, and a cemetery with its own view of all of it.</p>
          <p>And everything in this article is the general shape of the law. Your situation turns on particulars that no article can anticipate — exactly how the names read on the certificate, whether there’s a will with an express reference to the plot, whether a child predeceased, whether the plots were conveyed as a block, and what your specific cemetery requires.</p>
          <div className="not-prose my-8 border-y border-foreground/20 py-7">
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

        <section className="my-10 md:my-14" aria-label="Estimate inherited cemetery plot resale value">
          <p className="mb-6 max-w-3xl text-lg leading-relaxed text-foreground/75">Considering selling unused inherited spaces? Get an indicative resale estimate below. Ownership and the cemetery’s transfer requirements still need to be confirmed before a sale.</p>
          <PlotResaleCalculator compact />
        </section>

        <section className="relative my-8 overflow-hidden border-y border-primary/30 py-10 text-foreground md:py-14">
          <img src={transferBotanical} alt="" aria-hidden onError={(event) => event.currentTarget.classList.add("invisible")} width={1024} height={1024} loading="lazy" className="pointer-events-none absolute -bottom-16 -right-10 w-64 opacity-20" />
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative"><ShieldCheck className="h-7 w-7 text-primary"/><h2 className="mt-4 font-display text-3xl md:text-4xl">Get help from a cemetery broker.</h2><p className="mt-4 max-w-2xl leading-relaxed text-foreground/70">If the family agrees and the goal is a clean sale, we can check the cemetery record, identify the likely signers and explain the transfer requirements before you commit to anything.</p></div>
            <Link to="/sell" className="relative inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">Work through your file <ArrowRight className="h-4 w-4"/></Link>
          </div>
        </section>

        <Section id="faq" eyebrow="Common questions" title="Texas cemetery plot inheritance FAQs">
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
