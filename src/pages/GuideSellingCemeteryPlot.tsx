import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Phone, Mail, Plus, CheckCircle2, MapPin, Building2, Layers, Sparkles, TrendingUp, Clock3, Eye, HeartHandshake, FileCheck2, Award, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const PHONE = "+13108049586";
const PHONE_DISPLAY = "(310) 804-9586";
const EMAIL = "info@texascemeterybrokers.com";
const SLUG = "selling-a-cemetery-plot-in-texas";
const URL = `https://texascemeterybrokers.com/guides/${SLUG}`;

const faqs = [
  { q: "Can you sell a cemetery plot in Texas?", a: "Yes. If you own the right of sepulture in a plot, you can sell it. Check your contract for a right-of-first-refusal clause, confirm co-owners agree, then sell privately or through a broker who handles valuation, buyers, paperwork and the transfer." },
  { q: "How much is my cemetery plot worth in Texas?", a: "It depends on the cemetery, the section and current demand, so the best way to know is a valuation rather than a fixed figure. Resale plots typically sell below the cemetery's current retail price, which is what attracts buyers. We provide a free, plot-specific valuation." },
  { q: "Do I need a license to sell my own cemetery plot in Texas?", a: "No. Selling your own plot needs no license, and Texas no longer requires cemetery brokers to register either — that requirement was repealed effective September 1, 2019. Brokers must still follow the code's rules for recording the conveyance and remitting cemetery fees." },
  { q: "How long does it take to sell a cemetery plot in Texas?", a: "It depends on the cemetery and your price. High-demand metro plots can sell in weeks; rural or oversupplied locations may take longer. Accurate pricing and reaching active buyers shortens the timeline." },
  { q: "Will the cemetery buy my plot back?", a: "Sometimes, but often only at the price you originally paid rather than today's value — and many will not buy back at all. An open-market resale usually recovers more of your plot's worth." },
];

const jsonLd = [
  { "@context": "https://schema.org", "@type": "Service", name: "Cemetery Plot Resale Brokerage", areaServed: { "@type": "State", name: "Texas" }, provider: { "@type": "LocalBusiness", name: "Texas Cemetery Brokers", telephone: PHONE, email: EMAIL, sameAs: ["https://bayercemeterybrokers.com/"] } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
    { "@type": "ListItem", position: 2, name: "Guides", item: "https://texascemeterybrokers.com/guides" },
    { "@type": "ListItem", position: 3, name: "How to Sell a Cemetery Plot in Texas", item: URL },
  ] },
];

const trustItems = [
  { Icon: Award, t: "A+ BBB Accredited", d: "Through our partner, Bayer Cemet
