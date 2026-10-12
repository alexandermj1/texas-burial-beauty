import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import walkthrough from "@/assets/team/tcb-plot-walkthrough-v2.jpg.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import hibiscus from "@/assets/flowers/hibiscus-coral.png.asset.json";

const services = [
  { title: "We walk the grounds.", text: "We show your plot to prospective buyers, meet them at the cemetery and answer their questions. No viewings for you to arrange." },
  { title: "We bring the connections.", text: "Funeral homes and industry contacts source plots through us. Your property joins our cemetery pages and the available-property list we share with mortuaries." },
  { title: "We’re there when it matters.", text: "An at-need purchase calls for clear answers and careful coordination. We work with the family and cemetery to keep every next step understood." },
  { title: "They pay over time. You don’t wait.", text: "Qualified buyers can use our 0% interest financing. We carry the payment plan; you receive your agreed seller proceeds at closing, not in monthly instalments." },
];

export default function SellerBrokerValue() {
  const reducedMotion = useReducedMotion();
  const reveal = {
    initial: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reducedMotion ? 0 : 0.7 },
  };
  return (
    <section id="broker-value" aria-labelledby="broker-value-title" className="relative overflow-hidden bg-sand-light text-foreground">
      <div className="relative container px-6 py-16 md:py-24">
        <img src={bananaLeaf.url} alt="" aria-hidden className="pointer-events-none absolute -right-48 top-0 hidden w-[32rem] -rotate-12 opacity-10 md:block" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-9 flex items-center gap-4 border-t border-foreground/20 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">The broker advantage</p>
            <span className="h-px flex-1 bg-foreground/20" />
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60 sm:block">Texas Cemetery Brokers</span>
          </div>
          <motion.header {...reveal} className="grid items-end gap-8 lg:grid-cols-12">
            <h2 id="broker-value-title" className="font-display text-5xl leading-[0.98] md:text-7xl lg:col-span-8 lg:text-8xl">A better sale.<br /><em className="font-normal text-primary">A lighter load.</em></h2>
            <div className="lg:col-span-4 lg:pb-2">
              <p className="text-base font-light leading-relaxed text-foreground/75 md:text-lg">The price is only part of the story. Bringing the buyer, the paperwork and the cemetery together is where a broker makes the difference.</p>
              <Button asChild variant="link" className="mt-4 h-auto whitespace-normal px-0 text-left"><Link to="/what-is-my-cemetery-plot-worth-texas">Explore your plot’s estimated value <ArrowUpRight className="shrink-0" /></Link></Button>
            </div>
          </motion.header>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground">
        <div className="container px-6 py-12 md:py-16">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:gap-16">
            <motion.div {...reveal} className="lg:col-span-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-foreground/75">More resale potential</p>
              <p className="mt-4 font-display text-8xl leading-none md:text-9xl">~43<span className="text-5xl md:text-6xl">%</span></p>
              <p className="mt-3 font-display text-2xl italic md:text-3xl">higher in our estimate model.</p>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-primary-foreground/80">Market-led pricing, buyer reach and financing put your property in a stronger position than a private classified ad.</p>
            </motion.div>
            <div className="border-t border-primary-foreground/25 pt-8 lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
              <p className="mb-8 text-[10px] font-bold uppercase tracking-[0.3em] text-primary-foreground/75">Time to find a buyer · estimated</p>
              <div className="space-y-8">
                <div>
                  <p className="mb-2 text-sm text-primary-foreground/80">With a cemetery broker</p>
                  <p className="font-display text-3xl sm:text-4xl">1 month – 2 years</p>
                  <div className="mt-4 h-2 bg-primary-foreground/15"><motion.div initial={{ scaleX: reducedMotion ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reducedMotion ? 0 : 1 }} className="h-full w-[28.6%] origin-left bg-primary-foreground" /></div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-primary-foreground/80">Selling privately</p>
                  <p className="font-display text-3xl sm:text-4xl">5 – 7 years</p>
                  <div className="mt-4 h-2 bg-primary-foreground/15"><motion.div initial={{ scaleX: reducedMotion ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reducedMotion ? 0 : 1.2 }} className="h-full w-full origin-left bg-primary-foreground/45" /></div>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-primary-foreground/65"><span>Today</span><span>7 years</span></div>
            </div>
            <p className="border-t border-primary-foreground/25 pt-5 text-xs leading-relaxed text-primary-foreground/80 lg:col-span-12">The ~43% comparison reflects the calculator’s broker/private-sale assumptions, not a measured average or guaranteed return. Estimates are before listing fees, commissions and transfer costs; net proceeds will differ. Timelines are planning estimates, not promised sale dates. Bars compare the upper ends of both windows on a seven-year scale.</p>
          </div>
        </div>
      </div>

      <div className="container px-6 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <figure className="lg:col-span-5">
              <img src={walkthrough.url} alt="A Texas Cemetery Brokers team member visiting cemetery grounds" loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover object-[70%_center]" />
              <figcaption className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60"><span className="h-px w-10 bg-primary" />On the ground. In your corner.</figcaption>
            </figure>
            <div className="lg:col-span-7">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Beyond the listing</p>
              <h3 className="font-display text-4xl leading-tight md:text-5xl">You have the plot.<br /><em className="text-primary">We bring the people.</em></h3>
              <ol className="mt-7 divide-y divide-foreground/15">
                {services.map((service, index) => <motion.li {...reveal} key={service.title} className="grid grid-cols-[2rem_1fr] gap-4 py-6 sm:grid-cols-[3rem_1fr] sm:gap-5">
                  <span className="font-display text-3xl italic text-primary/70 sm:text-4xl">{String(index + 1).padStart(2, "0")}</span>
                  <div><h4 className="font-display text-2xl leading-tight">{service.title}</h4><p className="mt-2 text-sm leading-relaxed text-foreground/75 sm:text-base">{service.text}</p></div>
                </motion.li>)}
              </ol>
            </div>
          </div>

          <div className="relative mt-16 border-y border-foreground/20 py-12 md:mt-24 md:py-16">
            <img src={hibiscus.url} alt="" aria-hidden className="pointer-events-none absolute right-0 top-8 hidden w-24 rotate-12 opacity-80 md:block" />
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <motion.div {...reveal} className="lg:col-span-5">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-accent">The paperwork, handled</p>
                <p className="font-display text-8xl italic leading-none text-primary md:text-9xl">13</p>
                <h3 className="mt-3 font-display text-3xl md:text-4xl">documents on average.<br /><em className="text-primary">One team on your side.</em></h3>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-foreground/75 sm:text-base">A sale can involve deeds, ownership records, powers of attorney and affidavits. Your file may need fewer or more, depending on the owners, inheritance history and cemetery rules.</p>
              </motion.div>
              <div className="lg:col-span-7 lg:pr-24">
                <ol className="divide-y divide-foreground/15 border-t border-foreground/15">
                  {[
                    { title: "The right people signing.", text: "We check the deed and ownership questionnaire to establish owners, heirs and authority to sell." },
                    { title: "The right documents prepared.", text: "We identify supporting records and prepare the relevant POA and affidavit forms. You provide the evidence and sign where required." },
                    { title: "The cemetery, coordinated.", text: "We work through the cemetery’s approval and transfer requirements and keep the file moving toward closing." },
                  ].map((step) => <li key={step.title} className="py-5"><h4 className="font-display text-2xl">{step.title}</h4><p className="mt-2 text-sm leading-relaxed text-foreground/75">{step.text}</p></li>)}
                </ol>
                <Button asChild variant="link" className="mt-3 h-auto whitespace-normal px-0 text-left"><Link to="/cemetery-transfer-process-texas">Read our Texas transfer guide <ArrowUpRight className="shrink-0" /></Link></Button>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Requirements vary. Complex estates may need legal advice.</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <p className="font-display text-2xl italic text-foreground/80 md:text-3xl">Less chasing. More getting on with life.</p>
            <Button asChild size="lg" className="h-auto min-h-12 shrink-0 rounded-full whitespace-normal"><a href="#quote-form">Get my free valuation <ArrowRight className="shrink-0" /></a></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
