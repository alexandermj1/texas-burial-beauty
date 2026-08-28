import restlandOaks from "@/assets/restland/historic-oaks.png.asset.json";
import restlandMonuments from "@/assets/restland/historic-monuments.png.asset.json";
import restlandSign from "@/assets/restland/memories-sign.png.asset.json";
import bbEntrance from "@/assets/bluebonnet/bluebonnet-entrance-sign.jpg.asset.json";
import bbLake from "@/assets/bluebonnet/bluebonnet-lake-colonnade.jpg.asset.json";
import bbChristus from "@/assets/bluebonnet/bluebonnet-christus-garden.jpg.asset.json";
import bbCremation from "@/assets/bluebonnet/bluebonnet-cremation-garden.jpg.asset.json";
import bbShepherd from "@/assets/bluebonnet/bluebonnet-good-shepherd-sign.jpg.asset.json";
import bbLegacy from "@/assets/bluebonnet/bluebonnet-legacy-sign.jpg.asset.json";
import bbColumns from "@/assets/bluebonnet/bluebonnet-columns-sign.jpg.asset.json";
import bbBenches from "@/assets/bluebonnet/bluebonnet-memorial-benches.jpg.asset.json";
import bbCrypts from "@/assets/bluebonnet/bluebonnet-lakeside-crypts.jpg.asset.json";

export interface CemeteryPhoto {
  src: string;
  /** Descriptive, keyword-true alt text for image search. */
  alt: string;
  /** Editorial caption shown under/over the photo. */
  caption: string;
  /** Small editorial kicker used in the magazine layout. */
  kicker?: string;
}

export interface CemeteryPhotoEssay {
  eyebrow: string;
  heading: string;
  standfirst: string;
  /** Short credit line, in the manner of a magazine photo credit. */
  credit: string;
  photos: CemeteryPhoto[];
}

const RESTLAND: CemeteryPhotoEssay = {
  eyebrow: "The historic grounds",
  heading: "Inside Restland's oldest gardens.",
  standfirst:
    "The original section of Restland Memorial Park sits under mature live oaks off Greenville Avenue — upright monuments, family estates and cast-metal lane signs that predate most of the park. These closed gardens rarely release new inventory; almost everything that changes hands here is a family resale.",
  credit: "Photographed on the grounds by Texas Cemetery Brokers",
  photos: [
    {
      src: restlandOaks.url,
      alt: "Upright granite monuments under mature live oaks in the historic section of Restland Memorial Park, Dallas, Texas",
      caption: "Upright monuments under the original live oaks, historic section",
      kicker: "Historic section",
    },
    {
      src: restlandSign.url,
      alt: "Cast-metal 'Memories' garden lane sign in the historic section of Restland Memorial Park, Dallas, Texas",
      caption: "The cast-metal lane signs that name each garden",
      kicker: "Garden markers",
    },
    {
      src: restlandMonuments.url,
      alt: "Family monuments and memorial benches in an older garden at Restland Memorial Park on Greenville Avenue, Dallas",
      caption: "Family estates and upright memorials off Greenville Avenue",
      kicker: "Family estates",
    },
  ],
};

const BLUEBONNET: CemeteryPhotoEssay = {
  eyebrow: "A walk through the park",
  heading: "Bluebonnet Hills, from the lake outward.",
  standfirst:
    "Bluebonnet Hills Memorial Park is one of the loveliest grounds in the Mid-Cities. Everything turns around a spring-fed lake with a fountain at its centre, edged by clipped hedges, stone walkways and memorial benches, with the funeral home sitting right at the Colleyville Boulevard entrance. Walk out from the water and the park opens into wide, level lawns, a colonnade of lawn crypts, a cremation garden under a pergola, and named gardens marked by cast-metal signs.",
  credit: "Photographed on the grounds in Colleyville by Texas Cemetery Brokers",
  photos: [
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
      src: bbCremation.url,
      alt: "Cremation garden pergola and granite niche walls at Bluebonnet Hills Memorial Park in Colleyville, Texas",
      caption: "The cremation garden: pergola, granite niche walls and companion urn spaces.",
      kicker: "Cremation garden",
    },
    {
      src: bbCrypts.url,
      alt: "Lakeside lawn crypts and memorial benches overlooking the fountain lake at Bluebonnet Hills Memorial Park, Colleyville",
      caption: "Lawn crypts and benches along the water's edge.",
      kicker: "Lakeside crypts",
    },

    {
      src: bbBenches.url,
      alt: "Memorial benches and estate markers in a landscaped garden at Bluebonnet Hills Memorial Park, Colleyville, Texas",
      caption: "Estate markers and benches in the landscaped island gardens.",
      kicker: "Estates",
    },
    {
      src: bbEntrance.url,
      alt: "Entrance sign for Bluebonnet Hills Funeral Home and Memorial Park on Harwood Road, Colleyville, Texas",
      caption: "The Harwood Road entrance, funeral home and cemetery office on site.",
      kicker: "The entrance",
    },
  ],
};

const ESSAYS: Record<string, CemeteryPhotoEssay> = {
  "restland-memorial-park": RESTLAND,
  "bluebonnet-hills-memorial-park": BLUEBONNET,
};

export const photoEssayFor = (slug: string): CemeteryPhotoEssay | undefined =>
  ESSAYS[slug] ?? (slug.startsWith("restland") ? RESTLAND : undefined);
