import { motion } from "framer-motion";

/**
 * Cast-metal garden lane marker, drawn from the real signs staked through
 * Restland Memorial Park: a dark bronze rectangular plaque with a small peaked
 * crest, raised white letters and a slim galvanised post.
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
    initial={{ opacity: 0, y: 12, rotate: -1.4 }}
    whileInView={{ opacity: 1, y: 0, rotate: -0.7 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.55, ease: "easeOut" }}
    aria-hidden
    className={`pointer-events-none select-none inline-flex flex-col ${
      align === "center" ? "items-center" : "items-start"
    } ${className}`}
  >
    <svg
      width="220"
      height="96"
      viewBox="0 0 220 96"
      fill="none"
      className="overflow-visible drop-shadow-[0_10px_16px_hsl(var(--foreground)/0.16)]"
    >
      <defs>
        <linearGradient id="gsm-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--stone))" />
          <stop offset="38%" stopColor="hsl(25 22% 22%)" />
          <stop offset="100%" stopColor="hsl(25 18% 16%)" />
        </linearGradient>
        <linearGradient id="gsm-pole" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground)/0.3)" />
          <stop offset="42%" stopColor="hsl(var(--muted-foreground)/0.85)" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground)/0.28)" />
        </linearGradient>
      </defs>

      {/* Post + collar */}
      <rect x="106" y="44" width="8" height="46" rx="3" fill="url(#gsm-pole)" />
      <rect x="102" y="44" width="16" height="7" rx="2.5" fill="hsl(var(--muted-foreground)/0.75)" />

      {/* Peaked crest above the plate */}
      <path d="M99 14l11-9 11 9z" fill="hsl(25 20% 19%)" />

      {/* Plate */}
      <rect
        x="10"
        y="13"
        width="200"
        height="34"
        rx="4"
        fill="url(#gsm-plate)"
        stroke="hsl(25 15% 10%/0.6)"
        strokeWidth="1"
      />
      {/* Raised outer keyline */}
      <rect
        x="15"
        y="18"
        width="190"
        height="24"
        rx="2.5"
        fill="none"
        stroke="hsl(0 0% 100%/0.55)"
        strokeWidth="1.6"
      />

      {/* Raised letters */}
      <text
        x="110"
        y="35"
        textAnchor="middle"
        fill="hsl(0 0% 100%/0.94)"
        fontSize="15"
        fontWeight="700"
        letterSpacing="3.4"
        style={{ fontFamily: "inherit" }}
      >
        {label.toUpperCase()}
      </text>

      {/* Ground */}
      <ellipse cx="110" cy="91" rx="34" ry="4" fill="hsl(var(--foreground)/0.08)" />
    </svg>
  </motion.div>
);

export default GardenSignMarker;
