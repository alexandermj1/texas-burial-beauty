import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { SELLER_MODELS, sellerModelLabel, type SellerModel } from "../../../../supabase/functions/seller-agent/models";
import { SELLER_TOKEN_COSTS } from "@/lib/sellerModelCosts";

export default function AiReviewButton({ onReview, busy, disabled, label = "Review now" }: {
  onReview: (model: SellerModel) => void;
  busy?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" disabled={busy || disabled}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
        {label}<ChevronDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
      {SELLER_MODELS.map(model => <DropdownMenuItem key={model} onSelect={() => onReview(model)}>
        <span className="flex w-full flex-col gap-0.5">
          <span>Review with {sellerModelLabel(model)} · {SELLER_TOKEN_COSTS[model].relative}× Astra token cost</span>
          <span className="text-[11px] text-muted-foreground">{SELLER_TOKEN_COSTS[model].input} input / {SELLER_TOKEN_COSTS[model].output} output credits per 1M tokens</span>
        </span>
      </DropdownMenuItem>)}
      <p className="max-w-80 border-t border-border px-2 py-2 text-[10px] text-muted-foreground">Standard uncached text rates, November 6. Below 272k input tokens. Research, cache usage and scan length affect the total.</p>
    </DropdownMenuContent>
  </DropdownMenu>;
}