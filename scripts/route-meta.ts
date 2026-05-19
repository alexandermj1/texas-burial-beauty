// Per-route SEO metadata. Used by the prerender Vite plugin to emit
// static HTML shells with route-specific <title>, description, canonical,
// and Open Graph tags — for social unfurl crawlers and non-JS bots.

export interface RouteMeta {
  path: string; // url path, e.g. "/buy"
  title: string; // <= 60 chars
  description: string; // <= 160 chars
  ogImage?: string;
  type?: "website" | "article";
}

export const STATIC_ROUTES: RouteMeta[] = [
  {
    path: "/",
    title: "Texas Cemetery Brokers | Buy & Sell Cemetery Plots",
    description:
      "Buy and sell cemetery plots, niches and crypts across Texas — Dallas, Houston, Austin, San Antonio. Below-market resale by trusted brokers.",
  },
  {
    path: "/buy",
    title: "Buy a Cemetery Plot in Texas | Texas Cemetery Brokers",
    description:
      "Find below-market cemetery plots, niches, crypts and mausoleums across Texas. Concierge buyer matching in Dallas, Houston, Austin, San Antonio.",
  },
  {
    path: "/sell",
    title: "Sell Your Cemetery Plot in Texas | Texas Cemetery Brokers",
    description:
      "List your Texas cemetery plot with trusted brokers. Free and premium listings, no upfront appraisal fees, transparent process.",
  },
  {
    path: "/property-types",
    title: "Cemetery Property Types | Plots, Niches, Crypts in Texas",
    description:
      "Compare cemetery plots, columbarium niches, mausoleum crypts and family estates across Texas — find the option that fits your family.",
  },
  {
    path: "/partners",
    title: "Our Partners | Texas Cemetery Brokers",
    description:
      "Texas Cemetery Brokers operates in partnership with Bayer Cemetery Brokers (CEB 1512, California), bringing decades of cemetery resale experience to Texas families.",
  },
  {
    path: "/cemeteries",
    title: "Texas Cemetery Directory | Find a Cemetery Near You",
    description:
      "Browse cemeteries across Texas — Dallas, Houston, Austin, San Antonio, Fort Worth and El Paso. Search by city, region, or nearest location.",
  },
  {
    path: "/team",
    title: "Our Team | Texas Cemetery Brokers",
    description:
      "Meet the Texas Cemetery Brokers team helping families buy and sell cemetery property across Texas.",
  },
  {
    path: "/blog",
    title: "Cemetery Property Insights | Texas Cemetery Brokers Blog",
    description:
      "Guides, market insights and family resources for buying and selling cemetery property across Texas.",
  },
];
