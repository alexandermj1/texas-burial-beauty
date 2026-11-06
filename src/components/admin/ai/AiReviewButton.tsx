import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { SELLER_MODELS, sellerModelLabel, type SellerModel } from "../../../../supabase/functions/seller-agent/models";

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
    <DropdownMenuContent align="end">
      {SELLER_MODELS.map(model => <DropdownMenuItem key={model} onSelect={() => onReview(model)}>
        Review with {sellerModelLabel(model)}
      </DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}