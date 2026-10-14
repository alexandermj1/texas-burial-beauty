import { Link } from "react-router-dom";
import { Check, ArrowRight, Phone } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const steps = [
  { n: "01", title: "We review your request", body: "A broker reads your cemetery, budget and timeline the same day." },
  { n: "02", title: "We match available plots", body: "We check our sellers and industry contacts for plots that fit." },
  { n: "03", title: "We call you with options", body: "Usually within 24 hours, with prices that include every fee." },
];

const ThankYouBuyer = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Seo
      title="Request Received · Texas Cemetery Brokers"
      description="Your plot request has been received. A broker will be in touch within 24 hours."
      noindex
    />
    <Navbar forceScrolled />
    <main className="flex-1 px-6 pt-32 pb-24 bg-gradient-warm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl mx-auto text-center"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <Check className="w-8 h-8 text-primary" strokeWidth={2.5} />
        </div>
        <p className="text-primary font-medium text-xs tracking-[0.3em] uppercase mb-5">
          Plot request received
        </p>
        <h1 className="font-display text-5xl md:text-7xl text-foreground leading-[1.05] mb-6">
          We're finding your plot.
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
          Thank you for trusting us. Buying through a broker typically saves families
          thousands compared with buying new — here's what happens next.
        </p>
      </motion.div>

      <div className="max-w-5xl mx-auto mt-16 grid md:grid-cols-3 border-y border-border divide-y md:divide-y-0 md:divide-x divide-border">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 + i * 0.12 }}
            className="p-8 text-center md:text-left"
          >
            <p className="font-display text-3xl text-primary mb-3">{s.n}</p>
            <h2 className="font-display text-xl text-foreground mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-xl mx-auto mt-14 text-center">
        <p className="text-muted-foreground mb-6">Need a plot urgently? Call us now.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="tel:+12142304740"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
          >
            <Phone className="w-4 h-4" /> (214) 230-4740
          </a>
          <Link
            to="/cemeteries"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground font-medium rounded-full text-sm hover:border-primary transition-all"
          >
            Explore cemeteries <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default ThankYouBuyer;
