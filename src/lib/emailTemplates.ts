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
    ? `Thank you for providing the details you've shared so far - the more complete the picture, the more accurate the valuation we're able to come back with. To finalise your complimentary evaluation, please can you send across the following as a reply to this email:\n\n${missing.map(m => `• ${m}`).join("\n")}\n\n`
    : `Thank you for providing such complete details in the form — it genuinely helps us come back to you with the highest possible number.\n\n`;

  const closing = missing.length
    ? `As soon as we have this information, we'll be able to proceed with the appraisal.\n\n`
    : `We'll do our very best to get back to you promptly with an evaluation.\n\n`;

  const body = `Dear ${first(i.recipientName)},

Thank you for reaching out to Texas Cemetery Brokers about selling your cemetery property${cemetery}.

${ask}${closing}${signature(i.adminName)}`;

  return { id: "seller_intake", label: "Seller (no deed)", body };
};

// Seller acknowledgement when the deed was already supplied with the inquiry.
export const buildSellerDeedTemplate = (i: SellerInput): EmailTemplate => {
  const cemetery = i.cemetery ? ` at ${cem(i.cemetery)}` : "";
  // Describe what they actually submitted: count + type, plus section / space numbers.
  const count = (i.spaces || "").trim();
  const type = (i.propertyType || "").trim().toLowerCase();
  const noun = type || "burial plot";
  const plural = count && !/^1\b|^one\b/i.test(count) && !/s$/.test(noun) ? `${noun}s` : noun;
  const what = count ? `${count} ${plural}` : noun;
  const where: string[] = [];
  if (i.section?.trim()) where.push(`${i.section.trim()}`);
  if (i.spaceNumbers?.trim()) where.push(`space${/[,&/-]|\band\b/i.test(i.spaceNumbers) ? "s" : ""} ${i.spaceNumbers.trim()}`);
  const detail = where.length ? ` (${where.join(", ")})` : "";

  const body = `Dear ${first(i.recipientName)},

Thank you for reaching out to us. I have received your message and the copy of your deed for the ${what}${cemetery}${detail}, and I appreciate you providing that paperwork so promptly.

I am currently reviewing the information you shared. Our team will follow up with you as soon as possible regarding a suggested sales price and the next steps for your listing.

We appreciate your patience while we look into this for you.

${signature(i.adminName)}`;
  return { id: "seller_deed", label: "Seller (deed)", body };
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
// Body is just greeting + signature. The offer intro, tier cards, and
// Next Steps block are injected in one branded HTML chunk by
// SendListingOptionsDialog when the admin fills in the quote amount.
export const buildSellerListingOptionsTemplate = (i: SellerInput): EmailTemplate => {
  const body = `Dear ${first(i.recipientName)},

${signature(i.adminName)}`;
  return { id: "seller_listing_options", label: "Quote (with pay buttons)", body };
};

// Seller "Listing agreement" — the admin picks this, then uses the inline
// Listing agreement panel to generate the contract and insert the branded
// signing block. Body is just greeting + next steps + signature.
export const buildSellerListingAgreementTemplate = (i: SellerInput): EmailTemplate => {
  const cemetery = i.cemetery ? ` at ${cem(i.cemetery)}` : "";
  const body = `Dear ${first(i.recipientName)},

Thank you for choosing Texas Cemetery Brokers to represent the sale of your cemetery property${cemetery}. Your Exclusive Right-to-Sell Agreement is now prepared and ready for your review.


Once it's signed, we'll countersign, email you a copy for your records, and begin marketing the property straight away.

If you have any questions at all, simply reply to this email — I'm happy to walk you through it.

${signature(i.adminName)}`;
  return { id: "seller_listing_agreement", label: "Listing agreement (sign link)", body };
};

// Seller "Family tree" — the admin picks this, then uses the inline Family tree
// panel to edit the copy and insert the branded secure-link block. Body is just
// greeting + signature; the block carries the message.
export const buildSellerFamilyTreeTemplate = (i: SellerInput): EmailTemplate => {
  const body = `Dear ${first(i.recipientName)},

${signature(i.adminName)}`;
  return { id: "seller_family_tree", label: "Family tree (confirm the deed)", body };
};
