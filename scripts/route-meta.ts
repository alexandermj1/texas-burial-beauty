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
    title: "Bayer Cemetery Brokers — Our Texas Partnership",
    description:
      "Bayer Cemetery Brokers is our partner brokerage: licensed in California (CEB 1512) with 30+ years of cemetery resale experience, now serving Texas families.",
  },
  {
    path: "/cemeteries",
    title: "Texas Cemetery Directory | Find a Cemetery Near You",
    description:
      "Browse cemeteries across Texas — Dallas, Houston, Austin, San Antonio, Fort Worth and El Paso. Search by city, region, or nearest location.",
  },
  {
    path: "/contact",
    title: "Contact Texas Cemetery Brokers",
    description:
      "Get in touch with Texas Cemetery Brokers. Request a free valuation, ask a buying question, or send a general inquiry — we respond within 24 hours.",
  },
  {
    path: "/guides",
    title: "Cemetery Property Guides | Texas Cemetery Brokers",
    description:
      "Guides and family resources for buying and selling cemetery plots, niches and crypts across Texas — pricing, transfers and paperwork explained.",
  },
  {
    path: "/sell-cemetery-plot-texas",
    title: "How to Sell a Cemetery Plot in Texas (2026 Guide)",
    description:
      "What your plot is worth today, the transfer steps Texas cemeteries require, and how to sell it without upfront fees. Free valuation in 24 hours.",
    type: "article",
  },
  {
    path: "/cemetery-plots-for-sale-texas",
    title: "Cemetery Plots for Sale in Texas | Buyer's Guide",
    description:
      "Guide to buying cemetery plots in Texas — typical prices by city, plot types, transfer process and how to save 30–50% versus cemetery retail.",
    type: "article",
  },
  {
    path: "/cemetery-plots-for-sale-houston",
    title: "Cemetery Plots for Sale in Houston, TX | Below Retail",
    description:
      "Buy or sell cemetery plots in Houston, TX. Resale spaces at Forest Park, Memorial Oaks, Earthman and Brookside — typically 30–50% below cemetery retail.",
    type: "article",
  },
  {
    path: "/cemetery-plots-for-sale-dallas",
    title: "Cemetery Plots for Sale in Dallas–Fort Worth, TX",
    description:
      "Buy or sell cemetery plots across Dallas–Fort Worth. Resale spaces at Restland, Sparkman/Hillcrest, Laurel Land and Greenwood — below cemetery retail.",
    type: "article",
  },
  {
    path: "/cemetery-plots-for-sale-san-antonio",
    title: "Cemetery Plots for Sale in San Antonio, TX",
    description:
      "Buy or sell cemetery plots in San Antonio. Resale spaces at Mission Burial Park, Sunset Memorial, San Jose Burial Park and Roselawn — below retail.",
    type: "article",
  },
  {
    path: "/cemetery-plots-for-sale-austin",
    title: "Cemetery Plots for Sale in Austin, TX | Central Texas",
    description:
      "Buy or sell cemetery plots in Austin and Central Texas. Resale spaces at Cook-Walden, Austin Memorial Park, Capital Parks and Oakwood — below retail.",
    type: "article",
  },
  {
    path: "/cemetery-plot-cost-texas",
    title: "How Much Does a Cemetery Plot Cost in Texas? (2026)",
    description:
      "Texas cemetery plot prices by city, the fees cemeteries add on top, what resale spaces actually sell for, and how much cemetery brokers charge.",
    type: "article",
  },
];
