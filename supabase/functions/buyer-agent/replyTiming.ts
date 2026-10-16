export const BUYER_REPLY_MIN_DELAY_MS = 20 * 60 * 1000;

/** Invalid timestamps fail closed; automatic replies cannot precede the deadline. */
export function automaticReplyTiming(createdAt: unknown, now = Date.now()) {
  const created = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
  const eligibleAt = created + BUYER_REPLY_MIN_DELAY_MS;
  return {
    due: Number.isFinite(eligibleAt) && Number.isFinite(now) && now >= eligibleAt,
    eligibleAt: Number.isFinite(eligibleAt) ? new Date(eligibleAt).toISOString() : null,
  };
}