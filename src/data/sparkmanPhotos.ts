import fountain from "@/assets/sparkman/sparkman-fountain-garden.jpg.asset.json";
import entrance from "@/assets/sparkman/sparkman-entrance-sign.jpg.asset.json";
import chapel from "@/assets/sparkman/sparkman-chapel-exterior.jpg.asset.json";
import glassTrees from "@/assets/sparkman/sparkman-stained-glass-trees.jpg.asset.json";
import glassDetail from "@/assets/sparkman/sparkman-glass-detail.jpg.asset.json";
import shalom from "@/assets/sparkman/sparkman-temple-shalom.jpg.asset.json";
import oakLawn from "@/assets/sparkman/sparkman-oak-lawn.jpg.asset.json";
import lawnPath from "@/assets/sparkman/sparkman-lawn-path.jpg.asset.json";
import oakBench from "@/assets/sparkman/sparkman-oak-bench.jpg.asset.json";
import statue from "@/assets/sparkman/sparkman-garden-statue.jpg.asset.json";

export interface DossierPhoto {
  src: string;
  alt: string;
  caption: string;
  kicker: string;
}

/** Hero image for the Sparkman-Hillcrest dossier page. */
export const SPARKMAN_HERO = {
  src: fountain.url,
  alt: "The fountain garden at Sparkman-Hillcrest Memorial Park on Northwest Highway in Dallas, Texas, with clipped hedges and flat lawn markers",
};

/** Wide opener used inside the article body. */
export const SPARKMAN_STRIP: DossierPhoto = {
  src: entrance.url,
  alt: "The Sparkman-Hillcrest 'A Tradition of Excellence' entrance sign on Northwest Highway in Dallas, Texas",
  caption: "Sparkman-Hillcrest Memorial Park, Northwest Highway, Dallas, Texas",
  kicker: "The entrance",
};

/**
 * Editorial gallery — the grounds, gardens and lawns. Interior photography of
 * the mausoleum is deliberately not published; the only interior detail we
 * show is tightly cropped stained glass.
 */
export const SPARKMAN_PHOTOS: DossierPhoto[] = [
  {
    src: oakLawn.url,
    alt: "Mature oak trees over flat lawn markers in an established section at Sparkman-Hillcrest Memorial Park, Dallas, Texas",
    caption: "Established lawn under mature oaks — where most two- and four-space family holdings sit.",
    kicker: "Established lawn",
  },
  {
    src: lawnPath.url,
    alt: "Rows of flat bronze and granite lawn markers under a tree line at Sparkman-Hillcrest Memorial Park in Dallas, Texas",
    caption: "Level lawn sections, flat markers throughout, with the tree line closing the view.",
    kicker: "Lawn sections",
  },
  {
    src: oakBench.url,
    alt: "Open lawn with wide-canopy oaks and flat memorial markers at Sparkman-Hillcrest Memorial Park, Dallas, Texas",
    caption: "Wide-canopy oaks and open lawn on the quieter side of the park.",
    kicker: "Open lawn",
  },
  {
    src: chapel.url,
    alt: "Chapel and funeral home building at Sparkman-Hillcrest Funeral Home and Memorial Park, Northwest Highway, Dallas, Texas",
    caption: "The funeral home sits on the grounds, so services and interment happen in one place.",
    kicker: "Funeral home",
  },
  {
    src: glassTrees.url,
    alt: "Detail of a landscape stained-glass window of autumn trees at Sparkman-Hillcrest Memorial Park, Dallas, Texas",
    caption: "A landscape window, close up — the glass here is part of why people ask for the building.",
    kicker: "The glass",
  },
  {
    src: glassDetail.url,
    alt: "Close detail of jewel-toned leaded stained glass at Sparkman-Hillcrest Memorial Park in Dallas, Texas",
    caption: "Jewel-toned leaded glass, photographed in detail.",
    kicker: "Glass detail",
  },
  {
    src: shalom.url,
    alt: "Temple Shalom section marker among hedges at Sparkman-Hillcrest Memorial Park in Dallas, Texas",
    caption: "Temple Shalom, one of the congregational sections on the property.",
    kicker: "Temple Shalom",
  },
  {
    src: statue.url,
    alt: "Bronze statue on a granite plinth in a shaded garden at Sparkman-Hillcrest Memorial Park, Dallas, Texas",
    caption: "Statuary and shade in the older gardens toward Boedeker Street.",
    kicker: "Older gardens",
  },
];
