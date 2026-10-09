import { Link } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, MapPin, ShieldCheck, Receipt, Clock, FileText, TrendingUp, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import PlotResaleCalculator from "@/components/PlotResaleCalculator";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import transferBotanical from "@/assets/transfer-guide-botanical.png";
import { PlotWorthLocalContext, PlotWorthGroundsPhoto, PlotWorthTeamPerspective, PlotWorthEstimatePath } from "@/components/guides/PlotWorthEditorial";

const PATH = "/what-is-my-cemetery-plot-worth-texas";
const SITE = "https://texascemeterybrokers.com";
const TITLE = "What Is My Cemetery Plot Worth in Texas?";
const DESCRIPTION = "Estimate your Texas cemetery plot's resale value, compare broker and private-sale timelines, and understand pricing, fees and your next step.";
const FAQS = [
  { q: "What is my cemetery plot worth in Texas?", a: "Its resale value depends on the cemetery, garden or section, property type, number of spaces and current demand. There is no useful single statewide figure. Use the calculator for an indicative range, then request a free broker valuation of your exact property before choosing a sale price." },
  { q: "Is the calculator amount what I will receive?", a: "Not necessarily. The calculator shows an estimated resale value, not a binding quote or guaranteed net proceeds. Your written quote should explain the property price, cemetery transfer fee, seller fee and what you would receive. Confirm those figures before agreeing to sell." },
  { q: "How accurate is a cemetery plot value estimate?", a: "An automated range cannot confirm the exact deed, ownership, transfer eligibility or final buyer demand. The confidence score and uncertainty percentage are indicative, not independently verified measures of prediction accuracy. A broker reviewing the specific property can give a more useful valuation." },
  { q: "Do cemetery plots increase in value?", a: "A higher cemetery price does not guarantee a higher resale price. Availability in the specific section and buyer demand matter, as do transfer costs and competing spaces. Do not assume your plot has appreciated simply because the cemetery now charges more." },
  { q: "Can I sell an inherited cemetery plot?", a: "It may be possible, but the ownership and required signatures must be established first. A value estimate does not prove your authority to sell. If a deed owner has died, the family relationships and cemetery requirements determine the paperwork needed." },
  { q: "Will the cemetery buy my plot back?", a: "Buy-back policies vary. Ask the cemetery whether it accepts returns, what it would pay and whether any fees apply. Compare an actual written buy-back offer with your resale options rather than assuming it will pay today's advertised price." },
];
const READS = [
  { href: "/cemetery-plot-cost-texas", icon: Receipt, title: "Understand the price", detail: "Cemetery pricing, resale and the fees that affect a sale." },
  { href: "/sell-cemetery-plot-texas", icon: TrendingUp, title: "Plan your sale", detail: "The selling process, marketing and what happens next." },
  { href: "/cemetery-transfer-process-texas", icon: FileText, title: "Check ownership", detail: "Inherited plots, required signatures and transfer paperwork." },
];

function Chapter({ id, icon: Icon, title, children }: { id: string; icon: typeof MapPin; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-28 border-t border-border py-10 md:py-12">
    <div className="flex items-center gap-3 mb-5"><Icon className="w-6 h-6 text-primary shrink-0" /><h2 className="font-display text-3xl md:text-4xl leading-tight">{title}</h2></div>
    <div className="space-y-5 text-base sm:text-lg leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">{children}</div>
  </section>;
}

export default function GuideCemeteryPlotWorth() {
  return <MotionConfig reducedMotion="user"><div className="min-h-screen bg-background text-foreground">
    <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="article" jsonLd={[
      { "@context": "https://schema.org", "@type": "Article", headline: TITLE, description: DESCRIPTION, mainEntityOfPage: `${SITE}${PATH}`, datePublished: "2026-10-09", dateModified: "2026-10-09", inLanguage: "en-US", author: { "@type": "Organization", name: "Texas Cemetery Brokers", url: SITE }, publisher: { "@type": "Organization", name: "Texas Cemetery Brokers", url: SITE } },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE }, { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` }, { "@type": "ListItem", position: 3, name: TITLE, item: `${SITE}${PATH}` }] },
    ]} />
    <Navbar forceScrolled />
    <header className="relative overflow-hidden bg-sage-light border-b border-border pt-24 md:pt-28 pb-8 md:pb-10">
      <img src={transferBotanical} alt="" aria-hidden width={1024} height={1024} className="absolute -right-28 -top-12 w-[440px] md:w-[600px] opacity-20 pointer-events-none" />
      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-10">
        <Link to="/guides" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-primary"><ArrowLeft className="w-4 h-4" /> All guides</Link>
        <p className="text-xs font-medium text-primary mb-4">The Valuation Edition · Texas</p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight max-w-4xl">What is my cemetery plot worth <span className="text-primary">in Texas?</span></h1>
        <p className="mt-5 text-base sm:text-lg leading-relaxed max-w-3xl text-muted-foreground">Your plot’s value is local, not a statewide average. Start with an estimated resale range, then understand what could change it before you decide to sell.</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span>By Texas Cemetery Brokers · Updated October 9, 2026</span><Link to="/team" className="text-primary hover:underline">Meet our team</Link></div>
      </div>
    </header>
    <main className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-10">
      <nav aria-label="In this article" className="flex flex-wrap gap-x-6 gap-y-3 py-5 border-b border-border text-sm text-primary">
        <a href="#plot-value-calculator" className="hover:underline">Estimate your value</a><a href="#reading-estimate" className="hover:underline">Understand the result</a><a href="#local-context" className="hover:underline">Explore your cemetery</a><a href="#ownership" className="hover:underline">Inherited plots</a><a href="#next-step" className="hover:underline">Get a written quote</a><a href="#questions" className="hover:underline">Common questions</a>
      </nav>
      <section aria-label="Cemetery plot resale estimate" className="pt-7 pb-8 md:pt-9 md:pb-10"><PlotResaleCalculator heading="Estimate your plot’s resale value" /><p className="mt-4 text-sm text-muted-foreground leading-relaxed">An estimate for planning, not a binding offer. Your exact spaces, ownership and fees need a separate review. <a href="#reading-estimate" className="text-primary underline underline-offset-4">What does the confidence score mean?</a></p></section>
      <PlotWorthGroundsPhoto />
      <article>
        <PlotWorthEstimatePath />
        <Chapter id="value-factors" icon={MapPin} title="What actually makes your plot valuable?">
          <p><strong>The cemetery and exact location are the starting point.</strong> A burial space in Dallas–Fort Worth is not interchangeable with one in Houston, Austin or San Antonio. Even inside the same cemetery, two gardens can appeal to different buyers.</p>
          <div className="divide-y divide-border">
            {[
              ["Garden, section and position", "The exact garden, lot and space numbers matter. Access, surroundings and the type of memorial permitted can affect whether a buyer wants that particular space."],
              ["Property type and capacity", "A burial plot, lawn crypt, mausoleum crypt and cremation niche are different products. The deed and cemetery records should confirm what rights and capacity are included."],
              ["Adjacent spaces", "Two spaces beside each other can suit a couple or family. Two spaces in separate sections may need different buyers; multiplying a one-space figure cannot capture every situation."],
              ["Availability and demand", "A section with limited availability can be attractive, but scarcity alone is not a promise of a quick sale. There still needs to be a buyer for that cemetery and location."],
            ].map(([title, copy]) => <div key={title} className="py-5"><h3 className="font-body text-lg font-medium text-foreground mb-2">{title}</h3><p>{copy}</p></div>)}
          </div>
          <p>Find local context in our <Link to="/cemeteries">Texas cemetery directory</Link>, or read the <Link to="/cemetery-plot-cost-texas">cemetery plot cost guide</Link> for the difference between a cemetery’s pricing and a resale value.</p>
        </Chapter>
        <Chapter id="reading-estimate" icon={ShieldCheck} title="Read the range, not just the headline number">
          <p>The calculator gives a broker-resale estimate and a private-sale estimate for the details you enter. It is a starting point for planning, <strong>not an offer, an appraisal or a guaranteed sale price.</strong></p>
          <p>The range matters more than the midpoint. Your exact section, transfer costs and buyer demand can move the outcome. If you know the garden or section, include it; if you do not, leave it blank rather than guess. A broker can confirm the description against your deed.</p>
          <p><strong>A confidence score is not a percentage chance of selling.</strong> The score and uncertainty percentage are indicative signals from the estimator, not independently verified accuracy statistics. A high score does not guarantee a buyer or a final price.</p>
          <h3 className="font-body text-xl font-medium text-foreground">Resale value is not automatically your net proceeds</h3>
          <p>Cemetery transfer fees and the seller’s agreed fees affect what you receive. Do not subtract a guessed fee from the estimate: ask for a written quote showing the property price, transfer fee, seller fee and net proceeds. Our <Link to="/cemetery-plot-cost-texas">pricing and fees guide</Link> explains the categories to check.</p>
        </Chapter>
        <PlotWorthTeamPerspective />
        <Chapter id="selling-time" icon={Clock} title="Value and time to sell belong together">
          <p>The calculator displays a broad broker-sale timeline of <strong>1 month to 2 years</strong> and a private-sale planning average of <strong>5–7 years</strong>. These are illustrative planning assumptions, not independently verified averages or a promise for your plot. Some properties can take longer or may not sell.</p>
          <p>A private seller needs to find a buyer, answer questions, agree payment arrangements and coordinate the cemetery’s transfer requirements. A broker handles marketing, buyer enquiries and the sale process, but cannot remove the need for demand or complete paperwork.</p>
          <p>Before choosing a price, decide how much waiting you are comfortable with and what work you want to handle yourself. Read <Link to="/sell-cemetery-plot-texas">how to sell a cemetery plot in Texas</Link> for the process behind the number.</p>
        </Chapter>
        <PlotWorthLocalContext />
        <Chapter id="ownership" icon={FileText} title="An inherited plot can have value before it is ready to sell">
          <p>If a deed owner has died, a calculator can still help you consider your options. It cannot establish who owns the rights or who must sign. Those questions need to be resolved before a sale can complete.</p>
          <p>Keep the deed and any relevant family information. Do not assume the person holding the paperwork is the only person who needs to agree. Our <Link to="/cemetery-transfer-process-texas">inherited cemetery plot and transfer guide</Link> explains why family relationships, signatures and cemetery records matter.</p>
          <p>You do not need to guess which documents to obtain before asking for a valuation. Start with the property details you have; the team can review your specific situation and explain the next step.</p>
        </Chapter>
        <Chapter id="next-step" icon={TrendingUp} title="Turn an estimate into a written valuation">
          <p>For a more accurate quote, send the exact cemetery name and location being sold. A clear copy or photograph of the deed helps the team check the description rather than rely on a remembered garden name.</p>
          <ul className="space-y-3">
            {["Cemetery name and city", "Garden or section, lot and space numbers", "Property type and number of spaces", "Whether the spaces are together", "A deed copy, if available, and whether any named owner has died"].map(item => <li key={item} className="flex gap-3 items-start"><Check className="w-5 h-5 text-primary shrink-0 mt-1" /><span>{item}</span></li>)}
          </ul>
          <p>Keep any original documents safe. Your quote should make the sale price and expected proceeds clear; asking for a valuation does not turn the calculator estimate into a binding agreement.</p>
          <Button asChild size="lg" className="rounded-xl w-full sm:w-auto"><Link to="/sell">Get my free broker valuation <ArrowRight className="w-4 h-4" /></Link></Button>
        </Chapter>
        <section id="questions" className="scroll-mt-28 border-t border-border py-10 md:py-12">
          <h2 className="font-display text-3xl md:text-4xl mb-6">Cemetery plot value: common questions</h2>
          <Accordion type="single" collapsible>{FAQS.map(({ q, a }, i) => <AccordionItem key={q} value={`question-${i}`}><AccordionTrigger className="text-left text-base sm:text-lg">{q}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground leading-relaxed">{a}</AccordionContent></AccordionItem>)}</Accordion>
        </section>
      </article>
      <section className="border-t border-border py-10 md:py-12" aria-labelledby="related-reading">
        <div className="flex items-center gap-3 mb-6"><BookOpen className="w-6 h-6 text-primary" /><h2 id="related-reading" className="font-display text-3xl">Your next read</h2></div>
        <div className="divide-y divide-border">{READS.map(({ href, icon: Icon, title, detail }) => <Button key={href} asChild variant="ghost" className="w-full h-auto py-5 px-0 rounded-none justify-start whitespace-normal text-left hover:bg-transparent hover:text-primary"><Link to={href}><Icon className="w-5 h-5 shrink-0 text-primary" /><span className="flex-1 min-w-0"><span className="block text-base font-medium">{title}</span><span className="block text-sm font-normal text-muted-foreground mt-1">{detail}</span></span><ArrowRight className="w-5 h-5 shrink-0" /></Link></Button>)}</div>
      </section>
    </main>
    <Footer />
  </div></MotionConfig>;
}