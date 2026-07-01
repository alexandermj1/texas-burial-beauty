// Pre-filled email templates for the inline composer on submission records.
// Sellers get a short intake that only asks for missing details.
// Buyers get two options: "we don't have it" and "we have it".

import { cleanDisplayName } from "@/lib/displayName";
import { properCase, properFirstName } from "@/lib/properCase";

export interface EmailTemplate {
  id: string;
  label: string;
  body: string;
}

const first = (name?: string | null): string => {
  const c = cleanDisplayName(name || "");
  const cased = properFirstName(c);
  return cased || "there";
};

const cem = (c?: string | null) => properCase(c || "");


const signature = (adminName?: string | null) => {
  const name = adminName?.trim();
  const nameBlock = name ? `${name}\nCemetery Salesperson\n` : "";
  return `Best regards,\n\n${nameBlock}Texas Cemetery Brokers\nwww.texascemeterybrokers.com`;
};


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
  /** Owner names extracted from uploaded deed attachments (via AI extraction). */
  deedExtractedOwners?: string[] | null;
}

// Light heuristics for the ownership rules.
const splitOwnerNames = (raw?: string | null): string[] => {
  if (!raw) return [];
  return raw
    .split(/,| and | & |\s*;\s*|\s*\/\s*/i)
    .map(s => s.trim())
    .filter(Boolean);
};

const nameTokens = (s?: string | null): Set<string> => {
  const set = new Set<string>();
  if (!s) return set;
  s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).forEach(t => {
    if (t && t.length > 1) set.add(t);
  });
  return set;
};

const sellerClaimsOwner = (rel?: string | null): boolean => {
  if (!rel) return false;
  const r = rel.toLowerCase();
  return /\b(owner|self|myself|i am|i'm|mine|purchaser|buyer of record)\b/.test(r);
};

const otherOwnersImplied = (
  sellerName: string | null | undefined,
  formOwners: string[],
  extractedOwners: string[],
): boolean => {
  const sellerToks = nameTokens(sellerName);
  const matchesSeller = (n: string) => {
    const t = nameTokens(n);
    for (const x of t) if (sellerToks.has(x)) return true;
    return false;
  };
  const allOwners = [...formOwners, ...extractedOwners];
  if (allOwners.length === 0) return false;
  if (allOwners.length >= 2) return true;
  return !allOwners.some(matchesSeller);
};

export const buildSellerIntakeTemplate = (i: SellerInput): EmailTemplate => {
  const cemetery = i.cemetery ? ` at ${cem(i.cemetery)}` : "";
  const missing: string[] = [];

  if (!i.section?.trim()) missing.push("Garden / section name");
  const hasPlotDetails = !!(i.spaceNumbers?.trim() || (i.spaces?.trim() && i.propertyType?.trim()));
  if (!hasPlotDetails) missing.push("Lot & space numbers and type of plot (e.g. double-depth lawn crypt, single grave space)");
  if (!i.deedOwnerNames?.trim()) missing.push("Names of all owners listed on the deed");
  if (!i.deedOwnersStatus?.trim()) missing.push("Are the plot owner(s) currently living?");
  if (!i.relationshipToOwner?.trim()) missing.push("Your relationship to the plot owner(s)");
  if (!i.hasAttachments) missing.push("A scanned copy of the deed, plus any original purchase records or evidence of prepaid endowment care / service charges (these can increase the valuation)");

  // Ownership-specific follow-ups (only when the seller says they're an owner).
  const formOwners = splitOwnerNames(i.deedOwnerNames);
  const extractedOwners = (i.deedExtractedOwners || []).filter(Boolean);
  if (sellerClaimsOwner(i.relationshipToOwner)) {
    const ownershipQuestions = [
      "Are you currently the owner on record with the cemetery administration?",
      "Were you the original purchaser of the property? If not, is this an heirship situation — and if so, who was the original purchaser and what is their relationship to you?",
      "Are you the sole owner? If there are any other named owners, please share their full names and relationship to you.",
    ];
    if (otherOwnersImplied(i.recipientName, formOwners, extractedOwners)) {
      ownershipQuestions.push(
        "The deed appears to list additional names alongside yours — could you confirm who is the current owner of record so we have it correct before proceeding?",
      );
    }
    missing.push(
      `A quick confirmation on ownership so we can proceed correctly:\n   ◦ ${ownershipQuestions.join("\n   ◦ ")}`,
    );
  }



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
  const at = i.cemetery ? ` at ${cem(i.cemetery)}` : "";
  const body = `Dear ${first(i.recipientName)},

Thank you for reaching out about cemetery property${at}.

Unfortunately we don't have anything matching your request available at this moment. New inventory comes in often, however, and I'll keep your request on file and reach out the moment something fitting becomes available.

If your needs change in the meantime, just let me know.

${signature(i.adminName)}`;
  return { id: "buyer_none", label: "No inventory yet", body };
};

export const buildBuyerHaveItTemplate = (i: BuyerInput): EmailTemplate => {
  const at = i.cemetery ? ` at ${cem(i.cemetery)}` : "";
  const desc = [i.spaces, i.propertyType].filter(Boolean).join(" ") || "cemetery property";
  const body = `Dear ${first(i.recipientName)},

Great news — we currently have ${desc}${at} available that matches what you're looking for.

I'd be happy to share the full details and pricing. When would be a good time for a quick call, or would you prefer I send the information by email?

${signature(i.adminName)}`;
  return { id: "buyer_have", label: "We have a match", body };
};

// Seller "Listing Options" — the admin picks this, then clicks
// "Attach listing options" to inject 3 Stripe pay buttons + the offer intro.
// The body here is just the closing text (greeting + next steps + signature);
// the offer intro and 3 tier cards are inserted by SendListingOptionsDialog.
export const buildSellerListingOptionsTemplate = (i: SellerInput): EmailTemplate => {
  const body = `Dear ${first(i.recipientName)},



Next Steps

1. Review the Offer: Take your time to consider the net payment and the competitive market strategy outlined above.
2. Select Your Listing Option: Choose the plan (Starter, Pro, or Featured) that best aligns with your goals — simply click the button on the option you want.
3. Confirm Your Acceptance or Ask Questions: To accept this offer, or if you have any questions about the market or our process, please simply reply to this email. We will promptly send over your Exclusive Sales Agreement and guide you through listing your property.

We look forward to achieving a successful sale on your behalf.

${signature(i.adminName)}`;
  return { id: "seller_listing_options", label: "Listing options (with pay buttons)", body };
};
