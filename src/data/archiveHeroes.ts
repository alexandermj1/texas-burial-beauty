/**
 * Hero frames for cemetery pages where we do not yet hold original photography
 * of that specific park.
 *
 * These pages use the same memorial-grounds frame as our home page. Alt text
 * describes it honestly as a Texas memorial park and never claims the frame
 * shows the named cemetery.
 */
import homeHero from "@/assets/hero/home-hero-frame.jpg.asset.json";

const NO_PHOTO_SLUGS = [
  "cook-walden-capital-parks-funeral-home-cemetery",
  "forest-park-lawndale",
  "forest-park-westheimer",
  "brookside-memorial-park",
  "memorial-oaks-cemetery",
  "mount-olivet-cemetery",
  "grove-hill-memorial-park",
  "moore-memorial-gardens",
  "forest-park-east",
  "woodlawn-garden-of-memories",
  "greenlawn-memorial-park",
] as const;

export const ARCHIVE_HEROES: Record<string, { src: string; alt: string }> = Object.fromEntries(
  NO_PHOTO_SLUGS.map((slug) => [
    slug,
    {
      src: homeHero.url,
      alt: "Sunlit memorial park lawn beneath mature trees — Texas Cemetery Brokers archive photograph",
    },
  ])
);

export const archiveHeroFor = (slug: string) => ARCHIVE_HEROES[slug];
