// Google Ads + OpenAI pixel conversion reporting for completed website forms.
// Fired only after a submission is saved successfully; the submission id is
// passed as transaction_id so a resubmit/reload never double-counts.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    oaiq?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

export const ADS_CONVERSIONS = {
  seller: "AW-18210545326/RHOLCODlprgcEK69u-tD", // Seller lead – website form
  buyer: "AW-18210545326/p5agCKvjh58dEK69u-tD", // Buyer lead – website form
} as const;

export type LeadKind = keyof typeof ADS_CONVERSIONS;

export function reportLeadConversion(kind: LeadKind, submissionId: string) {
  try {
    window.gtag?.("event", "conversion", {
      send_to: ADS_CONVERSIONS[kind],
      value: 1.0,
      currency: "GBP",
      transaction_id: submissionId,
    });
  } catch (e) {
    console.warn("ads conversion failed", e);
  }
  // OpenAI pixel: report the completed form as a lead_created conversion so
  // ChatGPT-referred visitors can be measured. The SDK validates event props
  // strictly and drops anything beyond the documented shape, so keep this to
  // exactly { type: "customer_action" }.
  try {
    window.oaiq?.("measure", "lead_created", { type: "customer_action" });
  } catch (e) {
    console.warn("openai pixel conversion failed", e);
  }
}
