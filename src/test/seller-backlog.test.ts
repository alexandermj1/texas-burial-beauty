import { describe, expect, it } from "vitest";
import { legacySuggestionsNeedReview, replacedAutomationBlocker } from "../../supabase/functions/_shared/sellerBacklog";
describe("legacy suggestion takeover", () => {
  it("re-reviews abandoned manual suggestions rather than executing their old draft", () => {
    expect(legacySuggestionsNeedReview([{id:"old",action_type:"reply_email",run_id:"manual"}],new Set(),false)).toBe(true);
  });
  it("never redrafts a current held autonomous plan", () => {
    expect(legacySuggestionsNeedReview([{id:"old",action_type:"reply_email",run_id:"manual"}],new Set(),true)).toBe(false);
    expect(legacySuggestionsNeedReview([{id:"new",action_type:"reply_email",run_id:"auto"}],new Set(["auto"]),false)).toBe(false);
  });
  it("retires only obsolete automation approval blockers, not actual staff checks", () => {
    const a={id:"flag",action_type:"flag_human",payload:{source:"autopilot"},reason:"AI suggestions on this file have been waiting for approval for over a day — please approve or decline them so the seller isn't left waiting."};
    expect(replacedAutomationBlocker(a)).toBe(true);
    expect(replacedAutomationBlocker({...a,reason:"Check whether the original deed arrived"})).toBe(false);
    expect(replacedAutomationBlocker({...a,payload:{}})).toBe(false);
  });
});