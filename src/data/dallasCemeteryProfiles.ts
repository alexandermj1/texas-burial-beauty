import { RESTLAND_HERO, RESTLAND_PHOTOS } from "@/data/restlandDossierPhotos";
import { SPARKMAN_HERO, SPARKMAN_PHOTOS } from "@/data/sparkmanPhotos";
import { BLUEBONNET_HERO, BLUEBONNET_PHOTOS } from "@/data/bluebonnetPhotos";
import { LAUREL_LAND_HERO, LAUREL_LAND_PHOTOS } from "@/data/laurelLandPhotos";
import { RESTHAVEN_HERO, RESTHAVEN_PHOTOS } from "@/data/resthavenPhotos";
import type { DossierPhoto } from "@/data/sparkmanPhotos";

export interface DallasCemeteryProfile {
  name: string;
  slug: string;
  city: string;
  area: string;
  /** One-line positioning used on cards and as the photo caption lead. */
  standfirst: string;
  /** Two to three short paragraphs — written from what we see on the grounds. */
  body: string[];
  /** Short factual notes shown as an editorial ledger. */
  facts: { label: string; value: string }[];
  hero: { src: string; alt: string };
  photos: DossierPhoto[];
}

/**
 * Profiles for the five Dallas–Fort Worth parks we photograph and broker most.
 * Copy is written from our own visits — no operator marketing language, no
 * pricing claims that could embarrass a cemetery or a seller.
 */
export const DALLAS_CEMETERY_PROFILES: DallasCemeteryProfile[] = [
  {
    name: "Restland Memorial Park",
    slug: "restland-memorial-park",
    city: "Dallas",
    area: "Greenville Avenue, North Dallas",
    standfirst: "The largest cemetery in Dallas — flat ground, wide lanes, and dozens of named gardens.",
    body: [
      "Restland is the largest cemetery in Dallas and one of the largest in Texas. It is laid out as dozens of named gardens rather than one continuous lawn, which is why families almost always describe a space here by its garden name first and its section number second.",
      "The ground is largely flat. That matters more than people expect: a great many sections sit close to the curb, so a visitor with a wheelchair, a walker or a bad hip can park on the lane and reach the marker without crossing a slope. Families who visit often tend to ask for those curbside rows specifically.",
      "The oldest part of the park sits under mature live oaks off Greenville Avenue — upright monuments, family estates and cast-metal lane signs that predate most of the grounds. Those gardens are closed, so anything that changes hands there comes from a family rather than the cemetery office.",
    ],
    facts: [
      { label: "Terrain", value: "Largely flat throughout" },
      { label: "Access", value: "Many sections close to the curb" },
      { label: "Layout", value: "Named gardens, not numbered blocks" },
    ],
    hero: RESTLAND_HERO,
    photos: RESTLAND_PHOTOS.slice(0, 3),
  },
  {
    name: "Sparkman/Hillcrest Memorial Park",
    slug: "sparkman-hillcrest-memorial-park",
    city: "Dallas",
    area: "Northwest Highway, North Dallas",
    standfirst: "The most varied grounds in Dallas — every lawn here looks like a different cemetery.",
    body: [
      "Sparkman/Hillcrest has more variability than any other park in the metroplex. Walk it end to end and the lawns look genuinely different from one another: clipped formal gardens around the fountain, open oak lawn further in, upright-monument areas, and quiet lawns held by particular communities, including the Temple Shalom section.",
      "The Ross Perot memorial is here, set around the back of the cemetery in a deliberately discreet location. It is not signposted from the entrance and most visitors pass without noticing it, which is very much the point.",
      "The main mausoleum is beautiful. Individual stained glass windows are set into the family alcoves, so the light inside changes through the day and each family bay carries its own glass rather than a repeated pattern.",
    ],
    facts: [
      { label: "Character", value: "Highly varied lawns and gardens" },
      { label: "Landmark", value: "Ross Perot memorial, discreetly placed" },
      { label: "Mausoleum", value: "Individual stained glass per family alcove" },
    ],
    hero: SPARKMAN_HERO,
    photos: SPARKMAN_PHOTOS.slice(0, 3),
  },
  {
    name: "Bluebonnet Hills Memorial Park",
    slug: "bluebonnet-hills-memorial-park",
    city: "Colleyville",
    area: "Harwood Road, Mid-Cities",
    standfirst: "A lake at the centre, a fountain on the water, and a funeral home at the gate.",
    body: [
      "Bluebonnet Hills is built around a lake. The fountain sits mid-water with a colonnade of lawn crypts on the far bank, and the walks, hedges and memorial benches all face it. It is the prettiest water feature at any park we cover in the Mid-Cities.",
      "The rest of the grounds are level and easy to walk, with a Christus figure anchoring the centre garden and a separate cremation garden under a pergola. The funeral home sits right at the entrance, so a service and the interment happen in one place on the same morning.",
    ],
    facts: [
      { label: "Setting", value: "Lake, fountain and lakeside colonnade" },
      { label: "On site", value: "Funeral home at the entrance" },
      { label: "Cremation", value: "Dedicated garden with niche walls" },
    ],
    hero: BLUEBONNET_HERO,
    photos: BLUEBONNET_PHOTOS.slice(0, 3),
  },
  {
    name: "Laurel Land Memorial Park",
    slug: "laurel-land-memorial-park-fort-worth",
    city: "Fort Worth",
    area: "Crowley Road, South Fort Worth",
    standfirst: "Level lawn under broad oaks, with the funeral home on the grounds.",
    body: [
      "Laurel Land in Fort Worth reads as one open park rather than a series of enclosures. Flat markers run right through the lawn sections, so the sight lines stay clear and the mature oaks do the work of dividing the space.",
      "The funeral home is on the grounds, which is the practical reason a lot of south Fort Worth families chose it decades ago — chapel, service and interment without moving the family across town. Most of what we resell here sits in the established sections under that older shade.",
    ],
    facts: [
      { label: "Terrain", value: "Level lawn, flat markers throughout" },
      { label: "On site", value: "Funeral home and chapel" },
      { label: "Sections", value: "Established shade sections predominate" },
    ],
    hero: LAUREL_LAND_HERO,
    photos: LAUREL_LAND_PHOTOS.slice(0, 3),
  },
  {
    name: "Rest Haven Memorial Park",
    slug: "rest-haven-memorial-park-rowlett",
    city: "Rockwall",
    area: "State Highway 66, Rockwall County",
    standfirst: "Tree-lined avenues east of the lake, with a statue lawn at the centre.",
    body: [
      "Rest Haven sits on Highway 66 east of Lake Ray Hubbard, and the drive in tells you most of what you need to know: long avenues of flat markers, live oaks over the older gardens, and a statue lawn holding the middle of the park.",
      "It is an easy park to visit — level walks, a shaded pavilion near the newer gardens, and benches under the oaks. Rockwall families who want to stay on this side of the lake rather than drive into Dallas tend to start here.",
    ],
    facts: [
      { label: "Setting", value: "East of Lake Ray Hubbard" },
      { label: "Terrain", value: "Level walks and tree-lined avenues" },
      { label: "Features", value: "Statue lawn, garden pavilion, oak benches" },
    ],
    hero: RESTHAVEN_HERO,
    photos: RESTHAVEN_PHOTOS.slice(0, 3),
  },
];
