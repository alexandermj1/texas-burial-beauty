// Client-side mirror of supabase/functions/_shared/marketing/brands.ts.
// Kept in sync manually — only the fields the admin UI needs are exposed.
export type MarketingBrand = "texas" | "bayer";

export interface BrandUiConfig {
  key: MarketingBrand;
  name: string;
  primary: string;   // hex
  primaryFg: string;
  bgAccent: string;
  senderDomain: string;
  fromEmail: string;
  siteUrl: string;
  logoUrl: string;
}

export const BRAND_UI: Record<MarketingBrand, BrandUiConfig> = {
  texas: {
    key: "texas",
    name: "Texas Cemetery Brokers",
    primary: "#7c3a2e",
    primaryFg: "#ffffff",
    bgAccent: "#f7f1e8",
    senderDomain: "texascemeterybrokers.com",
    fromEmail: "hello@texascemeterybrokers.com",
    siteUrl: "https://www.texascemeterybrokers.com",
    logoUrl:
      "https://www.texascemeterybrokers.com/__l5e/assets-v1/ba491ce8-b20f-42a1-a37e-059bb277ea85/hibiscus-coral.png",
  },
  bayer: {
    key: "bayer",
    name: "Bayer Cemetery Brokers",
    primary: "#1e3a8a",
    primaryFg: "#ffffff",
    bgAccent: "#eef2ff",
    senderDomain: "news.bayercemeterybrokers.com",
    fromEmail: "hello@news.bayercemeterybrokers.com",
    siteUrl: "https://www.bayercemeterybrokers.com",
    logoUrl:
      "https://www.texascemeterybrokers.com/__l5e/assets-v1/71e10642-6ab0-460b-8fb1-538ab896b0d2/bayer-logo-white.png",
  },
};

export interface MarketingTemplate {
  key: string;
  label: string;
  brand: MarketingBrand;
  defaultSubject: string;
  defaultPreheader: string;
}

export const MARKETING_TEMPLATES: MarketingTemplate[] = [
  {
    key: "texas-intro-mortuaries",
    label: "Intro to mortuaries",
    brand: "texas",
    defaultSubject: "We'll source the cemetery plot your family needs",
    defaultPreheader:
      "Tell us the location and price point — we source below-retail plots across Texas and pay your funeral home a referral commission on every sale.",
  },
  {
    key: "bayer-intro-mortuaries",
    label: "Intro to mortuaries",
    brand: "bayer",
    defaultSubject: "Partnering with your funeral home on unused cemetery plots",
    defaultPreheader:
      "We resell unused cemetery property for families you serve — and pay a referral commission on every closed sale.",
  },
];
