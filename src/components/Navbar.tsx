import { useState, useLayoutEffect, useEffect } from "react";
import { Menu, X, Building2, Trees, ShoppingBag, Tag, Handshake, Mail, Phone, ArrowRight, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import hibiscusLogo from "@/assets/hibiscus-flower.png";

const Navbar = ({ forceScrolled = false }: { forceScrolled?: boolean }) => {
  const computeScrolled = () =>
    forceScrolled || (typeof window !== "undefined" && window.scrollY > 40);
  const [scrolled, setScrolled] = useState(computeScrolled);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useLayoutEffect(() => {
    setMenuOpen(false);
    const onScroll = () => setScrolled(computeScrolled());
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceScrolled, location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  const links = [
    { to: "/property-types", label: "Property Types", desc: "Browse plot categories", Icon: Building2 },
    { to: "/cemeteries", label: "Cemeteries", desc: "Find a cemetery near you", Icon: Trees },
    { to: "/buy", label: "Buy Property", desc: "Available listings", Icon: ShoppingBag },
    { to: "/sell", label: "Sell Property", desc: "List your plot", Icon: Tag },
    { to: "/partners", label: "Partners", desc: "Funeral homes & agents", Icon: Handshake },
    { to: "/guides", label: "Guides", desc: "Plain-English help", Icon: BookOpen },
    { to: "/contact", label: "Contact", desc: "Talk to our team", Icon: Mail },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ${
          scrolled || menuOpen
            ? "bg-background/95 backdrop-blur-lg shadow-soft border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2 whitespace-nowrap shrink-0">
            <span className={`font-display text-lg sm:text-2xl ${(scrolled || menuOpen) ? "text-foreground" : "text-primary-foreground"}`}>
              Texas Cemetery Brokers
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm ${
                  location.pathname === link.to
                    ? scrolled ? "text-foreground font-medium" : "text-primary-foreground font-medium"
                    : scrolled ? "text-muted-foreground hover:text-foreground" : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={`md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border transition-colors ${
              (scrolled || menuOpen)
                ? "text-foreground border-border hover:bg-muted"
                : "text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
            }`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel — rendered outside nav to avoid stacking issues */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-[68px] bottom-0 z-40 bg-background overflow-y-auto animate-fade-in"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-accent/5 pointer-events-none" />
          <div className="relative px-6 pt-6 pb-10 flex flex-col gap-6 min-h-full">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Menu
            </p>

            <ul className="flex flex-col gap-2">
              {links.map(link => {
                const active = location.pathname === link.to;
                const Icon = link.Icon;
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className={`group flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all ${
                        active
                          ? "border-primary/30 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-card/40 hover:border-primary/20 hover:bg-primary/5 active:scale-[0.98]"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                      </span>
                      <span className="flex flex-col flex-1 min-w-0">
                        <span className={`text-base leading-tight ${active ? "text-foreground font-semibold" : "text-foreground font-medium"}`}>
                          {link.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 truncate">
                          {link.desc}
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-6 border-t border-border/60 flex flex-col gap-3">
              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 font-medium shadow-soft hover:shadow-hover transition-shadow"
              >
                <Mail className="w-4 h-4" />
                Get in touch
              </Link>
              <a
                href="tel:+14155551234"
                className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call us
              </a>
              <p className="text-center text-[11px] text-muted-foreground mt-2">
                Texas Cemetery Brokers
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
