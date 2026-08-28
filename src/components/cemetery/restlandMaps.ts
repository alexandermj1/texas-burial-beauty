import westMap from "@/assets/restland-map-west.png.asset.json";
import eastMap from "@/assets/restland-map-east.png.asset.json";

/**
 * The two halves of the Restland Memorial Park garden plan, redrawn by Texas
 * Cemetery Brokers. Shared by the on-page map component and the page's
 * ImageObject structured data / download links.
 */
export const RESTLAND_MAPS = [
  {
    id: "west",
    label: "West grounds",
    blurb:
      "Whispering Waters, Abbey Estates, Good Shepherd, Trinity and the United Jewish Cemeteries — the older, more established side of the park.",
    src: westMap.url,
    downloadName: "restland-memorial-park-west-grounds-garden-map.png",
    alt: "Map of the west grounds at Restland Memorial Park, Dallas, showing Whispering Waters, Abbey Estates, Good Shepherd, Trinity and the surrounding gardens",
    caption: "Restland Memorial Park garden map — west grounds, Dallas, Texas",
    tone: "sepia-[.06] saturate-[.92] contrast-[1.02]",
  },
  {
    id: "east",
    label: "East grounds",
    blurb:
      "Chapel Gardens, Ascension, Devotion, Rose Garden and the Veteran's gardens along the Greenville Avenue frontage.",
    src: eastMap.url,
    downloadName: "restland-memorial-park-east-grounds-garden-map.png",
    alt: "Map of the east grounds at Restland Memorial Park, Dallas, showing Chapel Gardens, Ascension, Devotion, Rose Garden and the Veteran's gardens",
    caption: "Restland Memorial Park garden map — east grounds, Dallas, Texas",
    tone: "sepia-[.22] saturate-[.8] contrast-[1.04] brightness-[.99]",
  },
] as const;

export type RestlandMap = (typeof RESTLAND_MAPS)[number];
