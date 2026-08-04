import { useState, useLayoutEffect, useEffect } from "react";
import { Menu, X, Building2, Trees, ShoppingBag, Tag, Handshake, Mail, Phone, ArrowRight, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import hibiscusLogo from "@/assets/flowers/hibiscus-coral.png.asset.json";

const Navbar = ({ forceScrolled = false }: { forceScrolled?: boolean }) => {
  const computeScrolled = () =>
    forceScrolled || (typeof window !== "undefined" && window.scrollY > 40);
  const [scrolled, setScrolled] = useState(computeScrolled);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
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

  // Local city landing pages — surfaced inside the existing "Cemeteries" item
  // so the top bar stays uncrowded.
  const cityLinks = [
    { to: "/cemetery-plots-for-sale-dallas", label: "Dallas–Fort Worth" },
    { to: "/cemetery-plots-for-sale-houston", label: "Houston" },
    { to: "/cemetery-plots-for-sale-austin", label: "Austin" },
    { to: "/cemetery-plots-for-sale-san-antonio", label: "San Antonio" },
  ];


  const solid = scrolled || menuOpen || megaOpen;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ${
          solid
            ? `bg-background/95 backdrop-blur-lg ${megaOpen && !menuOpen ? "" : "shadow-soft"} border-b border-border`
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <img src={hibiscusLogo.url} alt="" width={32} height={32} className="w-8 h-8 object-contain" />
            <span className={`font-display text-lg sm:text-2xl transition-colors duration-300 ${solid ? "text-foreground" : "text-primary-foreground"}`}>
              Texas Cemetery Brokers
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map(link => {
              const isActive = location.pathname === link.to;
              const cls = `text-sm transition-colors duration-300 ${
                isActive
                  ? solid ? "text-foreground font-medium" : "text-primary-foreground font-medium"
                  : solid ? "text-muted-foreground hover:text-foreground" : "text-primary-foreground/70 hover:text-primary-foreground"
              }`;

              if (link.to !== "/cemeteries") {
                return (
                  <Link key={link.to} to={link.to} className={cls}>
                    {link.label}
                  </Link>
                );
              }

              return (
                <div
                  key={link.to}
                  className="group py-2 -my-2"
                  onMouseEnter={() => setMegaOpen(true)}
                  onMouseLeave={() => setMegaOpen(false)}
                  onFocus={() => setMegaOpen(true)}
                  onBlur={() => setMegaOpen(false)}
                >
                  <Link to={link.to} className={`${cls} inline-flex items-center gap-1.5`}>
                    {link.label}

                    {/* Inventive indicator: sage ring with a morphing caret */}
                    <span className="relative inline-flex items-center justify-center w-4 h-4">
                      <span className="absolute inset-0 rounded-full border border-current opacity-25 group-hover:opacity-60 group-hover:scale-110 transition-all duration-300" />
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 overflow-visible">
                        <path
                          d="M2.5 4.5 L6 8 L9.5 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="origin-center transition-transform duration-500 ease-out group-hover:rotate-180 group-hover:translate-y-[-1px]"
                        />
                      </svg>
                    </span>
                  </Link>

                  {/* Full-bleed mega-panel flowing out of the bar */}
                  <div className="absolute left-0 right-0 top-full opacity-0 invisible -translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 focus-within:opacity-100 focus-within:visible transition-all duration-300 ease-out z-50">
                    <div className="relative w-full border-y border-border/60 bg-popover/95 backdrop-blur-xl shadow-hover">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sage/50 to-transparent" />
                      <div className="container mx-auto px-6 py-8 grid grid-cols-12 gap-8">
                        {/* Featured */}
                        <Link
                          to="/cemeteries"
                          className="group/f col-span-12 lg:col-span-4 flex items-start gap-4 rounded-[1.5rem] bg-gradient-sage hover:bg-sage-light transition-colors p-5"
                        >
                          <span className="shrink-0 w-11 h-11 rounded-2xl bg-sage text-primary-foreground flex items-center justify-center shadow-soft">
                            <Trees className="w-5 h-5" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-display text-lg text-foreground leading-tight">
                              Texas cemetery directory
                              <ArrowRight className="w-4 h-4 text-sage -translate-x-1 opacity-0 group-hover/f:opacity-100 group-hover/f:translate-x-0 transition-all" />
                            </span>
                            <span className="block text-xs text-muted-foreground mt-1">
                              All 95 cemeteries — fees, contacts and availability
                            </span>
                          </span>
                        </Link>

                        <div className="col-span-12 lg:col-span-5">
                          <p className="pb-3 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                            Plots by metro
                          </p>
                          <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5">
                            {cityLinks.map(c => (
                              <Link
                                key={c.to}
                                to={c.to}
                                className="group/i flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/70 transition-colors"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-sage/40 group-hover/i:bg-terracotta transition-colors shrink-0" />
                                <span className="truncate">{c.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-12 lg:col-span-3 lg:border-l border-border/60 lg:pl-8 flex items-end">
                          <Link
                            to="/cemetery-plot-cost-texas"
                            className="group/c w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3.5 bg-card/50 hover:bg-card text-sm text-foreground/85 hover:text-foreground transition-colors"
                          >
                            <span className="italic font-display text-[15px]">What does a plot cost in Texas?</span>
                            <ArrowRight className="w-4 h-4 text-sage group-hover/c:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );


            })}

            <a
              href="tel:+12142304740"
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                scrolled || menuOpen
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/20 backdrop-blur-sm"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              (214) 230-4740
            </a>
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
                    {link.to === "/cemeteries" && (
                      <div className="mt-2 ml-3 pl-4 border-l border-border/60 flex flex-wrap gap-2">
                        {cityLinks.map(c => (
                          <Link
                            key={c.to}
                            to={c.to}
                            onClick={() => setMenuOpen(false)}
                            className="px-3 py-1.5 rounded-full border border-border/70 bg-card/50 text-xs text-foreground/75 active:scale-95 transition-all"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
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
                href="tel:+12142304740"
                className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call (214) 230-4740
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
