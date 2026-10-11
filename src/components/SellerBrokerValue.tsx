import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, FileCheck2, Handshake, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import walkthrough from "@/assets/team/tcb-plot-walkthrough-v2.jpg.asset.json";

const services = [
  { icon: MapPin, title: "We show the plot for you.", text: "We meet prospective buyers at the cemetery, walk the location and answer their questions. You don't have to arrange the viewing." },
  { icon: Handshake, title: "Connections beyond a classified ad.", text: "Funeral homes and industry contacts source property through us. Your plot joins the available-property list we share with mortuaries, as well as our cemetery pages." },
  { icon: ShieldCheck, title: "Trusted when a family needs a plot now.", text: "For at-need purchases, families need clear answers and a coordinated transfer. We work with the buyer and cemetery so each next step is understood." },
  { icon: Wallet, title: "Financing opens the door to more buyers.", text: "Qualified buyers can use our 0% interest financing. We carry their payment plan; you receive your agreed seller proceeds at closing, not in monthly instalments." },
];

export default function SellerBrokerValue() {
  const reducedMotion = useReducedMotion();
  return (
    <section aria-labelledby="broker-value-title" className="overflow-hidden bg-background py-20 md:py-28">
      <div className="container px-6">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-accent">The difference a broker makes</p>
            <h2 id="broker-value-title" className="font-display text-4xl leading-tight text-foreground md:text-6xl">More from your plot.<br /><em className="text-primary">Less on your plate.</em></h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">A good sale is about more than finding a buyer. It's the right price, the right paperwork and someone bringing it all together.</p>
          </header>

          <div className="mt-12 grid gap-10 border-y border-primary/20 py-10 md:grid-cols-[1fr_1.3fr] md:gap-16 md:py-14">
            <div className="flex flex-col justify-center">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Resale potential</p>
              <p className="mt-3 font-display text-7xl text-primary md:text-8xl">~43%<span className="mt-2 block font-body text-lg font-medium text-foreground">higher in our estimate model</span></p>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">Our calculator models a higher resale price with a broker than through a private sale. Market-led pricing, buyer reach and financing all help put your property in a stronger position.</p>
              <Button variant="link" asChild className="mt-5 h-auto justify-start self-start whitespace-normal px-0 text-left"><Link to="/what-is-my-cemetery-plot-worth-texas">Explore your plot's estimated value <ArrowRight /></Link></Button>
            </div>
            <div>
              <div className="mb-7 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Time to find a buyer</p><span className="h-px flex-1 bg-border" /></div>
              <div className="space-y-8">
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-2"><p className="font-medium text-primary">With a cemetery broker</p><p className="font-display text-3xl text-primary">1 month – 2 years</p></div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-sage-light"><motion.div initial={{ scaleX: reducedMotion ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9 }} className="h-full w-[28.6%] origin-left rounded-full bg-primary" /></div>
                  <p className="mt-2 text-xs text-muted-foreground">Estimated broker sale window</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-2"><p className="font-medium text-foreground">Selling privately</p><p className="font-display text-3xl text-foreground">5 – 7 years</p></div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted"><motion.div initial={{ scaleX: reducedMotion ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.15 }} className="h-full w-full origin-left rounded-full bg-foreground/45" /></div>
                  <p className="mt-2 text-xs text-muted-foreground">Estimated private-sale window</p>
                </div>
              </div>
              <p className="mt-7 text-xs leading-relaxed text-muted-foreground">Bars compare the upper ends of the estimated windows on the same seven-year scale. These are planning estimates, not a promise of when your plot will sell.</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">The ~43% comparison comes from the calculator's broker and private-sale assumptions, not a measured average or guaranteed return. Figures are sale-price estimates before listing fees, commissions and any applicable transfer costs; your net proceeds will differ.</p>

          <div className="py-14 md:py-20">
            <div className="flex flex-col items-center gap-5 text-center">
              <FileCheck2 className="h-8 w-8 text-primary" strokeWidth={1.4} />
              <h3 className="max-w-3xl font-display text-3xl leading-tight text-foreground md:text-5xl">An average of <span className="text-primary">13 documents.</span><br />One team keeping it together.</h3>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">Across the sales we handle, a file involves an average of 13 documents. Yours may need fewer or more, depending on the deed owners, inheritance history and the cemetery's requirements.</p>
            </div>
            <div className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {[
                { title: "Confirm who can sign", text: "We start with the deed and ownership questionnaire to understand the owners, heirs and authority to sell." },
                { title: "Prepare the right paperwork", text: "We identify the supporting records needed and prepare the relevant powers of attorney and affidavit forms. You provide the evidence and sign where required." },
                { title: "Coordinate the cemetery", text: "We work with the cemetery on its approval and transfer requirements, then keep the paperwork moving toward closing." },
              ].map((step, index) => (
                <div key={step.title} className="relative border-t border-primary/25 pt-6">
                  <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-sage-light text-primary"><Check className="h-4 w-4" /></span>
                  <h4 className="font-display text-2xl text-foreground">{step.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  {index < 2 && <ArrowDown aria-hidden className="mx-auto mt-6 h-5 w-5 text-primary/60 md:hidden" />}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center"><Button variant="link" asChild className="h-auto whitespace-normal"><Link to="/cemetery-transfer-process-texas">Who signs, what you need and how transfers work <ArrowRight /></Link></Button><p className="mt-2 text-xs text-muted-foreground">Our Texas transfer guide · Requirements vary; legal advice may be needed for complex estates.</p></div>
          </div>

          <div className="grid items-start gap-10 border-t border-border pt-12 lg:grid-cols-2 lg:gap-16">
            <figure className="lg:sticky lg:top-28">
              <img src={walkthrough.url} alt="A Texas Cemetery Brokers team member walking cemetery grounds" loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />
              <figcaption className="mt-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px w-8 bg-primary/40" />On the ground. In your corner.</figcaption>
            </figure>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">A real service, not just a listing</p>
              <h3 className="font-display text-3xl leading-tight text-foreground md:text-4xl">You have a plot.<br /><em className="text-primary">We bring the people.</em></h3>
              <div className="mt-8 divide-y divide-border">
                {services.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 py-6 first:pt-0"><Icon className="mt-1 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} /><div><h4 className="text-base font-medium text-foreground">{title}</h4><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div></div>)}
              </div>
              <Button asChild size="lg" className="mt-6 h-auto min-h-12 rounded-full whitespace-normal"><a href="#quote-form">Get my free valuation <ArrowRight /></a></Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}