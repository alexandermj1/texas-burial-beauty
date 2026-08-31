import { MapPin, Building2, Layers, Sparkles, TrendingUp, Wallet, Clock3, HeartHandshake, ShieldCheck, Users, type LucideIcon } from "lucide-react";

export const PHONE = "+12142304740";
export const PHONE_DISPLAY = "(214) 230-4740";
export const EMAIL = "info@texascemeterybrokers.com";
const SLUG = "preneed-cemetery-plots-texas";
const URL = `https://www.texascemeterybrokers.com/${SLUG}`;

export const faqs = [
  {
    q: "What is preneed cemetery property?",
    a: "Preneed simply means buying the cemetery property before it is needed, rather than at the time of a death. You choose the cemetery, the section and the type of space calmly, pay today's price, and the property is recorded in your name until it is used.",
  },
  {
    q: "Is it cheaper to buy a cemetery plot in advance?",
    a: "Usually, yes. Cemetery retail prices rise over time and at-need families almost always pay whatever the cemetery is charging on the day. Buying preneed locks in today's price, and buying a resale space preneed is normally cheaper again than buying new from the cemetery office.",
  },
  {
    q: "Can I buy a cemetery plot from the owner instead of the cemetery?",
    a: "Yes. Cemetery property in Texas is the exclusive right of sepulture, and an owner can sell that right to you. The cemetery then records the conveyance and the space becomes yours. Buying by owner is where the savings come from — but the ownership, co-owner consent and transfer paperwork must be verified first, which is exactly what we do before any space is listed.",
  },
  {
    q: "How much do cemetery plots cost in Texas?",
    a: "It varies widely by metro, cemetery and section, and cemeteries add fees on top of the space itself. Resale spaces are typically well below the cemetery's current retail price for a comparable new space. We give you a written figure for the specific cemetery you are asking about.",
  },
  {
    q: "Can I pay for a preneed plot over time?",
    a: "In most cases yes. We offer 0% interest payment plans over up to 24 months on preneed purchases, so a family can secure the property now and spread the cost. Property transfers once the balance is settled.",
  },
  {
    q: "What happens if we move or change our plans?",
    a: "Cemetery property keeps its value and remains sellable. If your plans change, the same brokerage that helped you buy can list the space for resale later — you are not locked in the way many people assume.",
  },
];

export const jsonLd: Record<string, unknown>[] = [
  { "@context": "https://schema.org", "@type": "Article", headline: "Preneed Cemetery Plots in Texas — Buying Before You Need To", mainEntityOfPage: URL, author: { "@type": "Organization", name: "Texas Cemetery Brokers" }, publisher: { "@type": "Organization", name: "Texas Cemetery Brokers" } },
  { "@context": "https://schema.org", "@type": "Service", name: "Preneed Cemetery Property — Buyer Representation", areaServed: { "@type": "State", name: "Texas" }, provider: { "@type": "LocalBusiness", name: "Texas Cemetery Brokers", telephone: PHONE, email: EMAIL, sameAs: ["https://bayercemeterybrokers.com/"] } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.texascemeterybrokers.com/" },
    { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.texascemeterybrokers.com/guides" },
    { "@type": "ListItem", position: 3, name: "Preneed Cemetery Plots in Texas", item: URL },
  ] },
];

export const resources = [
  { label: "Texas Department of Banking — Cemetery & Prepaid Funeral", href: "https://www.dob.texas.gov/cemetery-prepaid-funeral-services", note: "State regulator for perpetual care cemeteries and prepaid funeral contracts." },
  { label: "Texas Health & Safety Code, Chapter 711", href: "https://statutes.capitol.texas.gov/Docs/HS/htm/HS.711.htm", note: "The official statute governing cemetery property and the right of sepulture." },
  { label: "Texas Funeral Service Commission — Consumer Information", href: "https://tfsc.texas.gov/ConsumerInformation.html", note: "Consumer-facing guidance from the state funeral commission." },
  { label: "FTC Funeral Rule — consumer guidance", href: "https://consumer.ftc.gov/articles/shopping-funeral-services", note: "Your rights when shopping for funeral goods and services." },
  { label: "How to file a cemetery complaint (TX Dept. of Banking)", href: "https://www.dob.texas.gov/cemetery-prepaid-funeral-services/how-file-complaint", note: "Official complaint process for perpetual care cemeteries in Texas." },
  { label: "Bayer Cemetery Brokers", href: "https://bayercemeterybrokers.com/", note: "Our national partner — 30+ years of cemetery resale experience." },
];

interface IconItem { Icon: LucideIcon; t: string; d: string }

/** Why families buy ahead of time. */
export const reasons: IconItem[] = [
  { Icon: Wallet, t: "You pay today's price, not tomorrow's", d: "Cemetery retail prices move in one direction. Choosing the space now fixes the cost at today's figure instead of whatever the cemetery is charging years from now." },
  { Icon: Clock3, t: "You decide calmly, not in 48 hours", d: "At-need families usually choose a resting place within a day or two of a death. Preneed buyers get to visit, walk the grounds more than once, and think it over." },
  { Icon: HeartHandshake, t: "Your family is spared the decision", d: "The hardest part of an at-need purchase is not the money — it is being asked to make permanent decisions while grieving. Buying ahead removes that entirely." },
  { Icon: Users, t: "The family stays together", d: "Adjacent spaces, companion plots and family estates are far easier to secure while sections still have availability. Wait, and the spaces beside your relatives may be gone." },
  { Icon: ShieldCheck, t: "It keeps its value", d: "Cemetery property remains an asset. If plans change, it can be resold on the secondary market rather than written off." },
];

/** What changes the price of a preneed space. */
export const priceFactors: IconItem[] = [
  { Icon: MapPin, t: "The cemetery and the metro", d: "An established park in Dallas, Houston, Austin or San Antonio carries a different market than a rural or newer cemetery." },
  { Icon: Building2, t: "The section and the position", d: "Spaces near water, chapels, gardens, mature trees or main entrances sit at the top of a cemetery's price list." },
  { Icon: Layers, t: "The property type", d: "Single graves, companion and double-depth spaces, lawn crypts, mausoleum crypts and cremation niches each price differently." },
  { Icon: Sparkles, t: "What is included", d: "Vaults, markers, opening-and-closing rights, endowment care and the cemetery's own transfer fee all sit on top of the space itself." },
  { Icon: TrendingUp, t: "New versus resale", d: "The same space bought from an owner rather than from the cemetery's new-inventory price list is normally the single biggest saving available to a preneed buyer." },
];

/** Common myths at-need families repeat back to us. */
export const myths = [
  { t: "\u201CBuying early means paying twice.\u201D", d: "You pay once. What you are buying is the exclusive right of sepulture in a specific space, recorded in your name at the cemetery — it does not expire and it is not a subscription." },
  { t: "\u201CIf we move, we lose it.\u201D", d: "You do not. The property can be sold on the secondary market, and we broker exactly those sales every week." },
  { t: "\u201CBy-owner plots are risky.\u201D", d: "They are risky on classified sites, where nobody has checked who really owns the space. Every space we represent has had the deed, the cemetery record and any co-owner consent verified before it is offered." },
  { t: "\u201CThe cemetery is the only place to buy.\u201D", d: "The cemetery sells its own new inventory at its current price list. Owners resell existing spaces in the same cemetery, often for considerably less." },
];

export { Wallet, Clock3, HeartHandshake, ShieldCheck };
