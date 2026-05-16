import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

const BRAND = "Cemetery Property Resales";

// Module-level flag so the splash only shows once per full site load.
let hasShownSplash = false;

// Small flower SVG — petals scale in, center pops, stem grows
const Flower = ({
  delay,
  size = 28,
  hueShift = 0,
}: {
  delay: number;
  size?: number;
  hueShift?: number;
}) => {
  const petalColor =
    hueShift === 0
      ? "hsl(var(--sage))"
      : `hsl(var(--sage) / ${0.7 + (hueShift % 3) * 0.1})`;
  const centerColor = "hsl(var(--background))";

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [0, 1.15, 1], rotate: [- 30, 8, 0] }}
        transition={{
          duration: 0.9,
          delay,
          times: [0, 0.7, 1],
          ease: [0.2, 0.8, 0.2, 1],
        }}
        style={{ transformOrigin: "16px 16px" }}
      >
        {/* 5 petals around center */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <motion.ellipse
            key={i}
            cx="16"
            cy="9"
            rx="3.2"
            ry="5.5"
            fill={petalColor}
            style={{
              transformOrigin: "16px 16px",
              transform: `rotate(${angle}deg)`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.95 }}
            transition={{
              duration: 0.45,
              delay: delay + 0.1 + i * 0.05,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          />
        ))}
        {/* Center */}
        <motion.circle
          cx="16"
          cy="16"
          r="2.4"
          fill={centerColor}
          stroke={petalColor}
          strokeWidth="1"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{
            duration: 0.5,
            delay: delay + 0.4,
            times: [0, 0.7, 1],
            ease: [0.2, 0.8, 0.2, 1],
          }}
          style={{ transformOrigin: "16px 16px" }}
        />
      </motion.svg>
      {/* Stem grows down */}
      <motion.span
        className="block w-px"
        style={{ background: petalColor, transformOrigin: "top" }}
        initial={{ scaleY: 0, height: 14 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: 0.5,
          delay: delay + 0.05,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      />
    </motion.div>
  );
};

const PageTransition = () => {
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();

  const isHome = location.pathname === "/";
  const shouldShowSplash = isHome && !hasShownSplash;

  const [splashVisible, setSplashVisible] = useState(shouldShowSplash);
  const splashHoldMs = shouldReduceMotion ? 150 : 3300;

  useEffect(() => {
    if (!shouldShowSplash) return;
    hasShownSplash = true;
    const t = window.setTimeout(() => setSplashVisible(false), splashHoldMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const letters = useMemo(() => BRAND.split(""), []);

  // Flowers: alternating sizes, staggered bloom
  const flowers = useMemo(
    () => [
      { size: 22, delay: 2.45, hueShift: 0 },
      { size: 28, delay: 2.55, hueShift: 1 },
      { size: 34, delay: 2.65, hueShift: 2 },
      { size: 28, delay: 2.55, hueShift: 1 },
      { size: 22, delay: 2.45, hueShift: 0 },
    ],
    []
  );

  // ---- Subtle page transition (gentle fade only) ----
  const initialState = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 0 };

  const animateState = { opacity: 1 };

  const exitState = { opacity: 0 };

  return (
    <div className="grid min-h-screen bg-background isolate overflow-x-hidden">
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
          style={{
            willChange: "opacity",
          }}
          className="col-start-1 row-start-1 overflow-x-hidden bg-background"
        >
          {outlet}
        </motion.div>
      </AnimatePresence>

      {/* Home-only first-load splash */}
      <AnimatePresence>
        {splashVisible && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background pointer-events-none px-4 overflow-hidden"
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: "-100%" }}
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : { duration: 1.05, ease: [0.7, 0, 0.2, 1] }
            }
          >
            {/* Layer 1: Aurora gradient wash */}
            <motion.div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(var(--sage) / 0.18), transparent 70%), radial-gradient(ellipse 50% 40% at 30% 70%, hsl(var(--sage) / 0.08), transparent 70%), radial-gradient(ellipse 40% 35% at 75% 65%, hsl(var(--sage) / 0.06), transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4 }}
            />

            {/* Layer 2: Vignette */}
            <motion.div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 50%, hsl(var(--background)) 100%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            />

            {/* Layer 3: Subtle grain */}
            <motion.div
              aria-hidden
              className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, hsl(var(--foreground)) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, hsl(var(--foreground)) 0 1px, transparent 1px 3px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.04 }}
              transition={{ duration: 1.2 }}
            />

            {/* Layer 4: Ornate corner flourishes drawing in */}
            {!shouldReduceMotion && (
              <>
                {[
                  { pos: "top-6 left-6", rotate: 0 },
                  { pos: "top-6 right-6", rotate: 90 },
                  { pos: "bottom-6 right-6", rotate: 180 },
                  { pos: "bottom-6 left-6", rotate: 270 },
                ].map((c, i) => (
                  <motion.svg
                    key={i}
                    className={`absolute ${c.pos} w-12 h-12 sm:w-16 sm:h-16`}
                    viewBox="0 0 64 64"
                    fill="none"
                    style={{ transform: `rotate(${c.rotate}deg)` }}
                  >
                    <motion.path
                      d="M2 22 L2 2 L22 2 M2 2 Q14 14 26 14"
                      stroke="hsl(var(--sage) / 0.55)"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{
                        pathLength: {
                          duration: 1.1,
                          delay: 0.4 + i * 0.08,
                          ease: [0.2, 0.8, 0.2, 1],
                        },
                        opacity: { duration: 0.4, delay: 0.4 + i * 0.08 },
                      }}
                    />
                  </motion.svg>
                ))}
              </>
            )}

            <div className="relative flex flex-col items-center gap-7 text-foreground max-w-full">
              {/* Soft glow ring breathing behind the logo */}
              {!shouldReduceMotion && (
                <motion.div
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 top-0 rounded-full"
                  style={{
                    width: 240,
                    height: 240,
                    marginTop: -50,
                    background:
                      "radial-gradient(circle, hsl(var(--sage) / 0.30), transparent 65%)",
                    filter: "blur(10px)",
                  }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{
                    opacity: [0, 1, 0.65, 1],
                    scale: [0.7, 1.08, 1, 1.05],
                  }}
                  transition={{
                    duration: 2.8,
                    delay: 0.2,
                    times: [0, 0.4, 0.7, 1],
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* Logo: memorial arch — rises and settles */}
              <motion.div
                className="shrink-0 relative"
                initial={
                  shouldReduceMotion
                    ? { y: 0, scale: 1, opacity: 1 }
                    : { y: 32, scale: 0.78, opacity: 0 }
                }
                animate={
                  shouldReduceMotion
                    ? { y: 0, scale: 1, opacity: 1 }
                    : {
                        y: [32, -8, 2, 0],
                        scale: [0.78, 1.12, 0.98, 1],
                        opacity: [0, 1, 1, 1],
                      }
                }
                transition={{
                  duration: 1.4,
                  times: [0, 0.55, 0.85, 1],
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                <motion.svg
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative"
                  viewBox="0 0 64 80"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.rect
                    x="6"
                    y="68"
                    width="52"
                    height="6"
                    rx="1.5"
                    fill="hsl(var(--sage))"
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1, scaleX: 1 }
                        : { opacity: 0, scaleX: 0 }
                    }
                    animate={{ opacity: 1, scaleX: 1 }}
                    style={{ transformOrigin: "32px 71px" } as any}
                    transition={{
                      duration: 0.6,
                      delay: 0.25,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  />

                  <motion.path
                    d="M16 68 L16 28 A16 16 0 0 1 48 28 L48 68 Z"
                    stroke="hsl(var(--sage))"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                    fill="hsl(var(--sage))"
                    initial={
                      shouldReduceMotion
                        ? { pathLength: 1, fillOpacity: 0.95 }
                        : { pathLength: 0, fillOpacity: 0 }
                    }
                    animate={{ pathLength: 1, fillOpacity: 0.95 }}
                    transition={{
                      pathLength: {
                        duration: 1.0,
                        delay: 0.35,
                        ease: [0.2, 0.8, 0.2, 1],
                      },
                      fillOpacity: { duration: 0.5, delay: 1.15 },
                    }}
                  />

                  <motion.path
                    d="M22 64 L22 30 A10 10 0 0 1 42 30 L42 64 Z"
                    fill="hsl(var(--background))"
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.25 }}
                  />

                  <motion.line
                    x1="32"
                    y1="34"
                    x2="32"
                    y2="56"
                    stroke="hsl(var(--sage))"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 0.45,
                      delay: 1.4,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  />
                  <motion.line
                    x1="25"
                    y1="42"
                    x2="39"
                    y2="42"
                    stroke="hsl(var(--sage))"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 0.4,
                      delay: 1.75,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  />
                </motion.svg>

                {/* Shimmer sweep across logo */}
                {!shouldReduceMotion && (
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 30%, hsl(var(--sage) / 0.6) 50%, transparent 70%)",
                      mixBlendMode: "overlay",
                    }}
                    initial={{ x: "-120%", opacity: 0 }}
                    animate={{ x: ["-120%", "120%"], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.1, delay: 2.0, ease: "easeInOut" }}
                  />
                )}
              </motion.div>

              {/* Wordmark — letter stagger with gradient sweep */}
              <div className="flex flex-col items-center gap-3">
                <h1 className="font-display text-xl sm:text-3xl md:text-4xl tracking-tight text-center leading-tight flex flex-wrap justify-center max-w-[90vw] relative">
                  {letters.map((char, i) => (
                    <motion.span
                      key={`${char}-${i}`}
                      className="inline-block"
                      style={{ whiteSpace: "pre" }}
                      initial={
                        shouldReduceMotion
                          ? { opacity: 1, y: 0, filter: "blur(0px)" }
                          : { opacity: 0, y: 16, filter: "blur(8px)" }
                      }
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.6,
                        delay: 1.4 + i * 0.028,
                        ease: [0.2, 0.8, 0.2, 1],
                      }}
                    >
                      {char}
                    </motion.span>
                  ))}

                  {!shouldReduceMotion && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(110deg, transparent 35%, hsl(var(--sage) / 0.35) 50%, transparent 65%)",
                        mixBlendMode: "overlay",
                      }}
                      initial={{ x: "-110%", opacity: 0 }}
                      animate={{ x: ["-110%", "110%"], opacity: [0, 1, 0] }}
                      transition={{ duration: 1.2, delay: 2.4, ease: "easeInOut" }}
                    />
                  )}
                </h1>

                <motion.span
                  className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground"
                  initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 2.2, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  Honoring Every Legacy
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
