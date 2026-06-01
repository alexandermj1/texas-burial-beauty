import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Plus,
  CheckCircle2,
  MapPin,
  Building2,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Clock3,
  Eye,
  HeartHandshake,
  Scale,
  FileCheck2,
  Award,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Cemetery Plot Resale Brokerage",
    serviceType: "Cemetery property resale",
    areaServed: { "@type": "State", name: "Texas" },
    provider: { "@type": "LocalBusiness", name: "Texas Cemetery Brokers", telephone: PHONE, email: EMAIL, sameAs: ["https://bayercemeterybrokers.com/"] },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://texascemeterybrokers.com/guides" },
      { "@type": "ListItem", position: 3, name: "How to Sell a Cemetery Plot in Texas", item: URL },
    ],
  },
];

const trustItems = [
  { Icon: Award, t: "A+ BBB Accredited", d: "Through our partner, Bayer Cemetery Brokers" },
  { Icon: Calendar, t: "27+ Years", d: "In memorial property & family care" },
  { Icon: MapPin, t: "Statewide Coverage", d: "Houston · Dallas · San Antonio · Austin" },
];

const valueFactors = [
  { Icon: MapPin, t: "The cemetery & metro", d: "Established, in-demand parks in larger metros carry stronger resale value than rural or remote locations." },
  { Icon: Building2, t: "The section & position", d: "Spaces near trees, water, chapels, gardens or entrances, and plots in well-regarded sections, are more sought after." },
  { Icon: Layers, t: "The property type", d: "Single graves, companion or double-depth spaces, mausoleum crypts and cremation niches each have their own market." },
  { Icon: Sparkles, t: "What's included", d: "Vaults, markers, opening-and-closing rights and transfer fees all affect the net value to a buyer." },
  { Icon: TrendingUp, t: "Current demand", d: "What buyers are actively looking for in that exact cemetery, right now, sets the real ceiling on price." },
];

const reasons = [
  { n: "01", Icon: TrendingUp, t: "Reach", h: "We put your property in front of the right buyers.", d: "We do far more than post a listing and wait. We cross-reference your plot against the live inquiries we already hold — from funeral homes, estate attorneys and families searching for specific cemeteries. We