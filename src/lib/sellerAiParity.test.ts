import { describe, it, expect } from "vitest";
import { validateTreeEdit, treeDiff } from "../../supabase/functions/seller-agent/familyTree";
import { parityAllowed, pendingBefore } from "../../supabase/functions/seller-agent/parity";
import { pendingRecordChanges } from "../../supabase/functions/_shared/originalDocumentReceipt";
import { treeDocumentChanges } from "./aiTreeDocPreview";

const tree = {
  deed: [{ id: "d1", n: "Salic Gershner", st: "deceased" }],
  spouse: { d1: { has: "yes", n: "Lillian Gershner", alive: "deceased" } },
  will: { d1: "no" },
  kids: [{ id: "k1", n: "Adolph Gershner", st: "deceased", of: ["d1"], kids: [{ id: "g1", n: "David Gershner" }] }],
  contacts: { "david gershner": { email: "d@example.com" } },
  submitted: true,
};

describe("seller AI family tree edits", () => {
  it("rejects a tree with a deed holder missing living/deceased", () => {
    const r = validateTreeEdit(tree, { ...tree, deed: [{ id: "d1", n: "Salic Gershner" }] });
    expect("error" in r).toBe(true);
  });
  it("rejects an unchanged tree", () => {
    expect("error" in validateTreeEdit(tree, tree)).toBe(true);
  });
  it("keeps the seller's contact details when the AI leaves them out", () => {
    const { contacts: _c, ...noContacts } = tree;
    const r = validateTreeEdit(tree, { ...noContacts, kids: [{ ...tree.kids[0], kids: [{ id: "g1", n: "David A Gershner" }] }] });
    expect("tree" in r && r.tree.contacts).toEqual(tree.contacts);
  });
  it("describes a misspelt name being corrected", () => {
    const next = { ...tree, kids: [{ ...tree.kids[0], n: "Adolf Gershner" }] };
    expect(treeDiff(tree, next)).toContainEqual({ label: "Child — name", before: "Adolph Gershner", after: "Adolf Gershner" });
  });
  it("describes a newly added relative", () => {
    const next = { ...tree, kids: [...tree.kids, { id: "k2", n: "Vicki Wallace", st: "living", of: ["d1"] }] };
    expect(treeDiff(tree, next).some((l) => l.label === "Child — added" && l.after.startsWith("Vicki Wallace"))).toBe(true);
  });
  it("a newly added living heir adds their documents to the request", () => {
    const next = { ...tree, kids: [...tree.kids, { id: "k2", n: "Vicki Wallace", st: "living", of: ["d1"] }] };
    const d = treeDocumentChanges(tree, next);
    expect(d.added.some((l) => l.includes("Vicki Wallace"))).toBe(true);
  });
});

describe("which new admin steps the seller AI may propose", () => {
  const base = { email: "s@example.com", quote_sent_at: "2026-01-01", quote_response: "accepted" };
  it("can send the document request once the family tree is complete", () => {
    expect(parityAllowed({ ...base, ownership_answers: { v2: tree, sellerConfirmedAt: "2026-02-01" } }, []).has("send_document_request")).toBe(true);
  });
  it("cannot send the document request before the family tree is complete", () => {
    expect(parityAllowed({ ...base, ownership_answers: { v2: tree } }, []).has("send_document_request")).toBe(false);
  });
  it("can correct the family tree but not after paperwork is complete", () => {
    expect(parityAllowed({ ...base, ownership_answers: { v2: tree } }, []).has("edit_family_tree")).toBe(true);
    expect(parityAllowed({ ...base, documents_completed_at: "2026-03-01", ownership_answers: { v2: tree } }, []).has("edit_family_tree")).toBe(false);
  });
  it("prepares a listing agreement only when none exists", () => {
    expect(parityAllowed(base, []).has("prepare_listing_agreement")).toBe(true);
    expect(parityAllowed(base, [{ kind: "listing_agreement", status: "signed" }]).has("prepare_listing_agreement")).toBe(false);
  });
  it("never offers archiving or buyer matching", () => {
    const all = parityAllowed({ ...base, ownership_answers: { v2: tree, sellerConfirmedAt: "x" } }, []);
    expect([...all].some((t) => /archive|buyer|match/.test(t))).toBe(false);
  });
  it("a send waits for a tree correction from the same review", () => {
    const acts = [{ id: "a", run_id: "r", status: "proposed", action_type: "edit_family_tree" }, { id: "b", run_id: "r", status: "proposed", action_type: "send_document_request" }];
    expect(pendingBefore(acts, acts[1])).toBe(true);
    expect(pendingRecordChanges(acts, acts[1])).toBe(true);
  });
});
