import { Link } from "react-router-dom";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GUIDE_CEMETERY_FEATURES } from "@/components/guides/GuideCemeteryGallery";
import { RESTLAND_STRIP } from "@/data/restlandDossierPhotos";
import terryPhoto from "@/assets/team/terry-arellano.png";

export function PlotWorthLocalContext() {
  return <section id="local-context" className="scroll-mt-28 border-t border-border py-10 md:py-14">
    <p className="text-xs font-medium text-primary mb-3">Your cemetery, in context</p>
    <h2 className="font-display text-3xl md:text-4xl leading-tight mb-5">A local market. A specific resting place.</h2>
    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-4xl mb-8">The calculator starts with your cemetery. These guides help you understand the grounds, property types and sections behind that name. Photography gives useful context, but cannot confirm the position or value of your own spaces.</p>
    <div className="space-y-9 md:space-y-12">
      {GUIDE_CEMETERY_FEATURES.slice(0, 3).map((cemetery) => <figure key={cemetery.slug}>
        <Link to={`/cemeteries/${cemetery.slug}`} className="group block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <img src={cemetery.src} alt={cemetery.alt} loading="lazy" decoding="async" width={1400} height={650} className="w-full aspect-[16/9] sm:aspect-[16/6] object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.02]" />
        </Link>
        <figcaption className="pt-4">
          <p className="flex items-center gap-1.5 text-xs text-primary mb-2"><MapPin className="w-3.5 h-3.5" />{cemetery.kicker}</p>
          <h3 className="font-display text-2xl sm:text-3xl mb-2"><Link to={`/cemeteries/${cemetery.slug}`} className="hover:text-primary">{cemetery.name}</Link></h3>
          <p className="text-muted-foreground leading-relaxed">{cemetery.note}</p>
          <Button asChild variant="link" className="px-0 h-auto mt-3 whitespace-normal text-left"><Link to={`/cemeteries/${cemetery.slug}`}>Explore the cemetery and its sections <ArrowRight className="w-4 h-4 shrink-0" /></Link></Button>
        </figcaption>
      </figure>)}
    </div>
    <p className="mt-8 text-muted-foreground leading-relaxed">Elsewhere in Texas? Browse the <Link to="/cemeteries" className="text-primary underline underline-offset-4">full cemetery directory</Link>, including Houston, Austin, San Antonio and other Texas communities. For crypts, niches and lawn spaces, our <Link to="/property-types" className="text-primary underline underline-offset-4">property-type guide</Link> explains what to check on your deed.</p>
  </section>;
}

export function PlotWorthGroundsPhoto() {
  return <figure className="pb-10 md:pb-14">
    <img src={RESTLAND_STRIP.src} alt={RESTLAND_STRIP.alt} width={1400} height={650} loading="lazy" decoding="async" className="w-full aspect-[16/9] sm:aspect-[16/6] rounded-xl object-cover" />
    <figcaption className="flex flex-wrap justify-between gap-2 mt-3 text-xs sm:text-sm text-muted-foreground"><span>{RESTLAND_STRIP.caption}</span><Link to="/cemeteries/restland-memorial-park" className="inline-flex items-center gap-1.5 text-primary hover:underline">Explore Restland <ArrowRight className="w-3.5 h-3.5" /></Link></figcaption>
  </figure>;
}

export function PlotWorthTeamPerspective() {
  return <section aria-labelledby="team-perspective" className="border-y border-border py-9 md:py-12 my-2">
    <p className="text-xs font-medium text-primary mb-4">The people behind the guidance</p>
    <div className="flex items-center gap-4 sm:gap-5 mb-6">
      <img src={terryPhoto} alt="Terry Arellano, president and co-founder of Bayer Cemetery Brokers" width={112} height={112} loading="lazy" className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl object-cover object-top shrink-0" />
      <div><h2 id="team-perspective" className="font-display text-2xl sm:text-3xl">Terry Arellano</h2><p className="text-sm text-muted-foreground mt-1">President & co-founder · Bayer Cemetery Brokers</p><p className="text-xs text-primary mt-2">Texas Cemetery Brokers’ partner organization</p></div>
    </div>
    <blockquote className="border-l-2 border-primary pl-5 sm:pl-7">
      <p className="font-display text-2xl sm:text-3xl leading-relaxed">“The salespeople identify with being advocates of the living and grieving, displaying integrity, humility and professionalism.”</p>
      <footer className="text-sm text-muted-foreground mt-4">Our partner team’s philosophy, as published on our <Link to="/team" className="text-primary underline underline-offset-4">team page</Link>.</footer>
    </blockquote>
    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mt-6">Terry co-founded Bayer Cemetery Brokers in 1996. That established partner network supports our Texas service. Here, the same principle means distinguishing an automated estimate from a reviewed quote, explaining fees clearly and checking the ownership paperwork before a sale.</p>
    <Button asChild variant="link" className="px-0 mt-3"><Link to="/team">Meet the people behind our service <ArrowRight className="w-4 h-4" /></Link></Button>
  </section>;
}

export function PlotWorthEstimatePath() {
  return <section aria-labelledby="estimate-path" className="border-t border-border py-9 md:py-12">
    <div className="flex items-center gap-3 mb-5"><ShieldCheck className="w-6 h-6 text-primary shrink-0" /><h2 id="estimate-path" className="font-display text-3xl md:text-4xl">From a useful range to an informed decision</h2></div>
    <ol className="divide-y divide-border">
      {[
        { title: "Start with the details you know", copy: "Choose the cemetery, property type and number of spaces. Add the garden or section if you know it; do not guess a name just to get a narrower range.", href: "#plot-value-calculator", link: "Back to your estimate" },
        { title: "Read value and waiting time together", copy: "Compare the ranges, not just the headline totals. The score is an indicative signal, not a verified accuracy rate or the likelihood of finding a buyer.", href: "#reading-estimate", link: "Understand the result" },
        { title: "Confirm the property and your proceeds", copy: "A reviewed quote checks your specific property. Before proceeding, ask for the price, transfer fee, seller fee and expected net proceeds in writing.", href: "/sell", link: "Request a free broker valuation" },
      ].map((step, index) => <li key={step.title} className="flex gap-4 sm:gap-6 py-5"><span className="text-primary text-2xl font-display tabular-nums shrink-0 w-6">{index + 1}</span><div><h3 className="text-lg font-medium mb-2">{step.title}</h3><p className="text-muted-foreground leading-relaxed max-w-4xl">{step.copy}</p><Button asChild variant="link" className="px-0 h-auto mt-3 whitespace-normal text-left">{step.href.startsWith("#") ? <a href={step.href}>{step.link}<ArrowRight className="w-4 h-4 shrink-0" /></a> : <Link to={step.href}>{step.link}<ArrowRight className="w-4 h-4 shrink-0" /></Link>}</Button></div></li>)}
    </ol>
  </section>;
}