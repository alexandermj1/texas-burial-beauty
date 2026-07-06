// Brand configuration shared across marketing edge functions.
// Keep in sync with src/lib/marketingBrands.ts (the client-side mirror).

export type MarketingBrand = "texas" | "bayer";

export interface BrandConfig {
  key: MarketingBrand;
  name: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  senderDomain: string; // subdomain to verify in Resend
  siteUrl: string;      // absolute URL for unsubscribe / logo hosting
  logoUrl: string;      // absolute https URL used inside emails
  primary: string;      // brand accent hex
  primaryFg: string;    // foreground on primary
  bgAccent: string;     // secondary tint used in email
  bodyBg: string;
  footerAddress: string;
  tagline: string;
}

export const BRANDS: Record<MarketingBrand, BrandConfig> = {
  texas: {
    key: "texas",
    name: "Texas Cemetery Brokers",
    fromName: "Texas Cemetery Brokers",
    fromEmail: "hello@news.texascemeterybrokers.com",
    replyTo: "info@texascemeterybrokers.com",
    senderDomain: "news.texascemeterybrokers.com",
    siteUrl: "https://www.texascemeterybrokers.com",
    logoUrl:
      "https://www.texascemeterybrokers.com/__l5e/assets-v1/ba491ce8-b20f-42a1-a37e-059bb277ea85/hibiscus-coral.png",
    primary: "#7c3a2e",
    primaryFg: "#ffffff",
    bgAccent: "#f7f1e8",
    bodyBg: "#ffffff",
    footerAddress: "Texas Cemetery Brokers · Serving all of Texas · info@texascemeterybrokers.com",
    tagline: "The Modern Way to Sell Cemetery Property in Texas",
  },
  bayer: {
    key: "bayer",
    name: "Bayer Cemetery Brokers",
    fromName: "Bayer Cemetery Brokers",
    fromEmail: "hello@news.bayercemeterybrokers.com",
    replyTo: "info@bayercemeterybrokers.com",
    senderDomain: "news.bayercemeterybrokers.com",
    siteUrl: "https://www.bayercemeterybrokers.com",
    logoUrl:
      "https://www.texascemeterybrokers.com/__l5e/assets-v1/71e10642-6ab0-460b-8fb1-538ab896b0d2/bayer-logo-white.png",
    primary: "#1e3a8a",
    primaryFg: "#ffffff",
    bgAccent: "#eef2ff",
    bodyBg: "#ffffff",
    footerAddress: "Bayer Cemetery Brokers · info@bayercemeterybrokers.com",
    tagline: "Trusted cemetery resale, coast to coast",
  },
};
