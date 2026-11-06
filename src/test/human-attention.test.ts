import { describe, expect, it } from "vitest";
import { attentionIndex, humanAttentionEnabled, humanAttentionNote, parseHumanAttention, prioritizeHumanAttention, withHumanAttentionPolicy, type AttentionAction, type HumanAttention } from "@/lib/humanAttention";

const attention: HumanAttention = { priority: "high", importance: 85, category: "check", task: "Check whether David's original deed arrived in the office.", reason: "The photo cannot confirm physical receipt.", evidence: "David's latest email and the original-receipt checklist." };
const flag = (id: string, priority: HumanAttention["priority"] = "high", importance = 85): AttentionAction => ({ id: `action-${id}`, submission_id: id, action_type: "flag_human", status: "proposed", created_at: "2026-11-05T01:06:00Z", payload: { human_attention: { ...attention, priority, importance } } });
describe("human-attention rollout", () => {
  it("is released by the owner, and still needs the setting switched on", () => {
    expect(humanAttentionEnabled(true)).toBe(true);
    expect(humanAttentionEnabled(false)).toBe(false);
    expect(humanAttentionEnabled(true, false)).toBe(false);
  });
  it("requires release approval and an explicit boolean setting", () => {
    for (const value of [undefined, null, false, "true", {}, 1]) expect(humanAttentionEnabled(value, true)).toBe(false);
    expect(humanAttentionEnabled(true, true)).toBe(true);
  });
  it("does not change existing behavior when disabled", () => {
    const rows = [{ id: "regular" }, { id: "david" }];
    expect(prioritizeHumanAttention(rows, attentionIndex([flag("david")]), false)).toBe(rows);
    expect(withHumanAttentionPolicy("phone-only baseline", false)).toBe("phone-only baseline");
  });
});
describe("human task judgments", () => {
  it("retains an explicit task, reason and evidence without inferring urgency from low confidence", () => {
    expect(parseHumanAttention(attention)).toEqual(attention);
    expect(parseHumanAttention({ confidence: 0.1, needs_human: true })).toBeNull();
  });
  it("rejects incomplete or invalid escalation decisions", () => {
    for (const change of [{ task: "" }, { reason: "" }, { evidence: "" }, { priority: "critical" }, { importance: 101 }, { category: "refund" }]) expect(parseHumanAttention({ ...attention, ...change })).toBeNull();
  });
  it("leaves a concrete colleague note explaining the requested check", () => {
    const note = humanAttentionNote(attention);
    expect(note).toContain(attention.task);
    expect(note).toContain(attention.reason);
    expect(note).toContain(attention.evidence);
  });
  it("promotes outstanding human work above normal records and ranks by AI importance", () => {
    const rows = [{ id: "reply" }, { id: "david" }, { id: "deadline" }, { id: "other-check" }, { id: "ordinary" }];
    const index = attentionIndex([flag("david", "high", 85), flag("deadline", "urgent", 90), flag("other-check", "high", 95)]);
    expect(prioritizeHumanAttention(rows, index, true).map(s => s.id)).toEqual(["deadline", "other-check", "david", "reply", "ordinary"]);
  });
  it("does not hide a human task behind a newer sibling reply", () => {
    expect(attentionIndex([flag("david"), { ...flag("david"), id: "reply", action_type: "reply_email", created_at: "2026-11-05T02:00:00Z" }]).get("david")?.actionId).toBe("action-david");
  });
  it("keeps separate records with the same email distinct", () => {
    const rows = [{ id: "ai-test-2", email: "same@example.com" }, { id: "david", email: "same@example.com" }];
    expect(prioritizeHumanAttention(rows, attentionIndex([flag("david")]), true)[0].id).toBe("david");
  });
  it("removes resolved, declined, stale and soft-deleted flags from priority", () => {
    for (const status of ["acknowledged", "rejected", "superseded", "executed"]) expect(attentionIndex([{ ...flag("david"), status }]).size).toBe(0);
    expect(attentionIndex([{ ...flag("david"), deleted_at: "2026-11-05T02:00:00Z" }]).size).toBe(0);
  });
  it("does not promote archived or closed records", () => {
    for (const field of ["archived_at", "deleted_at", "sold_at", "closed_at"]) {
      expect(prioritizeHumanAttention([{ id: "normal" }, { id: "david", [field]: "2026-11-05" }], attentionIndex([flag("david")]), true)[0].id).toBe("normal");
    }
  });
});