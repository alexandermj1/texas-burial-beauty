// Color-coded badge that shows whether a contact is a Seller, Buyer, or General contact.
// Used in both the Submissions panel and the Gmail inbox panel so customers are
// easy to identify at a glance throughout the CRM.
import { ArrowDownToLine, ArrowUpFromLine, MessageSquare } from "lucide-react";

export type CustomerKind = "seller" | "buyer" | "contact" | null | undefined;

// Maps a submission's `customer_kind` (or legacy `source`) to a normalized kind.
export const resolveKind = (
  customer_kind: string | null | undefined,
  source: string | null | undefined,
): "seller" | "buyer" | "contact" => {
  if (customer_kind === "seller" || customer_kind === "buyer" || customer_kind === "contact") {
    return customer_kind;
  }
  if (source === "seller_quote") return "seller";
  if (source === "buy_property_wizard") return "buyer";
  return "contact";
};

const meta: Record<"seller" | "buyer" | "contact", { label: string; cls: string; dot: string; Icon: any }> = {
  // Sellers wear the brand primary — they bring inventory in.
  seller: {
    label: "Seller",
    cls: "bg-primary/10 text-primary border-primary/25",
    dot: "bg-primary",
    Icon: ArrowDownToLine,
  },
  // Buyers wear emerald — money out the door / close.
  buyer: {
    label: "Buyer",
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
    dot: "bg-emerald-500",
    Icon: ArrowUpFromLine,
  },
  contact: {
    label: "General",
    cls: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/50",
    Icon: MessageSquare,
  },
};

interface Props {
  kind: CustomerKind;
  source?: string | null;
  size?: "xs" | "sm";
  variant?: "badge" | "dot";
  className?: string;
}

const CustomerKindBadge = ({ kind, source, size = "sm", variant = "badge", className = "" }: Props) => {
  const resolved = resolveKind(kind, source);
  const m = meta[resolved];

  if (variant === "dot") {
    return (
      <span
        title={m.label}
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${m.dot} ${className}`}
        aria-label={m.label}
      />
    );
  }

  const sizeCls = size === "xs"
    ? "px-1.5 py-0.5 text-[10px] gap-0.5"
    : "px-2 py-0.5 text-[11px] gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${sizeCls} ${m.cls} ${className}`}
    >
      <m.Icon className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {m.label}
    </span>
  );
};

export default CustomerKindBadge;
