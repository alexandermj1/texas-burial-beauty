import { expect, it } from "vitest";
import { sellerDecisionJson } from "../../supabase/functions/_shared/sellerDecisionJson";
import { correctedAgreementEmail } from "../../supabase/functions/_shared/agreementContactCorrection";
import { sellerAutopilotOn, SELLER_EMAIL_ACTIONS, SELLER_RECORD_ACTIONS } from "../../supabase/functions/_shared/sellerAutopilotState";
it("repairs the observed sixty and seventy importance outputs without inference", () => {
  expect(sellerDecisionJson('{"actions":[{"type":"flag_human","importance": seventy}]}').actions[0].importance).toBe(70);
  expect(sellerDecisionJson('{"actions":[{"type":"flag_human","importance": sixty}]}').actions[0].importance).toBe(60);
  expect(() => sellerDecisionJson('{"actions":[')).toThrow();
});
it("all-seller mode is on despite an unselected per-record flag, but honors pauses", () => {
  expect(sellerAutopilotOn("all", false, null)).toBe(true);
  expect(sellerAutopilotOn("all", false, "2026-11-09T23:30:00Z")).toBe(false);
  expect(sellerAutopilotOn("selected", false, null)).toBe(false);
});
it("corrects Art's email while preserving paid Featured price, property and identity", () => {
  const fill = { email: "artfano@mcasystems.com", authorized_min_per_plot: 7000, authorized_min_total: 21000, plot_count: 3, listing_option: "Featured", listing_pricing_version: "current", seller_name: "Arturo A. Fano", plot_description: "Section 500, Lot 971, Spaces 4, 5 and 6", _seller_supplied: ["seller_name", "address", "city_state_zip"] };
  expect(correctedAgreementEmail({ kind: "listing_agreement", status: "viewed", fill_data: fill }, "artfano@tekselinc.com")).toEqual({ ...fill, email: "artfano@tekselinc.com" });
});
it("never rewrites an agreement signed by either party", () => {
  for (const patch of [{ signed_at: "2026-11-09" }, { countersigned_at: "2026-11-09" }, { status: "signed" }]) expect(() => correctedAgreementEmail({ kind: "listing_agreement", status: "viewed", fill_data: { email: "old@example.com" }, ...patch }, "new@example.com")).toThrow();
});
it("document and listing record updates execute independently but never count as emails", () => {
  expect(SELLER_RECORD_ACTIONS.has("update_document_items")).toBe(true);
  expect(SELLER_RECORD_ACTIONS.has("change_listing_option")).toBe(true);
  expect(SELLER_RECORD_ACTIONS.has("edit_family_tree")).toBe(true);
  expect(SELLER_RECORD_ACTIONS.has("edit_document_request")).toBe(true);
  expect(SELLER_RECORD_ACTIONS.has("sync_checklist")).toBe(true);
  expect(SELLER_RECORD_ACTIONS.has("prepare_listing_agreement")).toBe(true);
  expect(SELLER_EMAIL_ACTIONS.has("send_document_request")).toBe(true);
  expect(SELLER_EMAIL_ACTIONS.has("update_fields")).toBe(false);
  expect(SELLER_EMAIL_ACTIONS.has("reply_email")).toBe(true);
});