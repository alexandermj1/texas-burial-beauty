import { describe, expect, it } from "vitest";
import { reminderPausePatch, reminderPauseVerified } from "../../supabase/functions/seller-agent/reminderPause";
import { parityAllowed, pendingBefore } from "../../supabase/functions/seller-agent/parity";
import { SELLER_RECORD_ACTIONS, SELLER_EMAIL_ACTIONS } from "../../supabase/functions/_shared/sellerAutopilotState";
import { workBlocker } from "../../supabase/functions/_shared/sellerWorkPlan";

describe("Seller AI can pause automated document reminders", () => {
  const now = "2026-11-19T03:10:00.000Z";
  it("saves a pause and reason without pausing AI or changing receipt", () => {
    expect(reminderPausePatch("Corrected request pending", null, now)).toEqual({
      document_followup_paused_at: now,
      document_followup_pause_reason: "Corrected request pending",
    });
  });
  it("keeps the original pause timestamp on repeated execution", () => {
    expect(reminderPausePatch("Still waiting", now, "2026-11-20T03:10:00Z").document_followup_paused_at).toBe(now);
  });
  it("requires an evidenced reason", () => {
    expect(() => reminderPausePatch(" ", null, now)).toThrow("reason");
  });
  it("verifies equivalent database timestamp formats but rejects unsaved changes", () => {
    const patch = reminderPausePatch("Hold", null, now);
    expect(reminderPauseVerified({document_followup_paused_at:"2026-11-19T03:10:00+00:00",document_followup_pause_reason:"Hold"},patch)).toBe(true);
    expect(reminderPauseVerified({document_followup_paused_at:"2026-11-19T03:11:00Z",document_followup_pause_reason:"Hold"},patch)).toBe(false);
    expect(reminderPauseVerified(null,patch)).toBe(false);
  });
  it("allows a pause on active sellers, not already paused or closed ones", () => {
    expect(parityAllowed({}, []).has("pause_document_reminders")).toBe(true);
    for (const sub of [{document_followup_paused_at: now}, {sold_at: now}, {closed_at: now}, {archived_at: now}, {deleted_at: now}]) {
      expect(parityAllowed(sub, []).has("pause_document_reminders")).toBe(false);
    }
    expect([...parityAllowed({}, [])].some(t => /resume.*reminder/.test(t))).toBe(false);
  });
  it("runs independently of staff calls and is not an email", () => {
    expect(SELLER_RECORD_ACTIONS.has("pause_document_reminders")).toBe(true);
    expect(SELLER_EMAIL_ACTIONS.has("pause_document_reminders")).toBe(false);
    expect(workBlocker({id:"p",action_type:"pause_document_reminders",status:"proposed"}, [], [{id:"h",action_type:"flag_human",status:"proposed"}])).toBeNull();
  });
  it("a confirming reply waits for the pause", () => {
    const actions = [{id:"p",run_id:"r",action_type:"pause_document_reminders",status:"proposed"},{id:"e",run_id:"r",action_type:"reply_email",status:"proposed"}];
    expect(pendingBefore(actions, actions[1])).toBe(true);
  });
});