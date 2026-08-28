/**
 * Hero frames for cemetery pages where we do not yet hold original photography
 * of that specific park.
 *
 * These are unidentifiable frames from our own Texas archive — lawn, oak canopy,
 * pathways and benches with no signage, monuments or landmarks that would
 * identify the property. Alt text describes them honestly as Texas memorial
 * grounds and never claims the frame shows the named cemetery.
 */
import oakPath from "@/assets/resthaven/resthaven-oak-path.jpg.asset.json";
import markerLawn from "@/assets/resthaven/resthaven-marker-lawn.jpg.asset.json";
import avenue from "@/assets/resthaven/resthaven-avenue.jpg.asset.json";
import oakBench from "@/assets/resthaven/resthaven-oak-bench.jpg.asset.json";
import lawnOak from "@/assets/laurelland/laurel-land-lawn-oak.jpg.asset.json";

export const ARCHIVE_HEROES: Record<string, { src: string; alt: string }> = {
  "cook-walden-capital-parks-funeral-home-cemetery": {
    src: oakPath.url,
    alt: "Shaded oak path across a Texas memorial park lawn — archive photograph, not of Cook-Walden Capital Parks",
  },
  "forest-park-lawndale": {
    src: markerLawn.url,
    alt: "Open memorial lawn with flat bronze markers at a Texas cemetery — archive photograph, not of Forest Park Lawndale",
  },
  "forest-park-westheimer": {
    src: avenue.url,
    alt: "Tree-lined avenue through a Texas memorial park — archive photograph, not of Forest Park Westheimer",
  },
  "brookside-memorial-park": {
    src: lawnOak.url,
    alt: "Mature oak over a quiet memorial lawn in Texas — archive photograph, not of Brookside Memorial Park",
  },
  "memorial-oaks-cemetery": {
    src: oakBench.url,
    alt: "Memorial bench beneath oaks at a Texas memorial park — archive photograph, not of Memorial Oaks Cemetery",
  },
};

export const archiveHeroFor = (slug: string) => ARCHIVE_HEROES[slug];
