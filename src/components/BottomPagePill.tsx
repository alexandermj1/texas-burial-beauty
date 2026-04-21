import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/property-types", label: "Property Types" },
  { to: "/properties", label: "Properties" },
  { to: "/sell", label: "Sell Property" },
  { to: "/team", label: "Our Team" },
  { to: "/blog", label: "Blog" },
];

const labelFor = (path: string) => {
  const exact = links.find((l) => l.to === path);
  if (exact) return exact.label;
  const partial = links.find((l) => l.to !== "/" && path.startsWith(l.to));
  return partial?.label ?? "Menu";
};

const BottomPagePill = () => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y > 200);
      const nearBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      setExpanded(nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => setExpanded(false), [location.pathname]);

  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  if (typeof document === "undefined") return null;

  const currentLabel = labelFor(location.pathname);

  return createPortal(
    <div className="fixed bottom-8 inset-x-0 z-[60] flex justify-center pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={containerRef}
            key="pill-wrapper"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto"
          >
            <motion.div
              layout
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-2xl border border-primary-foreground/15 bg-primary text-primary-foreground shadow-[0_25px_70px_-15px_hsl(var(--primary)/0.55)]"
              style={{ width: expanded ? "min(92vw, 340px)" : "min(80vw, 260px)" }}
            >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-4 px-5 py-3.5"
          aria-expanded={expanded}
        >
          <span className="w-6 h-6 rounded-md border border-primary-foreground/30 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
          </span>
          <span className="font-display text-sm tracking-[0.18em] uppercase truncate text-primary-foreground">
            {currentLabel}
          </span>
          <span className="w-6 h-6 flex items-center justify-center text-primary-foreground">
            {expanded ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1">
                <div className="text-[10px] tracking-[0.3em] uppercase text-primary-foreground/50 mb-3">
                  Menu
                </div>
                <ul className="flex flex-col gap-1.5 mb-5">
                  {links.map((link) => {
                    const active = location.pathname === link.to;
                    return (
                      <li key={link.to} className="flex items-center gap-2">
                        {active ? (
                          <span className="w-1.5 h-1.5 rotate-45 bg-accent" aria-hidden />
                        ) : (
                          <span className="w-1.5 h-1.5" aria-hidden />
                        )}
                        <Link
                          to={link.to}
                          className={`font-display text-2xl leading-tight transition-colors ${
                            active
                              ? "text-primary-foreground"
                              : "text-primary-foreground/70 hover:text-primary-foreground"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex items-center justify-between text-xs text-primary-foreground/60 border-t border-primary-foreground/15 pt-4">
                  <a
                    href="tel:+12142560795"
                    className="inline-flex items-center gap-1.5 text-primary-foreground hover:text-accent transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    (214) 256-0795
                  </a>
                  <span className="tracking-[0.2em] uppercase text-[10px]">
                    Texas
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default BottomPagePill;
