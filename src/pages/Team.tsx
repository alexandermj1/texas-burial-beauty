import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import teamHeroBg from "@/assets/team/team-hero-bg.jpg";

// Photos
import terryPhoto from "@/assets/team/terry-arellano.png";
import michaelPhoto from "@/assets/team/michael-schepers.png";
import lingmeiPhoto from "@/assets/team/lingmei-lin.png";
import paulaPhoto from "@/assets/team/paula-troncone.png";
import damianPhoto from "@/assets/team/damian-garcia.png";
import nancyPhoto from "@/assets/team/nancy-ellis.png";
import jordanPhoto from "@/assets/team/jordan-brown.png";
import candacePhoto from "@/assets/team/candace-johnson.png";
import edPhoto from "@/assets/team/ed-fisher.png";
import oscarPhoto from "@/assets/team/oscar-quintero.png";

interface TeamMember {
  name: string;
  title: string;
  bio?: string;
  photo?: string;
  region?: string;
}

const leadership: TeamMember[] = [
  {
    name: "Terry Arellano",
    title: "President, Licensed Cemetery Salesperson",
    photo: terryPhoto,
    bio: `Terry Arellano is the President and co-founder of Bayer Cemetery Brokers — our trusted partner organization powering Texas Cemetery Brokers. Established in 1996 as a full-service brokerage firm, the company has helped thousands of families navigate cemetery resales with integrity. Through our Texas partnership, Terry's three decades of expertise are now extended to families across Dallas, Houston, Austin and San Antonio.\n\nUnder Terry's leadership, our combined network has successfully addressed the needs of families by saving 20% to 80% off the high cost of buying direct from cemeteries.`,
  },
  {
    name: "Michael Schepers",
    title: "Licensed & Bonded Broker, Licensed Cemetery Salesperson",
    photo: michaelPhoto,
    bio: `Michael became our licensed and bonded broker CEB 1421 in 2018. Michael has been general manager with Cemetery Property Resales since January 2000, marking his 28th year with the company. You will notice his German accent upon meeting him, and he is also fluent in Spanish. Michael specializes in properties in the South Bay at Oak Hill Memorial Park and Los Gatos Memorial Park in San Jose, and in San Mateo at Skylawn Memorial Park. Michael is a deacon at his church, a proud father and grandfather.`,
  },
];

const salesTeam: TeamMember[] = [
  {
    name: "Jason Salvador",
    title: "Regional Manager, Licensed Cemetery Salesperson",
    region: "San Francisco, Colma, North Bay, San Mateo",
  },
  {
    name: "Lingmei Lin",
    title: "Regional Manager, Licensed Cemetery Salesperson",
    photo: lingmeiPhoto,
    region: "East Bay & San Mateo",
    bio: `Lingmei started her cemetery career after her father passed away in 2002. Feeling grief, she sought peace and comfort every time she visited him at Skylawn Memorial Park. After 10 years of working at Skylawn and Chapel of the Chimes, Hayward and Oakland, she felt it was her calling to help more families throughout the entire Bay Area. She joined Cemetery Property Resales to help families save money during a difficult time, especially during the pre-planning process. In her free time, Lingmei teaches Sunday school and volunteers as a chauffeur at American Cancer Society.`,
  },
  {
    name: "Gale Lighthall",
    title: "Regional Sales Manager, Licensed Cemetery Salesperson",
    region: "East Bay",
    bio: `Mr. Lighthall brings over 30 years experience and knowledge in the cemetery business to help buyers locate the lowest priced graves, crypts, and cremation niches with our resale service. His expertise helps direct families to the best cost saving options. Gale is based in the East Bay and can quickly arrange to meet to show locations at any of our East Bay cemeteries.`,
  },
  {
    name: "Candace Johnson",
    title: "East Bay Regional Manager, Licensed Cemetery Salesperson",
    photo: candacePhoto,
    region: "East Bay",
    bio: `All of us have a unique story which drew us to the funeral and cemetery industry. In March of 1992, Candace lost her eldest relative to cancer. That event launched her quest into the sometimes misunderstood, but greatly needed business. In September of 1992, she began her career at Rolling Hills Memorial Park in the Advance Planning Department, assisting families in making their final arrangements ahead of time.`,
  },
  {
    name: "Ed Fisher",
    title: "East Bay Regional Manager, Licensed Cemetery Salesperson",
    photo: edPhoto,
    region: "East Bay",
    bio: `Ed joined our team in 2023 after retiring from his position as Family Service Manager at a local Bay area cemetery. He was inspired to come out of retirement after meeting with the owner Terry Arellano. Seeing how differently she ran her business he saw an opportunity to make a difference in people's lives while being honest, transparent and ethical. In his personal life, Ed enjoys traveling, especially cruising, dining out and attending movies and live music with his wife.`,
  },
  {
    name: "Oscar Quintero",
    title: "Regional Sales Manager – South Bay",
    photo: oscarPhoto,
    region: "South Bay · Fluent in Spanish",
  },
  {
    name: "Fernando Ramos",
    title: "Regional Sales Manager – East Bay",
    region: "East Bay · Fluent in Spanish",
  },
  {
    name: "Jose Almendarez",
    title: "Regional Manager, Licensed Cemetery Salesperson",
    region: "East Bay",
  },
  {
    name: "Kyle Safford",
    title: "Licensed Cemetery Salesperson",
    region: "Oak Hill & Los Gatos Memorial Park",
    bio: `As a second-generation memorial marker "Production Manager" and the Owner of Cypress Granite & Memorials in San Jose, Kyle has over 25 years of experience in funeral and burial sales. He is well-connected throughout the Bay Area possessing unparalleled insider-knowledge that ultimately saves clients vast amounts of money, time and stress. In his free time, Kyle enjoys live concerts and—you guessed it—riding his Harley!`,
  },
];

const supportTeam: TeamMember[] = [
  {
    name: "Paula Troncone",
    title: "Office Coordinator, Licensed Cemetery Salesperson",
    photo: paulaPhoto,
    bio: `Paula has been with Cemetery Property Resales for over 10 years and loves her interactions with our clients, the funeral homes and cemetery staff. She enjoys cooking, watching sumo wrestling, playing the ukulele, and wild birds.`,
  },
  {
    name: "Damian Garcia-Guerrero",
    title: "Office Manager",
    photo: damianPhoto,
    bio: `Damian has an extensive customer service background. From bartending in high end establishments, to serving in high volume restaurants. Damian's exceptional customer service experience has made him a wonderful fit for the Cemetery Property Resale team. In his free time, he loves to spend time with his family, and even coaches basketball for his sons' team!`,
  },
  {
    name: "Nancy Ellis",
    title: "Sellers Coordinator, Licensed Cemetery Salesperson",
    photo: nancyPhoto,
    bio: `Nancy has been in Client Services with Cemetery Property Resales since July 2019. She has always enjoyed relating to people over the phone. As a long-time career receptionist, she has used her skills while working for a few major San Francisco law firms. As an accomplished artist, she spends her off-hours creating art.`,
  },
  {
    name: "Jordan Brown",
    title: "Customer Service and Internet Marketing",
    photo: jordanPhoto,
    bio: `Jordan Brown has worn a few different hats in life, starting out in the financial world before discovering a more creative path. Friends and family often describe Jordan as having a gentle southern personality—warm, thoughtful, and welcoming.`,
  },
  {
    name: "Cassandra Headley",
    title: "Marketing Coordinator",
    bio: "Cassandra joined our company to help promote our business via email systems and Craig's Lists advertising.",
  },
  {
    name: "Kimberly Amoroso",
    title: "Property Listing Assistant",
  },
  {
    name: "Margo Jacobs",
    title: "Customer Service",
    bio: `Margo was born & raised in Michigan. She is #6 of 8 kids and a twin. She went on to a career in the music business, television, and healthcare. She considers herself outspoken, direct and rather delightful (most of the time).`,
  },
  {
    name: "Linda Dayson",
    title: "Retired Sellers Coordinator, Licensed Cemetery Salesperson",
    bio: `Linda started her employment with Cemetery Property Resales in 2010. As a dog lover and a self-professed "Dog Mama," Linda is a 20-year supporter of the Northern California German Shepherd Rescue Organization. She is married to a Grammy nominated musician who collects Corvettes.`,
  },
];

const getInitials = (name: string) =>
  name.split(" ").map(p => p[0]).join("").toUpperCase();

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" as const },
  }),
};

/* ─── Leader card: horizontal layout with photo (full visibility on mobile) ─ */
const LeaderCard = ({ member, index }: { member: TeamMember; index: number }) => (
  <motion.div
    custom={index}
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-40px" }}
    className="bg-card rounded-xl border border-border overflow-hidden"
  >
    <div className="flex flex-col sm:flex-row">
      <div className="sm:w-48 shrink-0 bg-muted">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            className="w-full aspect-[3/4] sm:h-full sm:aspect-auto object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[3/4] sm:h-full sm:aspect-auto bg-muted flex items-center justify-center">
            <span className="font-display text-3xl text-muted-foreground/40">{getInitials(member.name)}</span>
          </div>
        )}
      </div>
      <div className="p-6 sm:p-8 flex-1">
        <h3 className="font-display text-xl text-foreground mb-0.5">{member.name}</h3>
        <p className="text-sm text-accent font-medium mb-4">{member.title}</p>
        {member.bio && (
          <div className="text-muted-foreground leading-relaxed text-sm space-y-3">
            {member.bio.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

/* ─── Compact member row ──────────────────────────────────────── */
const MemberRow = ({ member, index }: { member: TeamMember; index: number }) => (
  <motion.div
    custom={index}
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-20px" }}
    className="flex items-start gap-4 py-5 border-b border-border/60 last:border-0"
  >
    {member.photo ? (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 ring-1 ring-border bg-muted">
        <img src={member.photo} alt={member.name} className="w-full h-full object-cover object-center" loading="lazy" />
      </div>
    ) : (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center shrink-0 ring-1 ring-border">
        <span className="text-sm font-display text-muted-foreground">{getInitials(member.name)}</span>
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h4 className="font-display text-base text-foreground">{member.name}</h4>
        {member.region && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {member.region}
          </span>
        )}
      </div>
      <p className="text-xs text-accent font-medium mt-0.5">{member.title}</p>
      {member.bio && (
        <p className="text-muted-foreground text-sm leading-relaxed mt-2">{member.bio}</p>
      )}
    </div>
  </motion.div>
);

/* ─── Photo card: portrait card for grid display ──────────────── */
const PhotoCard = ({ member, index }: { member: TeamMember; index: number }) => (
  <motion.div
    custom={index}
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-40px" }}
    className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full"
  >
    <div className="bg-muted">
      <img
        src={member.photo}
        alt={member.name}
        className="w-full aspect-[3/4] object-cover"
        style={{ objectPosition: getObjectPosition(member.name) }}
        loading="lazy"
      />
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <h3 className="font-display text-lg text-foreground leading-tight">{member.name}</h3>
      <p className="text-xs text-accent font-medium mt-1">{member.title}</p>
      {member.region && (
        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
          <MapPin className="w-3 h-3" /> {member.region}
        </span>
      )}
      {member.bio && (
        <p className="text-muted-foreground text-sm leading-relaxed mt-3 line-clamp-4">{member.bio}</p>
      )}
    </div>
  </motion.div>
);

/* Sort: members with photos first, preserving original order within each group */
const photosFirst = (arr: TeamMember[]) => [
  ...arr.filter(m => m.photo),
  ...arr.filter(m => !m.photo),
];

/* Curated order for the photo grid: Damian & Oscar lead, Nancy & Jordan kept apart */
const FEATURED_ORDER = [
  "Damian Garcia-Guerrero",
  "Oscar Quintero",
  "Lingmei Lin",
  "Nancy Ellis",
  "Candace Johnson",
  "Jordan Brown",
  "Ed Fisher",
  "Paula Troncone",
];

/* Per-photo vertical offset to align head heights across the grid.
   Lower % = head sits higher in the frame; higher % = head sits lower. */
const PHOTO_OBJECT_POSITION: Record<string, string> = {
  "Paula Troncone": "center 35%",   // head was a bit high → pull frame down
  "Jordan Brown": "center 32%",     // head slightly high → nudge down
  "Damian Garcia-Guerrero": "center 22%",
  "Oscar Quintero": "center 22%",
  "Lingmei Lin": "center 22%",
  "Nancy Ellis": "center 25%",
  "Candace Johnson": "center 22%",
  "Ed Fisher": "center 25%",
};
const getObjectPosition = (name: string) => PHOTO_OBJECT_POSITION[name] ?? "center 25%";

const Team = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Our Team & Texas Partner Network | Texas Cemetery Brokers"
        description="Meet the leadership and Texas partner network behind Texas Cemetery Brokers — decades of cemetery resale experience supporting Dallas, Houston, Austin and San Antonio families."
        path="/team"
      />
      <Navbar forceScrolled />

      {/* Hero */}
      <section className="relative min-h-[35vh] overflow-hidden flex items-end">
        <div className="absolute inset-0">
          <motion.img
            src={teamHeroBg}
            alt=""
            className="w-full h-full object-cover"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-background" />
        </div>
        <div className="relative container mx-auto px-6 pb-12 pt-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary-foreground/60 font-medium mb-4">
              Headquartered in Dallas · Partnered with Bayer Cemetery Brokers (Est. 1996)
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary-foreground drop-shadow-lg mb-4">
              Meet Our Team
            </h1>
            <p className="text-primary-foreground/75 max-w-2xl mx-auto text-lg leading-relaxed drop-shadow-sm">
              A dedicated team of licensed professionals — Texas-based brokers backed by a 29-year partner network — helping families across Dallas, Houston, Austin and San Antonio.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Company intro — brief, no boxes */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">
              An Ethical Approach & Teamwork
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Texas Cemetery Brokers operates in close partnership with Bayer Cemetery Brokers — the licensed brokerage (CEB 1421) that has been serving families since 1996. Together, our teams bring 30+ years of cemetery resale expertise to Texas families, with growing on-the-ground coverage of Dallas–Fort Worth, Greater Houston, Austin and San Antonio.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Our partner network is well known to Funeral Directors, hospices, churches and Veteran organizations across two states — combining the trust of a long-established brokerage with a Texas-first focus on speed and local service.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Leadership */}
      <section className="pb-14 md:pb-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center"
          >
            <span className="inline-block text-xs tracking-[0.2em] uppercase text-accent font-medium mb-2">Leadership</span>
            <h2 className="font-display text-2xl md:text-3xl text-foreground">Company Leadership</h2>
          </motion.div>
          <div className="space-y-6 max-w-4xl mx-auto">
            {leadership.map((member, i) => (
              <LeaderCard key={member.name} member={member} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Quote divider */}
      <section className="py-12 bg-muted/40 border-y border-border/40">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Award className="w-8 h-8 text-primary/40 mx-auto mb-4" />
            <blockquote className="font-display text-xl md:text-2xl text-foreground/80 italic leading-relaxed">
              "The salespeople identify with being advocates of the living and grieving, displaying integrity, humility and professionalism."
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* Featured Team — everyone with a photo, in a beautiful grid */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <span className="inline-block text-xs tracking-[0.2em] uppercase text-accent font-medium mb-2">Partner Network</span>
            <h2 className="font-display text-2xl md:text-3xl text-foreground">Sales, Office & Support</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              Licensed representatives and support staff from our Bayer Cemetery Brokers partner team — providing the back-office strength and buyer-network depth that Texas families benefit from every day.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {(() => {
              const allWithPhotos = [...salesTeam, ...supportTeam].filter((m) => m.photo);
              const ordered = [
                ...FEATURED_ORDER
                  .map((n) => allWithPhotos.find((m) => m.name === n))
                  .filter((m): m is TeamMember => Boolean(m)),
                ...allWithPhotos.filter((m) => !FEATURED_ORDER.includes(m.name)),
              ];
              return ordered.map((member, i) => (
                <PhotoCard key={member.name} member={member} index={i} />
              ));
            })()}
          </div>
        </div>
      </section>

      {/* Additional team members — clean list, no photo gaps */}
      <section className="py-14 md:py-20 bg-muted/20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center"
          >
            <span className="inline-block text-xs tracking-[0.2em] uppercase text-accent font-medium mb-2">Additional Team Members</span>
            <h2 className="font-display text-2xl md:text-3xl text-foreground">More of Our Family</h2>
          </motion.div>
          <div className="max-w-3xl mx-auto bg-card rounded-xl border border-border px-6">
            {[...salesTeam, ...supportTeam]
              .filter((m) => !m.photo)
              .map((member, i) => (
                <MemberRow key={member.name} member={member} index={i} />
              ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="font-display text-2xl md:text-3xl text-foreground mb-3">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Our team is here to help you buy or sell cemetery property anywhere in Texas. Reach out today for a free consultation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:+14242341678"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
              >
                <Phone className="w-4 h-4" />
                (424) 234-1678
              </a>
              <a
                href="mailto:Help@TexasCemeteryBrokers.com"
                className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground rounded-full font-medium hover:bg-muted transition-colors"
              >
                <Mail className="w-4 h-4" />
                Help@TexasCemeteryBrokers.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Team;
