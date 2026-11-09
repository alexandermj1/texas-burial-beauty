import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import teamPhoto from "@/assets/team/tcb-plot-walkthrough-v2.jpg.asset.json";

export const BROKER_GUIDE_SEO = {
  title: "What Does a Cemetery Broker Do? | Texas Family Guide",
  description: "How a cemetery broker helps families buy and sell plots, checks ownership, finds buyers and coordinates paperwork—and how that differs from a funeral director.",
};
const PATH = "/guides/what-does-a-cemetery-broker-do";
const SITE = "https://texascemeterybrokers.com";
const chapters = [
  { id: "roles", title: "The broker, the cemetery and the funeral director", paragraphs: [
    "Cemetery brokers help people buy and sell cemetery property: graves, cremation niches, mausoleum crypts and urn spaces. Ultimately, they work for families. The name can be confusing, because ‘cemetery broker’ sounds like someone who sells cemeteries. It is the property within the cemetery that is being bought or sold, not the cemetery itself.",
    "The cemetery sells its own spaces, maintains the grounds and keeps the ownership records. A funeral director handles the funeral service and arrangements. The broker brings a buyer and seller together when a family has a space it no longer needs, or wants to buy on the secondary market. Each has a different job, and a transaction may involve all three.",
  ] },
  { id: "seller", title: "On the seller’s side: first understand the property", paragraphs: [
    "When a seller makes an inquiry, the first step is to value and evaluate the property. That means looking at the records, identifying the cemetery and section, checking the type of space and how many interments it permits. Even the particular position within a lawn can matter.",
    "The broker also checks whether the right people are represented. A living original owner with a deed is a different situation from spaces inherited through several generations. The cemetery’s records, the family circumstances and its transfer requirements help establish who has authority to sell and which signatures are needed.",
    "Texas Cemetery Brokers explains what the process involves, gathers the paperwork and gives a realistic resale valuation. The question is not simply what the cemetery asks for a new space: it is what a buyer may pay for this property on the resale market, and what the seller may receive after the applicable fees. A valuation is not a guaranteed sale or a promised deadline.",
  ] },
  { id: "buyer", title: "On the buyer’s side: find a place that fits", paragraphs: [
    "Some buyers are looking near a family member already buried in a particular section. Others are planning ahead and want time to choose a setting that suits them. A broker helps locate suitable spaces and checks the property records rather than assuming that a description or photograph tells the whole story.",
    "A beautiful view can matter, but so can a level route, proximity to a road or whether someone using a wheelchair can visit comfortably. A niche, ground plot and mausoleum crypt feel different and have different capacities and rules. The right place is personal; a family should not be pressed to buy the first space it sees.",
    "Many people do not know there is a resale market. It offers another option to compare with the cemetery’s own inventory and may include privately owned spaces in a section the cemetery has sold out. Availability must still be confirmed. Compare the complete purchase price, transfer charges and any separate burial services—not just a headline saving.",
  ] },
  { id: "paperwork", title: "Much of the work happens between conversations", paragraphs: [
    "The daily work involves diligent paperwork, double-checking and communication with sellers, buyers, cemetery offices, funeral directors and mortuaries. Organizing the documents before a buyer is ready helps avoid discovering a missing signature at the point of transfer.",
    "A lost deed does not automatically mean a space cannot be sold. It does mean that the ownership and authority need to be demonstrated through evidence the cemetery accepts. A digital copy may help with an initial review; physical originals must still be supplied where required. The cemetery is being precise to protect the people on both sides of the sale.",
    "A broker cannot substitute for an owner’s required consent or settle an inheritance dispute. If relatives disagree, or the legal position is uncertain, a Texas probate or estates attorney may be needed. General guidance is not a legal determination for an individual family.",
  ] },
  { id: "choosing", title: "What to ask before choosing a broker", paragraphs: [
    "Ask how the property will reach buyers, what work is included, what the fees are and what evidence there is of completed transactions. A large promised return is not enough on its own: the property still has to sell. A realistic valuation, a clear process and actual buyer reach are more useful than the most flattering number.",
    "Finding an old deed can bring grief, confusion or guilt as well as practical questions. Texas Cemetery Brokers can explain the options without deciding for the family. Owners can take time to talk with the other people involved. The broker’s job is to help with an informed decision and the work that follows, not to pressure anyone into it.",
  ] },
];

export default function GuideCemeteryBroker() {
  return <div className="flex min-h-screen flex-col bg-background">
    <Seo {...BROKER_GUIDE_SEO} path={PATH} type="article" jsonLd={[
      { "@context": "https://schema.org", "@type": "Article", headline: "What does a cemetery broker actually do?", description: BROKER_GUIDE_SEO.description, mainEntityOfPage: `${SITE}${PATH}`, datePublished: "2026-11-09", dateModified: "2026-11-09", author: { "@type": "Organization", name: "Texas Cemetery Brokers" }, contributor: { "@type": "Person", name: "Emma MacLaren" }, publisher: { "@type": "Organization", name: "Texas Cemetery Brokers" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE }, { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` }, { "@type": "ListItem", position: 3, name: "What does a cemetery broker do?", item: `${SITE}${PATH}` }] },
    ]} />
    <Navbar forceScrolled />
    <main data-emma-editorial="broker-guide" className="mx-auto w-full max-w-6xl px-6 pb-14 pt-28 lg:px-10">
      <Button asChild variant="link" className="mb-7 h-auto px-0"><Link to="/guides"><ArrowLeft className="mr-2 h-4 w-4" />All guides</Link></Button>
      <header className="mb-8">
        <p className="mb-4 text-xs font-semibold uppercase text-accent">The brokerage edition · Texas families</p>
        <h1 data-simon-review className="max-w-4xl font-display text-4xl leading-tight text-foreground sm:text-6xl">What does a cemetery broker actually do?</h1>
        <p data-simon-review className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">A cemetery broker helps families buy and sell property within a cemetery, checks the ownership, finds the right buyer and coordinates the transfer. It is a different role from maintaining a cemetery or arranging a funeral.</p>
        <p className="mt-5 text-xs text-muted-foreground">Texas Cemetery Brokers · Based on Emma MacLaren’s brokerage commentary · November 2026</p>
      </header>
      <figure className="mb-9"><img src={teamPhoto.url} alt="Texas Cemetery Brokers team member walking the cemetery grounds" width={1536} height={1024} className="aspect-[16/9] w-full rounded-lg object-cover sm:aspect-[5/2]" /><figcaption className="mt-3 text-xs text-muted-foreground">Understanding the location is part of the work, alongside the ownership and paperwork.</figcaption></figure>
      <nav aria-label="Guide chapters" className="mb-8 flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-5 text-sm text-primary">{chapters.map((chapter) => <a className="underline underline-offset-4" key={chapter.id} href={`#${chapter.id}`}>{chapter.title}</a>)}</nav>
      <article>{chapters.map((chapter) => <section id={chapter.id} key={chapter.id} className="scroll-mt-28 border-b border-border py-8 md:py-10"><h2 data-simon-review className="mb-5 font-display text-3xl leading-tight text-foreground md:text-4xl">{chapter.title}</h2><div className="space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">{chapter.paragraphs.map((paragraph) => <p data-simon-review key={paragraph}>{paragraph}</p>)}</div></section>)}</article>
      <section className="pt-9"><h2 className="mb-5 font-display text-3xl text-foreground">The next step depends on the family.</h2><div className="flex flex-wrap gap-3"><Button asChild><Link to="/sell">Request a free valuation<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link to="/buy">Find a resting place</Link></Button></div><div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-primary"><Link className="underline underline-offset-4" to="/sell-cemetery-plot-texas">Selling a cemetery plot in Texas</Link><Link className="underline underline-offset-4" to="/cemetery-transfer-process-texas">Ownership and transfer requirements</Link><Link className="underline underline-offset-4" to="/cemetery-plot-cost-texas">Compare purchase costs</Link></div></section>
    </main>
    <Footer />
  </div>;
}