import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { Menu, X, Building2, Trees, ShoppingBag, Tag, Handshake, Mail, Phone, ArrowRight, ArrowUpRight, BookOpen, Flower2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import hibiscusLogo from "@/assets/flowers/hibiscus-coral.png.asset.json";
import { SPARKMAN_HERO } from "@/data/sparkmanPhotos";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import plumeriaCluster from "@/assets/flowers/plumeria-cluster.png.asset.json";
import pinkBlossom from "@/assets/flowers/pink-blossom.png.asset.json";

type MenuKey = "cemeteries" | "guides";

// Most-read guides, styled like the cards on /guides
const featuredGuides = [
  { to: "/cemetery-transfer-process-texas", num: "05", kicker: "The Transfer Edition", title: "The Cemetery", accent: "Transfer Process", meta: "8 chapters · 17 min read", panel: "bg-[hsl(200_28%_34%)]", ink: "text-[hsl(40_30%_97%)]", flower: plumeriaCluster.url },
  { to: "/sell-cemetery-plot-texas", num: "01", kicker: "The Seller's Edition", title: "How to Sell a", accent: "Cemetery Plot", meta: "9 min read", panel: "bg-[hsl(16_50%_45%)]", ink: "text-[hsl(40_30%_97%)]", flower: hibiscusCoral.url },
  { to: "/preneed-cemetery-plots-texas", num: "04", kicker: "The Preneed Edition", title: "Preneed Cemetery", accent: "Plots in Texas", meta: "9 chapters · 8 min read", panel: "bg-[hsl(28_22%_38%)]", ink: "text-[hsl(40_30%_97%)]", flower: pinkBlossom.url },
];

// The rest of the series, listed in the menu's contents rail
const otherGuides = [
  { to: "/guides/planning-a-funeral-in-texas", num: "00", title: "Planning a Funeral in Texas" },
  { to: "/cemetery-plots-for-sale-texas", num: "02", title: "Cemetery Plots for Sale" },
  { to: "/cemetery-plot-cost-texas", num: "03", title: "What a Plot Costs in Texas" },
];

const Navbar = ({ forceScrolled = false, dark = false, warm = false }: { forceScrolled?: boolean; dark?: boolean; warm?: boolean }) => {
  const computeScrolled = () =>
    forceScrolled || (typeof window !== "undefined" && window.scrollY > 40);
  const [scrolled, setScrolled] = useState(computeScrolled);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [lastMenu, setLastMenu] = useState<MenuKey>("cemeteries");
  const closeTimer = useRef<number | null>(null);
  const openNow = (k: MenuKey) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenMenu(k);
    setLastMenu(k);
  };
  const closeMenu = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenMenu(null);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 140);
  };
  const megaOpen = openMenu !== null;
  const location = useLocation();
  useEffect(() => { setOpenMenu(null); }, [location.pathname]);

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
    { to: "/buy", label: "Buy Property", desc: "Available listings", Icon: ShoppingBag },
    { to: "/sell", label: "Sell Property", desc: "List your plot", Icon: Tag },
    { to: "/cemeteries", label: "Cemeteries", desc: "Find a cemetery near you", Icon: Trees },
    { to: "/guides", label: "Guides", desc: "Plain-English help", Icon: BookOpen },
    { to: "/partners", label: "Partners", desc: "Funeral homes & agents", Icon: Handshake },
    { to: "/property-types", label: "Property Types", desc: "Browse plot categories", Icon: Building2 },
    { to: "/contact", label: "Contact", desc: "Talk to our team", Icon: Mail },
  ];

  // Local city landing pages — surfaced inside the existing "Cemeteries" item
  // so the top bar stays uncrowded.
  const cityLinks = [
    { to: "/cemetery-plots-for-sale-dallas", label: "Dallas–Fort Worth", detail: "North Texas" },
    { to: "/cemetery-plots-for-sale-houston", label: "Houston", detail: "Greater Houston" },
    { to: "/cemetery-plots-for-sale-austin", label: "Austin", detail: "Central Texas" },
    { to: "/cemetery-plots-for-sale-san-antonio", label: "San Antonio", detail: "South Texas" },
  ];
  const menuPhoto = SPARKMAN_HERO;


  const solid = scrolled || menuOpen || megaOpen;

  // Dark "dossier" theme — ink/gold editorial pages
  const dkBar = solid
    ? "bg-[hsl(var(--ink-deep)/0.95)] backdrop-blur-lg border-b border-[hsl(var(--gold)/0.25)]"
    : "bg-transparent";
  const dkBrand = "text-[hsl(var(--parchment))]";
  const dkLink = (isActive: boolean) =>
    isActive
      ? "text-[hsl(var(--parchment))] font-medium"
      : "text-[hsl(var(--parchment)/0.65)] hover:text-[hsl(var(--gold))]";

  return (
    <>
      <nav
        onMouseLeave={scheduleClose}
        onMouseEnter={() => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }}
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ${
          dark
            ? dkBar
            : solid
              ? `bg-background/95 backdrop-blur-lg ${megaOpen && !menuOpen ? "" : "shadow-soft"} border-b border-border`
              : warm
                ? "bg-background/20 backdrop-blur-sm border-b border-foreground/5"
                : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="relative grid h-8 w-8 shrink-0 place-items-center" aria-hidden>
              <Flower2 className={`h-6 w-6 ${dark ? "text-[hsl(var(--gold))]" : solid || warm ? "text-primary" : "text-primary-foreground"}`} />
              <img src={hibiscusLogo.url} alt="" width={32} height={32} className="absolute inset-0 h-8 w-8 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            </span>
            <span className={`font-display text-lg sm:text-2xl transition-colors duration-300 ${dark ? dkBrand : solid || warm ? "text-foreground" : "text-primary-foreground"}`}>
              Texas Cemetery Brokers
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map(link => {
              const isActive = location.pathname === link.to;
              const cls = `text-sm transition-colors duration-300 ${
                dark
                  ? dkLink(isActive)
                  : isActive
                    ? solid || warm ? "text-foreground font-medium" : "text-primary-foreground font-medium"
                    : solid || warm ? "text-foreground/65 hover:text-foreground" : "text-primary-foreground/70 hover:text-primary-foreground"
              }`;
              const key: MenuKey | null = link.to === "/cemeteries" ? "cemeteries" : link.to === "/guides" ? "guides" : null;

              if (!key) {
                return (
                  <Link key={link.to} to={link.to} className={cls} onMouseEnter={closeMenu}>
                    {link.label}
                  </Link>
                );
              }
              const isOpen = openMenu === key;
              return (
                <div key={link.to} className="py-2 -my-2" onMouseEnter={() => openNow(key)} onFocus={() => openNow(key)}>
                  <Link to={link.to} aria-expanded={isOpen} className={`${cls} inline-flex items-center gap-1.5`}>
                    {link.label}
                    <span className="relative inline-flex items-center justify-center w-4 h-4">
                      <span className={`absolute inset-0 rounded-full border border-current transition-all duration-300 ${isOpen ? "opacity-60 scale-110" : "opacity-25"}`} />
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 overflow-visible">
                        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                          className={`origin-center transition-transform duration-500 ease-out ${isOpen ? "rotate-180 -translate-y-px" : ""}`} />
                      </svg>
                    </span>
                  </Link>
                </div>
              );
            })}


            <a
              href="tel:+12142304740"
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                dark
                  ? "bg-[hsl(var(--gold))] text-[hsl(var(--ink))] hover:bg-[hsl(var(--parchment))]"
                    : solid || warm
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
              dark
                ? "text-[hsl(var(--parchment))] border-[hsl(var(--gold)/0.4)] hover:bg-[hsl(var(--gold)/0.12)]"
                : (scrolled || menuOpen || warm)
                  ? "text-foreground border-border hover:bg-muted"
                  : "text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
            }`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {/* Shared mega-panel — Cemeteries and Guides slide between each other */}
        <div
          aria-hidden={!megaOpen}
          className={`hidden md:block absolute left-0 right-0 top-full z-50 origin-top transition-[opacity,transform,filter,visibility] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${megaOpen ? "opacity-100 visible translate-y-0 scale-100 blur-0" : "opacity-0 invisible -translate-y-2 scale-[0.985] blur-[3px] pointer-events-none"}`}
        >
          <div className={`relative w-full overflow-hidden border-y shadow-hover ${dark ? "border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--ink-deep))]" : "border-border bg-background"}`}>
            <div className="grid">
              {(["cemeteries", "guides"] as MenuKey[]).map((k) => {
                const shown = (openMenu ?? lastMenu) === k;
                const offset = shown ? "translate-x-0 opacity-100" : k === "cemeteries" ? "-translate-x-12 opacity-0 pointer-events-none" : "translate-x-12 opacity-0 pointer-events-none";
                const reveal = (i: number) => ({
                  className: `transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${shown && megaOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`,
                  style: { transitionDelay: shown && megaOpen ? `${90 + i * 50}ms` : "0ms" },
                });
                return (
                  <div key={k} {...(!shown ? { inert: "" } : {})} className={`[grid-area:1/1] transition-[opacity,transform] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${offset}`}>
                    {k === "cemeteries" ? (
                      <div className="container mx-auto grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-8 px-6 py-5">
                        {menuPhoto && (
                          <figure className="min-w-0">
                            <img src={menuPhoto.src} alt={menuPhoto.alt} loading="lazy" className="h-40 w-full rounded-md object-cover" />
                            <figcaption className={`mt-3 font-display text-sm italic ${dark ? "text-[hsl(var(--parchment)/0.8)]" : "text-foreground/70"}`}>
                              Sparkman-Hillcrest Memorial Park · Dallas
                            </figcaption>
                          </figure>
                        )}
                        <div className="grid grid-cols-2 gap-x-10">
                          <p className={`col-span-2 mb-1 text-[10px] uppercase tracking-[0.28em] font-medium ${dark ? "text-[hsl(var(--gold))]" : "text-muted-foreground"}`}>Explore by region</p>
                          {cityLinks.map((c, i) => (
                            <div key={c.to} {...reveal(i)}>
                              <Link to={c.to} onClick={closeMenu} className={`group/i flex min-h-20 min-w-0 items-center gap-4 border-b py-4 transition-colors ${dark ? "border-[hsl(var(--gold)/0.25)] text-[hsl(var(--parchment))] hover:text-[hsl(var(--gold))]" : "border-border text-foreground hover:text-primary"}`}>
                                <span className={`self-start pt-1 text-xs ${dark ? "text-[hsl(var(--gold))]" : "text-muted-foreground"}`}>0{i + 1}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-display text-2xl leading-tight">{c.label}</span>
                                  <span className={`mt-1 block text-xs ${dark ? "text-[hsl(var(--parchment))]" : "text-muted-foreground"}`}>{c.detail}</span>
                                </span>
                                <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover/i:translate-x-1" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative container mx-auto flex h-full flex-col px-6 py-5">
                        <div className="relative flex flex-1 items-stretch gap-7">
                          {/* Contents rail — the rest of the series, set like a magazine index */}
                          <aside className={`flex w-56 shrink-0 flex-col justify-between border-l py-0.5 pl-5 ${dark ? "border-[hsl(var(--gold)/0.25)]" : "border-border"}`}>
                            <div>
                              <p className={`text-[10px] uppercase tracking-[0.3em] font-medium ${dark ? "text-[hsl(var(--gold))]" : "text-muted-foreground"}`}>
                                Also in the series
                              </p>
                              <ul className="mt-1.5">
                                {otherGuides.map((g, i) => (
                                  <li key={g.to} {...reveal(i + 3)}>
                                    <Link
                                      to={g.to}
                                      onClick={closeMenu}
                                      className={`group/s flex items-baseline gap-2.5 border-t py-[7px] transition-colors ${
                                        dark
                                          ? "border-[hsl(var(--gold)/0.2)] text-[hsl(var(--parchment))] hover:text-[hsl(var(--gold))]"
                                          : "border-border/70 text-foreground/80 hover:text-primary"
                                      }`}
                                    >
                                      <span className="font-display text-[11px] italic leading-none opacity-55">N°{g.num}</span>
                                      <span className="font-display text-[14px] leading-snug">{g.title}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Link
                              to="/guides"
                              onClick={closeMenu}
                              className={`group/a mt-3 inline-flex items-center gap-2 font-display text-sm italic transition-colors ${
                                dark ? "text-[hsl(var(--parchment))] hover:text-[hsl(var(--gold))]" : "text-foreground/70 hover:text-primary"
                              }`}
                            >
                              All seven guides <ArrowRight className="h-4 w-4 transition-transform group-hover/a:translate-x-1" />
                            </Link>
                          </aside>
                          <div className="grid flex-1 grid-cols-3 gap-4">
                            {featuredGuides.map((g, i) => (
                              <div key={g.to} {...reveal(i)}>
                                <Link to={g.to} onClick={closeMenu} className={`group/g relative flex h-full min-h-[13rem] flex-col justify-between overflow-hidden rounded-2xl p-6 ${g.panel} ${g.ink} transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1`}>
                                  <div
                                    aria-hidden
                                    className="absolute inset-0 opacity-[0.10] mix-blend-overlay"
                                    style={{
                                      backgroundImage:
                                        "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                                      backgroundSize: "44px 44px",
                                    }}
                                  />
                                  <img src={g.flower} alt="" aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 object-contain opacity-70 transition-transform duration-700 ease-out group-hover/g:scale-110 group-hover/g:-rotate-6" />
                                  <div className="relative flex items-start justify-between">
                                    <span className="text-[10px] uppercase tracking-[0.22em] opacity-90">{g.kicker}</span>
                                    <span className="font-display text-3xl leading-none opacity-45">{g.num}</span>
                                  </div>
                                  <div className="relative max-w-[68%]">
                                    <p className="font-display text-[1.45rem] leading-[1.12]">{g.title} <span className="italic">{g.accent}</span></p>
                                    <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium opacity-90">{g.meta} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/g:translate-x-0.5 group-hover/g:-translate-y-0.5" /></p>
                                  </div>
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu panel — rendered outside nav to avoid stacking issues */}
      {menuOpen && (
        <div
          className={`md:hidden fixed inset-x-0 top-[68px] bottom-0 z-40 overflow-y-auto animate-fade-in ${dark ? "bg-[hsl(var(--ink))]" : "bg-background"}`}
        >
          <div className="relative px-6 pt-6 pb-10 flex flex-col gap-6 min-h-full">
            <p className={`text-[11px] uppercase tracking-[0.18em] font-medium ${dark ? "text-[hsl(var(--gold))]" : "text-muted-foreground"}`}>
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
                        dark
                          ? active
                            ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.12)]"
                            : "border-[hsl(var(--gold)/0.2)] bg-[hsl(var(--ink-deep)/0.6)] hover:border-[hsl(var(--gold)/0.45)] active:scale-[0.98]"
                          : active
                            ? "border-primary/30 bg-primary/5 shadow-sm"
                            : "border-border/60 bg-card/40 hover:border-primary/20 hover:bg-primary/5 active:scale-[0.98]"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors ${
                          dark
                            ? active
                              ? "bg-[hsl(var(--gold))] text-[hsl(var(--ink))]"
                              : "bg-[hsl(var(--ink-deep))] text-[hsl(var(--parchment))] group-hover:bg-[hsl(var(--gold))] group-hover:text-[hsl(var(--ink))]"
                            : active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                      </span>
                      <span className="flex flex-col flex-1 min-w-0">
                        <span className={`text-base leading-tight ${dark ? "text-[hsl(var(--parchment))]" : "text-foreground"} ${active ? "font-semibold" : "font-medium"}`}>
                          {link.label}
                        </span>
                        <span className={`text-xs mt-0.5 truncate ${dark ? "text-[hsl(var(--parchment)/0.55)]" : "text-muted-foreground"}`}>
                          {link.desc}
                        </span>
                      </span>
                      <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition-all shrink-0 ${dark ? "text-[hsl(var(--parchment)/0.5)] group-hover:text-[hsl(var(--gold))]" : "text-muted-foreground/60 group-hover:text-primary"}`} />
                    </Link>
                    {link.to === "/cemeteries" && (
                      <div className={`mt-2 ml-3 pl-4 border-l flex flex-wrap gap-2 ${dark ? "border-[hsl(var(--gold)/0.25)]" : "border-border/60"}`}>
                        {cityLinks.map(c => (
                          <Link
                            key={c.to}
                            to={c.to}
                            onClick={() => setMenuOpen(false)}
                            className={`px-3 py-1.5 rounded-full border text-xs active:scale-95 transition-all ${
                              dark
                                ? "border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--ink-deep)/0.6)] text-[hsl(var(--parchment)/0.8)]"
                                : "border-border/70 bg-card/50 text-foreground/75"
                            }`}
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {link.to === "/guides" && (
                      <div className="mt-2 flex flex-col gap-2">
                        {featuredGuides.map(g => (
                          <Link
                            key={g.to}
                            to={g.to}
                            onClick={() => setMenuOpen(false)}
                            className={`group relative flex min-h-24 items-end justify-between overflow-hidden rounded-xl p-4 ${g.panel} ${g.ink} active:scale-[0.98] transition-transform`}
                          >
                            <div
                              aria-hidden
                              className="absolute inset-0 opacity-[0.10] mix-blend-overlay"
                              style={{
                                backgroundImage:
                                  "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                                backgroundSize: "34px 34px",
                              }}
                            />
                            <img src={g.flower} alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 object-contain opacity-70" />
                            <span className="relative">
                              <span className="block text-[9px] uppercase tracking-[0.18em] opacity-90">{g.kicker} · N°{g.num}</span>
                              <span className="mt-1.5 block max-w-[80%] font-display text-lg leading-tight">{g.title} <span className="italic">{g.accent}</span></span>
                              <span className="mt-1 block text-[11px] font-medium opacity-90">{g.meta}</span>
                            </span>
                            <ArrowUpRight className="relative h-4 w-4 shrink-0 opacity-80" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>


            <div className={`mt-auto pt-6 border-t flex flex-col gap-3 ${dark ? "border-[hsl(var(--gold)/0.25)]" : "border-border/60"}`}>
              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium shadow-soft hover:shadow-hover transition-shadow ${
                  dark ? "bg-[hsl(var(--gold))] text-[hsl(var(--ink))]" : "bg-primary text-primary-foreground"
                }`}
              >
                <Mail className="w-4 h-4" />
                Get in touch
              </Link>
              <a
                href="tel:+12142304740"
                className={`flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm transition-colors ${
                  dark
                    ? "border-[hsl(var(--gold)/0.4)] text-[hsl(var(--parchment))] hover:bg-[hsl(var(--gold)/0.12)]"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <Phone className="w-4 h-4" />
                Call (214) 230-4740
              </a>
              <p className={`text-center text-[11px] mt-2 ${dark ? "text-[hsl(var(--parchment)/0.5)]" : "text-muted-foreground"}`}>
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
