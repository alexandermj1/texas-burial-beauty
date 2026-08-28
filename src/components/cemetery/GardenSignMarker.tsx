import { motion } from "framer-motion";

/**
 * Cast-metal garden marker, drawn in the Texas Cemetery Brokers palette.
 * Mirrors the little lane signs staked at the head of each garden — a bronze
 * plaque with raised letters on a slim galvanised post.
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
    initial={{ opacity: 0, y: 10, rotate: -1.2 }}
    whileInView={{ opacity: 1, y: 0, rotate: -0.6 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.55, ease: "easeOut" }}
    aria-hidden
    className={`pointer-events-none select-none flex flex-col ${
      align === "center" ? "items-center" : "items-start"
    } ${className}`}
  >
    {/* Plaque */}
    <div className="relative">
      <div
        className="rounded-[3px] border border-foreground/40 bg-foreground px-4 py-2 shadow-[0_2px_0_hsl(var(--foreground)/0.35),0_10px_18px_-12px_hsl(var(--foreground)/0.6)]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, hsl(var(--foreground)/0.92) 0%, hsl(var(--foreground)) 55%, hsl(var(--foreground)/0.88) 100%)",
        }}
      >
        <span className="block text-[11px] md:text-xs font-semibold uppercase tracking-[0.34em] text-background/95 [text-shadow:0_1px_0_hsl(var(--foreground)/0.9)]">
          {label}
        </span>
      </div>
      {/* Plaque bevel */}
      <span className="absolute inset-x-[3px] top-[3px] h-px bg-background/25" />
    </div>

    {/* Post */}
    <span className="mt-[-1px] h-7 w-[3px] rounded-b-sm bg-gradient-to-b from-muted-foreground/70 to-muted-foreground/25" />
    <span className="h-[3px] w-5 rounded-full bg-muted-foreground/25 blur-[1px]" />
  </motion.div>
);

export default GardenSignMarker;
