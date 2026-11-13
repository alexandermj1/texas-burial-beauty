import video from "@/assets/dallas/tcb-dallas-cemeteries-v3.mp4.asset.json";
import cover from "@/assets/dallas/tcb-dallas-cemeteries-v3-cover.jpg.asset.json";

export const dallasFilm = {
  video: video.url,
  cover: cover.url,
  title: "Dallas–Fort Worth cemeteries: a guided tour of the area's memorial parks",
  coverAlt: "Illustrated map of Sparkman-Hillcrest Memorial Park in North Dallas from the Texas Cemetery Brokers Dallas–Fort Worth cemeteries film, showing named gardens and a note that Mickey Mantle rests there",
  summary: "An illustrated tour of Dallas–Fort Worth memorial parks, including Restland Memorial Park beside Richardson, Sparkman-Hillcrest Memorial Park on Northwest Highway, and Laurel Land Memorial Park in Dallas and Fort Worth. The film shows where each cemetery sits, the gardens families most often ask about, and what makes each one distinctive, to help families compare cemetery plots across the Dallas–Fort Worth area. Garden positions are approximate and availability changes over time.",
};

export const dallasFilmJsonLd = (path: string): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": "https://texascemeterybrokers.com/cemetery-plots-for-sale-dallas#dallas-cemeteries-film",
  name: dallasFilm.title,
  description: dallasFilm.summary,
  thumbnailUrl: `https://texascemeterybrokers.com${dallasFilm.cover}`,
  contentUrl: `https://texascemeterybrokers.com${dallasFilm.video}`,
  uploadDate: "2026-11-13T12:46:00Z",
  duration: "PT2M55S",
  inLanguage: "en-US",
  contentLocation: { "@type": "Place", name: "Dallas–Fort Worth, Texas" },
  publisher: { "@id": "https://texascemeterybrokers.com/#organization" },
  isPartOf: { "@type": "WebPage", "@id": `https://texascemeterybrokers.com${path}` },
});
