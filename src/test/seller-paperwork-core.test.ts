import { describe, expect, it } from "vitest";
import {
  computedRequirements, contractLocked, documentStates, outstandingRequirements,
  planChecklistSync, preparedPoaFor, reqDbKey, visibleRequirements,
  type ContractRow, type DocRow,
} from "../../supabase/functions/_shared/paperworkCore";
import type { Requirement } from "../../supabase/functions/_shared/ownershipRules";

const row = (patch: Partial<DocRow>): DocRow => ({
  id: "row-1", doc_code: "D1", person_name: null, label: "Certificate of ownership (plot deed)",
  status: "pending", required_state: "needed", manual_override: null, notes: null,
  file_url: null, file_urls: [], ...patch,
});
const requirement = (patch: Partial<Requirement>): Requirement => ({
  code: "D1", label: "Certificate of ownership (plot deed)", why: "Ownership proof", ...patch,
});
const answers = { v2: { deed: [{ id: "a", n: "Alice Example", st: "living" }], signerCheck: true } } as any;

describe("seller paperwork parity", () => {
  it("rebuilds from the corrected tree even after an earlier request was sent", () => {
    const rows = [row({})];
    const frozen = visibleRequirements({ answers, rows, requestedAt: "2026-11-01", cemetery: "Restland" });
    expect(frozen.map((r) => r.code)).toContain("D1");
    const changed = { ...answers, removedDocs: ["D1::"] };
    expect(visibleRequirements({ answers: changed, rows, requestedAt: "2026-11-01" }).some((r) => r.code === "D1")).toBe(true);
    expect(visibleRequirements({ answers: changed, rows, requestedAt: "2026-11-01", fromTree: true }).some((r) => r.code === "D1")).toBe(false);
  });

  it("updates metadata without resetting received state, files or manual decisions", () => {
    const existing = row({ status: "received", required_state: "received", manual_override: "received", file_url: "seller/deed.pdf" });
    const plan = planChecklistSync("sub-1", [requirement({ why: "Fresh explanation" })], [existing], false);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].patch).not.toHaveProperty("status");
    expect(plan.updates[0].patch).not.toHaveProperty("manual_override");
    expect(plan.updates[0].patch).not.toHaveProperty("file_url");
    expect(plan.inserts).toHaveLength(0);
    expect(plan.staleIds).toHaveLength(0);
  });

  it("adopts a hand-added photo ID instead of duplicating it", () => {
    const hand = row({ id: "hand", doc_code: "X-abc", person_name: null, label: "Photo ID - Alice Example" });
    const req = requirement({ code: "D2P", label: "Photo ID — Alice Example", personName: "Alice Example" });
    const plan = planChecklistSync("sub-1", [req], [hand], false);
    expect(plan.updates.map((u) => u.id)).toEqual(["hand"]);
    expect(plan.inserts).toHaveLength(0);
  });

  it("retires the last obsolete unsigned POA as well as individual ones", () => {
    const plan = planChecklistSync("sub-1", [requirement({})], [], false);
    expect(plan.wantedPoaPeople.size).toBe(0);
    const withPoa = planChecklistSync("sub-1", [requirement({ code: "D21", personName: "Alice Example", jointNames: ["Alice Example", "Alan Example"] })], [], false);
    expect([...withPoa.wantedPoaPeople].sort()).toEqual(["alan example", "alice example"]);
  });

  it("never treats a deed scan or a signed-but-unreturned POA as the physical original", () => {
    const req = requirement({});
    const states = documentStates([req], [row({ file_url: "seller/deed.pdf" })], [], answers);
    expect(states[reqDbKey(req)]).toBe("needed");
    const poa = requirement({ code: "D21", personName: "Alice Example", needsNotary: true, contractKind: "poa" });
    const contract: ContractRow = { id: "c1", kind: "poa", status: "signed", signed_at: "2026-11-01", fill_data: { seller_name: "Alice Example" } };
    const poaStates = documentStates([poa], [row({ doc_code: "D21", person_name: "Alice Example" })], [contract], answers);
    expect(poaStates[reqDbKey(poa)]).toBe("needed");
  });

  it("keeps signed historical paper locked and matches joint prepared POAs", () => {
    expect(contractLocked({ id: "c", kind: "poa", status: "viewed", signed_at: "2026-11-01" })).toBe(true);
    expect(contractLocked({ id: "c", kind: "poa", status: "viewed" })).toBe(false);
    const req = requirement({ code: "D21", personName: "Alice Example", jointNames: ["Alice Example", "Alan Example"], contractKind: "poa" });
    const match = preparedPoaFor(req, [{ id: "joint", kind: "poa", status: "draft", fill_data: { seller_name: "Alice Example & Alan Example" } }]);
    expect(match?.id).toBe("joint");
  });

  it("does not email review notes or the listing agreement as outstanding seller documents", () => {
    const reqs = [requirement({ code: "REVIEW" }), requirement({ code: "LA" }), requirement({ code: "D2P", personName: "Alice Example" })];
    expect(outstandingRequirements(reqs, {}).map((r) => r.code)).toEqual(["D2P"]);
  });

  it("uses the same family-tree engine for the standard living-owner request", () => {
    const codes = computedRequirements(answers).map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(["D1", "D2P", "D21", "LA"]));
  });
});
