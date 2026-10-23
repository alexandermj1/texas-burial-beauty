// Keeps the light email list (id, sender, recipient, date, matched seller) in
// memory so the "needs reply" scan does not re-read the whole mailbox on every
// change. Changed rows arrive via realtime and are merged in; a full re-read
// still runs on a slower interval as a safety net.
export type LightEmailRow = {
  id: string;
  matched_submission_id: string | null;
  from_email: string | null;
  to_email: string | null;
  received_at: string | null;
  deleted_at?: string | null;
};

export const FULL_EMAIL_RESCAN_MS = 15 * 60 * 1000;

/** Merge changed rows into the cached list; newest first, one entry per id. */
export function mergeEmailRows(cached: LightEmailRow[], incoming: Partial<LightEmailRow>[], removedIds: string[] = []): LightEmailRow[] {
  const byId = new Map(cached.map((r) => [r.id, r]));
  for (const r of incoming) {
    if (!r?.id) continue;
    const merged = { ...(byId.get(r.id) ?? {}), ...pickLight(r) } as LightEmailRow;
    if (merged.deleted_at) byId.delete(r.id);
    else byId.set(r.id, merged);
  }
  for (const id of removedIds) byId.delete(id);
  return [...byId.values()].sort((a, b) => String(b.received_at ?? "").localeCompare(String(a.received_at ?? "")));
}

function pickLight(r: Partial<LightEmailRow>): Partial<LightEmailRow> {
  const out: Partial<LightEmailRow> = { id: r.id };
  for (const k of ["matched_submission_id", "from_email", "to_email", "received_at", "deleted_at"] as const) {
    if (k in r) (out as any)[k] = r[k];
  }
  return out;
}

export function needsFullRescan(lastFullAt: number | null, now: number): boolean {
  return lastFullAt == null || now - lastFullAt >= FULL_EMAIL_RESCAN_MS;
}
