// Pre-filled email templates for the inline composer on submission records.
// Sellers get a short intake that only asks for missing details.
// Buyers get two options: "we don't have it" and "we have it".

import { cleanDisplayName } from "@/lib/displayName";

export interface EmailTemplate {
  id: string;
  label: string;
  body: string;
}

const first = (name?: string | null): string => {
  const c = cleanDisplayName(name || "");
  if (!c) return "there";
  return c.split(/\s+/)[0];
};

const signature = (adminName?: string | null) =>
  adminName ? `Best regards,\n${adminName}\nTexas Cemetery Brokers` : `Best regards,\nTexas Cemetery Brokers`;

interface SellerInput {
  recipientName?: string | null;
  adminName?: string | null;
  cemetery?: string | null;
  section?: string | null;
  spaces?: string | null;
  propertyType?: string | null;
  spaceNumbers?: string | null;
  deedOwnerNames?: string | null;
  deedOwnersStatus?: string | null;
  relationshipToOwner?: string | null;
  hasAttachments?: boolean;
}

export const buildSellerIntakeTemplate = (i: SellerInput): EmailTemplate => {
  const cemetery = i.cemetery ? ` at ${i.cemetery}` : "";
  const missing: string[] = [];

  if (!i.section?.trim()) missing.push("Garden / section name");
  const hasPlotDetails = !!(i.spaceNumbers?.trim() || (i.spaces?.trim() && i.propertyType?.trim()));
  if (!hasPlotDetails) missing.push("Lot & space numbers and type of plot (e.g. double-depth lawn crypt, single grave space)");
  if (!i.deedOwnerNames?.trim()) missing.push("Names of all owners listed on the deed");
  if (!i.deedOwnersStatus?.trim()) missing.push("Are the plot owner(s) currently living?");
  if (!i.relationshipToOwner?.trim()) missing.push("Your relationship to the plot owner(s)");
  if (!i.hasAttachments) missing.push("A scanned copy of the deed, plus any original purchase records or evidence of prepaid endowment care / service charges (these can increase the valuation)");

  const ask = missing.length
    ? `Thank you for providing the details you've shared so far — the more complete the picture, the higher the valuation we're typically able to come back with. To finalise your complimentary evaluation, could you send across the following:\n\n${missing.map(m => `• ${m}`).join("\n")}\n\n`
    : `Thank you for providing such complete details in the form — it genuinely helps us come back to you with the highest possible number.\n\n`;

  const closing = missing.length
    ? `As soon as we have these, we'll do our very best to get back to you promptly with an evaluation.\n\n`
    : `We'll do our very best to get back to you promptly with an evaluation.\n\n`;

  const body = `Dear ${first(i.recipientName)},

Thank you for reaching out to Texas Cemetery Brokers about selling your cemetery property${cemetery}.

${ask}${closing}${signature(i.adminName)}`;

  return { id: "seller_intake", label: "Seller intake (asks for missing info)", body };
};

interface BuyerInput {
  recipientName?: string | null;
  adminName?: string | null;
  cemetery?: string | null;
  propertyType?: string | null;
  spaces?: string | null;
}

export const buildBuyerNoInventoryTemplate = (i: BuyerInput): EmailTemplate => {
  const at = i.cemetery ? ` at ${i.cemetery}` : "";
  const body = `Dear ${first(i.recipientName)},

Thank you for reaching out about cemetery property${at}.

Unfortunately we don't have anything matching your request available at this moment. New inventory comes in often, however, and I'll keep your request on file and reach out the moment something fitting becomes available.

If your needs change in the meantime, just let me know.

${signature(i.adminName)}`;
  return { id: "buyer_none", label: "No inventory yet", body };
};

export const buildBuyerHaveItTemplate = (i: BuyerInput): EmailTemplate => {
  const at = i.cemetery ? ` at ${i.cemetery}` : "";
  const desc = [i.spaces, i.propertyType].filter(Boolean).join(" ") || "cemetery property";
  const body = `Dear ${first(i.recipientName)},

Great news — we currently have ${desc}${at} available that matches what you're looking for.

I'd be happy to share the full details and pricing. When would be a good time for a quick call, or would you prefer I send the information by email?

${signature(i.adminName)}`;
  return { id: "buyer_have", label: "We have a match", body };
};
