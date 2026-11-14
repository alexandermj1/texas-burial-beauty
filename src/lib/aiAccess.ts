// Seller suggestions are available to staff; global automation controls remain role-gated.
export const AI_HIDDEN_USER_IDS = new Set<string>();
export const canUseAi = (userId?: string | null) => !!userId && !AI_HIDDEN_USER_IDS.has(userId);
