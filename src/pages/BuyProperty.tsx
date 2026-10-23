import teamWalkthroughAsset from "@/assets/team/tcb-plot-walkthrough-v2.jpg.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import BuyerWizard from "@/components/BuyerWizard";

const BuyProperty = () => {
  return (
    <div className="min-h-svh bg-background flex flex-col">
      <Seo
        title="Buy a Cemetery Plot in Texas — Burial Plots 30–50% Below Cemetery Prices"
        description="Looking for burial plots for sale in Texas? Our free buyer concierge matches you with privately resold cemetery plots, niches and crypts in Dallas, Houston, Austin & beyond — typically 30–50% below cemetery prices."
        path="/buy"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Cemetery Plot Buyer Concierge",
            provider: { "@id": "https://texascemeterybrokers.com/#organization" },
            areaServed: "Texas, United States",
            description: "Guided concierge that matches Texas buyers with privately resold cemetery plots, niches, mausoleums and crypts at below-market prices.",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
              { "@type": "ListItem", position: 2, name: "Buy Property", item: "https://texascemeterybrokers.com/buy" },
            ],
          },
        ]}
      />
      <Navbar forceScrolled />

      {/* Editorial masthead, aligned with every buying step below. */}
      <header className="relative overflow-hidden pt-24 md:pt-28 pb-4 sm:pb-6 bg-background">
        <img src={bananaLeaf.url} alt="" aria-hidden="true" className="hidden md:block absolute -left-60 top-40 w-[28rem] opacity-10 -rotate-12 pointer-events-none select-none" />
        <img src={palmFan.url} alt="" aria-hidden="true" className="hidden lg:block absolute -right-44 bottom-10 w-[26rem] opacity-10 rotate-6 pointer-events-none select-none" />
        <img src={hibiscusCoral.url} alt="" aria-hidden="true" className="hidden md:block absolute right-[5%] top-36 w-20 lg:w-24 opacity-85 rotate-6 pointer-events-none select-none" />
        <img src={pinkBranch.url} alt="" aria-hidden="true" className="hidden md:block absolute left-[3%] bottom-24 w-24 lg:w-28 opacity-50 -rotate-6 pointer-events-none select-none" />
        <div className="relative w-full max-w-screen-2xl mx-auto px-6 lg:px-10">
          <div className="text-center pb-8 sm:pb-10 lg:pb-12">
            <p className="text-[10px] uppercase font-bold text-accent mb-5">Texas buyer concierge · No fee</p>
            <h1 className="mx-auto font-display text-foreground text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-none">
              The plot you want,<br />
              <span className="italic text-primary">for thousands less.</span>
            </h1>
            <div className="max-w-2xl mx-auto mt-5 sm:mt-6">
              <p className="text-xs text-accent uppercase font-medium">The private resale advantage</p>
              <div className="flex items-center justify-center gap-3 sm:gap-6 mt-4">
                <p className="max-w-28 sm:max-w-40 text-xs sm:text-sm text-muted-foreground">The price the cemetery quotes</p>
                <svg viewBox="0 0 110 50" fill="none" className="w-16 sm:w-24 h-12 shrink-0 text-primary" aria-hidden="true">
                  <path d="M5 30C22 3 61 3 97 28M97 28L81 27M97 28L91 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-center">
                  <p className="font-display text-4xl sm:text-7xl italic text-primary leading-none whitespace-nowrap">30–50%</p>
                  <p className="text-xs sm:text-sm text-primary mt-2">less — often thousands</p>
                </div>
              </div>
              <p data-simon-review className="mt-4 text-sm text-muted-foreground leading-relaxed">
                People’s plans change and plots they bought years ago are still there, unused. Buying from those owners is another way to find a resting place. We help you compare the spaces and get through the cemetery’s transfer paperwork.
              </p>
              <p className="mt-4 text-xs text-primary font-medium">Personal guidance · Every step handled · No concierge fee</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-10">
          <BuyerWizard />
        </div>
      </main>

      {/* Buying editorial — shares the masthead's width and typographic hierarchy. */}
      <section className="border-t border-foreground/20 bg-background">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-10 py-12 sm:py-16">
          <p className="text-center text-xs text-accent font-medium uppercase border-b border-foreground/20 pb-3">The buying perspective / Texas</p>
          <div className="text-center py-8 sm:py-10">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground leading-none">
              A place that feels right.<br />
              <span className="italic text-primary">A price that makes sense.</span>
            </h2>
            <p data-simon-review className="max-w-2xl mx-auto mt-5 text-base text-muted-foreground leading-relaxed">
              People look at where the plot is positioned, how it’s being kept and looked after, and if it’s a place they feel some sort of bond with. One family can find an absolute perfect fit, while another family finds it just doesn’t work for them. It’s a deeply personal decision.
            </p>
          </div>
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 border-t border-foreground/20 pt-8 sm:pt-10">
            <figure className="m-0 lg:col-span-5">
              <img loading="lazy" decoding="async" src={teamWalkthroughAsset.url} alt="A Texas Cemetery Brokers team member walking the cemetery grounds" className="w-full aspect-[4/3] object-cover rounded-lg" />
              <figcaption className="mt-3 text-xs text-muted-foreground leading-relaxed">Personal guidance, on the grounds and throughout the transfer.</figcaption>
            </figure>
            <div className="lg:col-span-7 divide-y divide-foreground/20">
              {[
                { title: "The cemetery you want. Less to pay.", text: "Private resale means buying from an existing owner, rather than the cemetery’s own inventory. A comparable space can cost meaningfully less — we help you compare the location, property and full purchase costs before you decide." },
                { title: "See the place. Make it personal.", text: "Some want to be near a tree, others want to be as far away as possible. Some want to be near a curb, some don’t. Some would like a slope with a view, others want it as flat as possible. There’s a great deal about relatives visiting and the ease of getting to the plot. We can walk the sections with you before you commit.", review: true },
                { title: "A clear path from choice to ownership.", text: "Cemeteries want to be very precise, making sure the person selling has the full and complete authority and that any other co-owners give the required consent. We organize the paperwork and coordinate the transfer. On selected pre-need properties, financing is available for up to two years at 0% interest; our buyer concierge is free.", review: true },
              ].map((item, index) => (
                <article key={item.title} className={index === 0 ? "pb-6 sm:pb-8" : "py-6 sm:py-8"}>
                  <div className="flex gap-4 sm:gap-6 items-baseline">
                    <span className="font-display italic text-xl text-primary shrink-0">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-display text-2xl sm:text-3xl text-foreground leading-tight">{item.title}</h3>
                      <p data-simon-review={item.review || undefined} className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">{item.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-12 sm:mt-16 grid lg:grid-cols-12 gap-6 lg:gap-12 border-t border-foreground/20 pt-8">
            <div className="lg:col-span-5">
              <p className="text-xs text-accent font-medium uppercase mb-3">Before you decide</p>
              <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">A few things<br /><span className="italic text-primary">worth knowing.</span></h2>
            </div>
            <div className="lg:col-span-7 divide-y divide-border border-b border-border">
            {[
              {
                q: "How much do burial plots cost in Texas?",
                a: "It varies widely by cemetery and section. Direct-from-cemetery single spaces in major Texas metros generally run from around $2,000 to well over $10,000, and premium mausoleum crypts considerably more. Private resales can offer meaningful savings; the exact difference depends on the property and location.",
              },
              {
                q: "Is it legal to buy a cemetery plot from a private seller?",
                a: "Yes. Texas law allows plot owners to resell their interment rights. The transfer is recorded with the cemetery via a deed or assignment — we handle the paperwork and coordinate with the cemetery so the transfer is clean and documented.",
              },
              {
                q: "Can I buy ahead of time (pre-need)?",
                a: "Absolutely — pre-need buyers usually get the best selection and pricing, and on selected properties we can arrange 0% interest financing for up to two years. At-need buyers are prioritized and we can often present options the same day.",
              },
              {
                q: "Which cemeteries do you serve?",
                a: "We cover cemeteries across Texas, with the most activity around Dallas–Fort Worth and Houston — including Restland Memorial Park, Sparkman/Hillcrest, Bluebonnet Hills, Forest Park and many more. Browse the directory or just tell us the cemetery you have in mind.",
              },
            ].map((f, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-sm sm:text-[15px] font-medium text-foreground hover:text-primary transition-colors [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45 text-lg leading-none">+</span>
                </summary>
                <p className="pb-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">{f.a}</p>
              </details>
            ))}
            </div>
          </div>

          <div className="mt-8 border-t border-foreground/20 pt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link to="/cemetery-plots-for-sale-texas" className="text-primary font-medium hover:underline">How to buy a cemetery plot →</Link>
            <Link to="/cemetery-plot-cost-texas" className="text-primary font-medium hover:underline">Texas cemetery plot costs →</Link>
            <Link to="/cemeteries" className="text-primary font-medium hover:underline">Browse the cemetery directory →</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuyProperty;
