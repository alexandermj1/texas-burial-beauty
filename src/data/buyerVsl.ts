import video from "@/assets/buy/tcb-buyer-video-v1.mp4.asset.json";
import cover from "@/assets/buy/tcb-buyer-video-v1-cover.jpg.asset.json";

export const buyerVsl = {
  video: video.url,
  cover: cover.url,
  title: "Buying a cemetery plot in Texas with Texas Cemetery Brokers",
  summary: "See how privately resold cemetery spaces compare with cemetery retail, how Texas Cemetery Brokers helps buyers visit the grounds and verifies ownership, and how the team coordinates the paperwork and transfer. The film also introduces the free buyer concierge and interest-free payment plans on selected pre-need properties. Availability, savings and financing depend on the property.",
};

export const buyerVslJsonLd = (path: string): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": "https://texascemeterybrokers.com/buy#buyer-video",
  name: buyerVsl.title,
  description: buyerVsl.summary,
  thumbnailUrl: `https://texascemeterybrokers.com${buyerVsl.cover}`,
  contentUrl: `https://texascemeterybrokers.com${buyerVsl.video}`,
  uploadDate: "2026-11-10T20:36:00Z",
  duration: "PT1M46S",
  inLanguage: "en-US",
  publisher: { "@id": "https://texascemeterybrokers.com/#organization" },
  isPartOf: { "@type": "WebPage", "@id": `https://texascemeterybrokers.com${path}` },
});