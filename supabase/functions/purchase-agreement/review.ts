export function isInteractiveReview(fields: Record<string, unknown>, token: string): boolean {
  return typeof fields._review_token === "string" && fields._review_token === token &&
    typeof fields._review_expires_at === "string" && Date.parse(fields._review_expires_at) > Date.now();
}
