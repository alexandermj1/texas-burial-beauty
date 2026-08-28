import bluebonnetHero from "@/assets/bluebonnet/bluebonnet-hero-lake.jpg.asset.json";

export interface CemeteryHeroPhoto {
  src: string;
  alt: string;
}

const HEROES: Record<string, CemeteryHeroPhoto> = {
  "bluebonnet-hills-memorial-park": {
    src: bluebonnetHero.url,
    alt: "The spring-fed lake and fountain at Bluebonnet Hills Memorial Park in Colleyville, Texas, with the walkway, clipped hedges and memorial benches along the water",
  },
};

export const heroPhotoFor = (slug: string): CemeteryHeroPhoto | undefined => HEROES[slug];
