import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Seller ownership questionnaire — one question at a time.
 *
 * Drop-in replacement for OwnershipConfirm.tsx. Same route (/confirm?s=<id>),
 * same backend ("ownership-questions" get / save), same tree object (answers.v2,
 * shaped as V2State in plotInheritanceRules.ts). The rules files are untouched;
 * the small signer walk below only decides which questions to ask next.
 */

type Attachment = { name: string; url: string; mime: string | null };
type Packet = {
  seller_name: string | null;
  cemetery: string | null;
  lawn?: string | null;
  space_numbers?: string | null;
  plot_description?: string | null;
  deed_owner_names?: string | null;
  attachments?: Attachment[];
  answers?: Record<string, any>;
  deed_owners?: { name: string; deceased?: boolean }[];
};
type Tree = any; // V2State + kseq/note, kept loose so older saved trees load as-is.

const INK = "#1f2a37", SAGE = "#4a6b54", PAPER = "#f6f2eb", CARD = "#fffdf8", LINE = "#e2d9ca", MUTED = "#6b6458", GOLD = "#8a6d3b";
const KEYS = ["A", "B", "C", "D"];
const SERIF = "'Newsreader', Georgia, serif";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap');
.ocq { font-family: 'Hanken Grotesk', system-ui, sans-serif; color: ${INK}; -webkit-font-smoothing: antialiased; }
.ocq * { box-sizing: border-box; }
.ocq button { font-family: inherit; }
.ocq input::placeholder, .ocq textarea::placeholder { color: #b3a994; }
.ocq a { color: ${INK}; text-underline-offset: 3px; text-decoration-color: #c9b48a; }
.ocq-opt:hover { border-color: ${INK} !important; }
.ocq-opt:active { transform: scale(0.99); }
.ocq-ghost:hover { background: #efe9df; }
.ocq-line:focus { border-bottom-color: ${INK} !important; }
`;

const WHY: Record<string, string> = {
  deed: "The cemetery only transfers a plot when every person on the deed, or whoever now holds their share, has signed. Names must match their photo ID.",
  st: "Living owners sign for themselves. When an owner has died, their share passes to someone else, and we work out who.",
  couple: "When married owners are both on the deed, the surviving husband or wife takes the share of the one who died.",
  rel: "When the owners were not married to each other, the share of the one who died goes to their own family. A broker confirms the details.",
  sp: "A husband or wife who survived them has a right to the plot and signs in their own right, even if they later remarried.",
  will: "A will can change who inherits. If there is one, a broker reads it before anything is sent.",
  kids: "With no will, Texas law passes the plot to children first. If a child has died, that child’s own children take their place. Husbands, wives, in-laws and stepchildren never inherit.",
  sibs: "With no children or grandchildren, the plot passes to brothers and sisters, and to the children of any who have died.",
  par: "With no children, brothers or sisters, the plot passes to surviving parents.",
  m: "A living husband or wife also has a right to the plot, so they sign a short consent.",
  p: "Someone with a power of attorney signs in that person’s name. We’ll need a copy of the document.",
  c: "We send each person their own documents to sign. Nothing is shared with anyone else.",
};

// ── helpers ──────────────────────────────────────────────────────────────────
const clean = (s: unknown) => String(s ?? "").trim();
const nk = (n: string) => {
  const t = String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};
const first = (n: string) => clean(n).split(/\s+/)[0] || "";
const poss = (n: string) => (first(n) ? `${first(n)}’s` : "their");
const ini = (n: string) => {
  const p = clean(n).split(/\s+/).filter(Boolean);
  return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() : "";
};
const splitTakers = (s: string) => {
  const out: string[] = []; const seen = new Set<string>();
  for (const raw of String(s ?? "").split(/,|;|\band\b|&|\n/i)) {
    const n = raw.replace(/\s+/g, " ").trim();
    if (n.length < 3 || !/[a-z]/i.test(n)) continue;
    const k = nk(n); if (!k || seen.has(k)) continue;
    seen.add(k); out.push(n);
  }
  return out;
};
/** "John Smith & Mary Smith" / "John and Mary Smith" → separate names (same as the current page). */
const splitDeedNames = (raw?: string | null): string[] => {
  const source = String(raw ?? "").replace(/\s+/g, " ").trim();
  const shared = source.match(/^([A-Za-z.'-]+)\s+(?:and|&)\s+([A-Za-z.'-]+)\s+([A-Za-z.'-]+)$/i);
  const normalized = shared ? `${shared[1]} ${shared[3]}, ${shared[2]} ${shared[3]}` : source;
  return normalized.split(/\s*(?:,|;|\/|&|\band\b)\s*/i).map((s) => s.trim())
    .filter((s) => s.length > 1 && !/^(unknown|n\/?a|none)$/i.test(s));
};
const blankTree = (names: string[], dead: Set<string>): Tree => ({
  deed: names.map((n, i) => ({ id: `d${i + 1}`, n, ...(dead.has(nk(n)) ? { st: "deceased" } : {}) })),
  poa: {}, spouse: {}, will: {}, taker: {}, kids: [], sibs: [], parents: [],
  noKids: {}, noSibs: {}, noParents: {}, heirSpouse: {}, signerSpouse: {}, signerPoa: {}, contacts: {}, kseq: 100,
});
const withDefaults = (t: Tree): Tree => ({
  poa: {}, spouse: {}, will: {}, taker: {}, kids: [], sibs: [], parents: [], noKids: {}, noSibs: {}, noParents: {},
  heirSpouse: {}, signerSpouse: {}, signerPoa: {}, contacts: {}, kseq: 100, ...t,
});

// ── who signs (mirrors the order of plotInheritanceRules.ts, for routing only) ──
type Signer = {
  key: string; name: string; role: string; label: string; src: { kind: "deed" | "heir" | "other"; id?: string };
  askMarried: boolean; spouseKey?: string; agentName?: string; agentFor?: string; mRef: [string, string]; pRef: [string, string];
};
function signersOf(t: Tree): Signer[] {
  const S = new Map<string, any>(); const order: string[] = [];
  const add = (p: any) => {
    if (!p.key) return null;
    const e = S.get(p.key);
    if (e) { if (p.name.length > e.name.length) e.name = p.name; for (const k in p) if (e[k] == null) e[k] = p[k]; return e; }
    S.set(p.key, p); order.push(p.key); return p;
  };
  const named = (t.deed ?? []).filter((d: any) => clean(d.n));
  const living = named.filter((d: any) => d.st === "living");
  const gone = named.filter((d: any) => d.st === "deceased");
  const couple2 = named.length === 2 && t.couple === "yes";

  for (const d of living) {
    const o = add({ key: nk(d.n), name: clean(d.n), role: "On the deed", src: { kind: "deed", id: d.id }, askMarried: true });
    if (couple2) {
      const other = named.find((x: any) => x.id !== d.id);
      o.askMarried = false;
      if (other.st === "living") o.spouseKey = nk(other.n); else o.role = `On the deed · takes ${poss(other.n)} share`;
    }
  }
  const heir = (x: any, why: string) => add({ key: nk(x.n), name: clean(x.n), role: why, src: { kind: "heir", id: x.id }, askMarried: true });
  for (const d of gone) {
    const other = named.find((x: any) => x.id !== d.id);
    if (couple2 && other && other.st === "living") continue;
    const F = first(d.n);
    if (t.will?.[d.id] === "yes") {
      for (const n of splitTakers(t.taker?.[d.id])) add({ key: nk(n), name: n, role: `Named in ${poss(d.n)} will`, src: { kind: "other" }, askMarried: true });
      continue;
    }
    if (!t.will?.[d.id]) continue;
    const sp = t.spouse?.[d.id];
    if (!couple2 && sp?.has === "yes" && clean(sp.n) && sp.alive !== "deceased")
      add({ key: nk(sp.n), name: clean(sp.n), role: `Surviving spouse of ${F}`, src: { kind: "other" }, askMarried: true });
    const of = (x: any) => (x.of || []).includes(d.id);
    const branch = (list: any[], rel: string, grel: string) => {
      for (const k of list) {
        if (k.st === "deceased") { for (const g of k.kids || []) if (clean(g.n)) heir(g, `${grel} of ${F}`); }
        else heir(k, `${rel} of ${F}`);
      }
    };
    const kids = (t.kids ?? []).filter(of).filter((k: any) => clean(k.n));
    if (kids.length) branch(kids, "Child", "Grandchild");
    else if (t.noKids?.[d.id]) {
      const sibs = (t.sibs ?? []).filter(of).filter((k: any) => clean(k.n));
      if (sibs.length) branch(sibs, "Brother or sister", "Niece or nephew");
      else if (t.noSibs?.[d.id]) for (const k of (t.parents ?? []).filter(of)) if (clean(k.n) && k.st !== "deceased") heir(k, `Parent of ${F}`);
    }
  }
  for (let pass = 0; pass < 4; pass++) {
    const before = order.length;
    for (const k of [...order]) {
      const s = S.get(k);
      if (s.agentFor) continue;
      s.mRef = s.src.kind === "deed" ? ["spouse", s.src.id] : s.src.kind === "heir" ? ["heirSpouse", s.src.id] : ["signerSpouse", s.key];
      s.pRef = s.src.kind === "deed" ? ["poa", s.src.id] : ["signerPoa", s.key];
      const m = (t[s.mRef[0]] || {})[s.mRef[1]];
      if (s.askMarried && !s.spouseKey && m?.has === "yes" && clean(m.n)) {
        const sp = add({ key: nk(m.n), name: clean(m.n), role: `Spouse of ${first(s.name)} · signs a consent`, src: { kind: "other" }, askMarried: false });
        if (sp && sp.key !== s.key) { sp.spouseKey = s.key; s.spouseKey = sp.key; }
      }
      const p = (t[s.pRef[0]] || {})[s.pRef[1]];
      if (p?.has === "yes" && clean(p.n) && !s.agentName) {
        s.agentName = clean(p.n);
        add({ key: nk(p.n), name: clean(p.n), role: `Signs for ${first(s.name)} · power of attorney`, agentFor: s.name, src: { kind: "other" }, askMarried: false });
      }
    }
    if (order.length === before) break;
  }
  return order.map((k) => S.get(k)).map((s) => ({ ...s, label: s.agentName ? `${s.role} · ${first(s.agentName)} signs for them` : s.role }));
}

// ── question model ───────────────────────────────────────────────────────────
type Opt = { value: string; label: string };
type Q = {
  id: string; kind: "intro" | "choice" | "text" | "names" | "contact" | "review";
  stage?: string; chapter?: string; title: string; sub?: string; why?: string; answered: boolean;
  isDeed?: boolean; nextLabel?: string;
  // choice
  value?: string; opts?: Opt[]; set?: (v: string) => void;
  // text
  ph?: string; put?: (v: string) => void;
  // names
  items?: { id: string; n: string }[]; rename?: (id: string, v: string) => void; remove?: (id: string) => void;
  add?: () => void; create?: (v: string) => void; none?: boolean; noneLabel?: string; pickNone?: () => void;
  // contact
  key?: string; contact?: { addr?: string; email?: string; phone?: string };
  // review
  signers?: Signer[]; contactIdx?: Record<string, number>;
};

function buildQuestions(t: Tree, U: (f: (t: Tree) => void) => void, preset: Set<string>): Q[] {
  const Q: Q[] = [];
  const byId = (a: any[], id: string) => a.find((x) => x.id === id);
  const listOps = (field: string) => ({
    rename: (id: string, v: string) => U((t) => { byId(t[field], id).n = v; }),
    remove: (id: string) => U((t) => { t[field] = t[field].filter((x: any) => x.id !== id); }),
  });
  const namesAnswered = (items: any[], none?: boolean) => !!none || (items.length > 0 && items.every((x) => clean(x.n)));

  Q.push({ id: "intro", kind: "intro", chapter: "Ownership confirmation", title: "Let’s confirm who can sell the plot.",
    sub: "A few short questions, one at a time. Most families finish in about three minutes, and your answers save as you go.", answered: true, nextLabel: "Begin" });

  Q.push({ id: "deed", kind: "names", isDeed: true, stage: "The deed", why: WHY.deed,
    title: "Please confirm these are the names on the most current deed and spelled correctly.",
    sub: "Check them against your copy of the deed. Fix any spelling, or add a name we missed.",
    ph: "Full name as printed", items: t.deed, ...listOps("deed"), answered: namesAnswered(t.deed),
    add: () => U((t) => { t.deed.push({ id: "d" + t.kseq++, n: "" }); }),
    create: (v) => U((t) => { t.deed.push({ id: "d" + t.kseq++, n: v }); }) });
  const named = t.deed.filter((d: any) => clean(d.n));
  if (!named.length || !Q[1].answered) return Q;

  for (const d of named) {
    if (preset.has(d.id)) continue;
    Q.push({ id: "st:" + d.id, kind: "choice", stage: "The deed", why: WHY.st, title: `Is ${clean(d.n)} still living?`, value: d.st, answered: !!d.st,
      opts: [{ value: "living", label: "Yes, living" }, { value: "deceased", label: "No, has died" }],
      set: (v) => U((t) => { byId(t.deed, d.id).st = v; }) });
  }
  if (!named.every((d: any) => d.st)) return Q;
  const gone = named.filter((d: any) => d.st === "deceased");
  const couple2 = named.length === 2 && t.couple === "yes";

  if (named.length === 2) {
    Q.push({ id: "couple", kind: "choice", stage: "The deed", why: WHY.couple, title: `Were ${first(named[0].n)} and ${first(named[1].n)} married to each other?`,
      value: t.couple, answered: !!t.couple, opts: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
      set: (v) => U((t) => { t.couple = v; if (v === "yes") delete t.deedRel; }) });
    if (!t.couple) return Q;
  }
  if (gone.length && (named.length > 2 || t.couple === "no")) {
    Q.push({ id: "rel", kind: "choice", stage: "The deed", why: WHY.rel, title: "How were they related?", value: t.deedRel, answered: !!t.deedRel,
      opts: [{ value: "siblings", label: "Brother and sister" }, { value: "parent_child", label: "Parent and child" }, { value: "other_family", label: "Other family" }, { value: "unrelated", label: "Not related" }],
      set: (v) => U((t) => { t.deedRel = v; }) });
    if (!t.deedRel) return Q;
  }

  const kinList = (field: string, noneField: string, ids: string[], o: Partial<Q> & { living?: boolean }): Q => {
    const items = t[field].filter((x: any) => (x.of || []).some((v: string) => ids.includes(v)));
    const none = !!t[noneField][ids[0]];
    const mk = (n: string) => ({ id: field[0] + "", n, of: ids.slice(), kids: [], ...(o.living ? { st: "living" } : {}) });
    return { ...(o as Q), kind: "names", items, ...listOps(field), none, answered: namesAnswered(items, none),
      pickNone: () => U((t) => { const on = !t[noneField][ids[0]]; ids.forEach((i) => { t[noneField][i] = on; }); if (on) t[field] = t[field].filter((x: any) => !(x.of || []).some((v: string) => ids.includes(v)) || clean(x.n)); }),
      add: () => U((t) => { ids.forEach((i) => { t[noneField][i] = false; }); t[field].push({ ...mk(""), id: field[0] + t.kseq++ }); }),
      create: (v) => U((t) => { ids.forEach((i) => { t[noneField][i] = false; }); t[field].push({ ...mk(v), id: field[0] + t.kseq++ }); }) };
  };
  const branch = (field: string, ids: string[]) => {
    for (const k of t[field].filter((x: any) => (x.of || []).some((v: string) => ids.includes(v)) && clean(x.n))) {
      Q.push({ id: `st:${k.id}`, kind: "choice", stage: "The family", title: `Is ${clean(k.n)} living?`, value: k.st, answered: !!k.st,
        opts: [{ value: "living", label: "Yes, living" }, { value: "deceased", label: "No, has died" }], set: (v) => U((t) => { byId(t[field], k.id).st = v; }) });
      if (!k.st) return false;
      if (k.st === "deceased") {
        const q: Q = { id: `gk:${k.id}`, kind: "names", stage: "The family", why: WHY.kids, title: `Who are ${poss(k.n)} children?`,
          sub: `They take ${poss(k.n)} place. Leave off husbands and wives.`, ph: "Full name", items: k.kids || [], none: !!k.none,
          noneLabel: `${first(k.n)} had no children`, answered: namesAnswered(k.kids || [], k.none),
          rename: (id, v) => U((t) => { byId(byId(t[field], k.id).kids, id).n = v; }),
          remove: (id) => U((t) => { const x = byId(t[field], k.id); x.kids = x.kids.filter((y: any) => y.id !== id); }),
          add: () => U((t) => { const x = byId(t[field], k.id); x.none = false; (x.kids ||= []).push({ id: "g" + t.kseq++, n: "" }); }),
          create: (v) => U((t) => { const x = byId(t[field], k.id); x.none = false; (x.kids ||= []).push({ id: "g" + t.kseq++, n: v }); }),
          pickNone: () => U((t) => { const x = byId(t[field], k.id); x.none = !x.none; if (x.none) x.kids = (x.kids || []).filter((y: any) => clean(y.n)); }) };
        Q.push(q); if (!q.answered) return false;
      }
    }
    return true;
  };

  for (let gi = 0; gi < gone.length; gi++) {
    const d = gone[gi]; const F = first(d.n); const ch = clean(d.n);
    const other = named.find((x: any) => x.id !== d.id);
    if (couple2 && other && other.st === "living") continue; // surviving spouse takes the share
    if (!couple2) {
      const sp = t.spouse[d.id] || {};
      const v = sp.has === "no" ? "no" : sp.has === "yes" ? (sp.alive === "deceased" ? "dead" : "living") : "";
      Q.push({ id: "sp:" + d.id, kind: "choice", stage: "Those who have died", chapter: ch, why: WHY.sp, title: `When ${F} died, were they married?`, value: v, answered: !!v,
        opts: [{ value: "living", label: "Yes, and their spouse is living" }, { value: "dead", label: "Yes, but their spouse has since died" }, { value: "no", label: "No" }],
        set: (x) => U((t) => { t.spouse[d.id] = x === "no" ? { has: "no" } : { ...(t.spouse[d.id] || {}), has: "yes", alive: x === "dead" ? "deceased" : "living" }; }) });
      if (!v) return Q;
      if (sp.has === "yes") {
        const q: Q = { id: "spn:" + d.id, kind: "text", stage: "Those who have died", chapter: ch, title: `What was the name of ${poss(d.n)} husband or wife?`, ph: "Full name",
          value: sp.n || "", answered: !!clean(sp.n), put: (val) => U((t) => { t.spouse[d.id].n = val; }) };
        Q.push(q); if (!q.answered) return Q;
      }
    }
    const w = t.will[d.id];
    Q.push({ id: "will:" + d.id, kind: "choice", stage: "Those who have died", chapter: ch, why: WHY.will, title: `Did ${F} leave a will?`, value: w, answered: !!w,
      opts: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "I’m not sure" }], set: (v) => U((t) => { t.will[d.id] = v; }) });
    if (!w) return Q;
    if (w === "yes") {
      const q: Q = { id: "tk:" + d.id, kind: "text", stage: "Those who have died", chapter: ch, title: "Who does the will leave the plot to?",
        sub: "Separate names with commas. A broker reads the will before anything is sent.", ph: "Full names",
        value: t.taker[d.id] || "", answered: !!clean(t.taker[d.id]), put: (val) => U((t) => { t.taker[d.id] = val; }) };
      Q.push(q); if (!q.answered) return Q;
      continue;
    }
    if (couple2 && gi > 0) continue; // both died: one shared list of children
    const ids = couple2 ? gone.map((x: any) => x.id) : [d.id];
    const who = couple2 ? `${first(gone[0].n)} and ${first(gone[1].n)}` : F;
    const whoP = couple2 ? `${who}’s` : poss(d.n);
    const kq = kinList("kids", "noKids", ids, { id: "kids:" + d.id, stage: "The family", why: WHY.kids, title: `Who are ${whoP} children?`,
      sub: "Every child, living or not. Leave off husbands, wives, stepchildren and in-laws.", ph: "Full name", noneLabel: `${who} had no children` });
    Q.push(kq); if (!kq.answered) return Q;
    if (!t.noKids[ids[0]]) { if (!branch("kids", ids)) return Q; continue; }
    const sq = kinList("sibs", "noSibs", ids, { id: "sibs:" + d.id, stage: "The family", why: WHY.sibs, title: `Did ${who} have brothers or sisters?`,
      sub: "Include any who have died.", ph: "Full name", noneLabel: "No brothers or sisters" });
    Q.push(sq); if (!sq.answered) return Q;
    if (!t.noSibs[ids[0]]) { if (!branch("sibs", ids)) return Q; continue; }
    const pq = kinList("parents", "noParents", ids, { id: "par:" + d.id, stage: "The family", why: WHY.par, title: `Are either of ${whoP} parents living?`,
      ph: "Full name", noneLabel: "Neither is living", living: true });
    Q.push(pq); if (!pq.answered) return Q;
  }

  const setRef = (ref: [string, string], patch: any) => U((t) => { t[ref[0]] = t[ref[0]] || {}; t[ref[0]][ref[1]] = { ...(t[ref[0]][ref[1]] || {}), ...patch }; });
  for (const s of signersOf(t)) {
    if (s.agentFor) continue;
    const F = first(s.name);
    if (s.askMarried) {
      const m = (t[s.mRef[0]] || {})[s.mRef[1]] || {};
      Q.push({ id: "m:" + s.key, kind: "choice", stage: "Signing", chapter: s.name, why: WHY.m, title: `Is ${s.name} married?`, sub: "If so, their husband or wife signs a short consent too.",
        value: m.has, answered: !!m.has, opts: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
        set: (v) => setRef(s.mRef, v === "yes" ? { has: "yes", alive: "living" } : { has: "no", n: "" }) });
      if (!m.has) return Q;
      if (m.has === "yes") {
        const q: Q = { id: "mn:" + s.key, kind: "text", stage: "Signing", chapter: s.name, title: `What is the name of ${poss(s.name)} husband or wife?`, ph: "Full name",
          value: m.n || "", answered: !!clean(m.n), put: (v) => setRef(s.mRef, { n: v }) };
        Q.push(q); if (!q.answered) return Q;
      }
    }
    const p = (t[s.pRef[0]] || {})[s.pRef[1]] || {};
    Q.push({ id: "p:" + s.key, kind: "choice", stage: "Signing", chapter: s.name, why: WHY.p, title: `Does anyone hold a power of attorney for ${F}?`, sub: "If so, that person signs on their behalf.",
      value: p.has, answered: !!p.has, opts: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
      set: (v) => setRef(s.pRef, v === "yes" ? { has: "yes" } : { has: "no", n: "" }) });
    if (!p.has) return Q;
    if (p.has === "yes") {
      const q: Q = { id: "pn:" + s.key, kind: "text", stage: "Signing", chapter: s.name, title: `Who holds ${poss(s.name)} power of attorney?`, ph: "Full name",
        value: p.n || "", answered: !!clean(p.n), put: (v) => setRef(s.pRef, { n: v }) };
      Q.push(q); if (!q.answered) return Q;
    }
  }

  const final = signersOf(t);
  const contactIdx: Record<string, number> = {};
  for (const s of final.filter((x) => !x.agentName)) {
    const c = t.contacts[s.key] || {};
    const ok = !!(clean(c.addr) && (clean(c.email) || clean(c.phone)));
    contactIdx[s.key] = Q.length;
    Q.push({ id: "c:" + s.key, kind: "contact", stage: "Contact details", chapter: s.name, why: WHY.c, key: s.key, contact: c,
      title: `Where should we send ${poss(s.name)} documents?`, sub: "An email or a phone number is enough alongside the address.", answered: ok });
    if (!ok) return Q;
  }

  Q.push({ id: "review", kind: "review", stage: "Review", chapter: "Review", answered: true, nextLabel: "Send to our team",
    title: final.length === 1 ? "One person signs." : `${final.length} people sign.`,
    sub: "We’ll prepare the paperwork for each of them. A broker checks everything before it goes out.", signers: final, contactIdx });
  return Q;
}

// ── shared bits of UI ────────────────────────────────────────────────────────
const lineInput = (big = false): React.CSSProperties => ({
  width: "100%", padding: big ? "10px 0 14px" : "8px 0 12px", fontSize: big ? "clamp(22px,3vw,28px)" : 21, fontFamily: SERIF,
  border: 0, borderBottom: "1.5px solid #cfc5b4", background: "transparent", color: INK, outline: "none", transition: "border-color .2s",
});
const caps: React.CSSProperties = { fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: GOLD };

const DeedCopy = ({ file }: { file?: Attachment }) => {
  const [broken, setBroken] = useState(false);
  if (!file) return null;
  const isPdf = (file.mime ?? "").includes("pdf") || /\.pdf$/i.test(file.name);
  return (
    <aside className="ocq-deed" style={{ flex: "1 1 300px", minWidth: 0, maxWidth: 460, position: "sticky", top: 150, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={caps}>Your copy of the deed</span>
        <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5 }}>Open full size</a>
      </div>
      <div className="ocq-deedbox" style={{ position: "relative", width: "100%", aspectRatio: "8.5 / 11", borderRadius: 16, overflow: "hidden", background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 24px 50px -32px rgba(31,42,55,0.45)" }}>
        {isPdf ? (
          <iframe src={`${file.url}#toolbar=0&view=FitH`} title={file.name} style={{ width: "100%", height: "100%", border: 0 }} />
        ) : broken ? (
          <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: MUTED, fontSize: 14 }}>
            This file can’t be shown here. <a href={file.url} target="_blank" rel="noreferrer">Open it</a>
          </div>
        ) : (
          <img src={file.url} alt={file.name} onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>{file.name}</span>
    </aside>
  );
};

// ── page ─────────────────────────────────────────────────────────────────────
const OwnershipConfirmV3 = () => {
  const [params] = useSearchParams();
  const submissionId = params.get("s") ?? "";
  const [packet, setPacket] = useState<Packet | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [error, setError] = useState("");
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  const [save, setSave] = useState<"idle" | "saving" | "saved">("idle");
  const [whyOpen, setWhyOpen] = useState(false);
  const preset = useRef<Set<string>>(new Set());
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const dirSign = useRef(1);
  const shownId = useRef<string>("");

  // Load — identical call to the current page.
  useEffect(() => {
    if (!submissionId) { setError("This link is missing its reference."); return; }
    (async () => {
      const { data, error: err } = await supabase.functions.invoke("ownership-questions", { body: { action: "get", submission_id: submissionId } });
      if (err || (data as any)?.error) { setError((data as any)?.error ?? "We could not open this link."); return; }
      const p = data as Packet;
      setPacket(p);
      // The office already marked who has died when typing the deed, so we never ask again.
      const dead = new Set((p.deed_owners ?? []).filter((o) => o.deceased).map((o) => nk(o.name)));
      const saved = p.answers?.v2;
      const t = saved && Array.isArray(saved.deed) && saved.deed.length ? withDefaults(saved) : blankTree(splitDeedNames(p.deed_owner_names), dead);
      preset.current = new Set(t.deed.filter((d: any) => dead.has(nk(d.n))).map((d: any) => d.id));
      setTree(t);
      if (saved?.submitted) setDone(true);
    })();
  }, [submissionId]);

  // Autosave — identical payload to the current page.
  const firstSave = useRef(true);
  useEffect(() => {
    if (!tree || !submissionId) return;
    if (firstSave.current) { firstSave.current = false; return; }
    setSave("saving");
    const h = setTimeout(async () => {
      await supabase.functions.invoke("ownership-questions", { body: { action: "save", submission_id: submissionId, answers: { v2: tree } } });
      setSave("saved");
    }, 1200);
    return () => clearTimeout(h);
  }, [tree, submissionId]);

  const U = useCallback((fn: (t: Tree) => void) => {
    setTree((s: Tree) => { const t = JSON.parse(JSON.stringify(s)); fn(t); return t; });
  }, []);

  const Qs = useMemo(() => (tree ? buildQuestions(tree, U, preset.current) : []), [tree, U]);
  const firstOpen = Qs.findIndex((x) => !x.answered);
  let cur = Math.min(pos, Math.max(0, Qs.length - 1));
  if (firstOpen >= 0 && cur > firstOpen) cur = firstOpen;
  const q = Qs[cur];

  const go = useCallback((to: number, sign: number) => {
    const el = stage.current; dirSign.current = sign;
    const apply = () => { busy.current = false; setPos(to); setDone(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
    if (!el || !el.animate) return apply();
    busy.current = true;
    const a = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${-sign * 14}px)` }], { duration: 170, easing: "ease-in", fill: "forwards" });
    a.onfinish = () => { apply(); requestAnimationFrame(() => a.cancel()); };
  }, []);

  // Enter-in transition + autofocus whenever the question changes.
  const qid = done ? "done" : q?.id;
  useEffect(() => {
    if (!qid || qid === shownId.current) return;
    const el = stage.current;
    if (el && shownId.current && el.animate) {
      el.animate([{ opacity: 0, transform: `translateY(${dirSign.current * 22}px)`, filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" });
      const f = el.querySelector<HTMLInputElement>("[data-autofocus='1']");
      if (f) setTimeout(() => f.focus({ preventScroll: true }), 80);
    }
    shownId.current = qid;
    setWhyOpen(false);
  }, [qid]);

  const submit = useCallback(() => {
    if (!tree || !q?.signers) return;
    const people = q.signers.map((s, i) => {
      const c = tree.contacts[s.key] || {};
      return { id: `v2-${i}`, name: s.name, role: s.agentFor ? "agent" : /spouse/i.test(s.role) ? "spouse" : /^On the deed/.test(s.role) ? "owner" : "heir",
        relationship: s.label, deceased: false, address: c.addr || "", email: c.email || "", phone: c.phone || "" };
    });
    // Finished save — identical to the current page's saveFinished(true).
    supabase.functions.invoke("ownership-questions", { body: { action: "save", submission_id: submissionId, finished: true,
      answers: { v2: { ...tree, submitted: true, signerCheck: true, sent: true }, people, sellerNotes: tree.note } } });
    firstSave.current = true; // don't immediately autosave over the finished payload
    U((t) => { t.submitted = true; t.signerCheck = true; t.sent = true; });
    dirSign.current = 1; setDone(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tree, q, submissionId, U]);

  const next = useCallback(() => {
    if (!q || !q.answered || busy.current) return;
    if (q.kind === "review") return submit();
    go(cur + 1, 1);
  }, [q, cur, go, submit]);

  const pick = (v: string) => {
    if (!q?.set || busy.current) return;
    q.set(v);
    const at = cur;
    setTimeout(() => go(at + 1, 1), 280);
  };

  // Keyboard: Enter continues, A–D pick an answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || busy.current || done) return;
      const tag = ((e.target as HTMLElement).tagName || "").toLowerCase();
      if (e.key === "Enter" && tag !== "textarea" && q.answered) { e.preventDefault(); next(); }
      else if (q.kind === "choice" && tag !== "input" && tag !== "textarea" && !e.metaKey && !e.ctrlKey) {
        const i = KEYS.indexOf(e.key.toUpperCase());
        if (i >= 0 && q.opts?.[i]) pick(q.opts[i].value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (error) return <div className="ocq" style={{ minHeight: "100vh", background: PAPER, display: "grid", placeItems: "center", padding: 24, color: MUTED }}><style>{FONTS}</style>{error}</div>;
  if (!tree || !q) return <div className="ocq" style={{ minHeight: "100vh", background: PAPER, display: "grid", placeItems: "center", color: MUTED }}><style>{FONTS}</style>Opening your questions…</div>;

  const cemetery = packet?.cemetery ?? "Your cemetery";
  const location = packet?.plot_description?.trim() || [packet?.lawn, packet?.space_numbers ? `Spaces ${packet.space_numbers}` : ""].filter(Boolean).join(", ") || "The spaces on your deed";
  const files = packet?.attachments ?? [];
  const deedFile = files.find((f) => /deed|certificate|ownership/i.test(f.name)) ?? files[0];
  const showDeed = !done && !!deedFile && (deedOpen ?? !!q.isDeed);
  const inStage = q.stage ? Qs.filter((x) => x.stage === q.stage) : [];
  const counter = !done && inStage.length > 1 ? `${inStage.indexOf(q) + 1} of ${inStage.length}` : "";
  const pct = done ? 100 : Math.round((cur / Math.max(Qs.length, cur + 5)) * 100);
  const signers = signersOf(tree);
  const canBack = !done && cur > 0;

  const title = done ? "Thank you. That’s everything we need." : q.title;
  const sub = done ? `We have the family tree for ${cemetery}. Here is what happens next.` : q.sub;
  const chapter = done ? "Sent" : q.chapter || q.stage || "";

  return (
    <div className="ocq" style={{ minHeight: "100vh", background: PAPER, display: "flex", flexDirection: "column" }}>
      <style>{FONTS}</style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#ebe4d8", zIndex: 30 }}>
        <div style={{ height: "100%", background: SAGE, width: `${pct}%`, transition: "width .7s cubic-bezier(.2,.7,.2,1)" }} />
      </div>

      <Navbar forceScrolled />
      <style>{`@media (max-width: 820px){ .ocq-deed{ order:-1; position:static !important; max-width:none !important; } .ocq-deed .ocq-deedbox{ aspect-ratio:auto !important; max-height:46vh; } }`}</style>
      <div style={{ height: 72 }} />
      <header style={{ borderBottom: "1px solid #e7e0d4", background: "rgba(246,242,235,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "sticky", top: 72, zIndex: 20 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "10px clamp(14px,4vw,32px)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => canBack && go(cur - 1, -1)} aria-label="Back" disabled={!canBack} className="ocq-ghost"
            style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 14px 0 10px", borderRadius: 999, border: "1px solid #ddd4c5", background: CARD, color: INK, fontSize: 14.5, fontWeight: 500, cursor: canBack ? "pointer" : "default", opacity: canBack ? 1 : 0.4 }}>← Back</button>
          <span style={{ fontSize: 14, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{cemetery}</span>
          <span style={{ flex: 1 }} />
          {save !== "idle" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: MUTED, whiteSpace: "nowrap" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: save === "saving" ? "#b8873a" : SAGE }} />
              {save === "saving" ? "Saving…" : "Saved"}
            </span>
          )}
          {deedFile && !done && (
            <button onClick={() => setDeedOpen((o) => !o)} className="ocq-ghost"
              style={{ flex: "none", height: 40, padding: "0 14px", borderRadius: 999, border: `1px solid ${GOLD}`, background: showDeed ? INK : CARD, color: showDeed ? "#fff" : INK, fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
              {showDeed ? "Hide deed" : "View deed"}
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, width: "100%", maxWidth: showDeed ? 1160 : 700, margin: "0 auto", padding: "clamp(28px,6vh,72px) clamp(18px,4vw,32px) 48px", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <main style={{ flex: "1 1 380px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div ref={stage} style={{ display: "flex", flexDirection: "column", gap: 30, maxWidth: 640 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...caps, display: "flex", alignItems: "center", gap: 10 }}>
                <span>{chapter}</span>
                {counter && (<><span style={{ width: 3, height: 3, borderRadius: "50%", background: "#c9bea9" }} /><span style={{ color: "#8a8170", letterSpacing: "0.1em" }}>{counter}</span></>)}
              </div>
              <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(32px,4.6vw,48px)", lineHeight: 1.08, letterSpacing: "-0.018em", textWrap: "balance" as any }}>{title}</h1>
              {sub && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: "#5e584d", maxWidth: "32em", textWrap: "pretty" as any }}>{sub}</p>}
            </div>

            {!done && q.kind === "intro" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div style={{ borderRadius: 20, background: CARD, border: "1px solid #e7e0d4", overflow: "hidden" }}>
                  <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ ...caps, fontSize: 11.5 }}>Your property</span>
                    <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.2 }}>{cemetery}</span>
                    <span style={{ fontSize: 15.5, color: "#5e584d" }}>{location}</span>
                  </div>
                  <div style={{ padding: "14px 22px", borderTop: "1px solid #efe8dc", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 10px" }}>
                    <span style={{ fontSize: 13.5, color: MUTED }}>On the deed</span>
                    {tree.deed.filter((d: any) => clean(d.n)).map((d: any) => (
                      <span key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 5px", borderRadius: 999, background: "#f3eee5", fontSize: 14.5, fontWeight: 500 }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: LINE, display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 600, color: "#5e584d" }}>{ini(d.n)}</span>{clean(d.n)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                  {[["1", "The deed", "Confirm the names, and who is still living."], ["2", "The family", "Who inherits from anyone who has died."], ["3", "Who signs", "How to reach each person who signs."]].map(([n, h, b]) => (
                    <div key={n} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
                      <span style={{ fontFamily: SERIF, fontSize: 22, color: GOLD }}>{n}</span>
                      <span style={{ fontSize: 15.5, fontWeight: 600 }}>{h}</span>
                      <span style={{ fontSize: 14, lineHeight: 1.5, color: MUTED }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!done && q.kind === "choice" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {q.opts!.map((o, i) => {
                  const on = q.value === o.value;
                  return (
                    <button key={o.value} onClick={() => pick(o.value)} className="ocq-opt"
                      style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", minHeight: 66, padding: "0 20px", borderRadius: 16, border: `1.5px solid ${on ? INK : LINE}`, background: on ? INK : CARD, color: on ? "#fff" : INK, fontSize: 18, fontWeight: 500, textAlign: "left", cursor: "pointer", boxShadow: on ? "0 10px 24px -14px rgba(31,42,55,.6)" : "none", transition: "background .22s, color .22s, border-color .22s, transform .15s, box-shadow .22s" }}>
                      <span style={{ flex: "none", width: 26, height: 26, borderRadius: 7, border: `1px solid ${on ? "rgba(255,255,255,.4)" : "#d6ccbb"}`, display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 600, color: on ? "#fff" : "#8a8170" }}>{KEYS[i]}</span>
                      <span style={{ flex: 1 }}>{o.label}</span>
                      <span style={{ fontSize: 16, opacity: on ? 1 : 0, transition: "opacity .2s" }}>✓</span>
                    </button>
                  );
                })}
              </div>
            )}

            {!done && q.kind === "text" && (
              <input data-autofocus="1" value={q.value ?? ""} onChange={(e) => q.put!(e.target.value)} placeholder={q.ph} className="ocq-line" style={lineInput(true)} />
            )}

            {!done && q.kind === "names" && (() => {
              const items = q.items!;
              const rows = items.length || q.none ? items : [{ id: "__new", n: "" }];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rows.map((it, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1.5px solid #ddd4c5" }}>
                      <span style={{ flex: "none", width: 32, height: 32, borderRadius: "50%", background: clean(it.n) ? LINE : "#efe9df", color: "#5e584d", display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 600 }}>{ini(it.n)}</span>
                      <input data-autofocus={i === 0 ? "1" : "0"} value={it.n ?? ""} placeholder={q.ph}
                        onChange={(e) => (it.id === "__new" ? q.create!(e.target.value) : q.rename!(it.id, e.target.value))}
                        style={{ flex: 1, minWidth: 0, padding: "13px 0", fontSize: "clamp(20px,2.6vw,24px)", fontFamily: SERIF, border: 0, background: "transparent", color: INK, outline: "none" }} />
                      {it.id !== "__new" && (items.length > 1 || clean(it.n)) && (
                        <button onClick={() => q.remove!(it.id)} aria-label="Remove" className="ocq-ghost" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", border: 0, background: "transparent", color: "#a39a88", fontSize: 20, cursor: "pointer" }}>×</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 22px", paddingTop: 10 }}>
                    {!q.none && <button onClick={q.add} style={{ minHeight: 44, padding: 0, border: 0, background: "transparent", color: INK, fontSize: 15.5, fontWeight: 600, cursor: "pointer" }}>+ Add another</button>}
                    {q.noneLabel && (
                      <button onClick={q.pickNone} style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 44, padding: 0, border: 0, background: "transparent", color: INK, fontSize: 15.5, cursor: "pointer" }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${q.none ? INK : "#cfc5b4"}`, display: "grid", placeItems: "center" }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: INK, opacity: q.none ? 1 : 0, transition: "opacity .2s" }} />
                        </span>
                        {q.noneLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {!done && q.kind === "contact" && (() => {
              const c = q.contact || {};
              const setC = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => { const v = e.target.value; U((t) => { t.contacts[q.key!] = { ...(t.contacts[q.key!] || {}), [f]: v }; }); };
              const label = (txt: string, el: React.ReactNode) => (
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 13, color: MUTED }}>{txt}</span>{el}</label>
              );
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {label("Mailing address", <input data-autofocus="1" value={c.addr ?? ""} onChange={setC("addr")} placeholder="Street, city, ZIP" className="ocq-line" style={lineInput()} />)}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "18px 24px" }}>
                    {label("Email", <input type="email" value={c.email ?? ""} onChange={setC("email")} placeholder="name@example.com" className="ocq-line" style={lineInput()} />)}
                    {label("Phone", <input type="tel" value={c.phone ?? ""} onChange={setC("phone")} placeholder="(555) 555-0100" className="ocq-line" style={lineInput()} />)}
                  </div>
                </div>
              );
            })()}

            {!done && q.kind === "review" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div style={{ borderRadius: 20, background: CARD, border: "1px solid #e7e0d4", overflow: "hidden" }}>
                  {q.signers!.map((s, i) => {
                    const c = tree.contacts[s.key] || {};
                    const contact = [clean(c.email), clean(c.phone)].filter(Boolean).join(" · ");
                    const ix = q.contactIdx![s.key];
                    return (
                      <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderTop: i ? "1px solid #efe8dc" : "none" }}>
                        <span style={{ flex: "none", width: 42, height: 42, borderRadius: "50%", background: "#e8eee6", color: SAGE, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 600 }}>{ini(s.name)}</span>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 17.5, fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontSize: 14, color: MUTED }}>{s.label}</span>
                          {contact && <span style={{ fontSize: 13.5, color: "#8a8170", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact}</span>}
                        </div>
                        {ix != null && (
                          <button onClick={() => go(ix, -1)} style={{ flex: "none", minHeight: 40, padding: "0 14px", borderRadius: 999, border: `1px solid ${LINE}`, background: "transparent", color: INK, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Edit</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <textarea value={tree.note ?? ""} onChange={(e) => { const v = e.target.value; U((t) => { t.note = v; }); }} rows={2} placeholder="Anything we should know? (optional)"
                  className="ocq-line" style={{ width: "100%", padding: "12px 0", fontSize: 17, lineHeight: 1.5, border: 0, borderBottom: "1.5px solid #cfc5b4", background: "transparent", color: INK, outline: "none", resize: "none", fontFamily: "inherit" }} />
              </div>
            )}

            {done && (
              <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                <div style={{ display: "flex", flexDirection: "column", borderLeft: "1.5px solid #d9cfbf", marginLeft: 15 }}>
                  {[
                    { n: "✓", h: "Answers received", b: "Saved to your file just now.", on: true },
                    { n: "2", h: "A broker checks the family tree", b: "Against the cemetery’s own rules, so nothing is missing when it’s submitted." },
                    { n: "3", h: signers.length > 1 ? `${signers.length} people receive their documents` : "You receive your documents", b: "By email, ready to sign. We prepare every form for you." },
                  ].map((s) => (
                    <div key={s.n} style={{ position: "relative", padding: "0 0 22px 30px", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ position: "absolute", left: -16, top: -2, width: 30, height: 30, borderRadius: "50%", background: s.on ? SAGE : CARD, color: s.on ? "#fff" : INK, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, border: `1.5px solid ${s.on ? SAGE : "#cfc5b4"}` }}>{s.n}</span>
                      <span style={{ fontSize: 16.5, fontWeight: 600, paddingTop: 3 }}>{s.h}</span>
                      <span style={{ fontSize: 15, lineHeight: 1.5, color: MUTED, maxWidth: "30em" }}>{s.b}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <button onClick={() => { dirSign.current = -1; const r = Qs.findIndex((x) => x.kind === "review"); setPos(r >= 0 ? r : 0); setDone(false); }}
                    style={{ minHeight: 50, padding: "0 24px", borderRadius: 999, border: `1.5px solid ${INK}`, background: "transparent", color: INK, fontSize: 15.5, fontWeight: 600, cursor: "pointer" }}>Change an answer</button>
                  <a href="tel:+12142304740" style={{ fontSize: 15.5, padding: "0 8px" }}>Call (214) 230-4740</a>
                </div>
              </div>
            )}

            {!done && q.why && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => setWhyOpen((o) => !o)} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, minHeight: 36, padding: 0, border: 0, background: "transparent", color: MUTED, fontSize: 14.5, cursor: "pointer" }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid #c9bea9", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}>?</span>Why we ask
                </button>
                {whyOpen && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#5e584d", maxWidth: "34em", paddingLeft: 26 }}>{q.why}</p>}
              </div>
            )}
          </div>

          {!done && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 40, paddingTop: 22, borderTop: "1px solid #e7e0d4", maxWidth: 640 }}>
              <button onClick={() => canBack && go(cur - 1, -1)} className="ocq-ghost"
                style={{ minHeight: 50, padding: "0 18px 0 12px", borderRadius: 999, border: 0, background: "transparent", color: INK, fontSize: 15.5, fontWeight: 500, cursor: "pointer", opacity: canBack ? 1 : 0, pointerEvents: canBack ? "auto" : "none" }}>← Back</button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: "#8a8170", opacity: q.answered ? 1 : 0.3, whiteSpace: "nowrap" }}>Press Enter ↵</span>
              <button onClick={next} disabled={!q.answered}
                style={{ minHeight: 54, padding: "0 30px", borderRadius: 999, border: 0, background: INK, color: "#fff", fontSize: 16.5, fontWeight: 600, cursor: q.answered ? "pointer" : "default", opacity: q.answered ? 1 : 0.3, transition: "opacity .25s" }}>
                {q.nextLabel || "Continue"}
              </button>
            </div>
          )}
        </main>

        {showDeed && <DeedCopy file={deedFile} />}
      </div>

      <footer style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "0 clamp(18px,4vw,32px) 22px", fontSize: 13, color: "#8a8170" }}>
        Not sure about something? Call <a href="tel:+12142304740">(214) 230-4740</a>
      </footer>
    </div>
  );
};

export default OwnershipConfirmV3;
