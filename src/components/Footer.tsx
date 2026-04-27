import { Phone, Mail, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border bg-card">
      <div className="container mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-lg text-foreground">Texas Cemetery</span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Brokers</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Licensed cemetery brokerage proudly serving Texas families. A partner of Bayer Cemetery Brokers, drawing on 29+ years of resale experience.
            </p>
          </div>
          <div>
            <h4 className="font-display text-sm text-foreground mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="tel:+14242341678" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Phone className="w-3.5 h-3.5" /> (424) 234-1678
              </a>
              <a href="mailto:Help@TexasCemeteryBrokers.com" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" /> Help@TexasCemeteryBrokers.com
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-display text-sm text-foreground mb-3">Quick Links</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/properties" className="block hover:text-foreground transition-colors">Browse Properties</Link>
              <Link to="/sell" className="block hover:text-foreground transition-colors">Sell Property</Link>
              <Link to="/partners" className="block hover:text-foreground transition-colors">Our Partners</Link>
              <Link to="/auth" className="block hover:text-foreground transition-colors">Sign In</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-sm text-foreground mb-3">Service Areas</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dallas · Fort Worth · Houston · Austin · San Antonio · El Paso · Statewide Texas
            </p>
          </div>
        </div>
        <div className="divider-earth mb-6" />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Texas Cemetery Brokers. All rights reserved. In partnership with Bayer Cemetery Brokers.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <Shield className="w-3 h-3" /> Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
