import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import PlotResaleCalculator from "@/components/PlotResaleCalculator";

const PATH = "/cemetery-plot-value-calculator";
const URL = `https://texascemeterybrokers.com${PATH}`;

const faqs = [
  { q: "How much is my cemetery plot worth?", a: "Most Texas cemetery plots resell for well below the cemetery's current retail price. Selling through a broker typically achieves around 60% of what the cemetery charges new, while private sales often settle nearer 40%. Your exact value depends on the cemetery, garden, location and demand." },
  { q: "How accurate is the plot value calculator?", a: "Each estimate comes with a confidence score and an accuracy range. Estimates are automated and can be off, so for an accurate number request a free valuation and a broker will price your specific property." },
  { q: "How long does it take to sell a cemetery plot?", a: "Through a broker most plots sell in anywhere from one month to two years. Private sales by owners take five to seven years on average, because few buyers search for individual sellers." },
  { q: "Why is a broker sale higher than a private sale?", a: "Brokers reach families and funeral homes actively looking for property at that cemetery, handle the cemetery's transfer paperwork and take payment safely, so buyers pay closer to market value." },
  { q: "Does it cost anything to get a valuation?", a: "No. The calculator and a full valuation from our team are both free, with no obligation to sell." },
];

const jsonLd = [
  {
    "@context": "https://schema.org", "@type": "WebApplication", name: "Cemetery Plot Value Calculator", url: URL,
    applicationCategory: "FinanceApplication", operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Estimate the resale value of a Texas cemetery plot, crypt or niche through a broker or a private sale.",
    provider: { "@type": "Organization", name: "Texas Cemetery Brokers", url: "https://texascemeterybrokers.com" },
  },
  {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

const PlotValueCalculatorPage = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="Cemetery Plot Value Calculator | Texas Resale Estimate"
      description="Free cemetery plot value calculator for Texas. Instantly estimate what your burial plot, crypt or niche could sell for through a broker or a private sale."
      path={PATH}
      jsonLd={jsonLd}
    />
    <Navbar />
    <main className="max-w-[1280px] mx-auto px-5 md:px-8 pt-28 md:pt-36 pb-20">
      <header className="max-w-3xl mb-10 md:mb-14">
        <p className="text-[10px] uppercase tracking-[0.34em] text-primary font-medium mb-4">Texas · Free tool</p>
        <h1 className="font-display text-4xl md:text-6xl text-foreground leading-[1.02] tracking-tight">
          Cemetery plot value calculator
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          Find out what your cemetery plot is worth in seconds. Compare the estimated resale value with a broker against selling privately — and how long each usually takes.
        </p>
      </header>

      <PlotResaleCalculator />

      <section className="grid md:grid-cols-3 gap-4 mt-14">
        {[
          ["~60% of retail", "Typical broker resale value, sold in 1 month – 2 years."],
          ["~42% of retail", "Typical private sale value, taking 5 – 7 years on average."],
          ["$0 to value", "Free valuations with no obligation to list or sell."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-3xl border border-border bg-card p-7">
            <p className="font-display text-3xl text-foreground">{t}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mt-16">
        <h2 className="font-display text-3xl md:text-4xl text-foreground mb-6">Plot value questions</h2>
        <div className="divide-y divide-border border-y border-border">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="cursor-pointer list-none flex justify-between gap-4 text-foreground font-medium">
                {f.q}<span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/sell" className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90">
            Get a free, accurate valuation <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/cemetery-plot-cost-texas" className="inline-flex items-center gap-2 px-7 py-3.5 border border-border rounded-full text-sm hover:border-primary">
            Texas plot cost guide
          </Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default PlotValueCalculatorPage;
