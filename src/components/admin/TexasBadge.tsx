// Orange Texas badge — flags submissions that came from a website form
// (anything that isn't an email-sourced or manually-added phone submission).
import { MapPin } from "lucide-react";

interface Props {
  inquiryChannel?: string | null;
  state?: string | null;
  source?: string | null;
  sourceEmailId?: string | null;
  size?: "xs" | "sm";
  className?: string;
}

const TX_CHANNELS = new Set(["texas_buy_wizard", "texas_contact"]);
// Sources that are NOT website forms — emails (promoted from inbox) and manual phone entries.
const NON_FORM_SOURCES = new Set(["email", "manual_phone", "manual"]);

const TexasBadge = ({ inquiryChannel, state, source, sourceEmailId, size = "sm", className = "" }: Props) => {
  const cameFromForm =
    !sourceEmailId && !!source && !NON_FORM_SOURCES.has(source);
  const isTexas =
    cameFromForm ||
    (inquiryChannel && TX_CHANNELS.has(inquiryChannel)) ||
    state === "TX";
  if (!isTexas) return null;
  const sizeCls = size === "xs"
    ? "px-1.5 py-0.5 text-[10px] gap-0.5"
    : "px-2 py-0.5 text-[11px] gap-1";
  return (
    <span
      title="Submitted via a website form"
      className={`inline-flex items-center rounded-full font-medium border bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300 ${sizeCls} ${className}`}
    >
      <MapPin className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      Texas
    </span>
  );
};

export default TexasBadge;
