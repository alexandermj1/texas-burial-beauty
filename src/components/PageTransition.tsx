import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import hibiscus from "@/assets/flowers/hibiscus-coral.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";

const BRAND = "Texas Cemetery Brokers";

// Module-level flag so the splash only shows once per full site load.
let hasShownSplash = false;

const PageTransition = () => {
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();

  const isHome = location.pathname === "/";
  const shouldShowSplash = isHome && !hasShownSplash;

  const [splashVisible, setSplashVisible] = useState(shouldShowSplash);
  const splashHoldMs = shouldReduceMotion ? 150 : 3200;

  useEffect(() => {
    if (!shouldShowSplash) return;
    hasShownSplash = true;
    const t = window.setTimeout(() => setSplashVisible(false), splashHoldMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const words = useMemo(() => BRAND.split(" "), []);

  // Private dashboards are large interactive workspaces. Keeping them outside
  // AnimatePresence avoids ref hand-offs to lazy route components and makes the
  // admin appear as soon as its data is ready instead of waiting on an exit.
  if (location.pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-background">{outlet}</div>;
  }

  const initialState = shouldReduceMotion ? { opacity: 1 } : { opacity: 0 };
  const animateState = { opacity: 1 };
  const exitState = { opacity: 0 };

  return (
    <div className="grid min-h-screen bg-background isolate overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={initialState}
          animate={animateState}
          exit={exitState}
          transition={
            shouldReduceMotion
              ? { duration: 0.15 }
              : {
                  duration: 0.35,
                  ease: "easeOut",
                  delay: shouldShowSplash ? splashHoldMs / 1000 : 0,
                }
          }
          style={{ willChange: "opacity" }}
          className="col-start-1 row-start-1 overflow-hidden bg-background"
        >
          {outlet}
        </motion.div>
      </AnimatePresence>

      {/* Home-only first-load splash — modern Texas botanical editorial */}
      <AnimatePresence>
        {splashVisible && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background pointer-events-none overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.025 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : { duration: 0.9, ease: [0.65, 0, 0.35, 1] }
            }
          >
            <motion.div
              aria-hidden
              className="absolute left-0 top-0 h-2 w-full bg-accent"
              initial={shouldReduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              aria-hidden
              className="absolute bottom-0 left-0 h-[18vh] w-full bg-sage-light/70"
              initial={shouldReduceMotion ? false : { y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.15, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />

            <motion.div
              aria-hidden
              className="absolute -left-24 -bottom-16 sm:-left-20 sm:-bottom-28 w-[20rem] sm:w-[34rem] lg:w-[42rem] origin-bottom-left"
              initial={shouldReduceMotion ? false : { x: "-28%", y: "18%", rotate: -8, opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: -2, opacity: 1 }}
              exit={{ x: "-35%", y: "18%", rotate: -8, opacity: 0 }}
              transition={{ duration: 1.25, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <img src={bananaLeaf.url} alt="" className="absolute bottom-0 left-0 w-[66%] -rotate-6" />
              <img src={hibiscus.url} alt="" className="relative ml-[20%] w-[72%] rotate-6 drop-shadow-xl" />
            </motion.div>

            <motion.div
              aria-hidden
              className="absolute -right-28 -top-20 sm:-right-16 sm:-top-28 w-[21rem] sm:w-[36rem] lg:w-[43rem] origin-top-right"
              initial={shouldReduceMotion ? false : { x: "30%", y: "-18%", rotate: 9, opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: 1, opacity: 1 }}
              exit={{ x: "35%", y: "-18%", rotate: 8, opacity: 0 }}
              transition={{ duration: 1.3, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <img src={palmFan.url} alt="" className="absolute right-0 top-0 w-[74%] rotate-12 opacity-90" />
              <img src={pinkBranch.url} alt="" className="relative ml-[2%] mt-[13%] w-[76%] -rotate-6 drop-shadow-lg" />
            </motion.div>

            <div className="relative z-10 flex max-w-[92vw] flex-col items-center px-5 text-center text-foreground">
              {/* A survey plat + location marker: cemetery property, professionally brokered. */}
              <motion.div
                className="mb-6 flex items-center gap-3 sm:mb-8"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
              >
                <span className="h-px w-10 bg-accent/60 sm:w-16" />
                <span className="text-[10px] font-semibold uppercase text-primary sm:text-xs">Cemetery property brokerage</span>
                <span className="h-px w-10 bg-accent/60 sm:w-16" />
              </motion.div>

              <motion.div
                aria-hidden
                className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-primary/25 bg-card shadow-soft sm:h-24 sm:w-24"
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.78, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <svg viewBox="0 0 72 72" fill="none" className="h-12 w-12 text-primary sm:h-14 sm:w-14">
                  <motion.path d="M17 12h29l9 9v39H17z M46 12v10h9 M25 31h22 M25 39h22 M25 47h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" initial={shouldReduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.7 }} />
                  <motion.path d="M48 43c0-4 3-7 7-7s7 3 7 7c0 6-7 13-7 13s-7-7-7-13z" fill="hsl(var(--accent))" stroke="hsl(var(--background))" strokeWidth="1.5" initial={shouldReduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 1.25 }} />
                  <circle cx="55" cy="43" r="2" fill="hsl(var(--background))" />
                </svg>
              </motion.div>

              <h1 className="flex max-w-[92vw] flex-wrap justify-center gap-x-[0.3em] font-display text-4xl leading-[1.03] sm:text-6xl md:text-7xl lg:text-8xl">
                {words.map((word, wi) => (
                  <span key={`${word}-${wi}`} className="inline-flex overflow-hidden pb-[0.08em]">
                    {word.split("").map((char, ci) => (
                      <motion.span
                        key={`${char}-${ci}`}
                        className="inline-block"
                        initial={
                          shouldReduceMotion
                            ? { y: 0, opacity: 1 }
                            : { y: "110%", opacity: 0, rotate: 2 }
                        }
                        animate={{ y: "0%", opacity: 1, rotate: 0 }}
                        transition={{
                          duration: 0.78,
                          delay: 0.82 + wi * 0.1 + ci * 0.018,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </h1>

              <motion.div
                className="mt-7 flex items-center gap-3 sm:mt-9"
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-xs font-medium uppercase text-muted-foreground sm:text-sm">Serving all of Texas</span>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
