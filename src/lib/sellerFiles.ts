import { supabase } from "@/integrations/supabase/client";

export type SellerFile = { name: string; path: string; created_at: string; size: number; url: string };

/** Files in a seller's own upload folder, with 1-hour viewing links. */
export async function listSellerFiles(bucket: "portal-uploads" | "customer-files", folder: string, prefix?: string): Promise<SellerFile[] | null> {
  const { data, error } = await supabase.functions.invoke("seller-files", { body: { bucket, folder, prefix } });
  if (error || !data?.files) return null;
  return data.files as SellerFile[];
}

/** A 1-hour viewing link for one file in a seller's own upload folder. */
export async function sellerFileUrl(bucket: "portal-uploads" | "customer-files", path: string): Promise<string | undefined> {
  const { data } = await supabase.functions.invoke("seller-files", { body: { bucket, path } });
  return data?.url;
}
