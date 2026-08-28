import sparkmanMap from "@/assets/sparkman-hillcrest-map.png.asset.json";
import bluebonnetMap from "@/assets/bluebonnet-hills-map.png.asset.json";
import restHavenMap from "@/assets/rest-haven-rockwall-map.png.asset.json";

export type CemeteryPlanMap = {
  src: string;
  alt: string;
  caption: string;
  blurb: string;
  downloadName: string;
  /** Brand colour grading applied over the scan. */
  tone: string;
};

/**
 * Section / garden plans we have redrawn and colour-graded for individual
 * cemeteries. Only cemeteries with a genuine, complete plan appear here —
 * partial section lists are deliberately not published.
 */
export const CEMETERY_PLAN_MAPS: Record<string, CemeteryPlanMap> = {
  "sparkman-hillcrest-memorial-park": {
    src: sparkmanMap.url,
    alt: "Section map of Sparkman-Hillcrest Memorial Park in Dallas, showing the gardens and mausoleums between Northwest Highway, Hillcrest Road and Boedeker Street",
    caption: "Sparkman-Hillcrest Memorial Park section map — Dallas, Texas",
    blurb:
      "The full grounds plan for Sparkman-Hillcrest, from the Northwest Highway frontage through the gardens and mausoleums out to Boedeker Street.",
    downloadName: "sparkman-hillcrest-memorial-park-section-map.png",
    tone: "sepia-[.12] saturate-[.9] contrast-[1.03]",
  },
  "bluebonnet-hills-memorial-park": {
    src: bluebonnetMap.url,
    alt: "Section map of Bluebonnet Hills Memorial Park in Colleyville, Texas, showing the numbered burial sections and garden areas",
    caption: "Bluebonnet Hills Memorial Park section map — Colleyville, Texas",
    blurb:
      "The Bluebonnet Hills grounds plan, with every numbered burial section and garden area across the park.",
    downloadName: "bluebonnet-hills-memorial-park-section-map.png",
    tone: "sepia-[.14] saturate-[.88] contrast-[1.03]",
  },
};

export const planMapFor = (slug: string): CemeteryPlanMap | undefined =>
  CEMETERY_PLAN_MAPS[slug];
