import fountain from "@/assets/sparkman/sparkman-fountain-garden.jpg.asset.json";
import corridor from "@/assets/sparkman/sparkman-mausoleum-corridor.jpg.asset.json";
import entrance from "@/assets/sparkman/sparkman-entrance-sign.jpg.asset.json";
import chapel from "@/assets/sparkman/sparkman-chapel-exterior.jpg.asset.json";
import chapelGlass from "@/assets/sparkman/sparkman-chapel-stained-glass.jpg.asset.json";
import glassTrees from "@/assets/sparkman/sparkman-stained-glass-trees.jpg.asset.json";
import shalom from "@/assets/sparkman/sparkman-temple-shalom.jpg.asset.json";
import oakLawn from "@/assets/sparkman/sparkman-oak-lawn.jpg.asset.json";
import nicheWall from "@/assets/sparkman/sparkman-niche-wall.jpg.asset.json";
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

/** Editorial gallery — the Hillcrest Mausoleum, chapels and lawns. */
export const SPARKMAN_PHOTOS: DossierPhoto[] = [
  {
    src: corridor.url,
    alt: "Marble corridor of the Hillcrest Mausoleum at Sparkman-Hillcrest Memorial Park in Dallas, with checkerboard floor, crypt fronts and a vaulted skylight",
    caption:
      "Inside the Hillcrest Mausoleum: checkerboard marble, crypt fronts either side and a vaulted skylight running the length of the corridor.",
    kicker: "Hillcrest Mausoleum",
  },
  {
    src: chapelGlass.url,
    alt: "Chapel alcove inside the Hillcrest Mausoleum at Sparkman-Hillcrest, Dallas, with figurative stained glass, a stone bench and a chandelier",
    caption: "A chapel alcove off the main corridor — figurative glass, stone bench, chandelier.",
    kicker: "Chapel alcove",
  },
  {
    src: glassTrees.url,
    alt: "Landscape stained-glass window of autumn trees inside the mausoleum at Sparkman-Hillcrest Memorial Park, Dallas, Texas",
    caption: "The landscape windows are the reason people ask for interior crypts here.",
    kicker: "The glass",
  },
  {
    src: nicheWall.url,
    alt: "Cremation niche wall with glass fronts and flowers inside the mausoleum at Sparkman-Hillcrest Memorial Park in Dallas",
    caption: "Cremation niches line the inner galleries — the most affordable way into the building.",
    kicker: "Niches",
  },
  {
    src: chapel.url,
    alt: "Chapel and funeral home building at Sparkman-Hillcrest Funeral Home and Memorial Park, Northwest Highway, Dallas, Texas",
    caption: "The funeral home and chapel sit on the grounds, so services and interment happen in one place.",
    kicker: "Chapel",
  },
  {
    src: oakLawn.url,
    alt: "Mature oak trees over flat lawn markers in an established section at Sparkman-Hillcrest Memorial Park, Dallas, Texas",
    caption: "Established lawn under mature oaks — where most two- and four-space family holdings sit.",
    kicker: "Established lawn",
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
