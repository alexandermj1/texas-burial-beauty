import { describe, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn(async () => ({data: {url: "https://example.test/pay", free: false}, error: null})));
vi.mock("@/integrations/supabase/client", () => ({supabase: {functions: {invoke}}}));
import { TIERS, buildListingOptionsBlock } from "@/lib/buildListingOptionsBlock";

describe("current listing fees", () => {
  it("keeps all four stable tier IDs and new paid prices", () => {
    expect(TIERS.map(t => [t.id, t.price])).toEqual([
      ["starter",299], ["pro",399], ["custom_plus",499], ["set_your_price",799],
    ]);
  });
  it("generates the correct paid buttons without changing seller commission", async () => {
    invoke.mockClear();
    const html = await buildListingOptionsBlock({ seller: {id:"test",name:"Test Seller",email:"test@example.test",cemetery:"Restland"}, netPerPlot: 1000, plotCount: 2, transferFee: 100, environment: "sandbox" });
    expect(invoke.mock.calls.map(call => (call as unknown as [string, {body: {amountCents: number}}])[1].body.amountCents)).toEqual([29900,39900,49900,79900]);
    for (const price of ["$299","$399","$499","$799"]) expect(html).toContain(price);
    expect(html).not.toContain("zero out-of-pocket");
    expect(html).toContain("$1,700");
  });
});
