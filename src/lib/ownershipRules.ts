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
  marital?: "married" | "divorced" | "widowed" | "single";
  /** Was the owner married at the time the plot was bought? Drives §711.039 waivers. */
  maritalAtPurchase?: "yes" | "no" | "unsure";
  occupied?: "no" | "yes";
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
  /** Named people gathered for the signing roster. */
  people?: RosterPerson[];
  /** Keys that were filled in by the AI reading and not yet confirmed by a human. */
  aiSuggested?: string[];
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
    key: "owner", eyebrow: "Ownership", question: "Who is named on the deed?",
    hint: "Go by the name printed on the cemetery's certificate of ownership.",
    answers: [
      { value: "living", label: "A living person (or people)", detail: "They're alive and selling" },
      { value: "deceased", label: "Someone who has died", detail: "The plot passes by inheritance" },
      { value: "trust", label: "A trust", detail: "Titled in a living or family trust" },
      { value: "org", label: "An organization", detail: "A church, lodge or company" },
    ],
  },
  rel: {
    key: "rel", eyebrow: "The seller", question: "What is the seller's relationship to that person?",
    hint: "This tells us whether they can sign themselves, or whether we need someone else.",
    answers: [
      { value: "self", label: "They are the owner" },
      { value: "spouse", label: "Husband or wife" },
      { value: "child", label: "Son or daughter" },
      { value: "grandchild", label: "Grandchild" },
      { value: "sibling", label: "Brother or sister" },
      { value: "nibling", label: "Niece or nephew" },
      { value: "inlaw", label: "Married to one of their relatives", detail: "For example, the wife of their son" },
      { value: "rep", label: "Executor, trustee or agent" },
      { value: "other", label: "Something else", detail: "Cousin, friend, or more distant" },
    ],
  },
  signer: {
    key: "signer", eyebrow: "Living owner", question: "Is the owner signing for themselves?",
    answers: [
      { value: "self", label: "Yes, they'll sign personally" },
      { value: "agent", label: "Someone signs for them", detail: "Under a power of attorney or as guardian" },
    ],
  },
  agentType: {
    key: "agentType", eyebrow: "Acting on behalf", question: "What gives that person authority?",
    answers: [
      { value: "poa", label: "A power of attorney" },
      { value: "guardian", label: "Court-appointed guardian", detail: "The owner is a ward or a minor" },
    ],
  },
  owners: {
    key: "owners", eyebrow: "Living owner", question: "How many people are named on the deed?",
    answers: [{ value: "sole", label: "Just one" }, { value: "multiple", label: "Two or more" }],
  },
  co: {
    key: "co", eyebrow: "Co-owners", question: "Are all co-owners alive and willing to sell?",
    hint: "A plot sold as one unit can't be split without the cemetery's consent, so everyone has to sign.",
    answers: [
      { value: "all", label: "Yes, all on board" },
      { value: "deceased", label: "One or more has died" },
      { value: "blocked", label: "One refuses or can't be found" },
    ],
  },
  marital: {
    key: "marital", eyebrow: "Spousal rights", question: "What is the owner's marital status?",
    hint: "A spouse holds a vested right of interment, so this affects whose signature we need.",
    answers: [
      { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" },
      { value: "widowed", label: "Widowed" }, { value: "single", label: "Never married" },
    ],
  },
  maritalAtPurchase: {
    key: "maritalAtPurchase", eyebrow: "Spousal rights", question: "Was the owner married when the plot was bought?",
    hint: "The right of interment vests at purchase, so a spouse from back then can still hold a claim even if the marriage has since ended.",
    answers: [
      { value: "no", label: "No, single at the time" },
      { value: "yes", label: "Yes, married then" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  occupied: {
    key: "occupied", eyebrow: "The plot", question: "Is anyone buried in the plot?",
    hint: "An occupied plot gives the surviving spouse and children reserved rights.",
    answers: [{ value: "no", label: "No, it's empty" }, { value: "yes", label: "Yes, partly or fully used" }],
  },
  will: {
    key: "will", eyebrow: "Establishing authority", question: "Did the owner leave a will?",
    answers: [
      { value: "yes", label: "Yes, there's a will" },
      { value: "no", label: "No will", detail: "Texas law decides who inherits" },
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
    key: "heirclass", eyebrow: "The family", question: "Who did the owner leave behind?",
    hint: "Texas law works down a ladder — the first group that exists inherits everything.",
    answers: [
      { value: "children", label: "Children or grandchildren", detail: "Even if some have since died" },
      { value: "parents", label: "No children, but a parent is living" },
      { value: "siblings", label: "No children or parents — brothers and sisters", detail: "Nieces and nephews step in for any who died" },
      { value: "unsure", label: "Not sure" },
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
    key: "spouse", eyebrow: "Surviving spouse", question: "Did the owner leave a surviving spouse?",
    answers: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  },
  chain: {
    key: "chain", eyebrow: "Chain of title", question: "Has anyone who would inherit also died since?",
    hint: "For example, the owner left it to a son who has since passed away.",
    answers: [{ value: "one", label: "No, one death only" }, { value: "multi", label: "Yes, more than one" }],
  },
  trustee: {
    key: "trustee", eyebrow: "Trust", question: "Who is acting as trustee now?",
    answers: [{ value: "original", label: "The original trustee" }, { value: "successor", label: "A successor trustee" }],
  },
  orgStatus: {
    key: "orgStatus", eyebrow: "Organization", question: "Is the organization still active?",
    answers: [{ value: "active", label: "Yes, active" }, { value: "inactive", label: "Dissolved or inactive" }],
  },
  deed: {
    key: "deed", eyebrow: "The deed", question: "Do they have the original certificate of ownership?",
    hint: "It's recorded with the cemetery, so a lost one can usually be rebuilt from their records.",
    answers: [{ value: "yes", label: "Yes, they have it" }, { value: "no", label: "No, it's lost" }],
  },
  names: {
    key: "names", eyebrow: "Names", question: "Do the names match across the deed, IDs and any court papers?",
    hint: "Marriage, divorce or a legal name change can create a mismatch.",
    answers: [{ value: "yes", label: "Yes, they match" }, { value: "no", label: "No, something differs" }],
  },
};

/** The ordered list of questions to ask, given what has been answered so far. */
export function questionPath(a: OwnershipAnswers): string[] {
  const p: string[] = ["owner", "rel"];
  if (a.owner === "living") {
    p.push("signer");
    if (a.signer === "agent") p.push("agentType");
    p.push("owners");
    if (a.owners === "multiple") p.push("co");
    p.push("marital");
    if (a.marital && a.marital !== "married") p.push("maritalAtPurchase");
  } else if (a.owner === "deceased") {
    p.push("occupied", "will");
    if (a.will === "yes") p.push("probate", "beneficiaries");
    if (a.will === "no") p.push("heirclass", "heirship");
    p.push("spouse");
    if (a.spouse === "no") p.push("marital", "maritalAtPurchase");
    p.push("chain");
  } else if (a.owner === "trust") p.push("trustee");
  else if (a.owner === "org") p.push("orgStatus");
  p.push("deed", "names");
  return p;
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
  issued: "Issued",
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
  /** The contract kind we can generate for this item, if any. */
  contractKind?: "listing_agreement" | "poa" | "affidavit_heirship" | "spousal_consent";
};

/**
 * Everyone whose signature or ID we need, derived from the answers plus the
 * named people the admin has entered.
 */
export function signingRoster(a: OwnershipAnswers): RosterPerson[] {
  const named = (a.people ?? []).filter((p) => p.name.trim());
  if (named.length) return named.filter((p) => p.role !== "decedent" && !p.deceased);
  // No names entered yet — describe the roles we know we'll need.
  const placeholder = (role: PersonRole, name: string): RosterPerson =>
    ({ id: `ph-${role}-${name}`, name, role });
  const out: RosterPerson[] = [];
  if (a.owner === "living") {
    out.push(placeholder("owner", "Owner on the deed"));
    if (a.owners === "multiple") out.push(placeholder("co_owner", "Each co-owner"));
    if (a.signer === "agent") out.push(placeholder("agent", "Person acting under authority"));
    if (a.marital === "married") out.push(placeholder("spouse", "Owner's spouse"));
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
  a: OwnershipAnswers,
  cem?: CemeteryDocRules | null,
): Requirement[] {
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
  } else if (a.deed) {
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
    if (a.marital === "married") {
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
  const namedRoster = (a.people ?? []).filter((p) => p.name.trim() && p.role !== "decedent" && !p.deceased);
  if (namedRoster.length === 0) {
    add({ code: "D2", label: "Photo ID for every person signing", why: "One clear government photo ID for each person who will sign." });
  }
  for (const p of namedRoster) {
    if (p.role === "witness") continue;
    add({
      code: "D21", label: `Limited power of attorney to Texas Cemetery Brokers — ${p.name}`,
      why: "Lets us sign the transfer paperwork at the cemetery on their behalf.",
      issuedByUs: true, needsNotary: true, contractKind: "poa",
      personName: p.name, personRole: p.role,
    });
    add({
      code: "D2P", label: `Photo ID — ${p.name}`,
      why: "The cemetery matches every signature to a government ID.",
      personName: p.name, personRole: p.role,
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
