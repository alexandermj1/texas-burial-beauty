import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList, Loader2, Users, AlertTriangle, Plus, Trash2, RotateCcw,
  ShieldCheck, FileSignature, Mail, Building2, CheckCircle2, ChevronDown, Sparkles,
} from "lucide-react";
import {
  QUESTIONS, questionPath, progress, computeRequirements, signingRoster,
  summarise, reqKey, ROLE_LABEL, STATE_LABEL, STATE_ORDER,
  type OwnershipAnswers, type RosterPerson, type PersonRole,
  type RequiredState, type Requirement, type CemeteryDocRules,
} from "@/lib/ownershipRules";

type Props = {
  submissionId: string;
  cemetery?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  /** AI reading only runs once the seller has accepted a quote — it costs money. */
  quoteAccepted?: boolean;
};

type ContractRow = {
  id: string;
  kind: string;
  status: string;
  signature_name: string | null;
  signed_at: string | null;
  notarized_at: string | null;
  completed_at: string | null;
  countersigned_at: string | null;
};

type Reading = {
  answers: Record<string, string>;
  reasons: { key: string; reason: string; confidence: string }[];
  people?: { name: string; role: PersonRole; relationship?: string; email?: string; deceased?: boolean }[];
  open_questions?: string[];
  sources?: { emails: number; notes: number };
};

type DocRow = {
  id: string;
  doc_code: string | null;
  person_name: string | null;
  label: string;
  status: string;
  required_state: string;
  manual_override: string | null;
  notes: string | null;
  file_url: string | null;
};

const STATE_STYLE: Record<RequiredState, string> = {
  not_needed: "bg-muted text-muted-foreground",
  maybe: "bg-slate-100 text-slate-700",
  needed: "bg-amber-100 text-amber-800",
  issued: "bg-blue-100 text-blue-800",
  awaiting_seller: "bg-purple-100 text-purple-800",
  received: "bg-teal-100 text-teal-800",
  notarized: "bg-emerald-100 text-emerald-800",
  complete: "bg-emerald-600 text-white",
};

export default function OwnershipPaperworkPanel({ submissionId, cemetery, sellerName, sellerEmail }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [answers, setAnswers] = useState<OwnershipAnswers>({});
  const [rules, setRules] = useState<CemeteryDocRules | null>(null);
  const [cemName, setCemName] = useState<string | null>(null);
  const [rows, setRows] = useState<DocRow[]>([]);
  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [inferring, setInferring] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sub }, { data: docs }, { data: cons }] = await Promise.all([
      supabase.from("contact_submissions")
        .select("ownership_answers, name, email").eq("id", submissionId).maybeSingle(),
      supabase.from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url")
        .eq("submission_id", submissionId),
      supabase.from("contracts")
        .select("id, kind, status, signature_name, signed_at, notarized_at, completed_at, countersigned_at")
        .eq("submission_id", submissionId),
    ]);
    const a = ((sub as Record<string, unknown> | null)?.ownership_answers ?? {}) as OwnershipAnswers;
    setAnswers(a && typeof a === "object" ? a : {});
    setRows((docs ?? []) as DocRow[]);
    setContracts((cons ?? []) as ContractRow[]);
    if (cemetery) {
      const { data: cem } = await supabase.from("texas_cemeteries")
        .select("name, doc_rules").ilike("name", cemetery).maybeSingle();
      setRules(((cem as Record<string, unknown> | null)?.doc_rules ?? null) as CemeteryDocRules | null);
      setCemName((cem as { name?: string } | null)?.name ?? null);
    }
    setLoading(false);
  }, [submissionId, cemetery]);

  useEffect(() => { void load(); }, [load]);

  const path = questionPath(answers);
  const prog = progress(answers);
  const requirements = useMemo(() => computeRequirements(answers, rules), [answers, rules]);
  const roster = useMemo(() => signingRoster(answers), [answers]);

  /**
   * What the signed-contract record already proves. A contract we have on file
   * beats whatever the checklist row says, unless an admin has manually
   * overridden that row.
   */
  const contractStates = useMemo(() => {
    const m: Record<string, RequiredState> = {};
    const stateOf = (c: ContractRow): RequiredState | null => {
      if (c.status === "void" || c.status === "draft") return null;
      if (c.completed_at || c.countersigned_at || c.status === "completed") return "complete";
      if (c.notarized_at || c.status === "notarized") return "notarized";
      if (c.signed_at || c.status === "signed") return "received";
      if (c.status === "sent" || c.status === "viewed") return "issued";
      return null;
    };
    const codeFor: Record<string, string> = {
      listing_agreement: "LA",
      poa: "D21",
      affidavit_heirship: "D12",
      spousal_consent: "D3",
    };
    const rank: RequiredState[] = ["issued", "received", "notarized", "complete"];
    for (const c of contracts) {
      const st = stateOf(c);
      const code = codeFor[c.kind];
      if (!st || !code) continue;
      // POAs are per-person; everything else is a single submission-level item.
      const key = code === "D21" ? `D21::${c.signature_name ?? ""}` : `${code}::`;
      const prev = m[key];
      if (!prev || rank.indexOf(st) > rank.indexOf(prev)) m[key] = st;
    }
    return m;
  }, [contracts]);

  const stateByKey = useMemo(() => {
    const m: Record<string, RequiredState> = { ...contractStates };
    for (const r of rows) {
      if (!r.doc_code) continue;
      const key = `${r.doc_code}::${r.person_name ?? ""}`;
      if (r.manual_override) { m[key] = r.manual_override as RequiredState; continue; }
      const fromContract = contractStates[key];
      if (fromContract) { m[key] = fromContract; continue; }
      m[key] = (r.required_state as RequiredState) ?? "needed";
    }
    return m;
  }, [rows, contractStates]);

  const stats = useMemo(() => summarise(requirements, stateByKey), [requirements, stateByKey]);

  const persistAnswers = async (next: OwnershipAnswers) => {
    setAnswers(next);
    await supabase.from("contact_submissions")
      .update({ ownership_answers: next as never, ownership_roster: (next.people ?? []) as never })
      .eq("id", submissionId);
  };

  const setAnswer = (key: string, value: string) => {
    const next = {
      ...answers,
      [key]: value,
      aiSuggested: (answers.aiSuggested ?? []).filter((k) => k !== key),
    } as OwnershipAnswers;
    void persistAnswers(next);
  };

  const addPerson = () => {
    const people = [...(answers.people ?? []), {
      id: crypto.randomUUID(), name: "", role: "owner" as PersonRole,
    }];
    void persistAnswers({ ...answers, people });
  };
  const updatePerson = (id: string, patch: Partial<RosterPerson>) => {
    const people = (answers.people ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p));
    setAnswers({ ...answers, people });
  };
  const commitPeople = () => void persistAnswers({ ...answers, people: answers.people ?? [] });
  const removePerson = (id: string) => {
    void persistAnswers({ ...answers, people: (answers.people ?? []).filter((p) => p.id !== id) });
  };

  /** Ask the AI to read the file (form + notes + email chain) and propose answers. */
  const inferFromFile = async () => {
    setInferring(true);
    try {
      const { data, error } = await supabase.functions.invoke("infer-ownership", {
        body: { submission_id: submissionId },
      });
      if (error) throw error;
      const r = data as Reading;
      if (!r?.answers || !Object.keys(r.answers).length) {
        setReading(r ?? null);
        toast.message("Nothing in the file was clear enough to answer with");
        return;
      }
      setReading(r);
      const suggested = Object.keys(r.answers);
      const people = (r.people ?? [])
        .filter((p) => p.name?.trim())
        .map((p) => ({ id: crypto.randomUUID(), ...p }));
      const existing = answers.people ?? [];
      const merged = [
        ...existing,
        ...people.filter((p) => !existing.some((e) => e.name.trim().toLowerCase() === p.name.trim().toLowerCase())),
      ];
      await persistAnswers({
        ...answers,
        ...r.answers,
        people: merged,
        aiSuggested: [...new Set([...(answers.aiSuggested ?? []), ...suggested])],
      } as OwnershipAnswers);
      toast.success(`Read the file and filled ${suggested.length} answer${suggested.length === 1 ? "" : "s"} — check each one`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInferring(false);
    }
  };

  /** Write the computed checklist into submission_documents, preserving progress. */
  const syncChecklist = async () => {
    setSaving(true);
    try {
      const existing = new Map(rows.filter((r) => r.doc_code).map((r) => [`${r.doc_code}::${r.person_name ?? ""}`, r]));
      const payload = requirements.map((r, i) => {
        const prev = existing.get(reqKey(r));
        return {
          id: prev?.id,
          submission_id: submissionId,
          doc_code: r.code,
          person_name: r.personName ?? null,
          person_role: r.personRole ?? null,
          document_type: r.code,
          label: r.label,
          status: prev?.status ?? "pending",
          required_state: (prev?.required_state as string) ?? (r.review ? "maybe" : "needed"),
          manual_override: prev?.manual_override ?? null,
          issued_by_us: !!r.issuedByUs,
          needs_notary: !!r.needsNotary,
          why: r.why,
          statute_ref: r.statute ?? null,
          sort_order: i,
        };
      });
      const { error } = await supabase.from("submission_documents")
        .upsert(payload as never, { onConflict: "id" });
      if (error) throw error;
      // Remove auto-generated rows that the rules no longer call for and that
      // nobody has touched (untouched = still pending, no file, no override).
      const wanted = new Set(requirements.map(reqKey));
      const stale = rows.filter((r) =>
        r.doc_code && !wanted.has(`${r.doc_code}::${r.person_name ?? ""}`)
        && !r.file_url && !r.manual_override && (r.status === "pending" || !r.status));
      if (stale.length) {
        await supabase.from("submission_documents").delete().in("id", stale.map((s) => s.id));
      }
      toast.success("Paperwork checklist updated");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setRowState = async (r: Requirement, value: RequiredState) => {
    const row = rows.find((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
    if (!row) { toast.error("Sync the checklist first"); return; }
    setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, manual_override: value, required_state: value } : x)));
    await supabase.from("submission_documents")
      .update({ manual_override: value, required_state: value, status: value === "complete" ? "received" : "pending" })
      .eq("id", row.id);
  };

  const generateDoc = async (r: Requirement) => {
    if (!r.contractKind) return;
    setBusy(reqKey(r));
    try {
      const { error } = await supabase.functions.invoke("generate-contract", {
        body: {
          submission_id: submissionId,
          kind: r.contractKind,
          overrides: r.personName ? { seller_name: r.personName } : {},
        },
      });
      if (error) throw error;
      toast.success(`${r.label} generated — open the Contracts section to send it`);
      await setRowState(r, "issued");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const emailOutstanding = async () => {
    const outstanding = requirements.filter((r) => {
      const s = stateByKey[reqKey(r)] ?? "needed";
      return s !== "complete" && s !== "received" && s !== "notarized" && s !== "not_needed" && !r.issuedByUs;
    });
    if (!outstanding.length) return toast.message("Nothing outstanding to request");
    const body = outstanding.map((r) => `• ${r.label}${r.why ? ` — ${r.why}` : ""}`).join("\n");
    await navigator.clipboard.writeText(
      `Hi ${(sellerName ?? "").split(" ")[0] || "there"},\n\nTo move your sale forward we still need the following:\n\n${body}\n\nYou can reply to this email with photos or scans of anything on the list.\n\nTexas Cemetery Brokers`,
    );
    toast.success("Outstanding-items email copied — paste it into a reply");
  };

  const general = requirements.filter((r) => !r.personName);
  const byPerson = roster.map((p) => ({ person: p, items: requirements.filter((r) => r.personName === p.name) }))
    .filter((g) => g.items.length);

  const Chip = ({ r }: { r: Requirement }) => {
    const s = stateByKey[reqKey(r)] ?? (r.review ? "maybe" : "needed");
    const synced = rows.some((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
    const row = rows.find((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
    const fromContract = !row?.manual_override && !!contractStates[reqKey(r)];
    return (
      <div className={`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2 ${r.review ? "border-amber-300 bg-amber-50/50" : "bg-background/60"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {r.review && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            <span className="text-sm font-medium">{r.label}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.code}</span>
            {r.issuedByUs && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">We issue</span>}
            {r.needsNotary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">Notary</span>}
            {r.originalsOnly && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Originals</span>}
            {fromContract && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />On file
              </span>
            )}
            {r.fromCemetery && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 inline-flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" />{cemName ?? "Cemetery"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {r.why}{r.statute ? ` · ${r.statute}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {r.contractKind && (
            <Button size="sm" variant="outline" disabled={busy === reqKey(r) || !synced} onClick={() => generateDoc(r)}>
              {busy === reqKey(r)
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <FileSignature className="w-3.5 h-3.5" />}
            </Button>
          )}
          <select
            className={`text-[11px] rounded px-2 py-1 border-0 font-medium ${STATE_STYLE[s]}`}
            value={s}
            disabled={!synced}
            onChange={(e) => void setRowState(r, e.target.value as RequiredState)}
          >
            {STATE_ORDER.map((v) => <option key={v} value={v}>{STATE_LABEL[v]}</option>)}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="border-t border-border/40 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 mb-3 text-left"
      >
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="w-3 h-3" /> Ownership &amp; paperwork
        </p>
        <div className="flex items-center gap-2">
          {stats.total > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {stats.done} of {stats.total} complete
              {stats.waitingOn.length > 0 && ` · waiting on ${stats.waitingOn.length} ${stats.waitingOn.length === 1 ? "person" : "people"}`}
            </span>
          )}
          {stats.blockers > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />{stats.blockers}
            </span>
          )}
          {stats.total > 0 && stats.done === stats.total && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading ownership file…
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Questionnaire ── */}
          <div className="border rounded-lg p-3 bg-background/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Who has the right to sell
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{prog.answered}/{prog.total} answered</span>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={inferFromFile} disabled={inferring}>
                  {inferring
                    ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  Read the file
                </Button>
              </div>
            </div>

            {reading && (
              <div className="rounded-md border border-violet-200 bg-violet-50/60 px-2.5 py-2 space-y-1">
                <p className="text-[11px] font-medium text-violet-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Read from the intake form, notes and {reading.sources?.emails ?? 0} email{reading.sources?.emails === 1 ? "" : "s"}
                </p>
                {reading.reasons.map((r) => (
                  <p key={r.key} className="text-[11px] text-violet-900/80">
                    <span className="font-medium">{QUESTIONS[r.key]?.eyebrow ?? r.key}:</span> {r.reason}
                    <span className="ml-1 opacity-60">({r.confidence} confidence)</span>
                  </p>
                ))}
                {(reading.open_questions ?? []).length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-medium text-violet-900">Still to ask the seller</p>
                    {reading.open_questions!.map((q) => (
                      <p key={q} className="text-[11px] text-violet-900/80">• {q}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {path.map((key) => {
              const q = QUESTIONS[key];
              const value = (answers as Record<string, unknown>)[key] as string | undefined;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    {q.question}
                    {(answers.aiSuggested ?? []).includes(key) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 inline-flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />AI — confirm
                      </span>
                    )}
                  </p>
                  {q.hint && <p className="text-[11px] text-muted-foreground">{q.hint}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {q.answers.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.detail}
                        onClick={() => setAnswer(key, opt.value)}
                        className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
                          value === opt.value
                            ? "bg-foreground text-background border-foreground"
                            : "bg-background hover:bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Roster ── */}
          <div className="border rounded-lg p-3 bg-background/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" /> People who must sign
              </span>
              <Button size="sm" variant="ghost" onClick={addPerson}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add person
              </Button>
            </div>
            {(answers.people ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Based on the answers above we'll need: {roster.map((r) => r.name).join(", ") || "—"}.
                Add their real names to generate each person's POA and ID request.
              </p>
            ) : (
              <div className="space-y-1.5">
                {(answers.people ?? []).map((p) => (
                  <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[1fr_170px_1fr_auto] gap-1.5 items-center">
                    <Input
                      className="h-8 text-xs" placeholder="Full legal name" value={p.name}
                      onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                      onBlur={commitPeople}
                    />
                    <select
                      className="h-8 text-xs rounded-md border border-input bg-background px-2"
                      value={p.role}
                      onChange={(e) => { updatePerson(p.id, { role: e.target.value as PersonRole }); setTimeout(commitPeople, 0); }}
                    >
                      {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <Input
                      className="h-8 text-xs" placeholder="Email (optional)" value={p.email ?? ""}
                      onChange={(e) => updatePerson(p.id, { email: e.target.value })}
                      onBlur={commitPeople}
                    />
                    <Button size="sm" variant="ghost" onClick={() => removePerson(p.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Checklist ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold">Documents required ({requirements.length})</span>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={emailOutstanding}>
                  <Mail className="w-3.5 h-3.5 mr-1" />Copy outstanding-items email
                </Button>
                <Button size="sm" variant="outline" onClick={syncChecklist} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                  Sync checklist
                </Button>
              </div>
            </div>

            {rules && Object.keys(rules).length > 0 && (
              <p className="text-[11px] text-stone-600 bg-stone-100 rounded px-2 py-1.5">
                <Building2 className="w-3 h-3 inline mr-1" />
                {cemName}'s own rules are applied{rules.notes ? ` — ${rules.notes}` : "."}
              </p>
            )}

            <div className="space-y-1.5">
              {general.map((r) => <Chip key={reqKey(r) + r.label} r={r} />)}
            </div>

            {byPerson.map(({ person, items }) => (
              <div key={person.id} className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {person.name} · {ROLE_LABEL[person.role]}
                </p>
                {items.map((r) => <Chip key={reqKey(r) + r.label} r={r} />)}
              </div>
            ))}

            {requirements.length > 0 && !rows.some((r) => r.doc_code) && (
              <p className="text-[11px] text-amber-700">
                Click <span className="font-medium">Sync checklist</span> to save these items so you can track
                and generate them.
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The list updates as the answers change. Statutory references are guidance, not legal advice —
            anything flagged in amber needs a human decision before the seller signs.
            {sellerEmail ? ` Requests go to ${sellerEmail}.` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
