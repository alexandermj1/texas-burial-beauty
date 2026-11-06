// Seller autopilot policy: pure functions (no I/O) so they can be unit-tested.
// Decides WHEN the AI replies, and HOW MUCH it needs to re-read on a wake-up —
// like a person returning to a file: read only what changed, do a full review
// when a lot changed, something important changed, or a problem is suspected.

export const FP_PARTS = ["seller_email", "our_email", "staff_note", "files", "payments", "contracts", "documents", "family_tree", "record"] as const;
export type FpPart = typeof FP_PARTS[number];
export type Fingerprint = Partial<Record<FpPart, string>>;

/** Changes that always need the whole file re-read (new evidence, money, signatures, paperwork). */
export const FULL_REVIEW_PARTS: FpPart[] = ["files", "payments", "contracts", "documents", "family_tree"];
export const MAX_REMINDERS = 3;
export const FULL_REVIEW_EVERY_DAYS = 14;

export const PART_LABEL: Record<FpPart, string> = {
  seller_email: "new email from the seller", our_email: "an email sent by our team", staff_note: "a staff note",
  files: "files added or changed", payments: "a payment or refund", contracts: "a contract sent, signed or changed",
  documents: "document request changed", family_tree: "family tree changed", record: "record details changed",
};

export function diffFingerprint(before: Fingerprint | null | undefined, now: Fingerprint): FpPart[] {
  if (!before) return [...FP_PARTS];
  return FP_PARTS.filter((p) => (before[p] ?? "") !== (now[p] ?? ""));
}

export type Memory = {
  due_at: string | null; suspect_problem: boolean; reminder_count: number;
  last_full_review_at: string | null; fingerprint: Fingerprint | null;
};
export type Route =
  | { kind: "wait"; reason: string }
  | { kind: "human"; reason: string }
  | { kind: "escalate_reminders"; reason: string }
  | { kind: "checkback"; reason: string }
  | { kind: "catch_up"; reason: string; changed: FpPart[] }
  | { kind: "full"; reason: string; changed: FpPart[] };

/** What to do for one record on a wake-up. Errs towards a full review when in doubt. */
export function routeWake(o: { memory: Memory | null; now: Fingerprint; at: number; humanOpen: boolean }): Route {
  if (o.humanOpen) return { kind: "human", reason: "A person is handling this record" };
  const m = o.memory;
  if (!m || !m.fingerprint) return { kind: "full", reason: "No memory of this record yet", changed: [...FP_PARTS] };
  const changed = diffFingerprint(m.fingerprint, o.now);
  const sinceFull = m.last_full_review_at ? o.at - Date.parse(m.last_full_review_at) : Infinity;
  if (changed.length) {
    if (m.suspect_problem) return { kind: "full", reason: "Last review suspected a problem", changed };
    const big = changed.filter((p) => FULL_REVIEW_PARTS.includes(p));
    if (big.length) return { kind: "full", reason: `Important change: ${big.map((p) => PART_LABEL[p]).join(", ")}`, changed };
    if (changed.length >= 3) return { kind: "full", reason: "A lot has changed", changed };
    if (sinceFull > FULL_REVIEW_EVERY_DAYS * 86400_000) return { kind: "full", reason: "Periodic full review", changed };
    return { kind: "catch_up", reason: `Only ${changed.map((p) => PART_LABEL[p]).join(" and ")}`, changed };
  }
  const due = m.due_at ? Date.parse(m.due_at) <= o.at : false;
  if (!due) return { kind: "wait", reason: "Nothing changed; check-back not due" };
  if (m.reminder_count >= MAX_REMINDERS) return { kind: "escalate_reminders", reason: `${m.reminder_count} reminders without a reply` };
  if (sinceFull > FULL_REVIEW_EVERY_DAYS * 86400_000) return { kind: "full", reason: "Periodic full review", changed: [] };
  return { kind: "checkback", reason: "Check-back due and nothing changed" };
}

export function clampCheckBackDays(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 3;
  return Math.min(14, Math.max(1, Math.round(v)));
}

// ───── Natural reply timing (Texas business hours) ─────
const TZ = "America/Chicago";
function texasParts(ms: number) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { day: p.weekday as string, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const OPEN = 7 * 60 + 30, CLOSE = 21 * 60;
export function isQuietTime(ms: number) {
  const { day, minutes } = texasParts(ms);
  return day === "Sun" || minutes < OPEN || minutes >= CLOSE;
}
/** Next allowed moment at/after ms, plus a small random spread so morning sends don't bunch up. */
export function nextAllowedTime(ms: number, rand: number): number {
  if (!isQuietTime(ms)) return ms;
  let t = ms;
  for (let i = 0; i < 60 * 24 * 3 && isQuietTime(t); i++) t += 60_000; // step minute-by-minute (max 3 days)
  return t + Math.round(rand * 40) * 60_000;
}

/** When an AI reply should go out. Conversation = we wrote to them shortly before their latest email. */
export function replySendAt(o: { now: number; inConversation: boolean; words: number; rand: number; rand2?: number }): number {
  const base = o.inConversation ? 3 + 6 * o.rand : 8 + 17 * o.rand;
  const longPad = Math.min(10, Math.max(0, o.words) / 80);
  const t = o.now + Math.round((base + longPad) * 60_000);
  return nextAllowedTime(t, o.rand2 ?? o.rand);
}
export function inConversation(lastSellerAt: string | null, lastOursBeforeSellerAt: string | null) {
  if (!lastSellerAt || !lastOursBeforeSellerAt) return false;
  const gap = Date.parse(lastSellerAt) - Date.parse(lastOursBeforeSellerAt);
  return gap >= 0 && gap <= 45 * 60_000;
}

/** Cheap stable hash for fingerprint parts (FNV-1a). */
export function hashOf(v: unknown): string {
  const s = typeof v === "string" ? v : JSON.stringify(v ?? null);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
