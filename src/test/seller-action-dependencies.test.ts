import { expect, it } from "vitest";
import { orderSellerActions, replyDependencies } from "../lib/sellerActionDependencies";
import { SELLER_TOKEN_COSTS } from "../lib/sellerModelCosts";
const reply = { id: "reply", submission_id: "glenda", run_id: "opus-review", status: "proposed", action_type: "reply_email" };
const extension = { ...reply, id: "extension", action_type: "extend_quote_deadline" };
it("shows deadline approval before its confirming reply regardless of model", () => {
  expect(replyDependencies([reply, extension], reply)).toEqual([extension]);
  expect(orderSellerActions([reply, extension]).map(a => a.id)).toEqual(["extension", "reply"]);
});
it("unblocks only after the required change is resolved", () => {
  expect(replyDependencies([reply, { ...extension, status: "executed" }], reply)).toEqual([]);
  expect(replyDependencies([reply, { ...extension, status: "rejected" }], reply)).toEqual([]);
  expect(replyDependencies([reply, { ...extension, status: "proposed", error: "failed" }], reply)).toHaveLength(1);
});
it("does not confuse a different seller or review with the current reply", () => {
  expect(replyDependencies([{ ...extension, run_id: "different" }, { ...extension, submission_id: "other" }], reply)).toEqual([]);
});
it("compares standard token rates, not whole-scan costs", () => {
  const a = SELLER_TOKEN_COSTS["openai/gpt-6-astra"], s = SELLER_TOKEN_COSTS["openai/gpt-6.1-sol"], o = SELLER_TOKEN_COSTS["anthropic/claude-opus-5-5"];
  expect(s.input / a.input).toBe(0.2); expect(s.output / a.output).toBe(0.2);
  expect(o.input / a.input).toBe(0.4); expect(o.output / a.output).toBe(0.4);
});