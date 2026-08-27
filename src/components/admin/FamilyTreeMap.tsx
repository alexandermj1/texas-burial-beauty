// A visual family tree for the submission: who is on the deed, who has died,
// who inherits — and, on every person, the exact documents we need from them.
//
// Each document is a chip on the person's card, coloured by its state, so a
// broker can see at a glance who is holding the file up. Clicking a chip opens
// that document (edit / prepare); the "+" on a card adds a document to that
// person's list without hunting through the checklist below.
import { useMemo } from "react";
import {
  Plus, Cross, User, HeartHandshake, ShieldCheck, Building2, Scale, Eye,
} from "lucide-react";
import {
  ROLE_LABEL, STATE_LABEL, isDeceasedPerson,
  type OwnershipAnswers, type Requirement, type RequiredState, type RosterPerson, type PersonRole,
} from "@/lib/ownershipRules";

const nameKey = (n?: string | null) => {
  const t = String(n ?? "").toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};

/** Short human label for a document chip. */
const CHIP_LABEL: Record<string, string> = {
  D1: "Deed",
  D2: "Photo ID",
  D3: "Spousal consent",
  D4: "Divorce decree",
  D5: "Marriage cert",
  D6: "Death cert",
  D7: "Will",
  D8: "Letters test.",
  D9: "Muniment",
  D10: "Heirship judgment",
  D12: "Affidavit of heirship",
  D13: "Small estate aff.",
  D15: "Their POA",
  D16: "Trust",
  D17: "Trustee acceptance",
  D18: "Guardianship",
  D19: "Corp. resolution",
  D20: "Cemetery packet",
  D21: "POA",
  D22: "Chain of title",
};

const chipLabel = (r: Requirement) => {
  if (r.jointNames?.length) return "Joint POA";
  return CHIP_LABEL[r.code] ?? (r.label.length > 22 ? `${r.label.slice(0, 20)}…` : r.label);
};

const CHIP_STYLE: Record<RequiredState, string> = {
  not_needed: "bg-muted text-muted-foreground border-transparent line-through",
  maybe: "bg-slate-100 text-slate-600 border-slate-200",
  needed: "bg-amber-100 text-amber-900 border-amber-200",
  issued: "bg-blue-100 text-blue-900 border-blue-200",
  awaiting_seller: "bg-purple-100 text-purple-900 border-purple-200",
  received: "bg-teal-100 text-teal-900 border-teal-200",
  notarized: "bg-emerald-100 text-emerald-900 border-emerald-200",
  complete: "bg-emerald-600 text-white border-emerald-700",
};

const ROLE_ICON: Record<PersonRole, typeof User> = {
  owner: User,
  co_owner: User,
  spouse: HeartHandshake,
  heir: User,
  executor: Scale,
  trustee: ShieldCheck,
  agent: ShieldCheck,
  witness: Eye,
  decedent: Cross,
};

type Row = { title: string; people: RosterPerson[] };

type Props = {
  answers: OwnershipAnswers;
  /** Everyone we know about — the raw roster, deceased included. */
  people: RosterPerson[];
  /** Per-person documents (LA and property-wide items excluded by the caller). */
  requirements: Requirement[];
  stateOf: (r: Requirement) => RequiredState;
  onDocClick: (r: Requirement) => void;
  onAddDoc: (personName: string) => void;
};

const FamilyTreeMap = ({ answers, people, requirements, stateOf, onDocClick, onAddDoc }: Props) => {
  // Anyone who has a document but isn't in the roster still gets a card.
  const all = useMemo(() => {
    const out: RosterPerson[] = people.filter((p) => p.name?.trim());
    const seen = new Set(out.map((p) => nameKey(p.name)));
    for (const r of requirements) {
      const names = r.jointNames?.length ? r.jointNames : [r.personName];
      for (const n of names) {
        const k = nameKey(n);
        if (!n || !k || seen.has(k)) continue;
        seen.add(k);
        out.push({ id: `x-${k}`, name: n, role: "owner", notes: "Added by hand" });
      }
    }
    return out;
  }, [people, requirements]);

  const docsFor = (p: RosterPerson) =>
    requirements.filter((r) => {
      const names = r.jointNames?.length ? r.jointNames : [r.personName];
      return names.some((n) => n && nameKey(n) === nameKey(p.name));
    });

  const isDead = (p: RosterPerson) => isDeceasedPerson(p, answers);

  const rows: Row[] = useMemo(() => {
    const deceased = all.filter((p) => isDead(p));
    const living = all.filter((p) => !isDead(p));
    const deedRoles: PersonRole[] = ["owner", "co_owner", "trustee"];
    const deed = living.filter((p) => deedRoles.includes(p.role));
    const spouses = living.filter((p) => p.role === "spouse");
    const next = living.filter((p) => !deedRoles.includes(p.role) && p.role !== "spouse");
    return [
      { title: "On the deed — deceased", people: deceased },
      { title: deceased.length ? "Living owners & co-owners" : "On the deed", people: deed },
      { title: "Spouses who must join", people: spouses },
      { title: "Heirs, executors & agents", people: next },
    ].filter((r) => r.people.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, answers]);

  if (!all.length) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        No people yet — the tree fills in from the seller's family confirmation.
      </p>
    );
  }

  const Card = ({ p }: { p: RosterPerson }) => {
    const dead = isDead(p);
    const docs = docsFor(p);
    const done = docs.filter((r) => ["received", "notarized", "complete"].includes(stateOf(r))).length;
    const Icon = ROLE_ICON[p.role] ?? User;
    return (
      <div
        className={`relative w-[228px] shrink-0 rounded-xl border px-3 py-2.5 transition shadow-sm hover:shadow-md ${
          dead
            ? "border-stone-300 bg-stone-50/80"
            : docs.length && done === docs.length
              ? "border-emerald-300 bg-emerald-50/60"
              : "border-border bg-background"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
            dead ? "bg-stone-200 text-stone-600" : "bg-[#1f2a37] text-white"
          }`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-semibold leading-tight truncate ${dead ? "text-stone-600" : ""}`} title={p.name}>
              {p.name}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
              {dead ? "Deceased" : ROLE_LABEL[p.role]}
              {p.relationship ? ` · ${p.relationship}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAddDoc(p.name)}
            title={`Add a document for ${p.name}`}
            className="w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 grid place-items-center shrink-0"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {docs.length === 0 ? (
            <span className="text-[10px] text-muted-foreground italic">No documents on this person yet</span>
          ) : (
            docs.map((r) => {
              const s = stateOf(r);
              return (
                <button
                  key={`${r.code}-${r.label}`}
                  type="button"
                  onClick={() => onDocClick(r)}
                  title={`${r.label} — ${STATE_LABEL[s]}${r.contractKind ? " · click to check or edit" : ""}`}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition hover:brightness-95 ${CHIP_STYLE[s]}`}
                >
                  {chipLabel(r)}
                </button>
              );
            })
          )}
        </div>

        {docs.length > 0 && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">{done} of {docs.length} in hand</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.title} className="relative">
          {i > 0 && <div className="absolute -top-3 left-6 h-3 w-px bg-border" />}
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            {row.title}
          </p>
          <div className="flex gap-2 flex-wrap">
            {row.people.map((p) => <Card key={p.id || p.name} p={p} />)}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px] text-muted-foreground">
        <Building2 className="w-3 h-3" />
        <span>Chip colour = where that document stands:</span>
        {(["needed", "issued", "awaiting_seller", "received", "complete"] as RequiredState[]).map((s) => (
          <span key={s} className={`px-1.5 py-0.5 rounded border ${CHIP_STYLE[s]}`}>{STATE_LABEL[s]}</span>
        ))}
      </div>
    </div>
  );
};

export default FamilyTreeMap;
