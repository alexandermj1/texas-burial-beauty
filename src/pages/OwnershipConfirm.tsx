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

/** The roles a seller can sensibly pick for a family member. */
const PUBLIC_ROLES: PersonRole[] = ["owner", "co_owner", "spouse", "heir", "executor", "trustee", "agent", "decedent"];

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
  qKey, answers, believed, confirmed, onAnswer, onConfirm, index, context,
}: {
  qKey: string;
  answers: OwnershipAnswers;
  believed: boolean;
  confirmed: boolean;
  onAnswer: (key: string, value: string) => void;
  onConfirm: (key: string) => void;
  index: number;
  /** Names already gathered, so a question can say who it is talking about. */
  context?: string;
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
            {context && qKey === "rel"
              ? `What is your relationship to ${context}?`
              : context && qKey === "owner"
                ? `Which of these describes ${context}?`
                : q.question}
          </p>

          {q.hint && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {context && qKey === "owner" ? "This decides whose signature the cemetery will accept." : q.hint}
            </p>
          )}


          {!showChoices && value && (
            <div className="mt-4">
              <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  {believed && !confirmed ? "From our records we believe" : "Your answer"}
                </p>
                <p className="text-sm text-foreground mt-0.5">{labelFor(qKey, value)}</p>
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
                  <span className="text-sm text-foreground">{opt.label}</span>
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
  /** The deed-holder card always leads, then the branching questionnaire. */
  const path = useMemo(() => [NAMES_KEY, ...questionPath(answers)], [answers]);

  /**
   * A question is settled once it has an answer the seller owns — either they
   * picked it, or they confirmed the one we had guessed. We only ever show one
   * unsettled question at a time so the page never looks like a form.
   */
  const deedPeople = useMemo(
    () => (answers.people ?? []).filter((p) => p.role === "owner" || p.role === "co_owner" || p.role === "decedent"),
    [answers.people],
  );
  const isSettled = useCallback(
    (k: string) => {
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
          answers: { ...answers, people: (answers.people ?? []).filter((p) => p.name.trim()), sellerNotes: notes.trim() || undefined },
          finished: false,
        },
      });
      setDraftSaving(false);
      setDraftSavedAt(new Date());
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, notes, loading, sent, submissionId]);

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

  const showFamily = answers.owner === "deceased" || answers.owners === "multiple" || people.length > 0;

  const addPerson = () => {
    dirty.current = true;
    setAnswers((a) => ({
      ...a,
      people: [...(a.people ?? []), { id: crypto.randomUUID(), name: "", role: "heir" as PersonRole }],
    }));
  };
  const updatePerson = (id: string, patch: Partial<RosterPerson>) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, people: (a.people ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  };
  const removePerson = (id: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, people: (a.people ?? []).filter((p) => p.id !== id) }));
  };


  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...answers,
        people: (answers.people ?? []).filter((p) => p.name.trim()),
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
                  ) : (
                    <QuestionCard
                      qKey={key}
                      index={i + 1}
                      answers={answers}
                      context={key === "rel" || key === "owner" ? deedNamesLabel : undefined}
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


            {allSettled && showFamily && (
              <div className="mt-10 rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-7 animate-in fade-in slide-in-from-bottom-2 duration-500">

                <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-1.5">The family</div>
                <p className="font-display text-2xl leading-snug text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Who is in the picture?
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  List everyone connected to the plot — the person named on the deed, their spouse, and any children or
                  other relatives who would inherit. Tick “has passed away” for anyone in the chain who has died; we
                  need them named even so. Nobody is contacted without speaking to you first.
                </p>

                <div className="mt-5 space-y-3">
                  {people.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/70 bg-background p-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground">Full name</label>
                          <input
                            value={p.name}
                            onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                            placeholder="e.g. Mary Ellen Carter"
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground">Their part in this</label>
                          <select
                            value={p.role}
                            onChange={(e) => updatePerson(p.id, { role: e.target.value as PersonRole })}
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          >
                            {PUBLIC_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground">Relationship (optional)</label>
                          <input
                            value={p.relationship ?? ""}
                            onChange={(e) => updatePerson(p.id, { relationship: e.target.value })}
                            placeholder="daughter, brother, surviving spouse…"
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground">Email (optional)</label>
                          <input
                            value={p.email ?? ""}
                            onChange={(e) => updatePerson(p.id, { email: e.target.value })}
                            placeholder="So we can send them anything they must sign"
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!p.deceased}
                            onChange={(e) => updatePerson(p.id, { deceased: e.target.checked })}
                            className="accent-[hsl(var(--primary))]"
                          />
                          <HeartCrack className="w-3.5 h-3.5" /> This person has passed away
                        </label>
                        <button
                          onClick={() => removePerson(p.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addPerson}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40 text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" /> Add {people.length ? "another person" : "the first person"}
                </button>
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
                  {saving ? "Sending…" : "Send this to my broker"}
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
