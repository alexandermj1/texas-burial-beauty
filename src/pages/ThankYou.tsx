import { Link } from "react-router-dom";
import { Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const ThankYou = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Thank You · Texas Cemetery Brokers"
        description="Your request has been received. We'll be in touch within 24 hours."
        noindex
      />
      <Navbar forceScrolled />
      <main className="flex-1 flex items-center justify-center px-6 py-24 bg-gradient-warm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl text-center bg-background border border-border rounded-3xl shadow-xl p-10 md:p-14"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-primary" strokeWidth={2.5} />
          </div>
          <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">
            Request received
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight mb-5">
            Thank you.
          </h1>
          <p className="text-muted-foreground text-lg font-light leading-relaxed mb-8">
            We've received your request and a member of our team will reach out
            within 24 hours. If your matter is urgent, please call us directly
            at <a href="tel:+12142304740" className="text-primary font-medium">(214) 230-4740</a>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ThankYou;
