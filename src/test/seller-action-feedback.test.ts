import { expect, it } from "vitest";
import { feedbackAllowed, aiActionEmail } from "../../supabase/functions/_shared/sellerActionFeedback";
it("allows a comment without deciding a pending action", () => { expect(feedbackAllowed("proposed", "comment")).toBe(true); });
it("only completed actions accept outcome feedback", () => {
  expect(feedbackAllowed("proposed", "outcome")).toBe(false);
  expect(feedbackAllowed("executed", "outcome")).toBe(true);
});
it("AI replies preserve sibling suggestions but real emails invalidate them", () => {
  expect(aiActionEmail('<div data-tcb-email="ai_agent">Reply</div>')).toBe(true);
  expect(aiActionEmail('<div>New customer information</div>')).toBe(false);
});