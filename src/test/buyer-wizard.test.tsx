import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuyerWizard from "@/components/BuyerWizard";

const { insert, invoke } = vi.hoisted(() => ({
  insert: vi.fn().mockResolvedValue({ error: null }),
  invoke: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }), functions: { invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/adsConversions", () => ({ reportLeadConversion: vi.fn() }));
vi.mock("@/hooks/useCemeteryRegistry", () => ({
  REGISTRY_REGIONS: ["Greater Houston"],
  useCemeteryRegistry: () => ({ loading: false, cemeteries: [{ id: "test", name: "Test Cemetery", city: "Houston", region: "Greater Houston" }] }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Embedded buyer enquiries", () => {
  it("submits a complete enquiry as a buyer and preserves the article attribution", async () => {
    render(<MemoryRouter><BuyerWizard variant="embedded" source="cost_guide_wizard" inquiryChannel="texas_cost_guide" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Burial Plot Traditional/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Pre-Need \(Future\)/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Flexible \/ Not Sure/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Greater Houston 1 cemeteries/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Any cemetery in Greater Houston/ }));
    const submit = await screen.findByRole("button", { name: "Submit Request" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), { target: { value: "Form Check" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "form-check@example.invalid" } });
    fireEvent.click(submit);
    await waitFor(() => expect(insert).toHaveBeenCalledOnce());
    expect(insert.mock.calls[0][0]).toMatchObject({
      customer_kind: "buyer", source: "cost_guide_wizard", inquiry_channel: "texas_cost_guide",
      name: "Form Check", email: "form-check@example.invalid", region: "Greater Houston",
      property_type: "Burial Plot", timeline: "Pre-Need (Future)", budget: "Flexible / Not Sure", state: "TX",
    });
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("inquiry-notification-email", { body: { submission_id: insert.mock.calls[0][0].id } }));
  });
});