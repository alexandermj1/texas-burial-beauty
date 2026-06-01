import { MapPin, Building2, Layers, Sparkles, TrendingUp, Clock3, Eye, HeartHandshake, type LucideIcon } from "lucide-react";

export const PHONE = "+13108049586";
export const PHONE_DISPLAY = "(310) 804-9586";
export const EMAIL = "info@texascemeterybrokers.com";
const SLUG = "sell-cemetery-plot-texas";
const URL = `https://www.texascemeterybrokers.com/${SLUG}`;

export const faqs = [
  { q: "Can you sell a cemetery plot in Texas?", a: "Yes. If you own the right of sepulture in a plot, you can sell it. Check your contract for a right-of-first-refusal clause, confirm co-owners agree, then sell privately or through a broker who handles valuation, buyers, paperwork and the transfer." },
  { q: "How much is my cemetery plot worth in Texas?", a: "It depends on the cemetery, the section and current demand, so the best way to know is a valuation rather than a fixed figure. Resale plots typically sell below the cemetery's current retail price, which is what attracts buyers. We provide a free, plot-specific valuation." },
  { q: "Do I need a license to sell my own cemetery plot in Texas?", a: "No. Selling your own plot needs no license, and Texas no longer requires cemetery brokers to register either — that requirement was repealed effective September 1, 2019. Brokers must still follow the code's rules for recording the conveyance and remitting cemetery fees." },
  { q: "How long does it take to sell a cemetery plot in Texas?", a: "It depends on the cemetery and your price. High-demand metro plots can sell in weeks through a broker; selling privately can take months or even years, and some plots never find a buyer that way. Accurate pricing and reaching active buyers shortens the timeline." },
  { q: "Will the cemetery buy my plot back?", a: "Sometimes, but often only at the price you originally paid rather than today's value — and many will not buy back at all. An open-market resale usually recovers more of your plot's worth." },
];

export const jsonLd: Record<string, unknown>[] = [
  { "@context": "https://schema.org", "@type": "Article", headline: "How to Sell a Cemetery Plot in Texas", mainEntityOfPage: URL, author: { "@type": "Organization", name: "Texas Cemetery Brokers" }, publisher: { "@type": "Organization", name: "Texas Cemetery Brokers" } },
  { "@context": "https://schema.org", "@type": "Service", name: "Cemetery Plot Resale Brokerage", areaServed: { "@type": "State", name: "Texas" }, provider: { "@type": "LocalBusiness", name: "Texas Cemetery Brokers", telephone: PHONE, email: EMAIL } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.texascemeterybrokers.com/" },
    { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.texascemeterybrokers.com/guides" },
    { "@type": "ListItem", position: 3, name: "How to Sell a Cemetery Plot in Texas", item: URL },
  ] },
];

interface IconItem { Icon: LucideIcon; t: string; d: string }

export const checks = [
  { t: "Read your original contract.", d: "Some cemeteries include a right of first refusal, meaning you must offer the plot back to them before selling to anyone else." },
  { t: "Confirm co-owner consent.", d: "Plots bought jointly with a spouse, sibling, or as a family group need written agreement from all owners under Texas community-property rules." },
  { t: "Check the cemetery's transfer policy.", d: "Each cemetery has its own conveyance forms, transfer fee, and procedure for recording a resale." },
];

export const valueFactors: IconItem[] = [
  { Icon: MapPin, t: "The cemetery & metro", d: "Established, in-demand parks in larger metros carry stronger resale value than rural or remote locations." },
  { Icon: Building2, t: "The section & position", d: "Spaces near trees, water, chapels, gardens or entrances, and plots in well-regarded sections, are more sought after." },
  { Icon: Layers, t: "The property type", d: "Single graves, companion or double-depth spaces, mausoleum crypts and cremation niches each have their own market." },
  { Icon: Sparkles, t: "What's included", d: "Vaults, markers, opening-and-closing rights and transfer fees all affect the net value to a buyer." },
  { Icon: TrendingUp, t: "Current demand", d: "What buyers are actively looking for in that exact cemetery, right now, sets the real ceiling on price." },
];

export { Clock3, Eye, HeartHandshake, TrendingUp };
