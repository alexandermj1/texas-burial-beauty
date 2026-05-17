// Orange Texas badge — flags submissions that came from the Texas buy-property
// guided wizard (inquiry_channel === "texas_buy_wizard").
import { MapPin } from "lucide-react";

interface Props {
  inquiryChannel?: string | null;
  size?: "xs" | "sm";
  className?: string;
}

const TexasBadge = ({ inquiryChannel, size = "sm", className = "" }: Props) => {
  if (inquiryChannel !== "texas_buy_wizard") return null;
  const sizeCls = size === "xs"
    ? "px-1.5 py-0.5 text-[10px] gap-0.5"
    : "px-2 py-0.5 text-[11px] gap-1";
  return (
    <span
      title="Submitted via Texas Find-Your-Property wizard"
      className={`inline-flex items-center rounded-full font-medium border bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300 ${sizeCls} ${className}`}
    >
      <MapPin className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      Texas
    </span>
  );
};

export default TexasBadge;
