// Staff who should not see or use AI suggestions yet (they still see AI-made notes, emails and changes).
export const AI_HIDDEN_USER_IDS = new Set<string>(["e07b4a4c-56d1-4b2f-bc27-7989314d008f"]);
export const canUseAi = (userId?: string | null) => !!userId && !AI_HIDDEN_USER_IDS.has(userId);
