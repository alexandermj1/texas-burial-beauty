// Browser wrapper around the shared quote ("seller pack") builder. The HTML itself
// lives in supabase/functions/_shared/listingOptionsBlock.ts so staff and the
// seller AI send byte-for-byte the same quote email.
import { supabase } from "@/integrations/supabase/client";
import { buildListingOptionsBlock as buildShared } from "../../supabase/functions/_shared/listingOptionsBlock.ts";
export { TIERS, parseSpaces, SAMPLE_SHEET_URL, SAMPLE_SHEET_WEB_URL, buildMortuarySheetEmailBlock } from "../../supabase/functions/_shared/listingOptionsBlock.ts";
export type { SellerForBlock } from "../../supabase/functions/_shared/listingOptionsBlock.ts";

type Opts = Omit<Parameters<typeof buildShared>[0], "createLink">;

export async function buildListingOptionsBlock(opts: Opts): Promise<string> {
  return buildShared({
    ...opts,
    createLink: async (body) => {
      const { data, error } = await supabase.functions.invoke("create-payment-link", { body });
      if (error) throw error;
      return data as { url?: string | null; free?: boolean };
    },
  });
}
