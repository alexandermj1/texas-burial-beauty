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
// Body is just greeting + signature. The offer intro, tier cards, and
// Next Steps block are injected in one branded HTML chunk by
// SendListingOptionsDialog when the admin fills in the quote amount.
export const buildSellerListingOptionsTemplate = (i: SellerInput): EmailTemplate => {
  const body = `Dear ${first(i.recipientName)},

${signature(i.adminName)}`;
  return { id: "seller_listing_options", label: "Quote (with pay buttons)", body };
};

// Consultative note explaining the difference between the $99 and $299
// listing packages — used when a seller asks which tier they should pick.
// Deliberately non-pushy: sets realistic expectations about the resale
// market, then explains why $299 is currently the strongest value.
export const buildListingOptionsRecommendationTemplate = (i: SellerInput): EmailTemplate => {
  const body = `Dear ${first(i.recipientName)},

Thank you for coming back to me — I'm glad you'd like to move forward with us.

To answer your question directly: both packages give your property real, active representation from our sales team, who have access to every listing in our inventory regardless of tier. The $299 package adds meaningfully greater visibility — priority placement in front of our funeral home and mortuary partners, and stronger positioning across our marketing channels — but I want to be transparent that no package can guarantee a faster sale.

The resale market for cemetery plots is genuinely unpredictable. Buyers make deeply personal decisions based on family history, sight lines, proximity to loved ones already interred, religious considerations, and dozens of other factors that no amount of marketing can shortcut. In practice we see properties that "should" move quickly sit for months, and quieter properties sell within weeks — a great deal comes down to the right family finding the right plot at the right moment.

That said, two data points from our 2025 sales are worth sharing, because they do reflect a real pattern:

• Plots listed on the $99 Pro package sold, on average, 22% faster than comparable plots marketed independently through classifieds or auction sites.
• Plots listed on the $299 Featured package sold, on average, 61% faster than the same independent baseline.

The reason the $299 tier performs so much better is straightforward: roughly 90% of resale plot sales originate through a mortuary or funeral home referral, and Featured placement puts your property at the top of the list our partners are looking at when a family walks in needing a plot. Being the first option shown matters a great deal in that setting.

I'll also mention — candidly — that $299 is a strong value at the moment. We're holding that price down while buyer demand is elevated, and it's the tier most sellers in your position are choosing right now.

Whichever route you prefer, we handle everything from here — the marketing, the showings, the buyer negotiations and the paperwork. You won't need to do anything further until we bring you an offer.

Happy to jump on a quick call if it's easier to talk it through.

${signature(i.adminName)}`;
  return {
    id: "seller_listing_options_recommendation",
    label: "Which listing option? (consultative)",
    body,
  };
};
