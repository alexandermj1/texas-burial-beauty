import heroLawn from "@/assets/restland/restland-hero-lawn.jpg.asset.json";
import lawnMonuments from "@/assets/restland/restland-lawn-monuments.jpg.asset.json";
import historicOaks from "@/assets/restland/historic-oaks.png.asset.json";
import historicMonuments from "@/assets/restland/historic-monuments.png.asset.json";
import memoriesSign from "@/assets/restland/memories-sign.png.asset.json";

import type { DossierPhoto } from "@/data/sparkmanPhotos";

/** Hero image for the Restland dossier page. */
export const RESTLAND_HERO = {
  src: heroLawn.url,
  alt: "Open lawn sections under mature trees at Restland Memorial Park on Greenville Avenue in Dallas, Texas",
};

/** Wide opener used inside the article body. */
export const RESTLAND_STRIP: DossierPhoto = {
  src: lawnMonuments.url,
  alt: "Flat markers and upright monuments across a shaded lawn at Restland Memorial Park, Dallas, Texas",
  caption: "Restland Memorial Park, Greenville Avenue, Dallas, Texas",
  kicker: "The grounds",
};

/** Editorial gallery — the historic gardens and the wider grounds. */
export const RESTLAND_PHOTOS: DossierPhoto[] = [
  {
    src: historicOaks.url,
    alt: "Upright granite monuments under mature live oaks in the historic section of Restland Memorial Park, Dallas, Texas",
    caption: "Upright monuments under the original live oaks in the historic section.",
    kicker: "Historic section",
  },
  {
    src: memoriesSign.url,
    alt: "Cast-metal 'Memories' garden lane sign in the historic section of Restland Memorial Park, Dallas, Texas",
    caption: "The cast-metal lane signs that name each garden.",
    kicker: "Garden markers",
  },
  {
    src: historicMonuments.url,
    alt: "Family monuments and memorial benches in an older garden at Restland Memorial Park on Greenville Avenue, Dallas",
    caption: "Family estates and upright memorials off Greenville Avenue.",
    kicker: "Family estates",
  },
  {
    src: heroLawn.url,
    alt: "Level lawn section with flat markers and a tree line at Restland Memorial Park in Dallas, Texas",
    caption: "Level lawn sections, flat markers, mature trees along the boundary.",
    kicker: "Lawn sections",
  },
];
