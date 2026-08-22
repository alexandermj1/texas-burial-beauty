import { supabase } from "@/integrations/supabase/client";

/**
 * Records are never physically removed from the database — deletion is blocked
 * at the database level. "Deleting" marks the row as hidden so it can always be
 * recovered. Always pair with `.is("deleted_at", null)` on read queries.
 */
export async function softDelete(
  table: string,
  id: string | string[],
  actor?: string | null,
) {
  const patch = {
    deleted_at: new Date().toISOString(),
    deleted_by: actor ?? null,
  } as any;
  const q = supabase.from(table as any).update(patch);
  const { error } = Array.isArray(id)
    ? await q.in("id", id)
    : await q.eq("id", id);
  return { error };
}

export async function restoreDeleted(table: string, id: string) {
  const { error } = await supabase
    .from(table as any)
    .update({ deleted_at: null, deleted_by: null } as any)
    .eq("id", id);
  return { error };
}
