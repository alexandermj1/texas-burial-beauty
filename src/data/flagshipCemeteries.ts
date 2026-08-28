// Deep, hand-built profiles for the five Dallas–Fort Worth cemeteries that
// generate the most inquiries for us. These power the rebuilt flagship pages
// at /cemeteries/<slug> (see src/pages/FlagshipCemeteryPage.tsx).
//
// Everything here is either (a) verified from the cemetery registry table,
// (b) taken from real section names customers have given us on submissions,
// or (c) presented explicitly as an estimated range. Never state a specific
// asking price for a live listing here.

export type PriceTier = "premium" | "standard" | "value";

export interface FlagshipSection {
  name: string;
  kind: "Ground" | "Lawn crypt" | "Mausoleum" | "Niche" | "Veteran" | "Infant";
  tier: PriceTier;
  note: string;
}

export interface FlagshipPriceRow {
  /** Property type label used across the site. */
  type: string;
  /** Cemetery counter price today, estimated range. */
  retail: [number, number];
  /** What resale spaces here typically trade for. */
  resale: [number, number];
}

export interface FlagshipFaq {
  q: string;
  a: string;
}

export interface FlagshipCemetery {
  slug: string;
  name: string;
  /** Alternative spellings people search for — used in copy and schema. */
  alsoKnownAs: string[];
  city: string;
  region: string;
  address: string;
  lat: number;
  lng: number;
  website: string;
  /** Verified transfer fee per space from the registry. */
  transferFee: number;
  operator: string;
  /** Short editorial kicker under the eyebrow. */
  tagline: string;
  /** 2–3 paragraph editorial intro. */
  intro: string[];
  /** Quick-glance facts rail. */
  facts: { label: string; value: string }[];
  sections: FlagshipSection[];
  pricing: FlagshipPriceRow[];
  /** Local, specific things a buyer or seller here should know. */
  localNotes: string[];
  faqs: FlagshipFaq[];
  /** Slugs of the other DFW cemeteries to cross-link. */
  nearby: string[];
  seo: { title: string; description: string; h1: string };
}

const DFW = "Dallas–Fort Worth";

export const FLAGSHIP_CEMETERIES: FlagshipCemetery[] = [
  {
    slug: "restland-memorial-park",
    name: "Restland Memorial Park",
    alsoKnownAs: ["Restland Cemetery", "Restland Funeral Home & Cemetery", "Restland Dallas"],
    city: "Dallas",
    region: DFW,
    address: "13005 Greenville Ave, Dallas, TX 75243",
    lat: 32.9297528,
    lng: -96.7409195,
    website: "https://restlandfuneralhome.com",
    transferFee: 1495,
    operator: "Independently operated memorial park",
    tagline: "The most-requested cemetery in North Texas",
    intro: [
      "Restland Memorial Park on Greenville Avenue is the single most-requested cemetery in our entire Texas book — it generates more buyer and seller inquiries than any other park in the state. That demand cuts both ways: buyers face long waits and premium counter pricing in the established gardens, and owners who bought decades ago are usually holding property worth far more than they paid.",
      "Almost everything that changes hands in Restland's mature gardens now moves through resale. The cemetery office cannot sell you a new space next to a relative in a closed garden; another family has to be willing to release theirs. That is exactly the market we broker — and because we hold both sides, a Restland space is often matched within weeks rather than months.",
    ],
    facts: [
      { label: "City", value: "Dallas (Richardson line)" },
      { label: "Gardens mapped", value: "90+ named gardens" },
      { label: "Transfer fee", value: "$1,495 per space" },
      { label: "Resale demand", value: "Exceptional — #1 in Texas" },
    ],
    sections: [
      { name: "Garden of the Last Supper", kind: "Ground", tier: "premium", note: "Feature garden with statuary — mature, and effectively closed at the counter." },
      { name: "Garden of Ascension", kind: "Ground", tier: "premium", note: "Established feature garden; resale only for most lots." },
      { name: "Chapel Garden II", kind: "Mausoleum", tier: "premium", note: "Indoor and garden crypts by tier — eye-level tiers carry a premium." },
      { name: "Fountain View", kind: "Ground", tier: "premium", note: "Water-feature garden, popular for family groupings of four." },
      { name: "Valley View", kind: "Ground", tier: "value", note: "Larger open lawn area; counter pricing here sits well below the feature gardens." },
      { name: "Islamic Garden", kind: "Ground", tier: "value", note: "Faith-designated garden near the north drive; the most accessible counter pricing on the property." },
    ],
    pricing: [
      { type: "Single burial space", retail: [10000, 18000], resale: [4500, 9500] },
      { type: "Companion / two spaces", retail: [20000, 34000], resale: [9000, 18000] },
      { type: "Lawn crypt (double depth)", retail: [16000, 26000], resale: [8000, 15000] },
      { type: "Mausoleum crypt", retail: [13000, 30000], resale: [7000, 18000] },
      { type: "Cremation niche", retail: [3500, 9000], resale: [2000, 5500] },
    ],
    localNotes: [
      "Restland charges the highest transfer fee we record anywhere in DFW — $1,495 per space. We confirm the current figure in writing before either side commits, and we tell you plainly who is expected to pay it.",
      "Counter pricing is not flat across the park. The feature gardens along the Greenville Avenue side sit near the top of the range, while faith-designated and open-lawn gardens can be thousands less for identical ground.",
      "Feature gardens such as the Last Supper, Ascension and Fountain View are mature. If someone tells you these are 'sold out', that is true at the counter — it is not true on the resale market.",
      "Restland spans a very large site. Use the garden map on this page to find your section before you visit — walking the wrong end of Greenville Avenue in July is nobody's idea of a good morning.",
    ],
    faqs: [
      {
        q: "Can you still buy plots at Restland Memorial Park?",
        a: "Yes — but in the established gardens you are almost always buying from a current owner rather than from the cemetery. Restland's older feature gardens are effectively closed at the counter, so resale is the route in. We match buyers to verified Restland owners and handle the cemetery's transfer end to end.",
      },
      {
        q: "How much are cemetery plots at Restland in Dallas?",
        a: "Counter pricing at Restland varies a great deal by garden — a single space in an established feature garden sits in the mid-teens of thousands, while quieter open-lawn and faith gardens are meaningfully less. Resale spaces typically trade at roughly half of counter pricing, which is where most families save. We quote a real number once we know the garden, lot and space.",
      },
      {
        q: "What is the transfer fee at Restland Memorial Park?",
        a: "Restland's recorded transfer fee is $1,495 per space, the highest we hold on file in Dallas–Fort Worth. It is paid to the cemetery to record the change of ownership and is separate from the purchase price. We confirm the live figure with the cemetery before closing.",
      },
      {
        q: "How do I sell a cemetery plot at Restland?",
        a: "Send us the deed details — names on the deed, garden or section, lot and space. We give you a free valuation, usually within one business day, then list, market and screen buyers, take payment safely and file the transfer paperwork with Restland. Restland is our highest-demand cemetery, so time on market here is typically short.",
      },
      {
        q: "Is Restland Memorial Park the same as Restland in Plano?",
        a: "No. Restland Funeral Home & Cemetery in Plano on East Park Boulevard is a separate location from the main Restland Memorial Park on Greenville Avenue in Dallas. Deeds are not interchangeable between them, so check which one your paperwork names — we can look it up for you.",
      },
    ],

    nearby: ["sparkman-hillcrest-memorial-park", "grove-hill-memorial-park", "laurel-land-memorial-park-dallas"],
    seo: {
      title: "Restland Cemetery Plots for Sale, Dallas | Prices & Fees",
      description:
        "Restland Memorial Park plots for sale in Dallas. Resale prices, garden-by-garden guide, the $1,495 transfer fee and free valuations for owners selling.",
      h1: "Restland Memorial Park",
    },
  },
  {
    slug: "sparkman-hillcrest-memorial-park",
    name: "Sparkman-Hillcrest Memorial Park",
    alsoKnownAs: ["Sparkman/Hillcrest", "Hillcrest Memorial Park Dallas", "Sparkman Hillcrest Cemetery"],
    city: "Dallas",
    region: DFW,
    address: "7405 W Northwest Hwy, Dallas, TX 75225",
    lat: 32.8670251,
    lng: -96.7801137,
    website:
      "https://dignitymemorial.com/funeral-homes/texas/dallas/sparkman-hillcrest-funeral-home/2251",
    transferFee: 595,
    operator: "Dignity Memorial (SCI)",
    tagline: "Park Cities address, statement property",
    intro: [
      "Sparkman-Hillcrest sits on Northwest Highway beside the Park Cities, and it prices like it. It is the address North Dallas families ask for by name, and the one where the gap between what an owner paid in the 1970s and what the space is worth today is widest.",
      "Because the desirable garden and mausoleum locations here rarely come back to the counter, resale is the practical market. For sellers that means genuinely strong pricing; for buyers it means a Park Cities interment at a number the cemetery office cannot offer you.",
    ],
    facts: [
      { label: "Location", value: "Northwest Hwy, North Dallas" },
      { label: "Operator", value: "Dignity Memorial" },
      { label: "Transfer fee", value: "$595 per space" },
      { label: "Resale demand", value: "Very high — premium pricing" },
    ],
    sections: [
      { name: "Providence Monument Garden", kind: "Ground", tier: "premium", note: "Upright-monument garden — the most expensive ground we transact on the property." },
      { name: "Garden of Roses", kind: "Ground", tier: "premium", note: "Feature garden held almost entirely by families; counter availability is rare." },
      { name: "Mausoleum crypts", kind: "Mausoleum", tier: "premium", note: "Interior and exterior crypts — tier height drives the price materially." },
      { name: "Cremation gardens & niches", kind: "Niche", tier: "standard", note: "The fastest-growing category here and the most affordable way in." },
      { name: "Established lawn sections", kind: "Ground", tier: "standard", note: "Mature lawns holding two to four contiguous spaces." },
    ],
    pricing: [
      { type: "Single burial space", retail: [12000, 26000], resale: [6000, 15000] },
      { type: "Companion / two spaces", retail: [24000, 50000], resale: [12000, 28000] },
      { type: "Mausoleum crypt", retail: [18000, 45000], resale: [10000, 28000] },
      { type: "Cremation niche", retail: [5000, 12000], resale: [2800, 7000] },
    ],
    localNotes: [
      "Sparkman-Hillcrest carries the highest ground prices we see in Dallas — monument gardens here transact at multiples of what the same square footage costs elsewhere in the metroplex. If you inherited spaces, do not assume they are worth what the family paid.",
      "The transfer fee on file is $595 per space, materially cheaper than Restland. That matters when you are comparing two options across the city.",
      "Buyers who cannot reach Sparkman-Hillcrest pricing often land well at Restland or Grove Hill for a similar section quality — we will say so rather than push you into a stretch.",
    ],
    faqs: [
      {
        q: "How much does a plot cost at Sparkman-Hillcrest?",
        a: "Counter pricing at Sparkman-Hillcrest is the highest in Dallas — feature and monument gardens reach the mid-twenties of thousands for a single space, with mausoleum crypts higher again. Resale spaces trade for a substantial discount to that. We give you a precise figure once we know the garden and space.",
      },

      {
        q: "Are there plots available at Sparkman-Hillcrest?",
        a: "The best locations are held by families rather than the cemetery, so availability changes week to week. Tell us the garden or general area you want and we will search both active inventory and our private owner network at Sparkman-Hillcrest.",
      },
      {
        q: "What is the transfer fee at Sparkman-Hillcrest Memorial Park?",
        a: "We hold $595 per space on file for Sparkman-Hillcrest. It is paid to the cemetery to record the deed change and is confirmed in writing before closing.",
      },
      {
        q: "I inherited spaces at Sparkman-Hillcrest — what are they worth?",
        a: "Often considerably more than the family paid. Send us the deed and we will value it free, usually within one business day. If you decide to sell, we handle marketing, buyer screening, payment and the cemetery transfer, and you pay nothing up front.",
      },
    ],
    nearby: ["restland-memorial-park", "grove-hill-memorial-park", "bluebonnet-hills-memorial-park"],
    seo: {
      title: "Sparkman-Hillcrest Plots for Sale, Dallas | Prices & Fees",
      description:
        "Sparkman-Hillcrest Memorial Park plots, crypts and niches for sale in Dallas. Resale price ranges, the $595 transfer fee and free valuations for owners.",
      h1: "Sparkman-Hillcrest Memorial Park",
    },
  },
  {
    slug: "bluebonnet-hills-memorial-park",
    name: "Bluebonnet Hills Memorial Park",
    alsoKnownAs: [
      "Bluebonnet Hills Funeral Home & Memorial Park",
      "Bluebonnet Hills Cemetery Colleyville",
      "Bluebonnet Memorial Park",
    ],
    city: "Colleyville",
    region: DFW,
    address: "5725 Colleyville Blvd, Colleyville, TX 76034",
    lat: 32.8945105,
    lng: -97.143044,
    website:
      "https://www.dignitymemorial.com/funeral-homes/texas/colleyville/bluebonnet-hills-funeral-home/9650",
    transferFee: 595,
    operator: "Dignity Memorial (SCI)",
    tagline: "The Mid-Cities' most-requested memorial park",
    intro: [
      "Bluebonnet Hills on Colleyville Boulevard is one of the prettiest memorial parks in the Mid-Cities. The grounds are built around a spring-fed lake with a fountain at its centre, and the walkways, clipped hedges and memorial benches follow the water the whole way round — it feels closer to a park than a cemetery.",
      "The funeral home sits right at the entrance, which families here appreciate: the service, the reception and the grounds are all in one place, a few minutes from Grapevine, Southlake, Bedford and Hurst. Beyond the lake the park opens into wide, level lawns, a colonnade of lawn crypts, a cremation garden with granite niche walls and named gardens marked by cast-metal signs.",
    ],
    facts: [
      { label: "City", value: "Colleyville (Mid-Cities)" },
      { label: "Operator", value: "Dignity Memorial" },
      { label: "Transfer fee", value: "$595 per space" },
      { label: "Setting", value: "Lakeside park with on-site funeral home" },
    ],
    sections: [
      { name: "Garden of Tranquility", kind: "Ground", tier: "premium", note: "Established feature garden of flat lawn markers." },
      { name: "Garden of Devotion", kind: "Ground", tier: "premium", note: "Mature garden, typically available as resale only." },
      { name: "Garden of Remembrance", kind: "Ground", tier: "standard", note: "Wide mature lawn, often held by families in groups of four." },
      { name: "Garden of Serenity", kind: "Ground", tier: "standard", note: "Quieter garden set back from the main drive." },
      { name: "Garden of the Rainbow", kind: "Ground", tier: "value", note: "Good value ground for single spaces." },
      { name: "Garden of Columns", kind: "Ground", tier: "premium", note: "Open lawn toward the north drive; counter pricing here sits at the upper end of the park." },
      { name: "Court of Prayer / Court of Fidelity", kind: "Lawn crypt", tier: "value", note: "Double-depth lawn crypts described by tier and row — two interments in one footprint, and the best value here." },
    ],

    pricing: [
      { type: "Single burial space", retail: [6000, 14000], resale: [3200, 7500] },
      { type: "Companion / two spaces", retail: [12000, 26000], resale: [6000, 14000] },
      { type: "Lawn crypt (double depth)", retail: [4500, 12000], resale: [2600, 7000] },
      { type: "Mausoleum crypt", retail: [12000, 26000], resale: [7000, 15000] },
      { type: "Cremation niche", retail: [3500, 8000], resale: [2000, 4800] },
    ],
    localNotes: [
      "Counter pricing swings widely by lawn here — a single grave space in the Columns garden can cost several times a lawn crypt tier in the Court of Fidelity. Tell us the garden and we will tell you where it sits.",
      "Double-depth lawn crypts in the Court of Prayer and Court of Fidelity are described by tier and row rather than lot and space. Have that line from your deed to hand — it changes the value.",
      "Mid-Cities buyers frequently consider Bluebonnet Hills and Moore Memorial Gardens in Arlington side by side. We will tell you honestly which one fits your budget and timing.",
      "The transfer fee on file is $595 per space, and we confirm it with the cemetery before anyone signs.",
    ],
    faqs: [
      {
        q: "How much are cemetery plots at Bluebonnet Hills in Colleyville?",
        a: "It depends heavily on the lawn. Premium garden ground reaches the low teens of thousands at the counter, while lawn crypt tiers in the courts are a fraction of that. Resale spaces typically trade at roughly half of counter pricing. We quote precisely once we know the garden.",

      },
      {
        q: "Which gardens at Bluebonnet Hills come up for resale most often?",
        a: "Tranquility, Devotion, Remembrance and Serenity are the gardens we see move most, along with double-depth lawn crypts in the Court of Prayer and Court of Fidelity. Tell us the garden you want and we will watch for it.",
      },
      {
        q: "What is the transfer fee at Bluebonnet Hills Memorial Park?",
        a: "$595 per space on our current file, paid to the cemetery to record the ownership change. It is confirmed in writing before closing.",
      },
      {
        q: "Can I sell just two of the four spaces my family owns?",
        a: "Yes, and it is very common here. Families regularly keep two spaces in a garden and release the other two. We handle the split on the deed and the cemetery paperwork.",
      },
    ],
    nearby: ["laurel-land-memorial-park-fort-worth", "sparkman-hillcrest-memorial-park", "restland-memorial-park"],
    seo: {
      title: "Bluebonnet Hills Plots for Sale, Colleyville TX | Prices",
      description:
        "Bluebonnet Hills Memorial Park plots for sale in Colleyville. Garden-by-garden resale prices, lawn crypts, the $595 transfer fee and free seller valuations.",
      h1: "Bluebonnet Hills Memorial Park",
    },
  },
  {
    slug: "laurel-land-memorial-park-fort-worth",
    name: "Laurel Land Memorial Park Fort Worth",
    alsoKnownAs: ["Laurel Land Fort Worth", "Laurel Land Funeral Home Fort Worth", "Laurel Land Crowley Road"],
    city: "Fort Worth",
    region: DFW,
    address: "7100 Crowley Rd, Fort Worth, TX 76134",
    lat: 32.6422616,
    lng: -97.3507336,
    website:
      "https://dignitymemorial.com/funeral-homes/texas/fort-worth/laurel-land-fh-ft-worth/9651",
    transferFee: 595,
    operator: "Dignity Memorial (SCI)",
    tagline: "South Fort Worth's veteran-strong memorial park",
    intro: [
      "Laurel Land on Crowley Road is the memorial park south Fort Worth families come back to across generations, and it has one of the strongest veteran followings in the metroplex — the Court of Liberty and Veterans II sections are requested by name.",
      "It is also the Laurel Land people most often mix up with the Dallas park of the same name. They are two separate cemeteries with separate deeds and separate inventory. We work both, so if your family's paperwork is ambiguous, we can settle it quickly.",
    ],
    facts: [
      { label: "City", value: "Fort Worth (south)" },
      { label: "Operator", value: "Dignity Memorial" },
      { label: "Transfer fee", value: "$595 per space" },
      { label: "Resale demand", value: "High — steady turnover" },
    ],
    sections: [
      { name: "Garden of Peace", kind: "Ground", tier: "standard", note: "Frequently traded lawn; contiguous groups of three and four appear here." },
      { name: "Garden of Rest", kind: "Ground", tier: "standard", note: "Mature lawn with regular resale availability." },
      { name: "Garden Highland", kind: "Ground", tier: "premium", note: "Elevated ground; family lots of four are common." },
      { name: "Veterans II / Court of Liberty", kind: "Veteran", tier: "premium", note: "Veteran crypts and ground identified by crypt and block." },
      { name: "Garden niches", kind: "Niche", tier: "value", note: "Outdoor niche sections — the most affordable option on the property." },
      { name: "Numbered sections (3, 17, 36, 42)", kind: "Ground", tier: "value", note: "Older numbered lawns; best value per space at Laurel Land." },
    ],
    pricing: [
      { type: "Single burial space", retail: [4800, 7500], resale: [2500, 4500] },
      { type: "Companion / two spaces", retail: [9500, 15000], resale: [5000, 9000] },
      { type: "Veteran crypt", retail: [11000, 15000], resale: [6000, 9500] },
      { type: "Mausoleum crypt", retail: [11000, 22000], resale: [6000, 13000] },
      { type: "Cremation niche", retail: [3000, 7000], resale: [1800, 4200] },
    ],
    localNotes: [
      "Ground pricing here is unusually consistent across the numbered sections and named gardens, which makes valuations quick and disputes rare. Crypts in the Court of Liberty sit in a much higher band.",
      "Veteran property here is described by crypt and block (for example Court of Liberty, Crypt 48, Block C). Bring that line and we can value it the same day.",
      "Check your deed carefully: Laurel Land Fort Worth on Crowley Road and Laurel Land Dallas on R.L. Thornton are different cemeteries. A deed for one cannot be used at the other.",
      "Transfer fee on file is $595 per space, and both Laurel Land parks share the same figure.",
    ],
    faqs: [
      {
        q: "How much are cemetery plots at Laurel Land Fort Worth?",
        a: "Ground spaces here sit in the mid-thousands at the counter, with veteran crypts several times higher. Resale ground typically trades at roughly half of counter pricing, which makes Laurel Land Fort Worth one of the better-value established parks in the metroplex.",
      },

      {
        q: "Is Laurel Land Fort Worth the same as Laurel Land Dallas?",
        a: "No. They are two separate cemeteries — Crowley Road in Fort Worth and R.L. Thornton Freeway in Dallas — with separate records and separate inventory. Send us your deed and we will confirm which park you own in.",
      },
      {
        q: "Are veteran sections at Laurel Land available to buy?",
        a: "Veteran sections such as Veterans II and the Court of Liberty are largely resale at this point. We watch for owners releasing veteran ground and crypts and can notify you when something matching comes up.",
      },
      {
        q: "What does it cost to transfer a plot at Laurel Land Fort Worth?",
        a: "$595 per space on our current file, paid to the cemetery to record the transfer. We confirm the live figure before closing and tell you which side is paying it.",
      },
    ],
    nearby: ["laurel-land-memorial-park-dallas", "bluebonnet-hills-memorial-park", "grove-hill-memorial-park"],
    seo: {
      title: "Laurel Land Fort Worth Plots for Sale | Prices & Fees",
      description:
        "Laurel Land Memorial Park Fort Worth plots, veteran crypts and niches for sale. Resale price ranges, the $595 transfer fee and free valuations for owners.",
      h1: "Laurel Land Memorial Park, Fort Worth",
    },
  },
  {
    slug: "laurel-land-memorial-park-dallas",
    name: "Laurel Land Memorial Park Dallas",
    alsoKnownAs: ["Laurel Land Dallas", "Laurel Land Cemetery Dallas", "Laurel Land Funeral Home Dallas"],
    city: "Dallas",
    region: DFW,
    address: "6300 S R.L. Thornton Fwy, Dallas, TX 75232",
    lat: 32.6697717,
    lng: -96.8140807,
    website:
      "https://dignitymemorial.com/funeral-homes/texas/dallas/laurel-land-funeral-home/9652",
    transferFee: 595,
    operator: "Dignity Memorial (SCI)",
    tagline: "South Dallas' landmark memorial park",
    intro: [
      "Laurel Land on the R.L. Thornton Freeway has served south Dallas for generations, and much of what changes hands here comes from families who bought four spaces decades ago and now need two. Its numbered sections make matching straightforward, and prices remain among the most reasonable of the established Dallas parks.",
      "If you are searching 'Laurel Land' generally, be aware there are two: this one in Dallas and the Fort Worth park on Crowley Road. We broker both and can tell you within minutes which one your deed refers to.",
    ],
    facts: [
      { label: "Location", value: "R.L. Thornton Fwy, south Dallas" },
      { label: "Operator", value: "Dignity Memorial" },
      { label: "Transfer fee", value: "$595 per space" },
      { label: "Resale demand", value: "High — family lots common" },
    ],
    sections: [
      { name: "Good Shepherd", kind: "Ground", tier: "premium", note: "Named feature garden; groups of three and four appear here regularly." },
      { name: "Veteran Garden II", kind: "Veteran", tier: "standard", note: "Veteran ground, usually released in pairs." },
      { name: "Court of Inspiration", kind: "Mausoleum", tier: "premium", note: "Mausoleum crypts identified by crypt number and tier." },
      { name: "Numbered sections (19, 28, 51, 67)", kind: "Ground", tier: "value", note: "Established numbered lawns — the best value ground on the property." },
      { name: "Babyland (Section 49)", kind: "Infant", tier: "value", note: "Infant and child section; handled with particular care." },
    ],
    pricing: [
      { type: "Single burial space", retail: [5000, 7500], resale: [2600, 4500] },
      { type: "Companion / two spaces", retail: [10000, 15000], resale: [5200, 9000] },
      { type: "Lawn crypt (double depth)", retail: [10000, 14000], resale: [5500, 8500] },
      { type: "Mausoleum crypt", retail: [11000, 24000], resale: [6000, 14000] },
      { type: "Cremation niche", retail: [3000, 7500], resale: [1800, 4500] },
    ],
    localNotes: [
      "Entry-level sections here are flat-monument only, which keeps counter pricing low and consistent; double-depth crypts in the Court of Inspiration sit roughly twice as high.",
      "Most Laurel Land Dallas property is described by section, lot and space (for example Section 51, Lot 69, Space 6). That one line lets us value it accurately without a site visit.",
      "Family holdings of four are the norm here. Selling two and keeping two is completely permitted and we handle the deed split.",
      "Transfer fee on file is $595 per space, confirmed with the cemetery before closing.",
    ],
    faqs: [
      {
        q: "How much do plots cost at Laurel Land Memorial Park in Dallas?",
        a: "Ground spaces sit in the mid-thousands at the counter depending on the section, and double-depth crypts in the Court of Inspiration run roughly double that. Resale spaces typically trade at around half of counter pricing.",
      },

      {
        q: "Which Laurel Land does my deed refer to?",
        a: "Look for the address. Laurel Land Memorial Park Dallas is on the R.L. Thornton Freeway; Laurel Land Fort Worth is on Crowley Road. If the deed is unclear, send it to us and we will confirm it with the cemetery.",
      },
      {
        q: "Can I sell an inherited plot at Laurel Land Dallas?",
        a: "Yes. Where the deed owner has passed away, the right to sell passes to the heirs, and we walk you through the short paperwork trail — usually a death certificate and a signed authority. There is nothing to pay up front.",
      },
      {
        q: "What is the transfer fee at Laurel Land Dallas?",
        a: "$595 per space on our current file, paid to the cemetery to record the change of ownership.",
      },
    ],
    nearby: ["laurel-land-memorial-park-fort-worth", "restland-memorial-park", "grove-hill-memorial-park"],
    seo: {
      title: "Laurel Land Dallas Plots for Sale | Prices & Transfer Fee",
      description:
        "Laurel Land Memorial Park Dallas plots and crypts for sale on R.L. Thornton. Section-by-section resale prices, the $595 transfer fee and free valuations.",
      h1: "Laurel Land Memorial Park, Dallas",
    },
  },
];

export const flagshipBySlug = (slug: string | undefined) =>
  slug ? FLAGSHIP_CEMETERIES.find((c) => c.slug === slug) : undefined;

export const flagshipByName = (name: string | undefined) =>
  name ? FLAGSHIP_CEMETERIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) : undefined;

export const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
export const range = (r: [number, number]) => `${money(r[0])} – ${money(r[1])}`;
