// ─────────────────────────────────────────────────────────────────────────────
// Ownership proof & document requirements engine
//
// Turns a short questionnaire about who is on the deed into (a) the roster of
// people who must sign and (b) the exact list of documents this submission
// needs, overlaid with the cemetery's own rules.
//
// Pure functions only — no React, no Supabase — so the same logic can be
// unit-tested and reused anywhere.
// ─────────────────────────────────────────────────────────────────────────────

export type OwnerKind = "living" | "deceased" | "trust" | "org";

export type OwnershipAnswers = {
  owner?: OwnerKind;
  rel?: "self" | "spouse" | "child" | "grandchild" | "sibling" | "nibling" | "inlaw" | "rep" | "other";
  signer?: "self" | "agent";
  agentType?: "poa" | "guardian";
  owners?: "sole" | "multiple";
  co?: "all" | "deceased" | "blocked";
  marital?: "on_deed" | "married" | "divorced" | "widowed" | "single" | "unsure";
  /** Was the owner married at the time the plot was bought? Drives §711.039 waivers. */
  maritalAtPurchase?: "yes" | "no" | "unsure";
  occupied?: "no" | "yes";
  /** Who is buried in the spaces, when any have been used. */
  occupiedBy?: string;
  /** Does any deed holder have a current legal spouse who is not also on the deed? */
  outsideSpouse?: "yes" | "no" | "unsure";
  /** Do any deceased deed holders have surviving biological/adopted descendants? */
  descendants?: "yes" | "no" | "unsure";
  /** Stage 1 Q3 — is anyone named on the deed deceased? */
  deceasedAny?: "yes" | "no";
  /** Stage 1 Q4 — does anyone hold a POA for a living person named on the deed? */
  poaHolder?: "yes" | "no";
  /** The details of that power of attorney, in the seller's words. */
  poaDetails?: string;


  will?: "yes" | "no";
  probate?: "letters" | "muniment" | "none";
  beneficiaries?: "sole" | "multiple";
  heirclass?: "children" | "parents" | "siblings" | "unsure";
  heirship?: "court" | "affidavit" | "sea" | "none";
  spouse?: "yes" | "no";
  chain?: "one" | "multi";
  trustee?: "original" | "successor";
  orgStatus?: "active" | "inactive";
  deed?: "yes" | "no";
  names?: "yes" | "no";
  /** Married couple signing a single joint power of attorney rather than one each. */
  jointPoa?: "yes" | "no";
  /** What differs between the names on the deed, the ID and any court papers. */
  nameMismatch?: string;
  /** Why a co-owner can't or won't sign, in the seller's words. */
  blockedNotes?: string;
  /** Steps the seller has personally settled, so a reload doesn't re-ask them. */
  confirmedKeys?: string[];
  /** Questions we worked out ourselves (from the deed roster) and never ask. */
  derived?: string[];




  /** Named people gathered for the signing roster. */
  people?: RosterPerson[];
  /** Extra documents an admin has added by hand for this file only. */
  extraDocs?: {
    id: string; label: string; why?: string; person?: string; needsNotary?: boolean;
    /**
     * Which kind of document this is. "custom" is a plain thing we ask the
     * seller for; the others are documents we prepare and issue ourselves, so
     * they get the same generate / check / edit machinery as the automatic ones.
     */
    kind?: "custom" | "poa" | "joint_poa" | "affidavit_heirship";
    /** Second principal when kind is "joint_poa". */
    person2?: string;
  }[];

  /** Requirement keys an admin has removed outright from this file's checklist. */
  removedDocs?: string[];
  /**
   * Files we already hold that an admin has linked to a checklist item by hand,
   * keyed by "CODE::personName" and holding storage paths. Used when a document
   * arrived by email long before the checklist existed.
   */
  linkedFiles?: Record<string, string[]>;
  /**
   * Files an admin has explicitly detached from a checklist item, keyed the same
   * way. Beats both a hand link and our own filename guesswork, so a wrongly
   * attached file stays off the item.
   */
  unlinkedFiles?: Record<string, string[]>;

  /** Keys that were filled in by the AI reading and not yet confirmed by a human. */
  aiSuggested?: string[];
  /** When we emailed the seller their own copy of this questionnaire. */
  questionsSentAt?: string;
  /** When the seller submitted their confirmation. */
  sellerConfirmedAt?: string;
  /** Anything the seller wanted us to know, in their own words. */
  sellerNotes?: string;
  /**
   * Documents this cemetery will only accept as originals: the seller posts the
   * paper to us instead of photographing it. Keyed by "CODE::personName".
   */
  mailOriginals?: Record<string, { address: string }>;
  /** Items the admin has explicitly switched back to photo-upload only. */
  mailSkip?: string[];
  /** Default postal address used when an item is switched to originals-by-mail. */
  originalsAddress?: string;

  /** Name the document-request email greets, when the auto-picked one is wrong. */
  packetGreeting?: string;
  /** The broker's own message inside the document-request email. */
  packetEmailNote?: string;
  /** The broker's own message shown at the top of the seller's document page. */
  packetNote?: string;

  /** The last AI reading, kept so its explanation survives a reload. */
  aiReading?: {
    answers?: Record<string, string>;
    reasons?: { key: string; reason: string; confidence: string }[];
    open_questions?: string[];
    sources?: { emails: number; notes: number };
    at?: string;
  };

};

export type PersonRole =
  | "owner"
  | "co_owner"
  | "spouse"
  | "heir"
  | "executor"
  | "trustee"
  | "agent"
  | "witness"
  | "decedent";

export type RosterPerson = {
  id: string;
  name: string;
  role: PersonRole;
  /** Free-text: "daughter", "brother", "surviving spouse"… */
  relationship?: string;
  email?: string;
  phone?: string;
  /** True for a person in the chain of title who has died. */
  deceased?: boolean;
  /** Government name exactly as printed on their photo ID. */
  legalName?: string;
  /** Home address as printed on their ID — we prefill the POA with it. */
  address?: string;
  notes?: string;
};


export const ROLE_LABEL: Record<PersonRole, string> = {
  owner: "Owner on the deed",
  co_owner: "Co-owner",
  spouse: "Surviving / current spouse",
  heir: "Heir",
  executor: "Executor or administrator",
  trustee: "Trustee",
  agent: "Agent under power of attorney",
  witness: "Disinterested witness",
  decedent: "Deceased owner",
};

// ── The questionnaire ────────────────────────────────────────────────────────

export type Question = {
  key: keyof OwnershipAnswers;
  eyebrow: string;
  question: string;
  hint?: string;
  answers: { value: string; label: string; detail?: string }[];
};

export const QUESTIONS: Record<string, Question> = {
  owner: {
    key: "owner", eyebrow: "Ownership", question: "Are any of the people named on the deed no longer living?",
    hint: "Go by the names printed on the cemetery's certificate of ownership.",
    answers: [
      { value: "living", label: "No — everyone on the deed is living", detail: "They can sign the sale themselves" },
      { value: "deceased", label: "Yes — someone on the deed has died", detail: "That share passes by inheritance" },
      { value: "trust", label: "The deed is held by a trust", detail: "A living or family trust owns it" },
      { value: "org", label: "The deed is held by an organization", detail: "A church, lodge or company" },
    ],
  },
  rel: {
    key: "rel", eyebrow: "The seller", question: "What is your relationship to the people named on the deed?",
    hint: "This tells us who has to sign, and what we need to prove it.",
    answers: [
      { value: "self", label: "Self — I am named on the deed" },
      { value: "spouse", label: "Husband or wife" },
      { value: "child", label: "Son or daughter" },
      { value: "grandchild", label: "Grandson or granddaughter" },
      { value: "sibling", label: "Brother or sister" },
      { value: "nibling", label: "Niece or nephew" },
      { value: "inlaw", label: "In-law", detail: "For example, a daughter-in-law or son-in-law" },
      { value: "rep", label: "Executor, trustee or attorney-in-fact" },
      { value: "other", label: "Something else", detail: "Cousin, friend, or more distant" },
    ],
  },
  signer: {
    key: "signer", eyebrow: "Power of attorney", question: "Does anyone hold a power of attorney for a living person named on the deed?",
    hint: "If someone signs on an owner's behalf, we need the document that gives them that authority.",
    answers: [
      { value: "self", label: "No — each living owner will sign for themselves" },
      { value: "agent", label: "Yes — someone else signs on their behalf", detail: "Under a power of attorney or as guardian" },
    ],
  },
  agentType: {
    key: "agentType", eyebrow: "Acting on behalf", question: "What gives that person their authority?",
    answers: [
      { value: "poa", label: "A power of attorney" },
      { value: "guardian", label: "A court-appointed guardianship", detail: "The owner is a ward or a minor" },
    ],
  },
  owners: {
    key: "owners", eyebrow: "The deed", question: "How many people are named on the deed?",
    answers: [{ value: "sole", label: "Just one" }, { value: "multiple", label: "Two or more" }],
  },
  co: {
    key: "co", eyebrow: "Co-owners", question: "Is everyone named on the deed willing to sign the sale?",
    hint: "A plot is sold as one unit, so every living owner has to agree.",
    answers: [
      { value: "all", label: "Yes — everyone agrees" },
      { value: "blocked", label: "No — someone refuses or can't be found" },
    ],
  },

  marital: {
    key: "marital", eyebrow: "Spousal rights", question: "Is anyone named on the deed married?",
    hint: "A spouse holds a vested right of interment, so their signature is usually needed even when they aren't on the deed.",
    answers: [
      { value: "on_deed", label: "Yes — and the spouse is named on the deed", detail: "Nothing more needed, they already sign as an owner" },
      { value: "married", label: "Yes — and the spouse is not on the deed" },
      { value: "divorced", label: "No — divorced" },
      { value: "widowed", label: "No — the spouse has died" },
      { value: "single", label: "No — never married" },
      { value: "unsure", label: "I don't know" },
    ],
  },
  maritalAtPurchase: {
    key: "maritalAtPurchase", eyebrow: "Spousal rights", question: "Was the owner married at the time the plot was bought?",
    hint: "The right of interment vests at purchase, so a spouse from back then can still hold a claim even if the marriage has since ended.",
    answers: [
      { value: "no", label: "No — single at the time" },
      { value: "yes", label: "Yes — married at the time" },
      { value: "unsure", label: "I don't know" },
    ],
  },
  occupied: {
    key: "occupied", eyebrow: "The spaces", question: "Have any of the spaces on the deed ever been used?",
    hint: "Anyone already buried there gives their spouse and children reserved rights, so we have to account for it.",
    answers: [{ value: "no", label: "No — all the spaces are empty" }, { value: "yes", label: "Yes — one or more has been used" }],
  },
  outsideSpouse: {
    key: "outsideSpouse", eyebrow: "Spouses", question: "Does anyone named on the deed have a current legal spouse who is not named on the deed?",
    hint: "Do not include a former spouse after divorce. A current husband or wife may have interment rights and may need to sign, even when their name is not on the deed.",
    answers: [
      { value: "yes", label: "Yes — there is a current spouse not named on the deed" },
      { value: "no", label: "No — every current spouse is either on the deed, or there is no current spouse" },
      { value: "unsure", label: "I don't know" },
    ],
  },
  deceasedAny: {
    key: "deceasedAny", eyebrow: "Stage 1 · The deed", question: "Are any of the individuals named on the deed deceased?",
    hint: "If so we'll ask you which of them, on the next step.",
    answers: [
      { value: "no", label: "No — everyone named on the deed is living" },
      { value: "yes", label: "Yes — one or more of them has died" },
    ],
  },
  poaHolder: {
    key: "poaHolder", eyebrow: "Stage 1 · Power of attorney", question: "Does anyone hold a power of attorney for a living individual named on the deed?",
    hint: "This is an existing power of attorney — not the one we prepare for the sale.",
    answers: [
      { value: "no", label: "No — each living owner signs for themselves" },
      { value: "yes", label: "Yes — someone holds a power of attorney" },
    ],
  },



  will: {
    key: "will", eyebrow: "Stage 2 · A will", question: "Did any deceased person named on the deed leave a will that specifically identified the cemetery plot or spaces?",
    hint: "Only answer yes when the will itself specifically identifies this cemetery property.",
    answers: [
      { value: "yes", label: "Yes — there is a will" },
      { value: "no", label: "No — there is no will", detail: "Texas law decides who inherits" },
    ],
  },
  descendants: {
    key: "descendants", eyebrow: "Stage 2 · The family", question: "Does the family of anyone named on the deed include living children, brothers or sisters?",
    hint: "We need the whole immediate family: the children of everyone named on the deed (and their husbands or wives), and the brothers and sisters of everyone named on the deed. Include biological and legally adopted children from every marriage, but not step-children. If a child has died, name that child's own children.",
    answers: [
      { value: "yes", label: "Yes — there are children, brothers or sisters" },
      { value: "no", label: "No — there are none living" },
      { value: "unsure", label: "I don't know" },
    ],
  },


  probate: {
    key: "probate", eyebrow: "Probate", question: "How has the will been handled?",
    hint: "A will on its own transfers nothing until a court acts.",
    answers: [
      { value: "letters", label: "Probated, executor appointed", detail: "Letters Testamentary issued" },
      { value: "muniment", label: "Admitted as muniment of title", detail: "No debts, no administration" },
      { value: "none", label: "Not probated", detail: "It's never been to court" },
    ],
  },
  beneficiaries: {
    key: "beneficiaries", eyebrow: "Who inherits", question: "How many people inherit the plot under the will?",
    answers: [{ value: "sole", label: "One person" }, { value: "multiple", label: "Several people" }],
  },
  heirclass: {
    key: "heirclass", eyebrow: "The family", question: "Who survived them?",
    hint: "Texas law works down a ladder — the first group that exists inherits everything. Count biological and legally adopted children, including from earlier marriages, but not step-children.",
    answers: [
      { value: "children", label: "Children, or grandchildren of a child who has died" },
      { value: "parents", label: "No children, but a parent is living" },
      { value: "siblings", label: "No children or parents — brothers and sisters", detail: "Nieces and nephews step in for any who have died" },
      { value: "unsure", label: "I don't know" },
    ],
  },

  heirship: {
    key: "heirship", eyebrow: "Proving heirs", question: "How are the heirs being established?",
    answers: [
      { value: "court", label: "A court order", detail: "Letters of Administration or Judgment Determining Heirship" },
      { value: "affidavit", label: "Affidavit of heirship", detail: "Recorded, two disinterested witnesses" },
      { value: "sea", label: "Small estate affidavit", detail: "Court-approved, estate under $75,000" },
      { value: "none", label: "Nothing yet", detail: "No paperwork filed" },
    ],
  },
  spouse: {
    key: "spouse", eyebrow: "Surviving spouse", question: "Did they leave a surviving spouse?",
    hint: "A widow or widower keeps a right of interment, so we need to know either way.",
    answers: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  },
  chain: {
    key: "chain", eyebrow: "Chain of title", question: "Has anyone who would inherit also died since?",
    hint: "For example, the plot passed to a son who has since passed away himself.",
    answers: [{ value: "one", label: "No — one death only" }, { value: "multi", label: "Yes — more than one" }],
  },
  trustee: {
    key: "trustee", eyebrow: "Trust", question: "Who is acting as trustee now?",
    answers: [{ value: "original", label: "The original trustee" }, { value: "successor", label: "A successor trustee" }],
  },
  orgStatus: {
    key: "orgStatus", eyebrow: "Organization", question: "Is the organization still active?",
    answers: [{ value: "active", label: "Yes — still active" }, { value: "inactive", label: "No — dissolved or inactive" }],
  },
  deed: {
    key: "deed", eyebrow: "The deed", question: "Do you have the original certificate of ownership?",
    hint: "It's recorded with the cemetery, so a lost one can usually be rebuilt from their records.",
    answers: [{ value: "yes", label: "Yes — I have it" }, { value: "no", label: "No — it's lost" }],
  },
  names: {
    key: "names", eyebrow: "Names", question: "Do the names on the deed match the owners' current government-issued identification?",
    hint: "Tell us about any marriage, divorce, spelling, or other name difference so the documents can be prepared correctly.",
    answers: [{ value: "yes", label: "Yes — all names match" }, { value: "no", label: "No — something differs" }],
  },
};

/**
 * The questionnaire, written straight from the Stage 1 / Stage 2 checklist.
 * Nothing else is ever asked. The deed-holder card sits immediately before this
 * path and gathers Stage 1 question one (who is named on the most current deed).
 */
export function questionPath(a: OwnershipAnswers): string[] {
  // Stage 1 — always, in this order.
  const p: string[] = ["rel"];

  // A sole owner filling the form in themselves is plainly alive: never ask.
  const deedHolders = (a.people ?? []).filter(
    (p) => p.name?.trim() && (p.role === "owner" || p.role === "co_owner" || p.role === "decedent"),
  );
  const soleLivingSelf = a.rel === "self" && deedHolders.length <= 1 &&
    !deedHolders.some((p) => p.deceased || p.role === "decedent");
  if (!soleLivingSelf) p.push("deceasedAny");

  p.push("poaHolder", "occupied", "outsideSpouse");

  // Stage 2 — only when someone named on the deed has died.
  if (hasDeceased(a)) p.push("will", "descendants");
  return p;
}


/** Is anyone named on the deed deceased? */
export function hasDeceased(a: OwnershipAnswers): boolean {
  return a.deceasedAny === "yes" ||
    (a.people ?? []).some((p) => p.role === "decedent" || p.deceased === true);
}

/**
 * The checklist answers, translated into the legacy keys the requirements
 * engine reads. The seller is never asked these — they follow from Stage 1/2.
 */
export function normalizeAnswers(a: OwnershipAnswers): OwnershipAnswers {
  const deceased = hasDeceased(a);
  const outside = a.outsideSpouse === "yes";
  return {
    ...a,
    owner: a.owner ?? (deceased ? "deceased" : "living"),
    signer: a.poaHolder === "yes" ? "agent" : a.poaHolder === "no" ? "self" : a.signer,
    agentType: a.poaHolder === "yes" ? (a.agentType ?? "poa") : undefined,
    marital: outside ? "married" : a.marital,
    spouse: deceased && outside ? "yes" : a.spouse,
    // No probate question is asked: a plot is settled by affidavit of heirship.
    heirship: deceased && a.will === "no" ? (a.heirship ?? "affidavit") : a.heirship,
    probate: deceased && a.will === "yes" ? (a.probate ?? "none") : a.probate,
  };
}




export function isComplete(a: OwnershipAnswers): boolean {
  return questionPath(a).every((k) => !!(a as Record<string, unknown>)[k]);
}

export function progress(a: OwnershipAnswers): { answered: number; total: number } {
  const path = questionPath(a);
  return { answered: path.filter((k) => !!(a as Record<string, unknown>)[k]).length, total: path.length };
}

// ── Cemetery-specific rules ──────────────────────────────────────────────────

export type CemeteryDocRules = {
  requires_originals?: boolean;
  own_heirship_form?: boolean;
  own_heirship_form_name?: string;
  own_transfer_form?: boolean;
  accepts_outside_poa?: boolean;
  allows_remote_signing?: boolean;
  in_person_lost_deed?: boolean;
  child_waiver_required?: boolean;
  extra_docs?: { label: string; when?: "always" | "deceased_owner" | "no_deed" | "occupied"; why?: string }[];
  notes?: string;
};

// ── Requirements ─────────────────────────────────────────────────────────────

export type RequiredState =
  | "not_needed" | "maybe" | "needed" | "issued"
  | "awaiting_seller" | "received" | "notarized" | "complete";

export const STATE_LABEL: Record<RequiredState, string> = {
  not_needed: "Not needed",
  maybe: "Maybe",
  needed: "Needed",
  issued: "Drafted — not sent",
  awaiting_seller: "Waiting on seller",
  received: "Received",
  notarized: "Notarized",
  complete: "Complete",
};

export const STATE_ORDER: RequiredState[] = [
  "maybe", "needed", "issued", "awaiting_seller", "received", "notarized", "complete", "not_needed",
];

export type Requirement = {
  /** D-code from the master catalog, or REVIEW for a human decision. */
  code: string;
  label: string;
  why: string;
  statute?: string;
  /** We generate and send this document ourselves. */
  issuedByUs?: boolean;
  /** Must be signed in front of a notary. */
  needsNotary?: boolean;
  /** A blocker that a human has to resolve before anyone signs. */
  review?: boolean;
  /** Cemetery-specific requirement rather than a statewide one. */
  fromCemetery?: boolean;
  /** Originals only — copies won't be accepted by this cemetery. */
  originalsOnly?: boolean;
  personName?: string;
  personRole?: PersonRole;
  /** Both names when one document is signed by two people (a joint POA). */
  jointNames?: string[];
  /** The contract kind we can generate for this item, if any. */
  contractKind?: "listing_agreement" | "poa" | "affidavit_heirship" | "spousal_consent";
};

/**
 * Is this person dead, either because they were marked so or because the
 * answers say the person on the deed has died? A decedent never signs.
 */
export const isDeceasedPerson = (p: RosterPerson, a: OwnershipAnswers): boolean => {
  // Explicit wins: the roster is the source of truth about who is alive.
  if (p.role === "decedent" || p.deceased === true) return true;
  if (p.deceased === false) return false;
  // "The owner has died" only tells us *an* owner died. When the roster already
  // names that person, every other owner on it is a living co-owner (typically
  // the surviving spouse) and must still sign / give a power of attorney.
  const someoneNamedDead = (a.people ?? []).some((x) => x.role === "decedent" || x.deceased === true);
  if (someoneNamedDead) return false;
  return a.owner === "deceased" && (p.role === "owner" || p.role === "co_owner");
};


/**
 * A single power of attorney may be signed by two principals — each signature
 * separately acknowledged before the notary — so a married couple who own the
 * plot together can sign one document rather than one each. We only offer it
 * where both signers are living and are the owner and their spouse/co-owner.
 */
export function canIssueJointPoa(a: OwnershipAnswers): boolean {
  const signers = (a.people ?? []).filter(
    (p) => p.name.trim() && p.role !== "witness" && !isDeceasedPerson(p, a),
  );
  if (signers.length !== 2) return false;
  const roles = signers.map((p) => p.role).sort().join("+");
  return roles === "owner+spouse" || roles === "co_owner+owner" || roles === "co_owner+co_owner";
}



/**
 * Everyone whose signature or ID we need, derived from the answers plus the
 * named people the admin has entered.
 */
export function signingRoster(a: OwnershipAnswers): RosterPerson[] {
  const named = (a.people ?? []).filter((p) => p.name.trim());
  if (named.length) return named.filter((p) => !isDeceasedPerson(p, a));

  // No names entered yet — describe the roles we know we'll need.
  const placeholder = (role: PersonRole, name: string): RosterPerson =>
    ({ id: `ph-${role}-${name}`, name, role });
  const out: RosterPerson[] = [];
  if (a.owner === "living") {
    out.push(placeholder("owner", "Owner on the deed"));
    if (a.owners === "multiple") out.push(placeholder("co_owner", "Each co-owner"));
    if (a.signer === "agent") out.push(placeholder("agent", "Person acting under authority"));
    if (a.marital === "married" || a.outsideSpouse === "yes") out.push(placeholder("spouse", "Owner's spouse"));
  } else if (a.owner === "deceased") {
    if (a.will === "yes" && a.probate === "letters") out.push(placeholder("executor", "Executor"));
    else out.push(placeholder("heir", "Each heir"));
    if (a.spouse === "yes") out.push(placeholder("spouse", "Surviving spouse"));
    if (a.heirship === "affidavit") out.push(placeholder("witness", "Disinterested witness"));
  } else if (a.owner === "trust") out.push(placeholder("trustee", "Trustee"));
  else if (a.owner === "org") out.push(placeholder("owner", "Authorised officer"));
  return out;
}

/**
 * The full document list for a submission: statewide rules first, then the
 * cemetery's own overrides, then a per-person POA + photo ID for every signer.
 */
export function computeRequirements(
  raw: OwnershipAnswers,
  cem?: CemeteryDocRules | null,
): Requirement[] {
  const a = normalizeAnswers(raw);
  const out: Requirement[] = [];
  const add = (r: Requirement) => out.push(r);
  const rules = cem ?? {};


  // ── Proof of the right being sold ──
  if (a.deed === "no") {
    add({
      code: "D1",
      label: rules.in_person_lost_deed
        ? "Lost-certificate of title form (cemetery, in person)"
        : "Lost-certificate affidavit + cemetery record",
      why: rules.in_person_lost_deed
        ? "This cemetery only replaces a lost deed on its own form, signed in person at the office."
        : "We rebuild proof of ownership from the cemetery's file.",
      issuedByUs: !rules.in_person_lost_deed,
      needsNotary: !rules.in_person_lost_deed,
      fromCemetery: rules.in_person_lost_deed,
      review: rules.in_person_lost_deed,
    });
    if (rules.own_heirship_form) {
      add({
        code: "C-HEIR",
        label: rules.own_heirship_form_name ?? "Cemetery's own heirship / quitclaim form",
        why: "This cemetery issues its own form when the original deed is missing.",
        fromCemetery: true,
      });
    }
  } else {
    // Every file needs proof of the right being sold, so the deed is listed by
    // default — even before the seller has told us whether they still have it.
    add({
      code: "D1",
      label: "Certificate of ownership (plot deed)",
      why: "Proves the right being sold.",
      originalsOnly: rules.requires_originals,
      fromCemetery: rules.requires_originals,
    });
  }


  // ── Living owner ──
  if (a.owner === "living") {
    if (a.agentType === "poa") {
      add({
        code: "D15", label: "The seller's existing power of attorney",
        why: rules.accepts_outside_poa === false
          ? "This cemetery does not accept an outside power of attorney — confirm before relying on it."
          : "Must cover property transactions, be unrevoked, and expressly allow delegation to route it through us.",
        statute: "§751.031", review: rules.accepts_outside_poa === false,
      });
    }
    if (a.agentType === "guardian") {
      add({ code: "D18", label: "Guardianship letters", why: "Plus any court approval of the sale.", review: true });
    }
    if (a.co === "deceased") {
      add({ code: "D6", label: "Death certificate for the deceased co-owner", why: "Opens the inheritance path for that share." });
    }
    if (a.co === "blocked") {
      add({ code: "REVIEW", label: "Co-owner refuses or can't be found", why: "A plot can't be conveyed without every co-owner. Decide the route before quoting.", review: true });
    }
    // The owner is alive but someone else is running the sale — very common where
    // a child sells a living parent's plot. Nothing passes by inheritance yet.
    if (a.rel && a.rel !== "self" && a.signer !== "agent") {
      add({
        code: "REVIEW",
        label: "The owner is living — they must sign, or give a power of attorney",
        why: "A relative has no authority over a living owner's plot. Either the owner signs everything themselves, or they sign a power of attorney first.",
        statute: "§751.031", review: true,
      });
      add({
        code: "D21", label: "Limited power of attorney from the living owner",
        why: "Only if the owner would rather the family member handled the sale.",
        issuedByUs: true, needsNotary: true, contractKind: "poa",
      });
    }
    if (a.marital === "married" || a.outsideSpouse === "yes") {
      add({
        code: "D3", label: "Spouse's written consent / joinder",
        why: "A sale can't erase their right of interment without it.",
        statute: "§711.039", issuedByUs: true, needsNotary: true, contractKind: "spousal_consent",
      });
    }
    if (a.marital === "divorced") add({ code: "D4", label: "Final divorce decree", why: "Shows the former spouse's right ended.", statute: "§711.039" });
    if (a.marital === "widowed") add({ code: "D6", label: "Late spouse's death certificate", why: "Clears their right of interment.", originalsOnly: rules.requires_originals });
  }

  // ── Deceased owner ──
  if (a.owner === "deceased") {
    add({
      code: "D6", label: "Death certificate for the plot owner",
      why: "Starts the chain of succession.", originalsOnly: rules.requires_originals,
      fromCemetery: rules.requires_originals,
    });
    if (a.occupied === "yes") {
      add({
        code: "NOTE", label: "Occupied plot — confirm the remaining spaces with the cemetery",
        why: "The surviving spouse and children hold reserved rights in the unused spaces, so the cemetery has to confirm what can actually be sold. No extra paperwork unless it objects.",
        statute: "§711.039(e)",
      });
    }
    if (a.will === "yes") {
      add({ code: "D7", label: "The will", why: "Names who takes the plot." });
      if (a.probate === "letters") add({ code: "D8", label: "Letters Testamentary", why: "The executor's authority." });
      if (a.probate === "muniment") add({ code: "D9", label: "Muniment of title order", why: "Passes title with no administration." });
      if (a.probate === "none") {
        add({
          code: "REVIEW", label: "The will has not been probated",
          why: "An unprobated will transfers nothing on its own. Either probate it, or establish the heirs by affidavit — most cemeteries accept the affidavit route for a plot.",
          review: true,
        });
        // The paper files show the affidavit route used even where a will exists
        // but was never probated — a plot is rarely worth opening an estate for.
        add({
          code: "D12",
          label: rules.own_heirship_form
            ? `Affidavit of heirship — ${rules.own_heirship_form_name ?? "cemetery's own form"}`
            : "Affidavit of Heirship (in place of probate)",
          why: "Sworn by the affiant and a second disinterested witness; attach the will as evidence of intent.",
          statute: "Estates Code §203.001",
          issuedByUs: !rules.own_heirship_form, needsNotary: true,
          fromCemetery: rules.own_heirship_form,
          contractKind: rules.own_heirship_form ? undefined : "affidavit_heirship",
        });
      }
    } else if (a.will === "no") {
      if (a.heirclass === "unsure") {
        add({ code: "REVIEW", label: "Establish the inheritance line", why: "We need to know which class of heirs inherits before choosing a route.", review: true });
      }
      if (a.heirship === "court") add({ code: "D10", label: "Letters of Administration or Judgment Determining Heirship", why: "The court's determination of the heirs." });
      if (a.heirship === "affidavit") {
        add({
          code: "D12",
          label: rules.own_heirship_form
            ? `Affidavit of heirship — ${rules.own_heirship_form_name ?? "cemetery's own form"}`
            : "Affidavit of Heirship",
          why: rules.own_heirship_form
            ? "This cemetery requires its own heirship form rather than a generic affidavit."
            : "Recorded, sworn by the affiant and a second disinterested witness.",
          statute: "Estates Code §203.001",
          issuedByUs: !rules.own_heirship_form, needsNotary: true,
          fromCemetery: rules.own_heirship_form,
          contractKind: rules.own_heirship_form ? undefined : "affidavit_heirship",
        });
      }
      if (a.heirship === "sea") add({ code: "D13", label: "Small estate affidavit", why: "Court-approved, estate under $75,000, signed by all heirs." });
      if (a.heirship === "none") add({ code: "REVIEW", label: "Heirship must be established first", why: "Pick a route before anyone signs.", review: true });
    }
    // A surviving spouse keeps their right whether or not there was a will.
    if (a.spouse === "yes") {
      add({
        code: "D3", label: "Surviving spouse's consent / joinder",
        why: "They keep a reserved right of interment.", statute: "§711.039",
        issuedByUs: true, needsNotary: true, contractKind: "spousal_consent",
      });
    }
    // No surviving spouse: prove how the earlier marriage ended.
    if (a.spouse === "no" && a.marital === "divorced") {
      add({ code: "D4", label: "Final divorce decree", why: "Shows the former spouse's right of interment ended before the owner died.", statute: "§711.039" });
    }
    if (a.spouse === "no" && a.marital === "widowed") {
      add({ code: "D6", label: "Late spouse's death certificate", why: "Clears the spouse's right of interment.", originalsOnly: rules.requires_originals });
    }
    if (a.chain === "multi") {
      add({ code: "D22", label: "Death certificate and inheritance proof for each estate", why: "Plus a short family chart showing how the plot travelled.", review: true });
    }
  }

  // ── Married when the plot was bought, but not married now ──
  // The right of interment vests at purchase, so the marriage that existed then
  // still matters even if it has since ended.
  if (a.maritalAtPurchase === "yes") {
    if (a.marital === "divorced") {
      add({ code: "D4", label: "Final divorce decree (plot addressed or awarded)", why: "The spouse at purchase vested a right of interment — the decree has to show it was divided or waived.", statute: "§711.039" });
      add({ code: "D3", label: "Former spouse's waiver of interment rights", why: "Needed when the decree is silent about the plot.", issuedByUs: true, needsNotary: true, contractKind: "spousal_consent", review: true });
    }
    if (a.marital === "widowed") {
      add({ code: "D6", label: "Death certificate for the spouse who was married to the owner at purchase", why: "Ends the right that vested when the plot was bought.", originalsOnly: rules.requires_originals });
    }
    if (a.marital === "single") {
      add({ code: "REVIEW", label: "Married at purchase but recorded as never married", why: "Reconcile the two before signing — one of the answers is wrong.", review: true });
    }
  } else if (a.maritalAtPurchase === "unsure") {
    add({ code: "REVIEW", label: "Confirm the owner's marital status at the time of purchase", why: "A spouse from then can still hold a vested right of interment.", statute: "§711.039", review: true });
  }

  if (a.owner === "trust") {
    add({ code: "D16", label: "Trust agreement or certification of trust", why: "Shows the trustee can sell." });
    if (a.trustee === "successor") add({ code: "D17", label: "Successor trustee acceptance", why: "Proof they validly took over." });
  }

  if (a.owner === "org") {
    add({ code: "D19", label: "Resolution authorising the sale", why: "Names who may sign." });
    add({ code: "D19b", label: "Proof of good standing", why: "Confirms it can still convey." });
    if (a.orgStatus === "inactive") add({ code: "REVIEW", label: "Dissolved-entity review", why: "May need reinstatement first.", review: true });
  }

  if (a.rel === "inlaw") {
    add({ code: "REVIEW", label: "In-laws do not inherit under Texas law", why: "Confirm which blood relative or spouse actually holds the right to sell.", review: true });
  }

  if (a.names === "no") {
    add({ code: "D5", label: "Marriage certificate, divorce decree or name-change order", why: "Bridges the different names across your documents." });
  }

  // ── Cemetery extras ──
  if (rules.child_waiver_required && (a.occupied === "yes" || a.owner === "deceased")) {
    add({ code: "C-CHILD", label: "Child waiver / consent of surviving children", why: "This cemetery requires the decedent's children to waive their reserved rights.", fromCemetery: true });
  }
  for (const extra of rules.extra_docs ?? []) {
    const when = extra.when ?? "always";
    const applies =
      when === "always" ||
      (when === "deceased_owner" && a.owner === "deceased") ||
      (when === "no_deed" && a.deed === "no") ||
      (when === "occupied" && a.occupied === "yes");
    if (applies) add({ code: "C-EXTRA", label: extra.label, why: extra.why ?? "Required by this cemetery.", fromCemetery: true });
  }

  // ── Always ──

  add({
    code: "LA", label: "Exclusive Right-to-Sell Listing Agreement",
    why: "Signed electronically once the seller accepts the quote.",
    issuedByUs: true, contractKind: "listing_agreement",
  });

  // ── Per-person items ──
  const namedRoster = (a.people ?? []).filter((p) => p.name.trim() && !isDeceasedPerson(p, a));
  if (namedRoster.length === 0) {
    add({ code: "D2", label: "Photo ID for every person signing", why: "One clear government photo ID for each person who will sign." });
  }
  const signers = namedRoster.filter((p) => p.role !== "witness");
  const joint = canIssueJointPoa(a) && a.jointPoa === "yes" ? signers : null;

  if (joint) {
    // Texas law lets two principals execute one instrument, each signature
    // separately acknowledged, so a married couple can sign a single POA.
    add({
      code: "D21", label: `Joint limited power of attorney — ${joint.map((p) => p.name).join(" & ")}`,
      why: "One document both spouses sign, each acknowledged before the notary, instead of a separate POA each.",
      statute: "§751.031",
      issuedByUs: true, needsNotary: true, contractKind: "poa",
      personName: joint[0].name, personRole: joint[0].role,
      jointNames: joint.map((p) => p.name),
    });
  }
  for (const p of signers) {
    if (!joint) {
      add({
        code: "D21", label: `Limited power of attorney to Texas Cemetery Brokers — ${p.name}`,
        why: "Lets us sign the transfer paperwork at the cemetery on their behalf.",
        issuedByUs: true, needsNotary: true, contractKind: "poa",
        personName: p.name, personRole: p.role,
      });
    }
    add({
      code: "D2P", label: `Photo ID — ${p.name}`,
      why: "The cemetery matches every signature to a government ID.",
      personName: p.name, personRole: p.role,
    });
  }

  // ── Documents added by hand for this file only ──
  // Most are plain requests, but a broker can also add a power of attorney, a
  // joint power of attorney or an affidavit of heirship by hand. Those carry the
  // real D-codes and contract kinds so they are prepared and signed exactly like
  // the ones the rules produce automatically.
  for (const x of a.extraDocs ?? []) {
    const kind = x?.kind ?? "custom";
    const person = x?.person?.trim() ?? "";
    const person2 = x?.person2?.trim() ?? "";

    if (kind === "poa" && person) {
      add({
        code: "D21",
        label: x.label?.trim() || `Limited power of attorney to Texas Cemetery Brokers — ${person}`,
        why: x.why?.trim() || "Lets us sign the transfer paperwork at the cemetery on their behalf.",
        issuedByUs: true, needsNotary: true, contractKind: "poa",
        personName: person,
      });
      continue;
    }
    if (kind === "joint_poa" && person && person2) {
      add({
        code: "D21",
        label: x.label?.trim() || `Joint limited power of attorney — ${person} & ${person2}`,
        why: x.why?.trim() || "One document both people sign, each acknowledged separately before the notary.",
        statute: "§751.031",
        issuedByUs: true, needsNotary: true, contractKind: "poa",
        personName: person, jointNames: [person, person2],
      });
      continue;
    }
    if (kind === "affidavit_heirship") {
      add({
        code: "D12",
        label: x.label?.trim() || "Affidavit of Heirship",
        why: x.why?.trim() || "Sworn by the affiant and a second disinterested witness, in place of probate.",
        statute: "Estates Code §203.001",
        issuedByUs: true, needsNotary: true, contractKind: "affidavit_heirship",
        ...(person ? { personName: person } : {}),
      });
      continue;
    }

    if (!x?.label?.trim()) continue;
    add({
      code: `X-${x.id}`,
      label: x.label.trim(),
      why: x.why?.trim() || "Added for this file by the broker.",
      needsNotary: !!x.needsNotary,
      ...(person ? { personName: person } : {}),
    });
  }





  // De-duplicate by checklist identity. Labels can change as names become known,
  // but that must not create a second request for the same document.
  const seen = new Map<string, Requirement>();
  for (const r of out) {
    const key = `${r.code}::${r.personName ?? ""}`;
    const prev = seen.get(key);
    if (!prev) seen.set(key, r);
    else seen.set(key, { ...prev, ...r });
  }
  return [...seen.values()];
}

/** Short human summary used in the panel header and the outstanding-items email. */
export function summarise(reqs: Requirement[], states: Record<string, RequiredState>) {
  const active = reqs.filter((r) => (states[reqKey(r)] ?? "needed") !== "not_needed");
  const done = active.filter((r) => {
    const s = states[reqKey(r)] ?? "needed";
    return s === "complete" || s === "received" || s === "notarized";
  });
  const people = new Set(
    active
      .filter((r) => !done.includes(r) && r.personName)
      .map((r) => r.personName as string),
  );
  return { total: active.length, done: done.length, waitingOn: [...people], blockers: active.filter((r) => r.review).length };
}

export const reqKey = (r: Requirement) => `${r.code}::${r.personName ?? ""}`;

/* ------------------------------------------------------------------ *
 * Plain-English guide for each document code. Used by the expandable
 * rows in the admin checklist and by the seller's document packet page,
 * so both sides read exactly the same explanation.
 * ------------------------------------------------------------------ */
export type DocGuide = {
  /** What the document actually is. */
  what: string;
  /** How the seller can get hold of it. */
  how: string;
  /** Filename keywords used to spot an uploaded file for this item. */
  match?: string[];
};

export const DOC_GUIDE: Record<string, DocGuide> = {
  D1: {
    what: "The cemetery's certificate of ownership — often called the plot deed. It is the original paper the cemetery issued when the spaces were bought, showing the owner's name and the exact section, lot and space numbers.",
    how: "Check the family papers, a safety deposit box or the funeral file. If it can't be found, the cemetery can confirm ownership from their records and we replace it with a lost-certificate affidavit.",
    match: ["deed", "certificate", "title", "ownership", "cert"],
  },
  D2: {
    what: "A clear photo or scan of a current government photo ID for every person who will sign — driver's licence, state ID or passport.",
    how: "Photograph the front of the ID in good light with all four corners visible.",
    match: ["id", "licence", "license", "passport", "dl", "drivers"],
  },
  D2P: {
    what: "A current government photo ID for this specific signer. The cemetery matches every signature against the ID.",
    how: "Photograph the front of the ID in good light with all four corners visible.",
    match: ["id", "licence", "license", "passport", "dl", "drivers"],
  },
  D3: {
    what: "A short notarized statement in which the spouse (or former spouse) gives up their right of interment in the plot, so the sale conveys cleanly.",
    how: "We prepare and send it — it is signed in front of a notary and returned to us.",
    match: ["consent", "waiver", "joinder", "spous"],
  },
  D4: {
    what: "The final divorce decree, ideally the page that deals with the cemetery property.",
    how: "The district clerk in the county where the divorce was granted can issue a certified copy, usually the same day.",
    match: ["divorce", "decree"],
  },
  D5: {
    what: "A marriage certificate, divorce decree or court name-change order that links the name on the deed to the name being used today.",
    how: "County clerk where the event was recorded, or the court that granted the change.",
    match: ["marriage", "name change", "namechange"],
  },
  D6: {
    what: "A certified death certificate for the owner (or spouse) — the copy with the raised seal, not a funeral-home keepsake.",
    how: "Texas Vital Statistics or the county clerk where the death occurred. Funeral homes can usually order extra certified copies.",
    match: ["death", "certificate", "dc"],
  },
  D7: {
    what: "The signed will that names who receives the estate, including the cemetery property.",
    how: "The attorney who drafted it, the executor's file, or the county clerk if it was filed for probate.",
    match: ["will", "testament"],
  },
  D8: {
    what: "Letters Testamentary — the court's one-page order confirming the executor may act for the estate.",
    how: "The probate clerk in the county where the will was probated.",
    match: ["letters", "testamentary"],
  },
  D9: {
    what: "The court order admitting the will as a muniment of title, which passes property with no full administration.",
    how: "The probate clerk in the county where the order was signed.",
    match: ["muniment"],
  },
  D10: {
    what: "Letters of Administration or a Judgment Determining Heirship — the court's finding of who the legal heirs are.",
    how: "The probate clerk in the county where the case was heard.",
    match: ["administration", "heirship", "judgment"],
  },
  D12: {
    what: "An Affidavit of Heirship for the cemetery property: a sworn statement of the family tree signed by the heirs and two disinterested witnesses who knew the family but inherit nothing.",
    how: "We prepare it from your answers. Every signer signs in front of a notary — Proof.com works from a phone in about fifteen minutes.",
    match: ["affidavit", "heirship"],
  },
  D13: {
    what: "A court-approved small estate affidavit, available when the estate is under $75,000 and every heir signs.",
    how: "Filed with, and returned by, the probate clerk.",
    match: ["small estate", "sea"],
  },
  D15: {
    what: "The existing power of attorney the seller already holds for the owner.",
    how: "Scan every page including the notary block. Some cemeteries will not accept an outside POA, so we check it first.",
    match: ["poa", "power of attorney", "attorney"],
  },
  D16: {
    what: "The trust agreement, or a certification of trust, showing the trustee has the power to sell real property.",
    how: "The attorney who drew up the trust, or the trustee's own file.",
    match: ["trust"],
  },
  D17: {
    what: "The document by which the successor trustee formally accepted the role.",
    how: "Usually held with the trust papers or prepared by the trust's attorney.",
    match: ["successor", "trustee"],
  },
  D18: {
    what: "Guardianship letters, plus any court approval needed to sell the ward's property.",
    how: "The probate court that granted the guardianship.",
    match: ["guardian"],
  },
  D19: {
    what: "A resolution from the organisation authorising the sale and naming who signs.",
    how: "The board secretary or the organisation's attorney.",
    match: ["resolution", "board"],
  },
  D19b: {
    what: "A certificate of good standing showing the entity still legally exists and can convey property.",
    how: "The Texas Secretary of State — available online in minutes.",
    match: ["good standing", "certificate of existence"],
  },
  D21: {
    what: "Our limited power of attorney. It lets Texas Cemetery Brokers sign the cemetery's transfer paperwork on your behalf so you never have to attend the office in person. It covers this plot only, nothing else.",
    how: "We send it ready to sign. It must be notarized — Proof.com is an online notary that works from a phone, or any local notary can do it.",
    match: ["poa", "power of attorney"],
  },
  D22: {
    what: "For a plot that passed through more than one death: a death certificate and inheritance proof for each estate, with a short family chart showing the chain.",
    how: "We work through this with you one step at a time.",
    match: ["death", "chain"],
  },
  LA: {
    what: "The Exclusive Right-to-Sell Listing Agreement — the contract that lets us market and sell the plot for the price agreed in your quote.",
    how: "We email a link; it is signed electronically in a couple of minutes, no printing.",
    match: ["listing", "agreement", "la"],
  },
  "C-HEIR": {
    what: "The cemetery's own heirship or quitclaim form, used instead of the standard affidavit.",
    how: "We request it from the cemetery office and send it on to you.",
    match: ["heirship", "quitclaim"],
  },
  "C-CHILD": {
    what: "A waiver signed by the deceased owner's surviving children giving up their reserved rights of interment.",
    how: "We prepare the waiver and send it to each child to sign.",
    match: ["waiver", "child"],
  },
  "C-EXTRA": {
    what: "An extra item this particular cemetery insists on before it will record a transfer.",
    how: "We confirm the exact form with the cemetery office.",
  },
  REVIEW: {
    what: "Not a document — a point in the file that a person here needs to decide before anyone signs.",
    how: "Resolve it internally, then remove or mark it not needed.",
  },
  NOTE: {
    what: "A note for the file rather than a document to collect.",
    how: "No action needed from the seller.",
  },
};

/** Keywords that suggest an uploaded file satisfies a requirement. */
export function matchTerms(code: string, label: string): string[] {
  const guide = DOC_GUIDE[code];
  const fromLabel = label.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 4 && !["texas", "cemetery", "brokers", "every", "person", "signing"].includes(w));
  return [...new Set([...(guide?.match ?? []), ...fromLabel])];
}

/**
 * Where sellers post original paperwork. Bayer Cemetery Brokers is our partner:
 * they receive and store the originals securely on our behalf so transfers can
 * be processed the moment a cemetery asks for the paper copy.
 */
export const ORIGINALS_MAIL_ADDRESS =
  "Bayer Cemetery Brokers\n100 N Brand Blvd, Ste 213\nGlendale, CA 91203";

export const ORIGINALS_MAIL_REASON =
  "We work with Bayer Cemetery Brokers, our partner, who collect and store original documents securely for us so we can process the transfer quickly the moment the cemetery asks for the paper copy.";

/** Photo ID is the only item we are happy to take as a photograph. */
export const mailsByDefault = (code: string): boolean =>
  !["REVIEW", "NOTE", "D2", "D2P"].includes(code);
