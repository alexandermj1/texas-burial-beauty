import { motion } from "framer-motion";

/**
 * Cast-bronze garden marker — the little arched lane signs staked at the head
 * of each garden. Two galvanised posts, a bevelled arched plaque with raised
 * serif letters, a hairline rule and a small ground shadow.
 */
const GardenSignMarker = ({
  label,
  align = "left",
  className = "",
}: {
  label: string;
  align?: "left" | "center";
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12, rotate: -1.6 }}
    whileInView={{ opacity: 1, y: 0, rotate: -0.8 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.55, ease: "easeOut" }}
    aria-hidden
    className={`pointer-events-none select-none inline-flex flex-col ${
      align === "center" ? "items-center" : "items-start"
    } ${className}`}
  >
    <svg
      width="188"
      height="88"
      viewBox="0 0 188 88"
      fill="none"
      className="overflow-visible drop-shadow-[0_10px_16px_hsl(var(--foreground)/0.18)]"
    >
      <defs>
        <linearGradient id="gsm-plaque" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--stone))" />
          <stop offset="42%" stopColor="hsl(var(--foreground))" />
          <stop offset="100%" stopColor="hsl(var(--stone))" />
        </linearGradient>
        <linearGradient id="gsm-post" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground)/0.35)" />
          <stop offset="45%" stopColor="hsl(var(--muted-foreground)/0.85)" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground)/0.3)" />
        </linearGradient>
      </defs>

      {/* Posts */}
      <rect x="26" y="40" width="5" height="40" rx="2" fill="url(#gsm-post)" />
      <rect x="157" y="40" width="5" height="40" rx="2" fill="url(#gsm-post)" />
      {/* Post finials */}
      <circle cx="28.5" cy="39" r="3.2" fill="hsl(var(--muted-foreground)/0.8)" />
      <circle cx="159.5" cy="39" r="3.2" fill="hsl(var(--muted-foreground)/0.8)" />

      {/* Arched plaque */}
      <path
        d="M14 46V26C14 12.7 32.4 4 94 4s80 8.7 80 22v20z"
        fill="url(#gsm-plaque)"
        stroke="hsl(var(--foreground)/0.55)"
        strokeWidth="1.2"
      />
      {/* Bevel highlight + inner keyline */}
      <path
        d="M18.5 42V27c0-11.3 17.6-19 75.5-19s75.5 7.7 75.5 19v15"
        fill="none"
        stroke="hsl(var(--background)/0.22)"
        strokeWidth="1"
      />
      <path
        d="M23 40.5V28.5C23 19 40 13 94 13s71 6 71 15.5v12"
        fill="none"
        stroke="hsl(var(--background)/0.28)"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />

      {/* Raised letters */}
      <text
        x="94"
        y="34"
        textAnchor="middle"
        className="font-display"
        fill="hsl(var(--background)/0.96)"
        fontSize="14"
        letterSpacing="4.2"
      >
        {label.toUpperCase()}
      </text>

      {/* Ground line + shadow */}
      <ellipse cx="94" cy="82" rx="72" ry="4" fill="hsl(var(--foreground)/0.07)" />
      <path d="M20 80h148" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  </motion.div>
);

export default GardenSignMarker;
