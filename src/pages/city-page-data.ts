// Data for the city landing pages (/cemetery-plots-for-sale-:city).
// Each entry powers one page targeting local buy + sell intent.

export interface CityCemetery {
  name: string;
  slug: string;
  area: string;
}

export interface CityPageData {
  slug: string; // route suffix, e.g. "houston"
  city: string; // "Houston"
  metro: string; // "Greater Houston"
  title: string;
  description: string;
  h1Lead: string;
  intro: string;
  retailRange: string; // typical cemetery retail range
  resaleRange: string; // typical resale range
  neighborhoods: string[];
  cemeteries: CityCemetery[];
  notes: string[]; // 2–3 local specifics
}

export const CITY_PAGES: CityPageData[] = [
  {
    slug: "houston",
    city: "Houston",
    metro: "Greater Houston",
    title: "Cemetery Plots for Sale in Houston, TX | Below Retail",
    description:
      "Buy or sell cemetery plots in Houston, TX. Resale spaces at Forest Park, Memorial Oaks, Earthman, Brookside and more — typically 30–50% below cemetery retail.",
    h1Lead: "Cemetery Plots for Sale in",
    intro:
      "Houston has some of the highest cemetery retail pricing in Texas, and many of its most desirable sections are sold out at the cemetery office. The resale market is where families still find space — often beside relatives already interred.",
    retailRange: "$4,500 – $12,000 per space",
    resaleRange: "$2,200 – $6,500 per space",
    neighborhoods: [
      "Memorial & West Houston",
      "The Heights",
      "Katy & Cypress",
      "Pearland & Friendswood",
      "Sugar Land & Fort Bend",
      "Clear Lake & Galveston County",
    ],
    cemeteries: [
      { name: "Forest Park Lawndale", slug: "forest-park-lawndale-cemetery", area: "East Houston" },
      { name: "Forest Park Westheimer", slug: "forest-park-westheimer-cemetery", area: "West Houston" },
      { name: "Forest Park East", slug: "forest-park-east-cemetery", area: "Webster" },
      { name: "Memorial Oaks Cemetery", slug: "memorial-oaks-cemetery", area: "Katy Freeway" },
      { name: "Earthman Resthaven", slug: "earthman-resthaven-cemetery", area: "North Houston" },
      { name: "Earthman Memory Gardens", slug: "earthman-memory-gardens", area: "Baytown" },
      { name: "Brookside Memorial Park", slug: "brookside-memorial-park", area: "Northeast Houston" },
      { name: "Garden Oaks Memorial Park", slug: "garden-oaks-memorial-park", area: "Inner Loop" },
      { name: "Klein Memorial Park", slug: "klein-memorial-park", area: "Tomball / Klein" },
      { name: "Forest Lawn Cemetery", slug: "forest-lawn-cemetery-houston", area: "South Houston" },
      { name: "Rosewood Memorial Park", slug: "rosewood-memorial-park", area: "Humble" },
      { name: "Houston National Cemetery", slug: "houston-national-cemetery", area: "Veterans (no resale)" },
    ],
    notes: [
      "Transfer fees at Houston parks commonly run $250–$695 per space, and several of the corporate-owned parks require the seller to sign a notarised assignment before recording.",
      "Sold-out sections at Forest Park Lawndale and Memorial Oaks are only obtainable through resale — the cemetery office cannot sell new spaces there.",
      "Houston flood-zone questions come up often: we can tell you which sections sit on higher ground before you commit.",
    ],
  },
  {
    slug: "dallas",
    city: "Dallas–Fort Worth",
    metro: "Dallas–Fort Worth",
    title: "Cemetery Plots for Sale in Dallas–Fort Worth, TX",
    description:
      "Buy or sell cemetery plots across Dallas–Fort Worth. Resale spaces at Restland, Sparkman/Hillcrest, Laurel Land, Greenwood and Grove Hill — below cemetery retail.",
    h1Lead: "Cemetery Plots for Sale in",
    intro:
      "DFW is the largest cemetery resale market in Texas. Retail pricing at the metroplex's memorial parks has risen sharply, while owners who moved away or changed plans are selling the same spaces for a fraction of today's counter price.",
    retailRange: "$4,000 – $15,000 per space",
    resaleRange: "$1,900 – $7,000 per space",
    neighborhoods: [
      "North Dallas & Richardson",
      "Plano, Frisco & McKinney",
      "Garland & Rowlett",
      "Arlington & Mid-Cities",
      "Fort Worth & Keller",
      "Irving & Las Colinas",
    ],
    cemeteries: [
      { name: "Restland Memorial Park", slug: "restland-memorial-park", area: "North Dallas" },
      { name: "Sparkman/Hillcrest Memorial Park", slug: "sparkman-hillcrest-memorial-park", area: "North Dallas" },
      { name: "Laurel Land Memorial Park (Dallas)", slug: "laurel-land-memorial-park-dallas", area: "South Dallas" },
      { name: "Laurel Land Memorial Park (Fort Worth)", slug: "laurel-land-memorial-park-fort-worth", area: "Fort Worth" },
      { name: "Greenwood Memorial Park", slug: "greenwood-memorial-park-fort-worth", area: "Fort Worth" },
      { name: "Grove Hill Memorial Park", slug: "grove-hill-memorial-park", area: "East Dallas" },
      { name: "Bluebonnet Hills Memorial Park", slug: "bluebonnet-hills-memorial-park", area: "Colleyville" },
      { name: "Calvary Hill Cemetery", slug: "calvary-hill-cemetery", area: "Catholic, Dallas" },
      { name: "Restland Funeral Home & Cemetery", slug: "restland-funeral-home-cemetery-plano", area: "Plano" },
      { name: "Rest Haven Memorial Park", slug: "rest-haven-memorial-park-rowlett", area: "Rowlett" },
      { name: "Memorial Oaks Cemetery", slug: "memorial-oaks-cemetery-irving", area: "Irving" },
      { name: "DFW National Cemetery", slug: "dfw-national-cemetery", area: "Veterans (no resale)" },
    ],
    notes: [
      "Restland and Sparkman/Hillcrest are the two most-requested parks in Texas; garden-specific inventory moves quickly, so tell us the garden name if you already have one in mind.",
      "Transfer fees across DFW typically run $195–$595 per space, and Bluebonnet Hills currently charges $595.",
      "Many DFW families hold four contiguous spaces bought decades ago. Selling two and keeping two is common and completely allowed.",
    ],
  },
  {
    slug: "san-antonio",
    city: "San Antonio",
    metro: "San Antonio & South Texas",
    title: "Cemetery Plots for Sale in San Antonio, TX",
    description:
      "Buy or sell cemetery plots in San Antonio. Resale spaces at Mission Burial Park, Sunset Memorial, San Jose Burial Park, Roselawn and Holy Cross — below retail.",
    h1Lead: "Cemetery Plots for Sale in",
    intro:
      "San Antonio's older parks — Mission, Sunset and San Jose — hold generations of family sections, and much of what is available today comes from families rather than the cemetery counter.",
    retailRange: "$3,500 – $9,500 per space",
    resaleRange: "$1,600 – $4,800 per space",
    neighborhoods: [
      "Alamo Heights & North Central",
      "Stone Oak",
      "Southside & Mission District",
      "New Braunfels & Comal County",
      "Schertz & Universal City",
      "Boerne & the Hill Country",
    ],
    cemeteries: [
      { name: "Mission Burial Park North", slug: "mission-burial-park-north", area: "North San Antonio" },
      { name: "Mission Burial Park South", slug: "mission-burial-park-south", area: "South San Antonio" },
      { name: "Mission Park Cemeteries", slug: "mission-park-cemeteries", area: "Citywide" },
      { name: "Sunset Memorial Park", slug: "sunset-memorial-park", area: "Austin Highway" },
      { name: "San Jose Burial Park", slug: "san-jose-burial-park", area: "South Side" },
      { name: "Roselawn Memorial Park", slug: "roselawn-memorial-park", area: "Northeast" },
      { name: "Holy Cross Cemetery", slug: "holy-cross-cemetery-san-antonio", area: "Catholic" },
      { name: "Garden of Gethsemani", slug: "garden-of-gethsemani-catholic-cemetery", area: "Catholic" },
      { name: "San Fernando Cemeteries", slug: "san-fernando-cemeteries", area: "Historic / Catholic" },
      { name: "Rolling Oaks Memorial Center", slug: "rolling-oaks-memorial-center", area: "Northeast" },
      { name: "Fort Sam Houston National Cemetery", slug: "fort-sam-houston-national-cemetery", area: "Veterans (no resale)" },
    ],
    notes: [
      "Catholic cemeteries in San Antonio have their own transfer rules — some require the buyer to be a parishioner or approved by the archdiocese. We confirm eligibility before you pay anything.",
      "Sunset Memorial Park and Mission Burial Park North both have sections that closed years ago; resale is the only route into them.",
      "Transfer fees in San Antonio commonly run $150–$450 per space.",
    ],
  },
  {
    slug: "austin",
    city: "Austin",
    metro: "Austin & Central Texas",
    title: "Cemetery Plots for Sale in Austin, TX | Central Texas",
    description:
      "Buy or sell cemetery plots in Austin and Central Texas. Resale spaces at Cook-Walden, Austin Memorial Park, Capital Parks and Oakwood — below cemetery retail.",
    h1Lead: "Cemetery Plots for Sale in",
    intro:
      "Austin is the tightest cemetery market in Texas. Austin Memorial Park and Oakwood have effectively no new inventory, and Cook-Walden's newer gardens price well above the state average — which makes the resale market unusually valuable here for both buyers and sellers.",
    retailRange: "$5,000 – $14,000 per space",
    resaleRange: "$2,500 – $7,500 per space",
    neighborhoods: [
      "Central Austin & Hyde Park",
      "North Austin & Pflugerville",
      "Round Rock & Georgetown",
      "South Austin & Buda",
      "Cedar Park & Leander",
      "San Marcos & Kyle",
    ],
    cemeteries: [
      { name: "Austin Memorial Park Cemetery", slug: "austin-memorial-park-cemetery", area: "Central Austin" },
      { name: "Oakwood Cemetery", slug: "oakwood-cemetery-austin", area: "East Austin (historic)" },
      { name: "Cook-Walden Capital Parks", slug: "cook-walden-capital-parks", area: "Pflugerville" },
      { name: "Cook-Walden Forest Oaks", slug: "cook-walden-forest-oaks-funeral-home-cemetery", area: "North Austin" },
      { name: "Memorial Park Cemetery", slug: "memorial-park-cemetery-round-rock", area: "Round Rock" },
      { name: "Cedar Park Cemetery", slug: "cedar-park-cemetery", area: "Cedar Park" },
      { name: "San Marcos Cemetery", slug: "san-marcos-cemetery", area: "San Marcos" },
      { name: "Texas State Cemetery", slug: "texas-state-cemetery", area: "State honours (no resale)" },
      { name: "Central Texas State Veterans Cemetery", slug: "central-texas-state-veterans-cemetery", area: "Killeen (veterans)" },
    ],
    notes: [
      "Austin Memorial Park is city-owned and its transfer process runs through the City of Austin, which takes longer than a corporate park — plan on several weeks.",
      "Because Austin inventory is scarce, sellers here typically achieve the strongest resale prices in the state.",
      "If you're open to Round Rock, Georgetown or Pflugerville, the same budget usually buys a considerably better section.",
    ],
  },
];

export const getCityPage = (slug: string) => CITY_PAGES.find((c) => c.slug === slug);
