import statueLawn from "@/assets/resthaven/resthaven-statue-lawn.jpg.asset.json";
import statueWide from "@/assets/resthaven/resthaven-statue-wide.jpg.asset.json";
import avenue from "@/assets/resthaven/resthaven-avenue.jpg.asset.json";
import oakPath from "@/assets/resthaven/resthaven-oak-path.jpg.asset.json";
import markerLawn from "@/assets/resthaven/resthaven-marker-lawn.jpg.asset.json";
import pavilionWalk from "@/assets/resthaven/resthaven-pavilion-walk.jpg.asset.json";
import veteranFlags from "@/assets/resthaven/resthaven-veteran-flags.jpg.asset.json";
import walkway from "@/assets/resthaven/resthaven-walkway.jpg.asset.json";
import oakBench from "@/assets/resthaven/resthaven-oak-bench.jpg.asset.json";
import type { DossierPhoto } from "./sparkmanPhotos";

/** Hero image for the Rest Haven Memorial Park (Rockwall) dossier page. */
export const RESTHAVEN_HERO = {
  src: statueLawn.url,
  alt: "Statue of Christ on the open lawn at Rest Haven Memorial Park on State Highway 66 in Rockwall, Texas, under a wide summer sky",
};

/** Wide opener used inside the article body. */
export const RESTHAVEN_STRIP: DossierPhoto = {
  src: avenue.url,
  alt: "A long tree-lined avenue of flat lawn markers running through Rest Haven Memorial Park in Rockwall, Texas",
  caption: "Rest Haven Memorial Park & Funeral Home, State Highway 66 East, Rockwall, Texas",
  kicker: "The grounds",
};

/** Editorial gallery — the gardens, lawns and landmarks at Rest Haven Rockwall. */
export const RESTHAVEN_PHOTOS: DossierPhoto[] = [
  {
    src: oakPath.url,
    alt: "Mature live oak shading flat lawn markers beside a concrete walk at Rest Haven Memorial Park, Rockwall, Texas",
    caption: "Mature live oaks shade the older gardens, with flat markers throughout.",
    kicker: "Established gardens",
  },
  {
    src: markerLawn.url,
    alt: "Rows of flat granite and bronze markers with flowers under oaks at Rest Haven Memorial Park in Rockwall, Texas",
    caption: "Level lawn, flat markers and a clear line of sight across the gardens.",
    kicker: "Lawn sections",
  },
  {
    src: pavilionWalk.url,
    alt: "Garden pavilion and paved walk between burial sections at Rest Haven Memorial Park, Rockwall, Texas",
    caption: "A shaded pavilion sits mid-park, close to the newer garden areas.",
    kicker: "The pavilion",
  },
  {
    src: veteranFlags.url,
    alt: "Texas and United States flags beside upright memorials at Rest Haven Memorial Park in Rockwall, Texas",
    caption: "Flags fly year-round beside the upright memorials near the park's east side.",
    kicker: "Memorials",
  },
  {
    src: walkway.url,
    alt: "Central walkway running between clipped hedges and lawn burial sections at Rest Haven Memorial Park, Rockwall, Texas",
    caption: "Clipped hedges and long walks organise the gardens into readable sections.",
    kicker: "Walkways",
  },
  {
    src: oakBench.url,
    alt: "Stone bench beneath a broad oak canopy at Rest Haven Memorial Park in Rockwall, Texas",
    caption: "Benches under the oaks — the quietest corner of the park.",
    kicker: "Quiet corner",
  },
  {
    src: statueWide.url,
    alt: "Wide view of the statue and surrounding lawn at Rest Haven Memorial Park on Highway 66, Rockwall, Texas",
    caption: "The statue lawn anchors the centre of the grounds.",
    kicker: "The statue lawn",
  },
];
