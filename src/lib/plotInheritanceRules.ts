// ─────────────────────────────────────────────────────────────────────────────
// MASTER LOGIC — Plot inheritance → document request
//
// This is the single authority for turning a completed family tree (the
// "Family Confirmation v2" answers) into the exact list of documents we ask a
// seller for. It follows the written rules exactly:
//
//   Per case
//     • Current deed, or affidavit of lost deed (must match cemetery records)
//     • Wills are an EXCEPTION — handled by a human, never automatically
//     • Affidavit of heirship/kinship whenever the heirs-at-law rule is used
//     • Marriage certificate when a surviving spouse is not named on the deed
//     • Death certificate for any deceased person who would have signed if alive
//     • Name-change documents where a deed name no longer matches the ID
//
//   Owners
//     RULE 1  Anyone alive named on the deed
//     RULE 2  For anyone named on the deed who has died — their surviving legal
//             spouse at the time of death (even if later remarried) AND that
//             person's heirs at law
//
//   Per owner
//     • Photo ID for each signer
//     • Single POA to TCB when they are not currently married
//     • Joint POA to TCB when a married couple both sign
//     • Their existing durable POA when someone signs on their behalf
//
//   Heirs at law (non-spouse)
//     Surviving children, then children of a deceased child, then children of a
//     deceased grandchild. If no younger generation exists: surviving siblings,
//     then surviving parents.
//
//   Exceptions dealt with by hand
//     • Any will or written instruction to the cemetery
//     • Deed holders who were not spouses of each other (e.g. mother/daughter)
//
// Pure functions only.
// ─────────────────────────────────────────────────────────────────────────────

import type { CemeteryDocRules, PersonRole, Requirement } from "./ownershipRules";

type YesNo = string | undefined;

export type V2DeedPerson = { id: string; n: string; st?: string };
export type V2Kid = { id: string; n: string; st?: string; of?: string[]; kids?: { id: string; n: string }[] };
export type V2SpouseAnswer = { has?: string; n?: string; alive?: string };

export type V2State = {
  deed?: V2DeedPerson[];
  couple?: YesNo;
  poa?: Record<string, { has?: string; n?: string }>;
  spouse?: Record<string, V2SpouseAnswer>;
  will?: Record<string, string>;
  taker?: Record<string, string>;
  kids?: V2Kid[];
  /** Brothers and sisters, used when a deed holder left no descendants. */
  sibs?: V2Kid[];
  /** Surviving parents, used when there are no descendants and no siblings. */
  parents?: V2Kid[];
  noKids?: Record<string, boolean>;
  noSibs?: Record<string, boolean>;
  noParents?: Record<string, boolean>;
  /** What the deed holders were to each other when they were not a couple. */
  deedRel?: string;
  heirSpouse?: Record<string, V2SpouseAnswer>;
  contacts?: Record<string, { addr?: string; email?: string; phone?: string }>;
  submitted?: boolean;
};

/** A person the master rules say must sign. */
export type MasterSigner = {
  key: string;
  name: string;
  role: PersonRole;
  /** Plain-English reason, shown on the checklist row. */
  why: string;
  /** Their living husband or wife, when one signs alongside them. */
  spouseKey?: string;
  /** True when this person is a spouse who is not printed on the deed. */
  spouseNotOnDeed?: boolean;
  /** True when they are the surviving spouse of a deed holder who has died. */
  survivingSpouse?: boolean;
  /** Name of the attorney-in-fact signing in their place, if any. */
  agentName?: string;
};

const clean = (s: unknown) => String(s ?? "").trim();

const key = (n: string) => {
  const t = n.toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};

/** Splits a free-text list of names ("A, B and C") into individual names. */
const splitNames = (s: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of String(s ?? "").split(/,|;|\band\b|&|\n/i)) {
    const n = raw.replace(/\s+/g, " ").trim();
    if (n.length < 3 || !/[a-z]/i.test(n)) continue;
    const k = key(n);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
};


const isLivingSpouse = (s?: V2SpouseAnswer) =>
  !!s && s.has === "yes" && clean(s.n).length > 0 && s.alive !== "deceased";

const isDeadSpouse = (s?: V2SpouseAnswer) =>
  !!s && s.has === "yes" && clean(s.n).length > 0 && s.alive === "deceased";

/** True when the family tree has enough in it to drive the master rules. */
export function hasFamilyTree(v2: unknown): v2 is V2State {
  const s = v2 as V2State | undefined;
  if (!s || !Array.isArray(s.deed)) return false;
  const named = s.deed.filter((d) => clean(d?.n));
  return named.length > 0 && named.every((d) => d.st === "living" || d.st === "deceased");
}

type Ctx = {
  signers: Map<string, MasterSigner>;
  order: string[];
  reqs: Requirement[];
};

function addSigner(ctx: Ctx, p: MasterSigner): MasterSigner {
  const existing = ctx.signers.get(p.key);
  if (existing) {
    if (p.name.length > existing.name.length) existing.name = p.name;
    if (p.spouseKey && !existing.spouseKey) existing.spouseKey = p.spouseKey;
    if (p.agentName && !existing.agentName) existing.agentName = p.agentName;
    if (p.spouseNotOnDeed) existing.spouseNotOnDeed = true;
    if (p.survivingSpouse) existing.survivingSpouse = true;
    return existing;
  }
  ctx.signers.set(p.key, p);
  ctx.order.push(p.key);
  return p;
}

/**
 * The whole document request for a submission whose family tree is complete.
 * Cemetery overrides are layered on top where they change a document.
 */
export function masterRequirements(v2: V2State, cem?: CemeteryDocRules | null, deedMissing?: boolean): Requirement[] {
  const rules = cem ?? {};
  const ctx: Ctx = { signers: new Map(), order: [], reqs: [] };
  const add = (r: Requirement) => ctx.reqs.push(r);

  const named = (v2.deed ?? []).filter((d) => clean(d?.n));
  const deedKeys = new Set(named.map((d) => key(clean(d.n))));
  const living = named.filter((d) => d.st === "living");
  const gone = named.filter((d) => d.st === "deceased");
  const marriedToEachOther = named.length === 2 && v2.couple === "yes";
  const spouseOf = (id: string) => (v2.spouse ?? {})[id];
  const heirSpouseOf = (id: string) => (v2.heirSpouse ?? {})[id];

  // ── Per case: the deed itself ──────────────────────────────────────────────
  if (deedMissing) {
    add({
      code: "D1",
      label: rules.own_lost_deed_form
        ? `Affidavit of lost deed — ${rules.own_lost_deed_form_name ?? "cemetery's own form"}`
        : rules.in_person_lost_deed
          ? "Affidavit of lost deed (cemetery's own form, signed in person)"
          : "Affidavit of lost deed",
      why: "The cemetery's record of ownership has to be re-established before the transfer.",
      issuedByUs: !rules.in_person_lost_deed && !rules.own_lost_deed_form,
      needsNotary: true,
      fromCemetery: !!rules.in_person_lost_deed || !!rules.own_lost_deed_form,
      review: rules.in_person_lost_deed,
    });
  } else {
    add({
      code: "D1",
      label: "Certificate of ownership (plot deed)",
      why: "The current deed, matching the cemetery's own record. If it cannot be found we replace it with an affidavit of lost deed.",
      originalsOnly: rules.requires_originals,
      fromCemetery: rules.requires_originals,
    });
  }

  // ── Exception: deed holders who were not spouses of each other ─────────────
  const REL_LABEL: Record<string, string> = {
    siblings: "brother and sister",
    parent_child: "parent and child",
    other_family: "other family",
    unrelated: "not related",
  };
  const relLabel = REL_LABEL[clean(v2.deedRel)];
  if (named.length > 1 && !marriedToEachOther && gone.length > 0) {
    // Only matters once one of them has died: their share moves to their own
    // family, not to the other owner. While everyone is living they each
    // simply sign, so no manual decision is needed.
    add({
      code: "REVIEW",
      label: relLabel
        ? `Deed held by ${relLabel} — confirm how the deceased owner's share passes`
        : "More than one name on the deed — confirm the relationship between them",
      why: relLabel
        ? `The seller has told us the deed holders were ${relLabel}. Because one of them has died, a broker confirms whether the share passed to the surviving owner or to the deceased owner's own heirs before anything is sent.`
        : "Where the deed holders were not husband and wife (for example a mother and daughter), the ownership route is settled by hand before anything is sent.",
      review: true,
    });
  }

  // ── RULE 1 — anyone alive named on the deed ────────────────────────────────
  for (const d of living) {
    const name = clean(d.n);
    const owner = addSigner(ctx, {
      key: key(name), name, role: "owner",
      why: "Named on the deed and living — must sign.",
    });

    // Their current husband or wife.
    let spouseKey = "";
    if (marriedToEachOther) {
      const other = named.find((x) => x.id !== d.id);
      if (other && other.st === "living" && key(clean(other.n)) !== owner.key) spouseKey = key(clean(other.n));
    } else {
      const sp = spouseOf(d.id);
      if (isLivingSpouse(sp)) {
        const sName = clean(sp!.n);
        const s = addSigner(ctx, {
          key: key(sName), name: sName, role: "spouse",
          why: `Currently married to ${name} — signs alongside them.`,
          spouseKey: owner.key,
          spouseNotOnDeed: !deedKeys.has(key(sName)),
        });
        if (s.key !== owner.key) { spouseKey = s.key; s.spouseKey = owner.key; }
      }
    }
    if (spouseKey && spouseKey !== owner.key) owner.spouseKey = spouseKey;

    // Someone already holds a durable power of attorney for them.
    const poa = (v2.poa ?? {})[d.id];
    if (poa?.has === "yes") {
      const agent = clean(poa.n);
      owner.agentName = agent || undefined;
      add({
        code: "D15",
        label: agent ? `Existing durable power of attorney — ${agent} for ${name}` : `Existing durable power of attorney for ${name}`,
        why: "Signed on their behalf under an existing power of attorney. It has to cover property and allow the authority to be passed to us.",
        statute: "§751.031",
        personName: name,
        review: rules.accepts_outside_poa === false,
      });
      if (agent) {
        addSigner(ctx, {
          key: key(agent), name: agent, role: "agent",
          why: `Signs in ${name}'s name under their power of attorney.`,
        });
      }
    }
  }

  // ── RULE 2 — for each deceased person named on the deed ────────────────────
  let heirsAtLawUsed = false;
  for (const d of gone) {
    const name = clean(d.n);

    // Death certificate — they would have been a signer if living.
    add({
      code: "D6",
      label: `Death certificate — ${name}`,
      why: "Certified copy for a person named on the deed who has died. Not needed if they are buried at this same cemetery.",
      personName: name,
      originalsOnly: rules.requires_originals,
    });

    // Wills stay a manual exception, but where the seller has told us who the
    // will leaves the property to, those people are still listed as signers so
    // the broker only has to confirm the will agrees with them.
    if ((v2.will ?? {})[d.id] === "yes") {
      const taker = clean((v2.taker ?? {})[d.id]);
      const takers = splitNames(taker);
      add({
        code: "REVIEW",
        label: `Will of ${name} — reviewed by hand`,
        why: taker
          ? `A will is said to leave this property to ${taker}. Their photo ID and power of attorney are listed below, but a broker reads the will against them before anything is sent.`
          : "A will only changes the outcome when it deals with the cemetery property differently from the Texas heirs-at-law rules, so a broker settles this file personally.",
        personName: name,
        review: true,
      });
      add({ code: "D7", label: `The will of ${name}`, why: "So we can check whether it deals with the cemetery property.", personName: name });
      for (const t of takers) {
        addSigner(ctx, {
          key: key(t), name: t, role: "heir",
          why: `Named in the will of ${name} as taking this property — signs subject to a broker's check of the will.`,
        });
      }
      continue;
    }


    // Their surviving legal spouse at the time of death — even if remarried.
    const sp = spouseOf(d.id);
    if (isLivingSpouse(sp)) {
      const sName = clean(sp!.n);
      addSigner(ctx, {
        key: key(sName), name: sName, role: "spouse",
        why: `Surviving spouse of ${name} at the time of death — signs in their own right.`,
        spouseNotOnDeed: !deedKeys.has(key(sName)),
        survivingSpouse: true,
      });
    } else if (isDeadSpouse(sp)) {
      const sName = clean(sp!.n);
      add({
        code: "D6",
        label: `Death certificate — ${sName}`,
        why: `Spouse of ${name}, who would have signed if living. Not needed if they are buried at this same cemetery.`,
        personName: sName,
        originalsOnly: rules.requires_originals,
      });
    }

    // And their heirs at law.
    heirsAtLawUsed = true;
    const kids = (v2.kids ?? []).filter((k) => {
      const of = k.of ?? [];
      return of.length ? of.includes(d.id) : gone.length === 1;
    });
    const namedKids = kids.filter((k) => clean(k.n) || (k.kids ?? []).some((g) => clean(g.n)));

    if (!namedKids.length) {
      // No descendants: the right passes to surviving brothers and sisters
      // (their children stepping into a deceased sibling's share), and then to
      // surviving parents. The family tree now asks for both.
      const pick = (list: V2Kid[] | undefined) =>
        (list ?? []).filter((x) => {
          const of = x.of ?? [];
          return of.length ? of.includes(d.id) : gone.length === 1;
        });
      const sibs = pick(v2.sibs).filter((x) => clean(x.n) || (x.kids ?? []).some((g) => clean(g.n)));
      const folks = pick(v2.parents).filter((x) => clean(x.n) && x.st !== "deceased");

      if (sibs.length) {
        for (const x of sibs) {
          const xName = clean(x.n);
          if (x.st === "deceased") {
            if (xName) {
              add({
                code: "D6",
                label: `Death certificate — ${xName}`,
                why: `Brother or sister of ${name} who would have inherited if living. Not needed if they are buried at this same cemetery.`,
                personName: xName,
                originalsOnly: rules.requires_originals,
              });
            }
            for (const g of x.kids ?? []) {
              const gName = clean(g.n);
              if (!gName) continue;
              const heir = addSigner(ctx, {
                key: key(gName), name: gName, role: "heir",
                why: `Niece or nephew of ${name} — steps into ${xName || "their parent"}'s share.`,
              });
              linkHeirSpouse(ctx, heir, heirSpouseOf(g.id), deedKeys);
            }
            continue;
          }
          if (!xName) continue;
          const heir = addSigner(ctx, {
            key: key(xName), name: xName, role: "heir",
            why: `Brother or sister of ${name} — inherits under the Texas heirs-at-law rules, there being no descendants.`,
          });
          linkHeirSpouse(ctx, heir, heirSpouseOf(x.id), deedKeys);
        }
      } else if (folks.length) {
        for (const x of folks) {
          const xName = clean(x.n);
          const heir = addSigner(ctx, {
            key: key(xName), name: xName, role: "heir",
            why: `Surviving parent of ${name} — inherits under the Texas heirs-at-law rules, there being no descendants or siblings.`,
          });
          linkHeirSpouse(ctx, heir, heirSpouseOf(x.id), deedKeys);
        }
      } else {
        add({
          code: "REVIEW",
          label: `Heirs at law of ${name} — no younger generation recorded`,
          why: "With no children or grandchildren, the right passes to surviving siblings, and then to surviving parents. A broker confirms who they are before the request goes out.",
          personName: name,
          review: true,
        });
      }
    }

    for (const k of kids) {
      const kName = clean(k.n);
      if (k.st === "deceased") {
        if (kName) {
          add({
            code: "D6",
            label: `Death certificate — ${kName}`,
            why: `Child of ${name} who would have inherited if living. Not needed if they are buried at this same cemetery.`,
            personName: kName,
            originalsOnly: rules.requires_originals,
          });
        }
        for (const g of k.kids ?? []) {
          const gName = clean(g.n);
          if (!gName) continue;
          const heir = addSigner(ctx, {
            key: key(gName), name: gName, role: "heir",
            why: `Grandchild of ${name} — steps into ${kName || "their parent"}'s share.`,
          });
          linkHeirSpouse(ctx, heir, heirSpouseOf(g.id), deedKeys);
        }
        continue;
      }
      if (!kName) continue;
      const heir = addSigner(ctx, {
        key: key(kName), name: kName, role: "heir",
        why: `Child of ${name} — inherits a share under the Texas heirs-at-law rules.`,
      });
      linkHeirSpouse(ctx, heir, heirSpouseOf(k.id), deedKeys);
    }
  }

  // ── Affidavit of heirship whenever the heirs-at-law rule was used ──────────
  if (heirsAtLawUsed) {
    add({
      code: "D12",
      label: rules.own_heirship_form
        ? `Affidavit of heirship — ${rules.own_heirship_form_name ?? "cemetery's own form"}`
        : "Affidavit of Heirship / Kinship",
      why: "Establishes the heirs at law. Sworn by the affiant and a second disinterested witness.",
      statute: "Estates Code §203.001",
      issuedByUs: !rules.own_heirship_form,
      needsNotary: true,
      fromCemetery: rules.own_heirship_form,
      contractKind: rules.own_heirship_form ? undefined : "affidavit_heirship",
    });
  }

  // ── Marriage certificate for a surviving spouse not named on the deed ──────
  for (const k of ctx.order) {
    const p = ctx.signers.get(k)!;
    // Only a surviving spouse of a deceased deed holder has to prove the
    // marriage; the current husband or wife of a living owner does not.
    if (p.role === "spouse" && p.spouseNotOnDeed && p.survivingSpouse) {
      add({
        code: "D5",
        label: `Marriage certificate — ${p.name}`,
        why: "Proves the marriage where the spouse is not printed on the deed.",
        personName: p.name,
      });
    }
  }

  // ── Per owner: photo ID and a power of attorney to us ─────────────────────
  const pairedOff = new Set<string>();
  for (const k of ctx.order) {
    const p = ctx.signers.get(k)!;
    if (p.role === "agent") {
      // An attorney-in-fact signs in the owner's name — we need their ID, but
      // the POA to us is signed by them on the owner's behalf.
      add({
        code: "D2P", label: `Photo ID — ${p.name}`,
        why: "The cemetery matches every signature to a government photo ID.",
        personName: p.name, personRole: p.role,
      });
      continue;
    }
    add({
      code: "D2P", label: `Photo ID — ${p.name}`,
      why: "The cemetery matches every signature to a government photo ID.",
      personName: p.name, personRole: p.role,
    });

    if (pairedOff.has(p.key)) continue;
    const spouse = p.spouseKey ? ctx.signers.get(p.spouseKey) : undefined;
    if (spouse && spouse.key !== p.key && !pairedOff.has(spouse.key)) {
      pairedOff.add(p.key);
      pairedOff.add(spouse.key);
      add({
        code: "D21",
        label: `Joint limited power of attorney — ${p.name} & ${spouse.name}`,
        why: "A married couple sign one power of attorney to Texas Cemetery Brokers, each signature acknowledged separately before the notary.",
        statute: "§751.031",
        issuedByUs: true, needsNotary: true, contractKind: "poa",
        personName: p.name, personRole: p.role,
        jointNames: [p.name, spouse.name],
      });
      continue;
    }
    pairedOff.add(p.key);
    add({
      code: "D21",
      label: `Limited power of attorney to Texas Cemetery Brokers — ${p.name}`,
      why: p.agentName
        ? `Signed by ${p.agentName} on ${p.name}'s behalf under their existing power of attorney.`
        : "Lets us sign the transfer paperwork at the cemetery on their behalf.",
      statute: "§751.031",
      issuedByUs: true, needsNotary: true, contractKind: "poa",
      personName: p.name, personRole: p.role,
    });
  }

  // ── Cemetery extras ───────────────────────────────────────────────────────
  for (const extra of rules.extra_docs ?? []) {
    const when = extra.when ?? "always";
    const applies =
      when === "always" ||
      (when === "deceased_owner" && gone.length > 0) ||
      (when === "no_deed" && !!deedMissing);
    if (applies) add({ code: "C-EXTRA", label: extra.label, why: extra.why ?? "Required by this cemetery.", fromCemetery: true });
  }
  if (rules.child_waiver_required && gone.length > 0) {
    add({
      code: "C-CHILD", label: "Child waiver / consent of surviving children",
      why: "This cemetery requires the decedent's children to waive their reserved rights.",
      fromCemetery: true,
    });
  }

  // ── The listing agreement is always on the file ───────────────────────────
  add({
    code: "LA", label: "Exclusive Right-to-Sell Listing Agreement",
    why: "Signed electronically once the seller accepts the quote.",
    issuedByUs: true, contractKind: "listing_agreement",
  });

  return ctx.reqs;
}

function linkHeirSpouse(ctx: Ctx, heir: MasterSigner, sp: V2SpouseAnswer | undefined, deedKeys: Set<string>) {
  if (!isLivingSpouse(sp)) return;
  void deedKeys;
  const sName = clean(sp!.n);
  const s = addSigner(ctx, {
    key: key(sName), name: sName, role: "spouse",
    why: `Currently married to ${heir.name}, who inherits — signs alongside them.`,
    spouseKey: heir.key,
  });
  if (s.key === heir.key) return;
  s.spouseKey = heir.key;
  heir.spouseKey = s.key;
}

/** The signing roster the master rules produce, for the admin family view. */
export function masterRoster(v2: V2State): MasterSigner[] {
  const reqs = masterRequirements(v2, null, false);
  const seen = new Map<string, MasterSigner>();
  for (const r of reqs) {
    if (r.code !== "D2P" || !r.personName) continue;
    seen.set(r.personName, {
      key: key(r.personName), name: r.personName,
      role: (r.personRole ?? "owner") as PersonRole,
      why: r.why,
    });
  }
  return [...seen.values()];
}
