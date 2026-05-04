// Blue (Bayer) badge — flags submissions that came from the Bayer Cemetery
// Brokers Sell-a-Plot form (inquiry_channel === "bayer_sell_a_plot").
import { Building2 } from "lucide-react";

interface Props {
  inquiryChannel?: string | null;
  size?: "xs" | "sm";
  className?: string;
}

const BayerBadge = ({ inquiryChannel, size = "sm", className = "" }: Props) => {
  if (inquiryChannel !== "bayer_sell_a_plot") return null;
  const sizeCls = size === "xs"
    ? "px-1.5 py-0.5 text-[10px] gap-0.5"
    : "px-2 py-0.5 text-[11px] gap-1";
  return (
    <span
      title="Submitted via Bayer Cemetery Brokers form"
      className={`inline-flex items-center rounded-full font-medium border bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300 ${sizeCls} ${className}`}
    >
      <Building2 className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      Bayer
    </span>
  );
};

export default BayerBadge;
