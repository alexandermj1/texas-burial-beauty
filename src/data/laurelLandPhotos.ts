import sign from "@/assets/laurelland/laurel-land-entrance-sign.jpg.asset.json";
import funeralHome from "@/assets/laurelland/laurel-land-funeral-home.jpg.asset.json";
import lawnMarkers from "@/assets/laurelland/laurel-land-lawn-markers.jpg.asset.json";
import lawnOak from "@/assets/laurelland/laurel-land-lawn-oak.jpg.asset.json";
import type { DossierPhoto } from "./sparkmanPhotos";

/** Hero image for the Laurel Land dossier page. */
export const LAUREL_LAND_HERO = {
  src: lawnOak.url,
  alt: "Open lawn and mature trees over flat memorial markers at Laurel Land Memorial Park in Texas",
};

/** Wide opener used inside the article body. */
export const LAUREL_LAND_STRIP: DossierPhoto = {
  src: sign.url,
  alt: "Laurel Land–Rose Hill Memorial Park and Funeral Home entrance sign",
  caption: "Laurel Land–Rose Hill Memorial Park & Funeral Home entrance",
  kicker: "The entrance",
};

/** Editorial gallery for the Laurel Land dossier page. */
export const LAUREL_LAND_PHOTOS: DossierPhoto[] = [
  {
    src: funeralHome.url,
    alt: "Funeral home building on the grounds at Laurel Land–Rose Hill Memorial Park in Texas",
    caption: "The funeral home sits on the grounds, so service and interment happen in one place.",
    kicker: "Funeral home",
  },
  {
    src: lawnMarkers.url,
    alt: "Flat bronze and granite lawn markers with flowers in an established section at Laurel Land Memorial Park",
    caption: "Flat markers throughout the lawn sections keep the park open and level.",
    kicker: "Lawn sections",
  },
  {
    src: lawnOak.url,
    alt: "Broad oak canopy over an established burial section at Laurel Land Memorial Park",
    caption: "Established sections under mature shade — where most family holdings sit.",
    kicker: "Established lawn",
  },
];
