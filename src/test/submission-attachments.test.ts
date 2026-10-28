import { describe, expect, it } from "vitest";
import { buildAttachmentIndex, documentHasAttachment, readAttachmentPages } from "@/lib/submissionAttachments";

describe("submission attachment detection", () => {
  it("counts original form uploads before customer-file mirroring", () => {
    const result = buildAttachmentIndex([{ id: "seller", seller_attachments: [{ path: "seller/deed.pdf" }] }], [], [], []);
    expect(result.ids.has("seller")).toBe(true);
  });
  it("matches customer files by profile ID even without an email", () => {
    expect(buildAttachmentIndex([{ id: "seller", customer_profile_id: "profile" }], [], [{ customer_profile_id: "profile" }], []).ids.has("seller")).toBe(true);
  });
  it("normalizes alternate emails and includes all regions", () => {
    expect(buildAttachmentIndex([{ id: "bayer", email: " Alternate@Example.com " }], [{ id: "p", primary_email: "other@example.com", alt_emails: [" ALTERNATE@example.com "] }], [{ customer_profile_id: "p" }], []).ids.has("bayer")).toBe(true);
  });
  it("counts document attachments and shares them with merged submissions", () => {
    const result = buildAttachmentIndex([{ id: "old", email: "same@example.com" }, { id: "new", email: "same@example.com" }], [], [], [{ submission_id: "old", file_urls: ["deed.pdf"] }]);
    expect([...result.ids].sort()).toEqual(["new", "old"]);
  });
  it("does not count empty requests or empty upload metadata", () => {
    expect(documentHasAttachment({ submission_id: "s", file_url: " ", file_urls: [""] })).toBe(false);
    expect(buildAttachmentIndex([{ id: "s", seller_attachments: [{}] }], [], [], []).ids.has("s")).toBe(false);
  });
  it("reads files beyond the 1000-row API limit", async () => {
    const rows = Array.from({ length: 1435 }, (_, id) => ({ id }));
    const result = await readAttachmentPages(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }));
    expect(result).toHaveLength(1435);
    expect(result[1434].id).toBe(1434);
  });
  it("rejects an incomplete lookup rather than replacing existing labels", async () => {
    await expect(readAttachmentPages(async from => from === 0 ? { data: Array(1000).fill({}), error: null } : { data: null, error: new Error("offline") })).rejects.toThrow("offline");
  });
});