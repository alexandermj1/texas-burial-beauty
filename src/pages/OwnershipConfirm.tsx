import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2, Loader2, Pencil, Sparkles, Users, Plus, Trash2,
  ShieldCheck, ArrowRight, Send, HeartCrack, Cloud, UserRound,
} from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import {
  QUESTIONS, questionPath, ROLE_LABEL,
  type OwnershipAnswers, type RosterPerson, type PersonRole,
} from "@/lib/ownershipRules";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import fern from "@/assets/flowers/fern.png.asset.json";

/**
 * The seller's own copy of the ownership questionnaire.
 *
 * We arrive here already believing most of the answers — read from their form,
 * notes and email chain — so the page leads with what we think is true and asks
 * them only to confirm it, correct it, or fill in the gaps (including the
 * family tree when the plot is being inherited).
 */

type Packet = {
  seller_name: string | null;
  cemetery: string | null;
  lawn?: string | null;
  space_numbers?: string | null;
  deed_owner_names?: string | null;
  relationship_to_owner?: string | null;
  answers: OwnershipAnswers;
};


/** The synthetic first card: the names printed on the deed. */
const NAMES_KEY = "_deedNames";

/** Split "John Smith & Mary Smith" / "John and Mary Smith" into separate names. */
const splitNames = (raw?: string | null): string[] =>
  String(raw ?? "")
    .split(/\s*(?:,|\/|&| and )\s*/i)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && !/^(unknown|n\/?a|none)$/i.test(s));

/** Read the relationship the seller already told us into one of our choices. */
const guessRel = (raw?: string | null): string | undefined => {
  const s = String(raw ?? "").toLowerCase();
  if (!s.trim()) return undefined;
  if (/\b(self|me|myself|i am|owner)\b/.test(s)) return "self";
  if (/\b(husband|wife|spouse)\b/.test(s)) return "spouse";
  if (/\b(son|daughter|child)\b/.test(s)) return "child";
  if (/\bgrand(son|daughter|child)\b/.test(s)) return "grandchild";
  if (/\b(brother|sister|sibling)\b/.test(s)) return "sibling";
  if (/\b(niece|nephew)\b/.test(s)) return "nibling";
  if (/\b(in-?law)\b/.test(s)) return "inlaw";
  if (/\b(executor|trustee|attorney|agent|representative)\b/.test(s)) return "rep";
  return undefined;
};

const labelFor = (key: string, value?: string) =>
  QUESTIONS[key]?.answers.find((a) => a.value === value)?.label ?? "";


const QuestionCard = ({
  qKey, answers, believed, confirmed, onAnswer, onConfirm, index, title, hint, labels,
}: {
  qKey: string;
  answers: OwnershipAnswers;
  believed: boolean;
  confirmed: boolean;
  onAnswer: (key: string, value: string) => void;
  onConfirm: (key: string) => void;
  index: number;
  /** The question rewritten to name the person we're actually talking about. */
  title?: string;
  hint?: string;
  /** Answer labels rewritten the same way, e.g. "Yes, I'll sign personally". */
  labels?: Record<string, string>;
}) => {
  const q = QUESTIONS[qKey];
  const value = (answers as Record<string, unknown>)[qKey] as string | undefined;
  const [editing, setEditing] = useState(false);
  const showChoices = editing || !value;
  const settled = !!value && (confirmed || !believed);

  if (!q) return null;

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 transition-all duration-500 ${
        settled
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border/70 bg-card/70 shadow-[0_8px_40px_-24px_hsl(var(--primary)/0.5)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] transition-colors ${
            settled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {settled ? <CheckCircle2 className="w-4 h-4" /> : index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-1.5">{q.eyebrow}</div>
          <p className="font-display text-xl sm:text-2xl leading-snug text-foreground">
            {title ?? q.question}
          </p>

          {(hint ?? q.hint) && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{hint ?? q.hint}</p>
          )}



          {!showChoices && value && (
            <div className="mt-4">
              <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  {believed && !confirmed ? "From our records we believe" : "Your answer"}
                </p>
                <p className="text-sm text-foreground mt-0.5">{labels?.[value] ?? labelFor(qKey, value)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {believed && !confirmed && (
                  <button
                    onClick={() => onConfirm(qKey)}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> That's correct
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40 text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" /> {believed && !confirmed ? "No — change this" : "Change"}
                </button>
              </div>
            </div>
          )}

          {showChoices && (
            <div className="mt-4 grid gap-2">
              {q.answers.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onAnswer(qKey, opt.value); setEditing(false); }}
                  className={`text-left rounded-xl border px-4 py-3 transition ${
                    value === opt.value
                      ? "border-primary bg-primary/[0.07]"
                      : "border-border/70 bg-background hover:border-primary/40"
                  }`}
                >
                  <span className="text-sm text-foreground">{labels?.[opt.value] ?? opt.label}</span>
                  {opt.detail && <span className="block text-[11px] text-muted-foreground mt-0.5">{opt.detail}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The deed-holder card. We lead with the names we already hold and ask only for
 * a nod — but a deed can carry several names, so the editor is a live list.
 */
const NamesCard = ({
  people, believed, confirmed, index, onChange, onConfirm,
}: {
  people: RosterPerson[];
  believed: boolean;
  confirmed: boolean;
  index: number;
  onChange: (people: RosterPerson[]) => void;
  onConfirm: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const named = people.filter((p) => p.name.trim());
  const showEditor = editing || named.length === 0;
  const settled = named.length > 0 && (confirmed || !believed);

  const patch = (id: string, p: Partial<RosterPerson>) =>
    onChange(people.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 transition-all duration-500 ${
        settled ? "border-primary/30 bg-primary/[0.04]" : "border-border/70 bg-card/70 shadow-[0_8px_40px_-24px_hsl(var(--primary)/0.5)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] transition-colors ${
            settled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {settled ? <CheckCircle2 className="w-4 h-4" /> : index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-1.5">The deed</div>
          <p className="font-display text-xl sm:text-2xl leading-snug text-foreground">
            Whose name is printed on the deed?
          </p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Exactly as it appears on the cemetery's certificate of ownership. A deed often carries more than one
            name — please list everyone on it.
          </p>

          {!showEditor && (
            <div className="mt-4">
              <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  {believed && !confirmed ? "From our records we believe" : "Your answer"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {named.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-sm text-foreground"
                    >
                      <UserRound className="w-3.5 h-3.5 text-primary" />
                      {p.name}
                      {p.deceased && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">deceased</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {believed && !confirmed && (
                  <button
                    onClick={onConfirm}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> That's correct
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40 text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" /> {believed && !confirmed ? "No — change this" : "Change"}
                </button>
              </div>
            </div>
          )}

          {showEditor && (
            <div className="mt-4 space-y-2">
              {people.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2">
                  <input
                    value={p.name}
                    autoFocus={!p.name}
                    onChange={(e) => patch(p.id, { name: e.target.value })}
                    placeholder="Full name as printed on the deed"
                    className="flex-1 min-w-[220px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => patch(p.id, { deceased: !p.deceased, role: !p.deceased ? "decedent" : "owner" })}
                    className={`text-[11px] px-3 py-2 rounded-full border transition ${
                      p.deceased ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    Has passed away
                  </button>
                  {people.length > 1 && (
                    <button
                      onClick={() => onChange(people.filter((x) => x.id !== p.id))}
                      className="p-2 rounded-full border border-border text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => onChange([...people, { id: crypto.randomUUID(), name: "", role: "co_owner" as PersonRole }])}
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40 text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" /> Another name on the deed
                </button>
                {named.length > 0 && (
                  <button
                    onClick={() => { setEditing(false); onConfirm(); }}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> That's everyone
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ── Follow-up prompts ────────────────────────────────────────────────────────
//
// An answer on its own rarely lets us draw a document: "married" only matters
// once we know the spouse's name, "one refuses" only matters once we know who.
// Each answer therefore pulls in the people (or the explanation) it implies,
// right there in the flow rather than in a form at the end.

type PeopleSlot = {
  kind: "people";
  eyebrow: string;
  title: string;
  hint: string;
  role: PersonRole;
  /** Seeded onto anyone added from this card. */
  relationship?: string;
  deceased?: boolean;
  addLabel: string;
  /** They may honestly have nobody to name. */
  allowNone?: boolean;
  noneLabel?: string;
};

type TextSlot = {
  kind: "text";
  eyebrow: string;
  title: string;
  hint: string;
  field: "nameMismatch" | "blockedNotes" | "occupiedBy";
  placeholder: string;
};

const SLOTS: Record<string, PeopleSlot | TextSlot> = {
  _decedent: {
    kind: "people", eyebrow: "The owner who died", role: "decedent", deceased: true,
    title: "Who is the person on the deed who has passed away?",
    hint: "We need their name exactly as the cemetery holds it — every inheritance document is drawn in that name.",
    addLabel: "Add another owner who has died",
  },
  _agent: {
    kind: "people", eyebrow: "Signing on their behalf", role: "agent",
    title: "Who will be signing for the owner?",
    hint: "The person named in the power of attorney or guardianship papers.",
    addLabel: "Add another agent",
  },
  _coowners: {
    kind: "people", eyebrow: "The other owners", role: "co_owner",
    title: "Who else owns the plot with you?",
    hint: "A plot sold as one unit needs every owner's signature, so we'll need to reach each of them.",
    addLabel: "Add another owner",
  },
  _spouse: {
    kind: "people", eyebrow: "Your spouse", role: "spouse", relationship: "spouse",
    title: "What is the spouse's full name?",
    hint: "A husband or wife holds a vested right of interment, so the cemetery will want their signature too.",
    addLabel: "Add spouse",
  },
  _exspouse: {
    kind: "people", eyebrow: "The former spouse", role: "spouse", relationship: "former spouse",
    title: "Who was the owner married to at the time?",
    hint: "A divorce doesn't always end a right of interment — naming them lets us check the decree and clear it properly.",
    addLabel: "Add former spouse",
    allowNone: true, noneLabel: "I don't know their name",
  },
  _latespouse: {
    kind: "people", eyebrow: "The late spouse", role: "spouse", deceased: true, relationship: "late spouse",
    title: "What was your late spouse's full name?",
    hint: "We may need their death certificate to clear their name from the deed.",
    addLabel: "Add spouse",
  },
  _executor: {
    kind: "people", eyebrow: "The estate", role: "executor",
    title: "Who was appointed executor or administrator?",
    hint: "Their signature carries the estate — the letters from the court will be in this name.",
    addLabel: "Add another representative",
  },
  _heirs: {
    kind: "people", eyebrow: "Who inherits", role: "heir",
    title: "Who are the people who inherit the plot?",
    hint: "Everyone with a claim has to sign or waive, so please name them all — including anyone who has since died.",
    addLabel: "Add another heir",
  },
  _trustee: {
    kind: "people", eyebrow: "The trust", role: "trustee",
    title: "Who is the trustee signing for the trust?",
    hint: "As named in the trust agreement or certification of trust.",
    addLabel: "Add another trustee",
  },
  _chaindeaths: {
    kind: "people", eyebrow: "Chain of title", role: "decedent", deceased: true,
    title: "Who else in the family has since died?",
    hint: "Each death adds a link we have to prove, so we need every name in the chain.",
    addLabel: "Add another person who has died",
  },
  _blocked: {
    kind: "text", eyebrow: "The owner who won't sign", field: "blockedNotes",
    title: "Tell us who that is and what's happened",
    hint: "There is almost always a lawful way forward — knowing the situation lets a broker choose it.",
    placeholder: "e.g. My brother David Carter hasn't spoken to the family in years and we have no address for him.",
  },
  _occupiedBy: {
    kind: "text", eyebrow: "The spaces", field: "occupiedBy",
    title: "Who is buried in the space, and which space is it?",
    hint: "Whoever is interred there brings their own family's rights with them, so the cemetery will ask us about it.",
    placeholder: "e.g. My father, Robert Lee Hayes, is in space 2 — buried 2011.",
  },
  _nameMismatch: {
    kind: "text", eyebrow: "The names", field: "nameMismatch",
    title: "Which name differs, and what is it now?",
    hint: "For example: the deed says Mary Ellen Doe, her driver's licence says Mary E. Carter after she married.",
    placeholder: "The deed says … but the ID says …",
  },
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/** Shared shell so every card in the flow looks and moves the same way. */
const CardShell = ({
  index, settled, eyebrow, title, hint, children,
}: {
  index: number; settled: boolean; eyebrow: string; title: string; hint?: string; children: React.ReactNode;
}) => (
  <div
    className={`rounded-2xl border p-6 sm:p-7 transition-all duration-500 ${
      settled ? "border-primary/30 bg-primary/[0.04]" : "border-border/70 bg-card/70 shadow-[0_8px_40px_-24px_hsl(var(--primary)/0.5)]"
    }`}
  >
    <div className="flex items-start gap-4">
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] transition-colors ${
          settled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {settled ? <CheckCircle2 className="w-4 h-4" /> : index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-1.5">{eyebrow}</div>
        <p className="font-display text-xl sm:text-2xl leading-snug text-foreground">{title}</p>
        {hint && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
        {children}
      </div>
    </div>
  </div>
);

/** Ask for the people an answer implies — name first, then how to reach them. */
const PeopleSlotCard = ({
  slot, index, people, settled, suggestions = [], onChange, onDone,
}: {
  slot: PeopleSlot;
  index: number;
  people: RosterPerson[];
  settled: boolean;
  /** Names already on the file, offered as one tap rather than retyping. */
  suggestions?: string[];
  onChange: (people: RosterPerson[]) => void;
  onDone: (none?: boolean) => void;
}) => {
  const rows = people.length
    ? people
    : [{ id: "seed", name: "", role: slot.role, relationship: slot.relationship, deceased: slot.deceased }];
  const named = rows.filter((p) => p.name.trim());
  const clean = (list: RosterPerson[]) => list.map((x) => (x.id === "seed" ? { ...x, id: crypto.randomUUID() } : x));
  const patch = (id: string, p: Partial<RosterPerson>) =>
    onChange(clean(rows.map((x) => (x.id === id ? { ...x, ...p } : x))));
  const offer = suggestions.filter((s) => !rows.some((r) => r.name.trim().toLowerCase() === s.toLowerCase()));
  const addNamed = (name: string) => {
    const blank = rows.find((r) => !r.name.trim());
    if (blank) return patch(blank.id, { name });
    onChange(clean([...rows, { id: crypto.randomUUID(), name, role: slot.role, relationship: slot.relationship, deceased: slot.deceased }]));
  };

  return (
    <CardShell index={index} settled={settled} eyebrow={slot.eyebrow} title={slot.title} hint={slot.hint}>
      {offer.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">From your file:</span>
          {offer.map((s) => (
            <button
              key={s}
              onClick={() => addNamed(s)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/[0.06] text-foreground hover:bg-primary/10"
            >
              <Plus className="w-3 h-3 text-primary" /> {s}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-3">

        {rows.map((p) => (
          <div key={p.id} className="rounded-xl border border-border/70 bg-background p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-medium shrink-0">
                {initials(p.name) || <UserRound className="w-4 h-4" />}
              </div>
              <input
                value={p.name}
                onChange={(e) => patch(p.id, { name: e.target.value })}
                placeholder="Full name"
                className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              {rows.length > 1 && (
                <button
                  onClick={() => onChange(rows.filter((x) => x.id !== p.id))}
                  className="p-2 rounded-full border border-border text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {p.name.trim() && (
              <div className="mt-3 grid sm:grid-cols-2 gap-2 animate-in fade-in duration-300">
                <input
                  value={p.email ?? ""}
                  onChange={(e) => patch(p.id, { email: e.target.value })}
                  placeholder="Email (so we can send what they sign)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={p.phone ?? ""}
                  onChange={(e) => patch(p.id, { phone: e.target.value })}
                  placeholder="Phone (optional)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={p.relationship ?? ""}
                  onChange={(e) => patch(p.id, { relationship: e.target.value })}
                  placeholder="Their relationship — daughter, brother…"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={!!p.deceased}
                    onChange={(e) => patch(p.id, { deceased: e.target.checked, role: e.target.checked ? "decedent" : slot.role })}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <HeartCrack className="w-3.5 h-3.5" /> This person has passed away
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onChange([
            ...rows.filter((x) => x.id !== "seed" || x.name.trim()),
            { id: crypto.randomUUID(), name: "", role: slot.role, relationship: slot.relationship, deceased: slot.deceased },
          ])}
          className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40 text-foreground"
        >
          <Plus className="w-3.5 h-3.5" /> {slot.addLabel}
        </button>
        {named.length > 0 && (
          <button
            onClick={() => onDone()}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> That's everyone
          </button>
        )}
        {slot.allowNone && named.length === 0 && (
          <button
            onClick={() => onDone(true)}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40 text-muted-foreground"
          >
            {slot.noneLabel ?? "I don't know"}
          </button>
        )}
      </div>
    </CardShell>
  );
};

/** A short written answer where a choice can't carry the detail. */
const TextSlotCard = ({
  slot, index, value, settled, onChange, onDone,
}: {
  slot: TextSlot; index: number; value: string; settled: boolean;
  onChange: (v: string) => void; onDone: () => void;
}) => (
  <CardShell index={index} settled={settled} eyebrow={slot.eyebrow} title={slot.title} hint={slot.hint}>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      maxLength={1200}
      placeholder={slot.placeholder}
      className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-y"
    />
    <button
      onClick={onDone}
      disabled={!value.trim()}
      className="mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
    >
      <CheckCircle2 className="w-3.5 h-3.5" /> Save this
    </button>
  </CardShell>
);

/** The final card: the ID name and address behind every signature. */
const IDS_KEY = "_ids";

const IdentityCard = ({
  index, settled, signers, isSelf, onPatch, onDone,
}: {
  index: number;
  settled: boolean;
  signers: RosterPerson[];
  isSelf: boolean;
  onPatch: (id: string, patch: Partial<RosterPerson>) => void;
  onDone: () => void;
}) => {
  const ready = signers.every((p) => (p.address ?? "").trim().length > 5);
  return (
    <CardShell
      index={index}
      settled={settled}
      eyebrow="For the paperwork"
      title={
        signers.length === 1 && isSelf
          ? "Last thing — your name and address exactly as they appear on your ID"
          : "Last thing — each signer's name and address exactly as on their ID"
      }
      hint="Every power of attorney is notarised, so the name and address on it must match the driver's licence or passport the notary sees. We type these straight onto your documents so you never have to."
    >
      <div className="mt-4 space-y-3">
        {signers.map((p) => (
          <div key={p.id} className="rounded-xl border border-border/70 bg-background p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-medium shrink-0">
                {initials(p.name) || <UserRound className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground leading-tight truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {p.relationship || ROLE_LABEL[p.role]}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={p.legalName ?? ""}
                onChange={(e) => onPatch(p.id, { legalName: e.target.value })}
                placeholder={`Full legal name on the ID (e.g. ${p.name})`}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={p.address ?? ""}
                onChange={(e) => onPatch(p.id, { address: e.target.value })}
                placeholder="Home address on the ID — street, city, state, ZIP"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onDone}
        disabled={!ready}
        className="mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Save these details
      </button>
    </CardShell>
  );
};

/**
 * Say the question out loud the way a broker would: to the owner it's "you",
 * about anybody else it's their name. Nothing generic, nothing repeated.
 */
const phraseFor = (
  key: string, isSelf: boolean, ownerNames: string, deedNames: string,
): { title?: string; hint?: string; labels?: Record<string, string> } => {
  const who = isSelf ? "you" : ownerNames || "the owner";
  switch (key) {
    case "rel":
      return deedNames ? { title: `What is your relationship to ${deedNames}?` } : {};
    case "signer":
      return isSelf
        ? {
            title: "Will you be signing the paperwork yourself?",
            labels: {
              self: "Yes — I'll sign personally",
              agent: "No — someone signs for me under a power of attorney or guardianship",
            },
          }
        : { title: `Will ${who} be signing the paperwork personally?` };
    case "co":
      return { title: isSelf ? "Is everyone else on the deed willing to sign the sale?" : "Is everyone on the deed willing to sign the sale?" };
    case "marital":
      return {
        title: isSelf
          ? "Do you have a legal spouse who is not named on the deed?"
          : `Does ${who} have a legal spouse who is not named on the deed?`,
        hint: "A husband or wife signs the power of attorney too — even when they aren't named on the deed.",
        labels: {
          married: "Yes — married, and not divorced",
          divorced: "No — divorced",
          widowed: "No — my spouse has died",
          single: isSelf ? "No — I've never married" : "No — never married",
          unsure: "I don't know",
        },
      };
    case "maritalAtPurchase":
      return { title: isSelf ? "Were you married when the plot was bought?" : `Was ${who} married when the plot was bought?` };
    case "occupied":
      return {
        title: "Have any of the spaces on the deed ever been used?",
        hint: "Anyone already buried there brings their own family's rights with them, so the cemetery will ask.",
      };
    case "deed":
      return {
        title: isSelf
          ? "Do you have the original certificate of ownership?"
          : `Does ${who} have the original certificate of ownership?`,
        labels: isSelf ? { yes: "Yes — I have it", no: "No — it's lost" } : undefined,
      };

    default:
      return {};
  }
};



/**
 * The family, drawn rather than listed. Everyone gathered so far is grouped by
 * the part they play, so the seller can see at a glance that we have the right
 * people — and spot anyone missing.
 */
const FamilyTree = ({ people, onRemove }: { people: RosterPerson[]; onRemove: (id: string) => void }) => {
  const groups: { label: string; roles: PersonRole[] }[] = [
    { label: "On the deed", roles: ["owner", "co_owner", "decedent"] },
    { label: "Spouse", roles: ["spouse"] },
    { label: "Inherits", roles: ["heir"] },
    { label: "Acting for them", roles: ["executor", "trustee", "agent"] },
  ];
  // One card per person: someone named on the deed who has since died is the
  // same human as the decedent we asked about, so we keep the later entry.
  const named = Array.from(
    people
      .filter((p) => p.name.trim())
      .reduce((m, p) => m.set(p.name.trim().toLowerCase(), p), new Map<string, RosterPerson>())
      .values(),
  );

  if (!named.length) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-7">
      <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-1.5">The family</div>
      <p className="font-display text-2xl leading-snug text-foreground flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> Everyone connected to this plot
      </p>

      <div className="mt-6 space-y-6">
        {groups.map((g) => {
          const members = named.filter((p) => g.roles.includes(p.role));
          if (!members.length) return null;
          return (
            <div key={g.label} className="relative pl-5">
              <span className="absolute left-0 top-2 bottom-2 w-px bg-primary/25" />
              <span className="absolute -left-[3px] top-2 w-[7px] h-[7px] rounded-full bg-primary" />
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{g.label}</div>
              <div className="flex flex-wrap gap-2">
                {members.map((p) => (
                  <div
                    key={p.id}
                    className={`group inline-flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition ${
                      p.deceased || p.role === "decedent"
                        ? "border-border bg-muted/40"
                        : "border-primary/25 bg-primary/[0.06]"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full bg-background border border-border/70 flex items-center justify-center text-[10px] text-primary">
                      {initials(p.name) || <UserRound className="w-3.5 h-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground leading-tight">{p.name}</span>
                      <span className="block text-[10px] text-muted-foreground leading-tight">
                        {p.relationship || ROLE_LABEL[p.role]}
                        {(p.deceased || p.role === "decedent") && " · has passed away"}
                      </span>
                    </span>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OwnershipConfirm = () => {

  const [params] = useSearchParams();
  const submissionId = params.get("s") ?? "";
  const [packet, setPacket] = useState<Packet | null>(null);
  const [answers, setAnswers] = useState<OwnershipAnswers>({});
  const [confirmedKeys, setConfirmedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!submissionId) { setError("This link is missing its reference."); setLoading(false); return; }
    const { data, error: err } = await supabase.functions.invoke("ownership-questions", {
      body: { action: "get", submission_id: submissionId },
    });
    if (err || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? "We couldn't open this link.");
    } else {
      const p = data as Packet;
      setPacket(p);

      /**
       * Lead with what we already hold. Names from the file become the deed
       * roster, and anything the seller told us about their relationship is
       * mapped onto our own choices — both flagged "believed" so they are
       * asked to confirm rather than to type it all again.
       */
      const a: OwnershipAnswers = { ...(p.answers ?? {}) };
      const believed = new Set(a.aiSuggested ?? []);
      const existingDeed = (a.people ?? []).filter((x) => x.role === "owner" || x.role === "co_owner" || x.role === "decedent");
      if (existingDeed.length === 0) {
        const seeded = splitNames(p.deed_owner_names).map((name, i) => ({
          id: crypto.randomUUID(),
          name,
          role: (i === 0 ? "owner" : "co_owner") as PersonRole,
        }));
        if (seeded.length) {
          a.people = [...seeded, ...(a.people ?? [])];
          believed.add(NAMES_KEY);
        }
      } else if (!a.sellerConfirmedAt) {
        believed.add(NAMES_KEY);
      }
      if (!a.rel) {
        const guess = guessRel(p.relationship_to_owner);
        if (guess) { a.rel = guess as OwnershipAnswers["rel"]; believed.add("rel"); }
      }
      a.aiSuggested = [...believed];

      setAnswers(a);
      setConfirmedKeys(Array.isArray(a.confirmedKeys) ? a.confirmedKeys : []);
      setNotes(String((p.answers as Record<string, unknown>)?.sellerNotes ?? ""));
      if ((p.answers as Record<string, unknown>)?.sellerConfirmedAt) setSent(true);

    }
    setLoading(false);
  }, [submissionId]);

  useEffect(() => {
    document.title = "Confirm your details · Texas Cemetery Brokers";
    void load();
  }, [load]);

  /** Answers we filled in ourselves and have not had confirmed yet. */
  const believedKeys = useMemo(() => new Set(answers.aiSuggested ?? []), [answers.aiSuggested]);

  const deedPeople = useMemo(
    () => (answers.people ?? []).filter((p) => p.role === "owner" || p.role === "co_owner" || p.role === "decedent"),
    [answers.people],
  );

  /**
   * Anything the deed roster already tells us is settled silently — asking a
   * couple who wrote two names down "how many owners are there?" is the kind
   * of question that makes people abandon the page.
   */
  useEffect(() => {
    const named = deedPeople.filter((p) => p.name.trim());
    if (!named.length) return;
    const owners = named.length > 1 ? "multiple" : "sole";

    // The seller writing their own name on the deed answers the relationship
    // question for us — asking a husband and wife "who are you to them?" reads
    // as though we haven't been listening.
    const norm = (v: string) => v.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
    const seller = norm(packet?.seller_name ?? "");
    const sellerOnDeed = !!seller && named.some((p) => {
      const n = norm(p.name);
      return n === seller || (n.split(" ")[0] === seller.split(" ")[0] &&
        n.split(" ").slice(-1)[0] === seller.split(" ").slice(-1)[0]);
    });

    const nextDerived = [...new Set([...(answers.derived ?? []), "owners", ...(sellerOnDeed ? ["rel"] : [])])];
    const relOk = !sellerOnDeed || answers.rel === "self";
    if (answers.owners === owners && relOk &&
        nextDerived.length === (answers.derived ?? []).length) return;

    setAnswers((a) => ({
      ...a,
      owners,
      ...(sellerOnDeed ? { rel: "self" as const } : {}),
      derived: nextDerived,
    }));
  }, [deedPeople, answers.owners, answers.rel, answers.derived, packet?.seller_name]);

  /**
   * Every answer that implies people pulls those people in immediately, so the
   * names we need for the documents are gathered in context rather than in one
   * daunting list at the end.
   */
  const followUps = useCallback((k: string, a: OwnershipAnswers): string[] => {
    const derived = a.derived ?? [];
    switch (k) {
      case "owner": return a.owner === "deceased" ? ["_decedent"] : [];
      case "signer": return a.signer === "agent" ? ["_agent"] : [];
      // Co-owners we read off the deed are already named — don't ask twice.
      case "owners": return a.owners === "multiple" && !derived.includes("owners") ? ["_coowners"] : [];
      case "co": return a.co === "blocked" ? ["_blocked"] : [];
      case "occupied": return a.occupied === "yes" ? ["_occupiedBy"] : [];
      case "marital":
        return a.marital === "married" ? ["_spouse"]
          : a.marital === "divorced" ? ["_exspouse"]
          : a.marital === "widowed" ? ["_latespouse"] : [];
      case "spouse": return a.spouse === "yes" ? ["_spouse"] : [];
      case "probate": return a.probate === "letters" ? ["_executor"] : [];
      case "beneficiaries": return ["_heirs"];
      case "heirclass": return a.heirclass && a.heirclass !== "unsure" ? ["_heirs"] : [];
      case "trustee": return ["_trustee"];
      case "chain": return a.chain === "multi" ? ["_chaindeaths"] : [];
      default: return [];
    }
  }, []);

  /** Everyone still living whose signature — and therefore ID — we will need. */
  const signers = useMemo(
    () => (answers.people ?? []).filter(
      (p) => p.name.trim() && !p.deceased &&
        (p.role === "owner" || p.role === "co_owner" || p.role === "spouse" ||
         p.role === "agent" || p.role === "executor" || p.role === "trustee"),
    ),
    [answers.people],
  );

  /** The deed-holder card leads, then each question with whatever it implies. */
  const path = useMemo(() => {
    const out: string[] = [NAMES_KEY];
    for (const k of questionPath(answers)) {
      out.push(k);
      for (const f of followUps(k, answers)) if (!out.includes(f)) out.push(f);
    }
    // Two or more living people have to sign, so ask how they'd like to do it.
    if (signers.length >= 2) out.push("jointPoa");
    // Last of all, the ID details that go on the notarised documents.
    if (signers.length) out.push(IDS_KEY);
    return out;
  }, [answers, followUps, signers]);


  /**
   * A step is settled once it has an answer the seller owns — they picked it,
   * confirmed the one we had guessed, or finished naming people. We only ever
   * show one unsettled step at a time so the page never looks like a form.
   */
  const isSettled = useCallback(
    (k: string) => {
      if (k === IDS_KEY) return confirmedKeys.includes(k);
      const slot = SLOTS[k];
      if (slot) return confirmedKeys.includes(k);

      const v = k === NAMES_KEY
        ? deedPeople.some((p) => p.name.trim())
        : !!(answers as Record<string, unknown>)[k];
      return !!v && (confirmedKeys.includes(k) || !believedKeys.has(k));
    },
    [answers, confirmedKeys, believedKeys, deedPeople],
  );
  const answered = path.filter((k) => isSettled(k)).length;
  const pct = path.length ? Math.round((answered / path.length) * 100) : 0;
  const nextIndex = path.findIndex((k) => !isSettled(k));
  const allSettled = nextIndex === -1;
  const visible = allSettled ? path : path.slice(0, nextIndex + 1);
  const remaining = path.length - (allSettled ? path.length : nextIndex);



  /** Scroll the newly revealed question into view, but never on first paint. */
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastRevealed = useRef<string | null>(null);
  useEffect(() => {
    if (loading || sent || allSettled) return;
    const key = path[nextIndex];
    if (!key || lastRevealed.current === key) return;
    if (lastRevealed.current !== null) {
      cardRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    lastRevealed.current = key;
  }, [path, nextIndex, allSettled, loading, sent]);

  /** Quietly keep a draft so nothing is lost if they close the tab mid-way. */
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const dirty = useRef(false);
  useEffect(() => {
    if (loading || sent || !submissionId || !dirty.current) return;
    const t = setTimeout(async () => {
      setDraftSaving(true);
      await supabase.functions.invoke("ownership-questions", {
        body: {
          action: "save",
          submission_id: submissionId,
          answers: { ...answers, confirmedKeys, people: (answers.people ?? []).filter((p) => p.name.trim()), sellerNotes: notes.trim() || undefined },
          finished: false,
        },
      });
      setDraftSaving(false);
      setDraftSavedAt(new Date());
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, confirmedKeys, notes, loading, sent, submissionId]);

  const setAnswer = (key: string, value: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [key]: value } as OwnershipAnswers));
  };
  const confirmKey = (key: string) => {
    dirty.current = true;
    setConfirmedKeys((k) => [...new Set([...k, key])]);
  };


  /** Replace just the deed-holder slice of the roster, keeping everyone else. */
  const setDeedPeople = (next: RosterPerson[]) => {
    dirty.current = true;
    setAnswers((a) => {
      const others = (a.people ?? []).filter(
        (p) => p.role !== "owner" && p.role !== "co_owner" && p.role !== "decedent",
      );
      return { ...a, people: [...next, ...others] };
    });
  };
  const deedNamesLabel = useMemo(() => {
    const names = deedPeople.map((p) => p.name.trim()).filter(Boolean);
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }, [deedPeople]);

  const people = answers.people ?? [];

  /** People gathered by a particular follow-up card, kept in role order. */
  const slotPeople = (role: PersonRole) => people.filter((p) => p.role === role);
  const setSlotPeople = (role: PersonRole, next: RosterPerson[]) => {
    dirty.current = true;
    setAnswers((a) => ({
      ...a,
      people: [...(a.people ?? []).filter((p) => p.role !== role), ...next],
    }));
  };
  const setText = (field: "nameMismatch" | "blockedNotes" | "occupiedBy", v: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [field]: v } as OwnershipAnswers));
  };

  const removePerson = (id: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, people: (a.people ?? []).filter((p) => p.id !== id) }));
  };

  /** Update one person in place — used by the ID name & address card. */
  const patchPerson = (id: string, patch: Partial<RosterPerson>) => {
    dirty.current = true;
    setAnswers((a) => ({
      ...a,
      people: (a.people ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };




  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...answers,
        people: (answers.people ?? []).filter((p) => p.name.trim()),
        confirmedKeys,
        sellerNotes: notes.trim() || undefined,
      };
      const { data, error: err } = await supabase.functions.invoke("ownership-questions", {
        body: { action: "save", submission_id: submissionId, answers: payload, finished: true },
      });
      if (err || (data as { error?: string })?.error) throw new Error((data as { error?: string })?.error ?? err?.message);
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save your answers.");
    } finally {
      setSaving(false);
    }
  };

  const first = (packet?.seller_name ?? "").trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${hibiscusCoral.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
      />
      <div
        className="absolute bottom-0 -left-28 w-80 h-80 opacity-[0.12] pointer-events-none"
        style={{ backgroundImage: `url(${fern.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
      />
      {/* Soft light behind the page so each card lifts off the paper. */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full bg-primary/[0.07] blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-accent/[0.10] blur-3xl pointer-events-none" />



      <div className="relative max-w-3xl mx-auto px-5 py-16">
        <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-3">Texas Cemetery Brokers</div>
        {packet?.seller_name && (
          <p className="text-xs font-medium text-foreground mb-2">Private page for {packet.seller_name}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Opening your file…
          </div>
        ) : error && !packet ? (
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>
        ) : sent ? (
          <div className="mt-6">
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-foreground mb-4">
              Thank you{first ? `, ${first}` : ""} — that's <em className="italic text-primary">everything we needed</em>.
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              A broker is reviewing your answers now and will prepare the exact documents your cemetery requires.
              You'll receive one email with the full list — nothing to print until then.
            </p>
            <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/[0.05] p-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-display text-lg text-foreground">Your answers are saved</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Remembered something else? Call (214) 230-4740 or reply to our email and we'll update your file.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-xs text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Review or change my answers
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-foreground mb-4">
              {first ? `${first}, we just need you to` : "We just need you to"}{" "}
              <em className="italic text-primary">confirm a few things</em>.
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Before the transfer paperwork is drawn up{packet?.cemetery ? ` for ${packet.cemetery}` : ""}, the cemetery
              needs certainty about who has the right to sell. We've already worked most of it out from your file —
              please confirm what's right and correct anything that isn't.
            </p>

            <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 px-5 py-4 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Answers marked <span className="text-foreground">“From our records we believe”</span> were taken from
                what you've already told us. Nothing is final until you confirm it — and getting this right now is what
                stops the cemetery rejecting the transfer later.
              </p>
            </div>

            <div className="sticky top-0 z-20 -mx-5 px-5 py-3 mt-8 mb-8 bg-background/85 backdrop-blur border-b border-border/60">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  {allSettled
                    ? "All questions answered"
                    : `${answered} of ${path.length} answered · ${remaining} to go`}
                </span>
                <span className="inline-flex items-center gap-2">
                  {draftSaving ? (
                    <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>
                  ) : draftSavedAt ? (
                    <span className="inline-flex items-center gap-1"><Cloud className="w-3 h-3" /> Saved</span>
                  ) : null}
                  <span>{pct}%</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="space-y-3">
              {visible.map((key, i) => (
                <div
                  key={key}
                  ref={(el) => { cardRefs.current[key] = el; }}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out"
                >
                  {key === NAMES_KEY ? (
                    <NamesCard
                      index={i + 1}
                      people={deedPeople.length ? deedPeople : [{ id: "seed", name: "", role: "owner" as PersonRole }]}
                      believed={believedKeys.has(NAMES_KEY)}
                      confirmed={confirmedKeys.includes(NAMES_KEY)}
                      onChange={setDeedPeople}
                      onConfirm={() => confirmKey(NAMES_KEY)}
                    />
                  ) : SLOTS[key]?.kind === "people" ? (
                    <PeopleSlotCard
                      slot={SLOTS[key] as PeopleSlot}
                      index={i + 1}
                      settled={confirmedKeys.includes(key)}
                      people={slotPeople((SLOTS[key] as PeopleSlot).role)}
                      suggestions={deedPeople.map((p) => p.name.trim()).filter(Boolean)}


                      onChange={(next) => setSlotPeople((SLOTS[key] as PeopleSlot).role, next)}
                      onDone={() => confirmKey(key)}
                    />
                  ) : SLOTS[key]?.kind === "text" ? (
                    <TextSlotCard
                      slot={SLOTS[key] as TextSlot}
                      index={i + 1}
                      settled={confirmedKeys.includes(key)}
                      value={(answers as Record<string, unknown>)[(SLOTS[key] as TextSlot).field] as string ?? ""}
                      onChange={(v) => setText((SLOTS[key] as TextSlot).field, v)}
                      onDone={() => confirmKey(key)}
                    />
                  ) : key === IDS_KEY ? (
                    <IdentityCard
                      index={i + 1}
                      settled={confirmedKeys.includes(IDS_KEY)}
                      signers={signers}
                      isSelf={answers.rel === "self"}
                      onPatch={patchPerson}
                      onDone={() => confirmKey(IDS_KEY)}
                    />
                  ) : (
                    <QuestionCard
                      qKey={key}
                      index={i + 1}
                      answers={answers}
                      {...phraseFor(key, answers.rel === "self", deedNamesLabel, deedNamesLabel)}
                      believed={believedKeys.has(key)}
                      confirmed={confirmedKeys.includes(key)}
                      onAnswer={setAnswer}
                      onConfirm={confirmKey}
                    />
                  )}


                </div>
              ))}
            </div>


            {!allSettled && (
              <p className="mt-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                Answer this one and the next question appears — your place is saved as you go.
              </p>
            )}


            {allSettled && people.some((p) => p.name.trim()) && (
              <div className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <FamilyTree people={people} onRemove={removePerson} />
              </div>
            )}


            {allSettled && (
              <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-1.5">Anything else</div>
                <p className="font-display text-2xl leading-snug text-foreground">
                  Is there something about this plot we should know?
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  A disagreement in the family, a name that changed, paperwork you can't find — tell us here and a broker
                  will handle it. Nothing you write causes a delay; not telling us usually does.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => { dirty.current = true; setNotes(e.target.value); }}
                  rows={4}
                  maxLength={2000}
                  placeholder="Optional — in your own words"
                  className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-y"
                />
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>
            )}

            {allSettled && (
              <div className="mt-8 flex flex-wrap items-center gap-3 animate-in fade-in duration-500">
                <button
                  onClick={() => void submit()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 text-sm px-6 py-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {saving ? "Sending…" : "Confirm my details"}
                </button>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" /> You can leave anything you're unsure of blank.
                </span>
              </div>
            )}


            <div className="mt-12 rounded-2xl border border-primary/25 bg-primary/[0.04] px-5 py-5">
              <div className="text-[10px] uppercase tracking-[0.28em] text-primary mb-1.5">Rather talk it through?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A broker will go through these questions with you on the phone — there is never a charge for asking.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <a href="tel:+12142304740" className="text-foreground hover:text-primary">(214) 230-4740</a>
                <a href="mailto:info@texascemeterybrokers.com" className="text-foreground hover:text-primary">info@texascemeterybrokers.com</a>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
              Your answers are stored privately and used only to transfer this plot.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OwnershipConfirm;
