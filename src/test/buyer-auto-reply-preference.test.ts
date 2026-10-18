import { describe, expect, it } from "vitest";
import { buyerReplyAllowed } from "../../supabase/functions/buyer-agent/autoReplyPreference";
describe("per-buyer automatic reply switch", () => {
  it("blocks automatic replies when off and allows them when on", () => {
    expect(buyerReplyAllowed(true, true)).toBe(false);
    expect(buyerReplyAllowed(false, true)).toBe(true);
  });
  it("preserves deliberate manual approval while off", () => {
    expect(buyerReplyAllowed(true, false)).toBe(true);
  });
  it("fails closed when the preference is unreadable", () => {
    expect(buyerReplyAllowed(undefined, true)).toBe(false);
    expect(buyerReplyAllowed(null, true)).toBe(false);
  });
});
