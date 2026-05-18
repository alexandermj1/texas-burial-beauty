import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

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
  const splashHoldMs = shouldReduceMotion ? 150 : 2400;

  useEffect(() => {
    if (!shouldShowSplash) return;
    hasShownSplash = true;
    const t = window.setTimeout(() => setSplashVisible(false), splashHoldMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const words = useMemo(() => BRAND.split(" "), []);

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

      {/* Home-only first-load splash — Apple-minimal */}
      <AnimatePresence>
        {splashVisible && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background pointer-events-none px-6 overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.02, filter: "blur(8px)" }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : { duration: 0.9, ease: [0.65, 0, 0.35, 1] }
            }
          >
            {/* Soft, single radial glow — no dots, no grid */}
            {!shouldReduceMotion && (
              <motion.div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 55% 45% at 50% 50%, hsl(var(--sage) / 0.10), transparent 70%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2 }}
              />
            )}

            <div className="relative flex flex-col items-center text-foreground max-w-full">
              {/* Wordmark — large, serif, calm */}
              <h1 className="font-display tracking-tight text-center leading-[1.05] text-3xl sm:text-5xl md:text-6xl lg:text-7xl flex flex-wrap justify-center gap-x-[0.32em] max-w-[92vw]">
                {words.map((word, wi) => (
                  <span key={`${word}-${wi}`} className="inline-flex overflow-hidden pb-[0.08em]">
                    {word.split("").map((char, ci) => (
                      <motion.span
                        key={`${char}-${ci}`}
                        className="inline-block"
                        initial={
                          shouldReduceMotion
                            ? { y: 0, opacity: 1 }
                            : { y: "105%", opacity: 0 }
                        }
                        animate={{ y: "0%", opacity: 1 }}
                        transition={{
                          duration: 0.85,
                          delay: 0.15 + wi * 0.12 + ci * 0.025,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </h1>

              {/* Hairline divider drawing out */}
              <motion.div
                aria-hidden
                className="mt-7 sm:mt-9 h-px bg-foreground/25"
                initial={shouldReduceMotion ? { width: 80 } : { width: 0 }}
                animate={{ width: 80 }}
                transition={{ duration: 0.9, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* Tagline */}
              <motion.span
                className="mt-5 text-[10px] sm:text-xs uppercase tracking-[0.4em] text-muted-foreground"
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
              >
                Est. 1996 · All of Texas
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
