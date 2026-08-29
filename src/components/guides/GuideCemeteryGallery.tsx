import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { RESTLAND_HERO } from "@/data/restlandDossierPhotos";
import { SPARKMAN_HERO } from "@/data/sparkmanPhotos";
import { BLUEBONNET_HERO } from "@/data/bluebonnetPhotos";
import { LAUREL_LAND_HERO } from "@/data/laurelLandPhotos";
import { RESTHAVEN_HERO } from "@/data/resthavenPhotos";
import { RESTHAVEN_PHOTOS } from "@/data/resthavenPhotos";

export interface GuideCemeteryFeature {
  slug: string;
  name: string;
  city: string;
  /** One line of genuinely useful, non-inflammatory context. */
  note: string;
  src: string;
  alt: string;
  kicker: string;
}

/**
 * The cemeteries families ask us about most often, each with an editorial
 * photograph and a link through to that cemetery's full page. Used on both
 * the buyer's and seller's guides for internal linking and image SEO.
 */
export const GUIDE_CEMETERY_FEATURES: GuideCemeteryFeature[] = [
  {
    slug: "restland-memorial-park",
    name: "Restland Memorial Park",
    city: "Dallas",
    note: "Decades of established gardens off Greenville Avenue — the park we're asked about most in North Texas.",
    src: RESTLAND_HERO.src,
    alt: "Open lawn sections under mature trees at Restland Memorial Park on Greenville Avenue in Dallas, Texas",
    kicker: "Dallas · Greenville Avenue",
  },
  {
    slug: "sparkman-hillcrest-memorial-park",
    name: "Sparkman-Hillcrest Memorial Park",
    city: "Dallas",
    note: "Flat lawn markers, mature oaks and a funeral home on the grounds at Northwest Highway.",
    src: SPARKMAN_HERO.src,
    alt: "The fountain garden at Sparkman-Hillcrest Memorial Park on Northwest Highway in Dallas, Texas",
    kicker: "Dallas · Northwest Highway",
  },
  {
    slug: "bluebonnet-hills-memorial-park",
    name: "Bluebonnet Hills Memorial Park",
    city: "Colleyville",
    note: "A spring-fed lake, walkways and memorial benches, with the funeral home at the entrance.",
    src: BLUEBONNET_HERO.src,
    alt: "The lake and fountain at Bluebonnet Hills Memorial Park in Colleyville, Texas, with walkways and memorial benches",
    kicker: "Colleyville · Harwood Road",
  },
  {
    slug: "laurel-land-memorial-park-fort-worth",
    name: "Laurel Land Memorial Park",
    city: "Fort Worth",
    note: "Level lawn sections under broad oaks, with service and interment handled in one place.",
    src: LAUREL_LAND_HERO.src,
    alt: "Open lawn and mature trees over flat memorial markers at Laurel Land Memorial Park in Fort Worth, Texas",
    kicker: "Fort Worth · Crowley Road",
  },
  {
    slug: "rest-haven-memorial-park",
    name: "Rest Haven Memorial Park",
    city: "Rockwall",
    note: "Tree-lined avenues and quiet gardens east of Dallas on State Highway 66.",
    src: RESTHAVEN_HERO.src,
    alt: "Statue of Christ on the open lawn at Rest Haven Memorial Park in Rockwall, Texas",
    kicker: "Rockwall · Highway 66",
  },
  {
    slug: "forest-park-lawndale",
    name: "Forest Park Lawndale",
    city: "Houston",
    note: "One of Houston's landmark memorial parks, with gardens, mausoleums and cremation options.",
    src: RESTHAVEN_PHOTOS[0]?.src ?? RESTHAVEN_HERO.src,
    alt: "Mature live oaks shading flat lawn markers along a walkway in a Texas memorial park",
    kicker: "Houston · Lawndale Street",
  },
];

/** ImageGallery schema so the guide photography is eligible for image results. */
export const guideGalleryJsonLd = (pageUrl: string, name: string) => ({
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  name,
  url: pageUrl,
  associatedMedia: GUIDE_CEMETERY_FEATURES.map((f) => ({
    "@type": "ImageObject",
    contentUrl: f.src.startsWith("http") ? f.src : `https://texascemeterybrokers.com${f.src}`,
    caption: `${f.name}, ${f.city}, Texas`,
    description: f.alt,
    representativeOfPage: false,
  })),
});

const Card = ({ f, tall }: { f: GuideCemeteryFeature; tall?: boolean }) => (
  <Link
    to={`/cemeteries/${f.slug}`}
    className="group relative block overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
  >
    <figure className="m-0">
      <div className={`relative overflow-hidden ${tall ? "aspect-[4/5] md:aspect-[3/4]" : "aspect-[4/3]"}`}>
        <img
          src={f.src}
          alt={f.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/70 mb-2">{f.kicker}</p>
          <h3 className={`font-display text-white leading-[1.05] ${tall ? "text-3xl md:text-4xl" : "text-2xl md:text-[1.75rem]"}`}>
            {f.name}
          </h3>
          <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-md">{f.note}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-white/85">
            View the cemetery page
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </figcaption>
      </div>
    </figure>
  </Link>
);

interface Props {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  /** Extra sentence with in-context internal links. */
  footer?: React.ReactNode;
}

const GuideCemeteryGallery = ({ id = "cemeteries", eyebrow, title, intro, footer }: Props) => {
  const [lead, ...rest] = GUIDE_CEMETERY_FEATURES;
  return (
    <section id={id} className="scroll-mt-24 mt-20">
      <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">{eyebrow}</p>
      <h2 className="font-display text-3xl md:text-4xl text-foreground mb-5 leading-tight">{title}</h2>
      <p className="text-foreground/80 leading-relaxed mb-8 text-lg max-w-3xl">{intro}</p>

      <div className="grid md:grid-cols-2 gap-4 md:gap-5">
        <Card f={lead} tall />
        <div className="grid gap-4 md:gap-5">
          {rest.slice(0, 2).map((f) => (
            <Card key={f.slug} f={f} />
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-4 md:mt-5">
        {rest.slice(2).map((f) => (
          <Card key={f.slug} f={f} />
        ))}
      </div>

      {footer && <p className="mt-8 text-foreground/80 leading-relaxed">{footer}</p>}
    </section>
  );
};

export default GuideCemeteryGallery;
