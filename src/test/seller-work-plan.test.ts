import { describe, expect, it } from "vitest";
import { parseExecutionPlan, workBlocker, relatedRecordEvidence } from "../../supabase/functions/_shared/sellerWorkPlan";
import { safeChecklistState } from "../../supabase/functions/_shared/originalDocumentReceipt";
import { repairedUnsignedAgreement } from "../../supabase/functions/_shared/agreementContactCorrection";
import { parityAllowed } from "../../supabase/functions/seller-agent/parity";
const taskId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const task = { id: taskId, action_type: "flag_human", status: "proposed" };
const plan = { independent: true, reason: "Asks which spaces are being sold, without claiming a repair.", depends_on_action_types: [], depends_on_staff_task_ids: [] };
const reply = { id: "reply", action_type: "reply_email", status: "proposed", payload: { execution: plan } };
describe("independent seller work", () => {
  it("allows a clarification while staff still owe a refund", () => expect(workBlocker(reply, [reply], [task])).toBeNull());
  it("blocks only the requested staff outcome and resumes after it is recorded", () => {
    const action = { ...reply, payload: { execution: { ...plan, depends_on_staff_task_ids: [taskId] } } };
    expect(workBlocker(action, [action], [task])).not.toBeNull();
    expect(workBlocker(action, [action], [])).not.toBeNull();
    expect(workBlocker(action, [action], [{ ...task, status: "rejected" }])).not.toBeNull();
    expect(workBlocker(action, [action], [{ ...task, status: "acknowledged" }, { ...task, id: "other" }])).toBeNull();
  });
  it("never confirms an unexecuted, failed, rejected or missing correction", () => {
    const action = { ...reply, payload: { execution: { ...plan, depends_on_action_types: ["edit_family_tree"] } } };
    for (const status of ["proposed", "rejected", "superseded"]) expect(workBlocker(action, [{ id: "tree", action_type: "edit_family_tree", status }], [])).not.toBeNull();
    expect(workBlocker(action, [], [])).not.toBeNull();
    expect(workBlocker(action, [{ id: "tree", action_type: "edit_family_tree", status: "executed" }], [])).toBeNull();
  });
  it("does not assume independence for old or malformed email proposals", () => {
    expect(parseExecutionPlan({ independent: true })).toBeNull();
    expect(workBlocker({ ...reply, payload: {} }, [], [task])).not.toBeNull();
  });
});
describe("safe routine repairs", () => {
  it("keeps a deed-copy attachment update without marking its original received", () => {
    expect(safeChecklistState({ doc_code: "D1" }, "received")).toMatchObject({ state: null });
    expect(safeChecklistState({ doc_code: "D1", manual_override: "received" }, "received").state).toBe("received");
  });
  it("allows normal ID copies and protects wet-ink POA originals", () => {
    expect(safeChecklistState({ doc_code: "D2P" }, "received").state).toBe("received");
    expect(safeChecklistState({ doc_code: "D21", needs_notary: true }, "notarized").state).toBeNull();
  });
  it("permits repairing a missing input tree and correcting a previously completed checklist", () => {
    expect(parityAllowed({ documents_completed_at: "2026-11-01" }, []).has("edit_family_tree")).toBe(true);
    expect(parityAllowed({ documents_completed_at: "2026-11-01", ownership_answers: { v2: { deed: [{ id: "a", n: "Alice", st: "living" }] } } }, []).has("sync_checklist")).toBe(true);
    expect(parityAllowed({ sold_at: "2026-11-01" }, []).has("edit_family_tree")).toBe(false);
  });
  it("repairs unsigned descriptions without changing paid terms or the fee version", () => {
    const c = { kind: "listing_agreement", status: "sent", fill_data: { email: "old@example.com", seller_name: "Alce", authorized_min_total: 21000, listing_option: "Featured", listing_pricing_version: "legacy", address: "Saved address" } };
    const next = repairedUnsignedAgreement(c, { seller_name: "Alice", plot_description: "Spaces 3 and 4", authorized_min_total: 1, listing_pricing_version: "current" });
    expect(next).toMatchObject({ seller_name: "Alice", authorized_min_total: 21000, listing_option: "Featured", listing_pricing_version: "legacy", address: "Saved address" });
    expect(() => repairedUnsignedAgreement({ ...c, signed_at: "2026-11-01" }, { seller_name: "Alice" })).toThrow();
  });
  it("shared email is evidence of contact, not duplicate property", () => {
    expect(relatedRecordEvidence({ id: "a", email: "same@example.com" }, { id: "b", email: "same@example.com", cemetery: "Different cemetery" })).toBe("same contact email only; not proof of duplicate property");
    expect(relatedRecordEvidence({ id: "a", email: "a@example.com" }, { id: "b", email: "b@example.com" })).toBeNull();
  });
});