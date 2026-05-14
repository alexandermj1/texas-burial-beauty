import { useState, useLayoutEffect } from "react";
import { Phone, Menu, X, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useAgent } from "@/hooks/useAgent";

const Navbar = ({ forceScrolled = false }: { forceScrolled?: boolean }) => {
  const computeScrolled = () =>
    forceScrolled || (typeof window !== "undefined" && window.scrollY > 40);
  const [scrolled, setScrolled] = useState(computeScrolled);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { isAgent, loading: agentLoading } = useAgent();

  useLayoutEffect(() => {
    // Sync before paint so the light navbar background and dark text always
    // change together, including after route transitions and fast scrolling.
    setMenuOpen(false);
    const onScroll = () => setScrolled(computeScrolled());
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceScrolled, location.pathname]);

  const links = [
    { to: "/property-types", label: "Property Types" },
    { to: "/cemeteries", label: "Buy Property" },
    { to: "/sell", label: "Sell Property" },
    { to: "/team", label: "Our Team" },
    { to: "/partners", label: "Partners" },
  ];

  const rolesLoading = authLoading || adminLoading || agentLoading;
  const dashboardLink = rolesLoading ? "/dashboard" : isAdmin ? "/admin" : isAgent ? "/agent" : "/dashboard";

  const navContent = (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-lg shadow-soft border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className={`font-display text-2xl ${scrolled ? "text-foreground" : "text-primary-foreground"}`}>
            Texas Cemetery
          </span>
          <span className={`text-xs tracking-[0.2em] uppercase font-body hidden sm:inline ${scrolled ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
            Brokers
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="tel:+14242341678" className={`inline-flex items-center gap-1.5 text-sm font-medium ${scrolled ? "text-primary" : "text-primary-foreground/80 hover:text-primary-foreground"}`}>
            <Phone className="w-3.5 h-3.5" />
            (424) 234-1678
          </a>
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
          <a href="tel:+14242341678" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
            <Phone className="w-3.5 h-3.5" />
            (424) 234-1678
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

  return navContent;
};

export default Navbar;
