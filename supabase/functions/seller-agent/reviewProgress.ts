import { sellerModelLabel, type SellerModel } from "./models.ts";
import type { ResearchState } from "../_shared/recordAgent.ts";

const labels: Record<string, string> = {
  get_record: "Reading seller details and current stage", get_emails: "Reading recent emails",
  get_all_emails: "Reading the full email history", get_notes: "Checking staff notes",
  get_files: "Looking up uploaded files", reused_research: "Nothing changed since the last check — reusing earlier findings", read_deed: "Reading the deed image with Gemini Flash",
  read_file: "Opening and checking a document with Gemini Flash", get_cemetery: "Checking the cemetery and section information",
  get_payments: "Checking payments and whether they are live or test", get_quote_history: "Comparing saved quotes and revisions",
  get_activity: "Checking previous staff activity", get_family_tree: "Reading the ownership questionnaire",
  get_documents: "Checking requested paperwork and physical-original receipt", get_contracts: "Checking agreements and signatures",
  cemetery_stock: "Checking cemetery inventory", nearby_cemeteries: "Checking nearby cemeteries",
};
export function researchProgress(state?: ResearchState | null) {
  const tool = state?.pending[0]?.function?.name;
  if (tool) return labels[tool] ?? "Looking up supporting record information";
  return `Gemini Flash — ${state && state.step >= 9 ? "finishing the research summary" : `reviewing findings and choosing checks (round ${(state?.step ?? 0) + 1})`}`;
}
export function decisionProgress(model: SellerModel) {
  return `${sellerModelLabel(model)} — reviewing the evidence and preparing suggestions`;
}