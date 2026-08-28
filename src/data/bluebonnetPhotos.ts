import type { DossierPhoto } from "@/data/sparkmanPhotos";
import bbHero from "@/assets/bluebonnet/bluebonnet-hero-lake.jpg.asset.json";
import bbEntrance from "@/assets/bluebonnet/bluebonnet-entrance-sign.jpg.asset.json";
import bbLake from "@/assets/bluebonnet/bluebonnet-lake-colonnade.jpg.asset.json";
import bbChristus from "@/assets/bluebonnet/bluebonnet-christus-garden.jpg.asset.json";
import bbCremation from "@/assets/bluebonnet/bluebonnet-cremation-garden.jpg.asset.json";
import bbShepherd from "@/assets/bluebonnet/bluebonnet-good-shepherd-sign.jpg.asset.json";
import bbLegacy from "@/assets/bluebonnet/bluebonnet-legacy-sign.jpg.asset.json";
import bbColumns from "@/assets/bluebonnet/bluebonnet-columns-sign.jpg.asset.json";
import bbBenches from "@/assets/bluebonnet/bluebonnet-memorial-benches.jpg.asset.json";
import bbCrypts from "@/assets/bluebonnet/bluebonnet-lakeside-crypts.jpg.asset.json";

/** Hero image for the Bluebonnet Hills dossier page. */
export const BLUEBONNET_HERO = {
  src: bbHero.url,
  alt: "The spring-fed lake and fountain at Bluebonnet Hills Memorial Park in Colleyville, Texas, with walkways, clipped hedges and memorial benches along the water",
};

/** Wide opener used inside the article body. */
export const BLUEBONNET_STRIP: DossierPhoto = {
  src: bbEntrance.url,
  alt: "Entrance sign for Bluebonnet Hills Funeral Home and Memorial Park on Harwood Road, Colleyville, Texas",
  caption: "Bluebonnet Hills Funeral Home and Memorial Park, Colleyville, Texas",
  kicker: "The entrance",
};

/** Editorial gallery — the lake outward. */
export const BLUEBONNET_PHOTOS: DossierPhoto[] = [
  {
    src: bbLake.url,
    alt: "The fountain lake and lawn-crypt colonnade at Bluebonnet Hills Memorial Park in Colleyville, Texas",
    caption: "The fountain lake, with the crypt colonnade on the far bank — the view the whole park is built around.",
    kicker: "The lake",
  },
  {
    src: bbChristus.url,
    alt: "Christus statue at the centre of a garden of flat lawn markers at Bluebonnet Hills Memorial Park, Colleyville, Texas",
    caption: "The Christus figure anchoring the centre garden, walks radiating out to the lawn sections.",
    kicker: "Centre garden",
  },
  {
    src: bbCrypts.url,
    alt: "Lakeside lawn crypts and memorial benches overlooking the fountain lake at Bluebonnet Hills Memorial Park, Colleyville",
    caption: "Lawn crypts and benches along the water's edge.",
    kicker: "Lakeside crypts",
  },
  {
    src: bbCremation.url,
    alt: "Cremation garden pergola and granite niche walls at Bluebonnet Hills Memorial Park in Colleyville, Texas",
    caption: "The cremation garden: pergola, granite niche walls and companion urn spaces.",
    kicker: "Cremation garden",
  },
  {
    src: bbShepherd.url,
    alt: "Cast-metal 'Garden of the Good Shepherd' section sign at Bluebonnet Hills Memorial Park in Colleyville, Texas",
    caption: "Garden of the Good Shepherd — flat markers under mature shade.",
    kicker: "Good Shepherd",
  },
  {
    src: bbLegacy.url,
    alt: "Legacy garden section sign beneath crape myrtles at Bluebonnet Hills Memorial Park, Colleyville, Texas",
    caption: "Legacy, set beneath the crape myrtles along the back drive.",
    kicker: "Legacy",
  },
  {
    src: bbColumns.url,
    alt: "Columns section sign on the drive at Bluebonnet Hills Memorial Park, Colleyville, Texas",
    caption: "The Columns section, on the open lawn toward the north drive.",
    kicker: "Columns",
  },
  {
    src: bbBenches.url,
    alt: "Memorial benches and estate markers in a landscaped garden at Bluebonnet Hills Memorial Park, Colleyville, Texas",
    caption: "Estate markers and benches in the landscaped island gardens.",
    kicker: "Estates",
  },
];
