import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Phone, Menu, X, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useAgent } from "@/hooks/useAgent";

const Navbar = ({ forceScrolled = false }: { forceScrolled?: boolean }) => {
  const [scrolled, setScrolled] = useState(forceScrolled);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { isAgent, loading: agentLoading } = useAgent();

  useEffect(() => {
    const onScroll = () => setScrolled(forceScrolled || window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/property-types", label: "Property Types" },
    { to: "/properties", label: "Properties" },
    { to: "/sell", label: "Sell Property" },
    { to: "/team", label: "Our Team" },
    { to: "/blog", label: "Blog" },
  ];

  const rolesLoading = authLoading || adminLoading || agentLoading;
  const dashboardLink = rolesLoading ? "/dashboard" : isAdmin ? "/admin" : isAgent ? "/agent" : "/dashboard";

  if (typeof document === "undefined") return null;

  const navContent = (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/95 backdrop-blur-lg shadow-soft border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className={`font-display text-2xl transition-colors duration-500 ${scrolled ? "text-foreground" : "text-primary-foreground"}`}>
            Cemetery Property
          </span>
          <span className={`text-xs tracking-[0.2em] uppercase font-body hidden sm:inline transition-colors duration-500 ${scrolled ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
            Resales
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="tel:+16503720795" className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-500 ${scrolled ? "text-primary" : "text-primary-foreground/80 hover:text-primary-foreground"}`}>
            <Phone className="w-3.5 h-3.5" />
            650-372-0795
          </a>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors duration-500 ${
                location.pathname === link.to
                  ? scrolled ? "text-foreground font-medium" : "text-primary-foreground font-medium"
                  : scrolled ? "text-muted-foreground hover:text-foreground" : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <Link
              to={dashboardLink}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-500 ${
                scrolled
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/25"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-500 ${
                scrolled
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/25"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:hidden transition-colors ${scrolled ? "text-foreground" : "text-primary-foreground"}`}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background border-t border-border px-6 py-6 flex flex-col gap-4">
          <a href="tel:+16503720795" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
            <Phone className="w-3.5 h-3.5" />
            650-372-0795
          </a>
          {links.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="text-sm text-foreground">
              {link.label}
            </Link>
          ))}
          {user ? (
            <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full w-fit">
              <User className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full w-fit">
              <User className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );

  return createPortal(navContent, document.body);
};

export default Navbar;
