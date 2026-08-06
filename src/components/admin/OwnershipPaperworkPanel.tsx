import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList, Loader2, Users, AlertTriangle, Plus, Trash2, RotateCcw,
  ShieldCheck, FileSignature, Building2, CheckCircle2, ChevronDown, Sparkles,
  Paperclip, Link2, Undo2, Send, FileText, Mail, Monitor,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ContractsPanel from "./ContractsPanel";
import {
  QUESTIONS, questionPath, progress, computeRequirements, signingRoster,
  summarise, reqKey, ROLE_LABEL, STATE_LABEL, STATE_ORDER, DOC_GUIDE,
  canIssueJointPoa, isDeceasedPerson,
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
  sign_token: string | null;
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

/** A file the seller has sent us, wherever it landed. */
type AnyFile = {
  name: string;
  path: string;
  bucket: "customer-files" | "portal-uploads";
  origin: string;
  docId?: string;
  extractedData?: Record<string, unknown> | null;
  extractedSummary?: string | null;
};

const PUBLIC_SITE_URL = "https://www.texascemeterybrokers.com";

/**
 * What a read document actually proves. Only the extractor's classification
 * counts here — filenames and stray words inside a document (an ID number
 * printed on a deed, the word "certificate" in a letter) are not evidence, and
 * matching on them is what made the checklist claim we hold things we don't.
 */
const TYPE_CODES: { test: RegExp; codes: string[] }[] = [
  { test: /(cemetery deed|interment right|certificate of ownership|ownership certificate|\bdeed\b)/, codes: ["D1"] },
  { test: /(driver.?s? licen|government id|state id|passport|identification card|photo id)/, codes: ["D2", "D2P"] },
  { test: /death certificate/, codes: ["D6", "D22"] },
  { test: /affidavit of heirship/, codes: ["D12"] },
  { test: /small estate affidavit/, codes: ["D13"] },
  { test: /letters testamentary/, codes: ["D8"] },
  { test: /(letters of administration|judgment determining heirship|determination of heirship)/, codes: ["D10"] },
  { test: /muniment of title/, codes: ["D9"] },
  { test: /(last will|\bwill\b|testament)/, codes: ["D7"] },
  { test: /power of attorney/, codes: ["D21", "D15"] },
  { test: /guardianship/, codes: ["D18"] },
  { test: /(marriage (certificate|licen)|name.?change)/, codes: ["D5"] },
  { test: /divorce decree/, codes: ["D4"] },
  { test: /(trust agreement|certification of trust)/, codes: ["D16"] },

];

const codesForFile = (f: AnyFile): string[] => {
  const type = String(f.extractedData?.document_type ?? "").toLowerCase();
  if (!type) return [];
  const hit = TYPE_CODES.find((t) => t.test.test(type));
  return hit ? hit.codes : [];
};

/** Does this file plainly name the person the requirement is about? */
const fileNamesPerson = (f: AnyFile, person?: string | null) => {
  if (!person?.trim()) return true;
  const parts = person.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (!parts.length) return true;
  const hay = `${JSON.stringify(f.extractedData ?? {})} ${f.extractedSummary ?? ""} ${f.name}`.toLowerCase();
  return parts.every((p) => hay.includes(p));
};

const fileMatchesRequirement = (f: AnyFile, r: Requirement, row?: DocRow) => {
  // A file the seller uploaded against this exact checklist item always counts.
  if (row && f.docId === row.id) return true;
  const codes = codesForFile(f);
  if (!codes.includes(r.code)) return false;
  // Per-person items (photo ID, POA) must actually be that person's document.
  if (["D2", "D2P", "D21"].includes(r.code)) return fileNamesPerson(f, r.personName);
  return true;
};



export default function OwnershipPaperworkPanel({ submissionId, cemetery, sellerName, sellerEmail, quoteAccepted }: Props) {
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
  const [files, setFiles] = useState<AnyFile[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [poaPrompt, setPoaPrompt] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);
  /** A prepared PDF shown inline so it can be checked without leaving the page. */
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  /** The send-document-request review flow. */
  const [review, setReview] = useState<null | { step: 1 | 2; html?: string; subject?: string; loading?: boolean }>(null);


  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sub }, { data: docs }, { data: cons }] = await Promise.all([
      supabase.from("contact_submissions")
        .select("ownership_answers, name, email, customer_profile_id, seller_attachments").eq("id", submissionId).maybeSingle(),
      supabase.from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url")
        .eq("submission_id", submissionId),
      supabase.from("contracts")
        .select("id, kind, status, signature_name, signed_at, notarized_at, completed_at, countersigned_at, sign_token")
        .eq("submission_id", submissionId),
    ]);
    const a = ((sub as Record<string, unknown> | null)?.ownership_answers ?? {}) as OwnershipAnswers;
    setAnswers(a && typeof a === "object" ? a : {});
    setRows((docs ?? []) as DocRow[]);
    setContracts((cons ?? []) as ContractRow[]);

    // Everything the seller has actually sent us, from all three places files land.
    const collected: AnyFile[] = [];
    const sellerFiles = (sub as { seller_attachments?: { path?: string; name?: string }[] } | null)?.seller_attachments;
    for (const f of Array.isArray(sellerFiles) ? sellerFiles : []) {
      if (f?.path) collected.push({ name: f.name ?? f.path, path: f.path, bucket: "customer-files", origin: "Intake form" });
    }
    const profileId = (sub as { customer_profile_id?: string } | null)?.customer_profile_id;
    if (profileId) {
      const { data: cf } = await supabase.from("customer_files")
        .select("file_name, file_path, document_type, extracted_data, extracted_summary").eq("customer_profile_id", profileId);
      for (const f of cf ?? []) {
        if (!collected.some((c) => c.path === f.file_path)) {
          collected.push({
            name: f.file_name,
            path: f.file_path,
            bucket: "customer-files",
            origin: f.document_type ?? "Uploaded",
            extractedData: (f.extracted_data as Record<string, unknown> | null) ?? null,
            extractedSummary: f.extracted_summary ?? null,
          });
        }
      }
    }
    for (const d of docs ?? []) {
      if (d.file_url && !collected.some((c) => c.path === d.file_url)) {
        collected.push({ name: d.file_url.split("/").pop() ?? d.file_url, path: d.file_url, bucket: "portal-uploads", origin: "Document packet", docId: d.id });
      }
    }
    setFiles(collected);

    if (cemetery) {
      const { data: cem } = await supabase.from("texas_cemeteries")
        .select("name, doc_rules").ilike("name", cemetery).maybeSingle();
      setRules(((cem as Record<string, unknown> | null)?.doc_rules ?? null) as CemeteryDocRules | null);
      setCemName((cem as { name?: string } | null)?.name ?? null);
    }
    setLoading(false);
  }, [submissionId, cemetery]);

  /** Open any collected file in a new tab via a short-lived signed URL. */
  const openFile = async (f: AnyFile) => {
    const { data, error } = await supabase.storage.from(f.bucket).createSignedUrl(f.path, 60 * 10);
    if (error || !data) return toast.error("Couldn't open that file");
    window.open(data.signedUrl, "_blank", "noopener");
  };


  useEffect(() => { void load(); }, [load]);

  // The seller's page writes straight into submission_documents — listen so the
  // checklist ticks itself the moment a file lands, with no manual refresh.
  useEffect(() => {
    const ch = supabase
      .channel(`docs-${submissionId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "submission_documents", filter: `submission_id=eq.${submissionId}` },
        () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [submissionId, load]);

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
      if (c.status === "void") return null;
      if (c.status === "draft" && c.sign_token) return "issued";
      if (c.status === "draft") return null;
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
      const poaPeople = requirements.filter((r) => r.code === "D21").map((r) => r.personName).filter(Boolean);
      const poaPerson = c.signature_name || (poaPeople.length === 1 ? poaPeople[0] : "");
      const key = code === "D21" ? `D21::${poaPerson ?? ""}` : `${code}::`;
      const prev = m[key];
      if (!prev || rank.indexOf(st) > rank.indexOf(prev)) m[key] = st;
    }
    return m;
  }, [contracts, requirements]);

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

  // Save the computed checklist the first time an admin opens the panel, so the
  // seller's own page is never empty just because nobody pressed Sync.
  useEffect(() => {
    if (!open || loading || autoSynced) return;
    if (!requirements.length || rows.some((r) => r.doc_code)) return;
    setAutoSynced(true);
    void syncChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, autoSynced, rows]);

  /** Is this roster entry plainly the person who sent us the submission? */
  const isTheSeller = (name?: string) => {
    const a = (name ?? "").trim().toLowerCase();
    const b = (sellerName ?? "").trim().toLowerCase();
    if (!a || !b) return false;
    if (a === b) return true;
    const pa = a.split(/\s+/).filter((w) => w.length > 2);
    const pb = b.split(/\s+/).filter((w) => w.length > 2);
    if (!pa.length || !pb.length) return false;
    // Same first and last name, ignoring middle names / initials.
    return pa[0] === pb[0] && pa[pa.length - 1] === pb[pb.length - 1];
  };

  /** The submission already carries the seller's email — never make it be typed again. */
  const withKnownEmails = (people?: RosterPerson[]) =>
    (people ?? []).map((p) =>
      !p.email?.trim() && sellerEmail && isTheSeller(p.name) ? { ...p, email: sellerEmail } : p,
    );

  const persistAnswers = async (next: OwnershipAnswers) => {
    const withEmails = { ...next, people: withKnownEmails(next.people) } as OwnershipAnswers;
    setAnswers(withEmails);
    await supabase.from("contact_submissions")
      .update({ ownership_answers: withEmails as never, ownership_roster: (withEmails.people ?? []) as never })
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
    if (!quoteAccepted) {
      toast.message("The AI reading only runs after the seller accepts a quote");
      return;
    }
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

  /** The live checklist rows, keyed the same way the DB's unique item index is. */
  const fetchLiveRows = async (): Promise<DocRow[]> => {
    const { data } = await supabase.from("submission_documents")
      .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url")
      .eq("submission_id", submissionId);
    return (data ?? []) as DocRow[];
  };
  const keyOf = (code?: string | null, person?: string | null) => `${code ?? ""}::${person ?? ""}`;

  /** Write the computed checklist into submission_documents, preserving progress. */
  const syncChecklist = async () => {
    setSaving(true);
    try {
      // Read the live rows first: the unique index is on (submission, code,
      // person), so inserting against a stale snapshot is what produced the
      // duplicate-key error.
      const live = await fetchLiveRows();
      const existing = new Map(live.filter((r) => r.doc_code).map((r) => [keyOf(r.doc_code, r.person_name), r]));
      const seen = new Set<string>();
      const inserts: Record<string, unknown>[] = [];
      const updates: { id: string; patch: Record<string, unknown> }[] = [];

      requirements.forEach((r, i) => {
        const key = reqKey(r);
        if (seen.has(key)) return; // never write the same item twice in one pass
        seen.add(key);
        const prev = existing.get(key);
        const base = {
          submission_id: submissionId,
          doc_code: r.code,
          person_name: r.personName ?? null,
          person_role: r.personRole ?? null,
          document_type: r.code,
          label: r.label,
          issued_by_us: !!r.issuedByUs,
          needs_notary: !!r.needsNotary,
          why: r.why,
          statute_ref: r.statute ?? null,
          sort_order: i,
        };
        if (prev) {
          updates.push({ id: prev.id, patch: base });
        } else {
          inserts.push({
            ...base,
            status: "pending",
            required_state: r.review ? "maybe" : "needed",
            manual_override: null,
          });
        }
      });

      if (inserts.length) {
        const { error } = await supabase.from("submission_documents").insert(inserts as never);
        if (error) throw error;
      }
      for (const u of updates) {
        const { error } = await supabase.from("submission_documents")
          .update(u.patch as never).eq("id", u.id);
        if (error) throw error;
      }

      // Remove auto-generated rows that the rules no longer call for and that
      // nobody has touched (untouched = still pending, no file, no override).
      const wanted = new Set(requirements.map(reqKey));
      const stale = live.filter((r) => {
         const key = keyOf(r.doc_code, r.person_name);
         const supersededGeneralId = r.doc_code === "D2" && requirements.some((x) => x.code === "D2P");
         const supersededPlaceholder = !!r.person_name
           && /^(owner on the deed|each co-owner|each heir|executor|trustee|authorised officer|person acting under authority)$/i.test(r.person_name)
           && requirements.some((x) => x.code === r.doc_code && x.personName && x.personName !== r.person_name);
         return !!r.doc_code && !wanted.has(key) && !r.file_url
           && (supersededGeneralId || supersededPlaceholder || (!r.manual_override && (r.status === "pending" || !r.status)));
       });
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

  /** Set a requirement's state, creating its checklist row on the fly if needed. */
  const setRowState = async (r: Requirement, value: RequiredState) => {
    const status = ["received", "notarized", "complete"].includes(value) ? "received" : "pending";
    const patch = { manual_override: value, required_state: value, status };
    const local = rows.find((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
    if (local) {
      setRows((prev) => prev.map((x) => (x.id === local.id ? { ...x, ...patch } : x)));
      const { error } = await supabase.from("submission_documents").update(patch).eq("id", local.id);
      if (error) toast.error(error.message);
      return;
    }
    // No local row — the DB may still hold one (another tab, the seller page).
    const live = await fetchLiveRows();
    const remote = live.find((x) => keyOf(x.doc_code, x.person_name) === reqKey(r));
    if (remote) {
      const { error } = await supabase.from("submission_documents").update(patch).eq("id", remote.id);
      if (error) { toast.error(error.message); return; }
      setRows((prev) => prev.some((p) => p.id === remote.id)
        ? prev.map((p) => (p.id === remote.id ? { ...p, ...patch } : p))
        : [...prev, { ...remote, ...patch }]);
      return;
    }
    const { data, error } = await supabase.from("submission_documents").insert({
      submission_id: submissionId,
      doc_code: r.code,
      person_name: r.personName ?? null,
      person_role: r.personRole ?? null,
      document_type: r.code,
      label: r.label,
      ...patch,
      issued_by_us: !!r.issuedByUs,
      needs_notary: !!r.needsNotary,
      why: r.why,
      statute_ref: r.statute ?? null,
    } as never).select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url").maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) setRows((prev) => [...prev, data as DocRow]);
  };


  /** The seller's curated upload page — one link with everything on it. */
  const packetUrl = `${PUBLIC_SITE_URL}/documents?s=${submissionId}`;
  const copyPacketLink = async () => {
    await navigator.clipboard.writeText(packetUrl);
    toast.success("Seller document link copied");
  };
  /** Everything still owed by the seller, in the order the checklist shows it. */
  const outstanding = useMemo(() => requirements.filter((r) => {
    if (r.code === "REVIEW" || r.code === "NOTE" || r.code === "LA") return false;
    const s = stateByKey[reqKey(r)] ?? (r.review ? "maybe" : "needed");
    return !["complete", "received", "notarized", "not_needed"].includes(s);
  }), [requirements, stateByKey]);

  const poaRequired = requirements.some((r) => r.contractKind === "poa");
  const poaContract = contracts.find((c) => c.kind === "poa" && c.status !== "void");

  /** Generate the POA so it can travel inside the same packet email. */
  const preparePoa = async () => {
    const req = requirements.find((r) => r.contractKind === "poa");
    setBusy("poa");
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: {
          submission_id: submissionId, kind: "poa",
          overrides: {
            ...(req?.personName ? { seller_name: req.personName } : {}),
            ...(req?.jointNames ? { joint_names: req.jointNames } : {}),
          },
        },
      });
      if (error) throw error;
      const res = data as { pdf_url?: string | null };
      if (res?.pdf_url) setPdfPreview({ url: res.pdf_url, title: req?.label ?? "Power of Attorney" });
      toast.success("Power of Attorney prepared — check it below, then send");
      await load();
      setPoaPrompt(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  /** The items and POA link that make up the request, shared by preview and send. */
  const buildPacketPayload = async () => {
    let poaUrl: string | null = null;
    let poaFor: string | null = null;
    if (poaContract) {
      const { data: c } = await supabase.from("contracts")
        .select("sign_token, signature_name").eq("id", poaContract.id).maybeSingle();
      if (c?.sign_token) {
        poaUrl = `${PUBLIC_SITE_URL}/sign/${c.sign_token}`;
        poaFor = (c as { signature_name?: string | null }).signature_name ?? null;
      }
    }
    const items = outstanding.map((r) => {
      const g = DOC_GUIDE[r.code];
      return {
        code: r.code,
        label: r.label,
        why: r.why,
        what: g?.what,
        how: g?.how,
        person: r.personName ?? null,
        needsNotary: !!r.needsNotary,
        issuedByUs: !!r.issuedByUs,
      };
    });
    return { items, poaUrl, poaFor };
  };

  /** Step 2 of the review: fetch the exact email without sending anything. */
  const loadEmailPreview = async () => {
    setReview({ step: 2, loading: true });
    try {
      if (!rows.some((r) => r.doc_code)) await syncChecklist();
      const { items, poaUrl, poaFor } = await buildPacketPayload();
      const { data, error } = await supabase.functions.invoke("send-document-packet", {
        body: { submission_id: submissionId, items, packet_url: packetUrl, poa_url: poaUrl, poa_for: poaFor, preview: true },
      });
      if (error) throw error;
      const res = data as { html?: string; subject?: string };
      setReview({ step: 2, html: res?.html, subject: res?.subject });
    } catch (e) {
      toast.error((e as Error).message);
      setReview({ step: 1 });
    }
  };

  /** One email: the curated upload page, every outstanding item explained, and
   *  the POA notary route folded in so the seller only ever gets one message. */
  const sendPacketEmail = async () => {
    if (!sellerEmail) return toast.error("This submission has no email address");
    setSending(true);
    try {
      // Make sure the seller's page actually lists these items.
      if (!rows.some((r) => r.doc_code)) await syncChecklist();
      const { items, poaUrl, poaFor } = await buildPacketPayload();

      const { error } = await supabase.functions.invoke("send-document-packet", {
        body: { submission_id: submissionId, items, packet_url: packetUrl, poa_url: poaUrl, poa_for: poaFor },
      });
      if (error) throw error;
      toast.success(`Document request emailed to ${sellerEmail}`, {
        description: `${items.length} item${items.length === 1 ? "" : "s"}${poaUrl ? " + Power of Attorney" : ""}`,
      });
      setPoaPrompt(false);
      setReview(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const generateDoc = async (r: Requirement) => {
    if (!r.contractKind) return;
    setBusy(reqKey(r));
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: {
          submission_id: submissionId,
          kind: r.contractKind,
          overrides: {
            ...(r.personName ? { seller_name: r.personName } : {}),
            ...(r.jointNames ? { joint_names: r.jointNames } : {}),
          },
        },
      });
      if (error) throw error;
      const res = data as { pdf_url?: string | null; sign_token?: string | null };
      // Show the filled PDF inline so it can be checked line by line.
      if (res?.pdf_url) setPdfPreview({ url: res.pdf_url, title: r.label });
      toast.success(`${r.label} prepared`, {
        description: res?.pdf_url ? "Opened below so you can check every field." : "Open the contract to review it.",
      });
      await setRowState(r, "issued");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  /** Re-open the already-prepared contract PDF for a requirement, inline. */
  const openContractPdf = async (r: Requirement) => {
    const matches = contracts.filter((x) => x.kind === r.contractKind && x.status !== "void");
    // Several POAs can exist (one per signer) — prefer the one made for this person.
    const wanted = (r.jointNames?.join(" & ") ?? r.personName ?? "").toLowerCase();
    const c = matches.find((x) => (x.signature_name ?? "").toLowerCase() === wanted)
      ?? matches.find((x) => wanted && (x.signature_name ?? "").toLowerCase().includes(wanted.split(" ")[0]))
      ?? matches[0];
    if (!c) return;
    setBusy(`${reqKey(r)}-open`);
    try {
      const { data } = await supabase.from("contracts")
        .select("filled_pdf_path, signed_pdf_path, notarized_pdf_path, sign_token").eq("id", c.id).maybeSingle();
      const path = data?.notarized_pdf_path || data?.signed_pdf_path || data?.filled_pdf_path;
      if (path) {
        const { data: signed } = await supabase.storage.from("contracts").createSignedUrl(path, 3600);
        if (signed?.signedUrl) { setPdfPreview({ url: signed.signedUrl, title: r.label }); return; }
      }
      if (data?.sign_token) {
        setPdfPreview({ url: `${PUBLIC_SITE_URL}/sign/${data.sign_token}`, title: r.label });
        return;
      }
      toast.error("No prepared PDF found yet — press Prepare first.");
    } finally {
      setBusy(null);
    }
  };

  /** Every POA the checklist calls for, and whether a prepared copy matches it. */
  const poaRequirements = requirements.filter((r) => r.contractKind === "poa");
  const preparedPoaFor = (r: Requirement) => {
    const wanted = (r.jointNames?.join(" & ") ?? r.personName ?? "").toLowerCase();
    const list = contracts.filter((x) => x.kind === "poa" && x.status !== "void");
    return list.find((x) => (x.signature_name ?? "").toLowerCase() === wanted)
      ?? (wanted ? list.find((x) => (x.signature_name ?? "").toLowerCase().includes(wanted.split(" ")[0])) : list[0]);
  };
  /** A joint POA was asked for but the prepared copy only names one person. */
  const jointMismatch = (r: Requirement) => {
    if (!r.jointNames || r.jointNames.length < 2) return false;
    const c = preparedPoaFor(r);
    if (!c) return false;
    const name = (c.signature_name ?? "").toLowerCase();
    return !r.jointNames.every((n) => name.includes(n.trim().toLowerCase().split(" ")[0]));
  };

  /** Add a one-off document to this file's checklist. */
  const addExtraDoc = async () => {
    const label = newDoc.label.trim();
    if (!label) return toast.error("Give the document a name");
    const extraDocs = [...(answers.extraDocs ?? []), {
      id: crypto.randomUUID().slice(0, 8),
      label,
      why: newDoc.why.trim() || undefined,
      person: newDoc.person.trim() || undefined,
      needsNotary: newDoc.needsNotary,
    }];
    await persistAnswers({ ...answers, extraDocs });
    setNewDoc({ label: "", why: "", person: "", needsNotary: false });
    setAddDocOpen(false);
    toast.success(`"${label}" added — press Sync checklist to publish it to the seller's page`);
  };

  const removeExtraDoc = async (id: string) => {
    await persistAnswers({ ...answers, extraDocs: (answers.extraDocs ?? []).filter((d) => d.id !== id) });
    await supabase.from("submission_documents").delete()
      .eq("submission_id", submissionId).eq("doc_code", `X-${id}`);
    await load();
  };




  const documentRequirements = requirements.filter((r) => r.code !== "LA");
  const general = documentRequirements.filter((r) => !r.personName);
  const byPerson = roster.map((p) => ({ person: p, items: requirements.filter((r) => r.personName === p.name) }))
    .filter((g) => g.items.length);

  /** Do we physically hold a certificate of ownership / plot deed already? */
  const deedOnFile = files.some((f) => codesForFile(f).includes("D1"));


  /** Files that look like they satisfy this requirement. */
  const filesFor = (r: Requirement): AnyFile[] => {
    const row = rows.find((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
    return files.filter((f) => fileMatchesRequirement(f, r, row));
  };

  // Documents often arrive before the ownership interview. Auto-ticking only
  // happens on hard evidence: a file the extractor has actually read and
  // classified as that document (and, for per-person items, one that names the
  // person). Manual admin choices always win.
  useEffect(() => {
    if (loading || !requirements.length || !files.length) return;
    const satisfied = requirements.filter((r) => {
      if (["LA", "D21", "REVIEW", "NOTE"].includes(r.code)) return false;
      const row = rows.find((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
      const state = stateByKey[reqKey(r)];
      return !row?.manual_override && !["received", "notarized", "complete"].includes(state ?? "")
        && files.some((f) => f.extractedData && fileMatchesRequirement(f, r, row));
    });

    if (!satisfied.length) return;
    void (async () => {
      for (const r of satisfied) await setRowState(r, "received");
      await load();
    })();
    // setRowState and load are stable for the lifetime of this render path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, requirements, files, rows, stateByKey]);

  const Chip = ({ r }: { r: Requirement }) => {
    const key = reqKey(r);
    const s = stateByKey[key] ?? (r.review ? "maybe" : "needed");
    const row = rows.find((x) => x.doc_code === r.code && (x.person_name ?? "") === (r.personName ?? ""));
    const fromContract = !row?.manual_override && !!contractStates[key];
    const guide = DOC_GUIDE[r.code];
    const attached = filesFor(r);
    const isOpen = !!expanded[key];
    const supplied = ["received", "notarized", "complete"].includes(s);
    return (
      <div className={`border rounded-md px-3 py-2 ${r.review ? "border-amber-300 bg-amber-50/50" : "bg-background/60"}`}>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
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
              {attached.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 inline-flex items-center gap-0.5">
                  <Paperclip className="w-2.5 h-2.5" />{attached.length}
                </span>
              )}
              {r.fromCemetery && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 inline-flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" />{cemName ?? "Cemetery"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))}
              className="text-[11px] text-muted-foreground mt-0.5 text-left hover:text-foreground inline-flex items-center gap-1"
            >
              {r.why}{r.statute ? ` · ${r.statute}` : ""}
              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {r.contractKind && (
              <Button size="sm" variant="outline" disabled={busy === key} onClick={() => generateDoc(r)}
                title={`Prepare ${r.label} — fills it in and opens the PDF so you can check it`} className="text-[11px] h-7">
                {busy === key
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <FileSignature className="w-3.5 h-3.5 mr-1" />}
                {contracts.some((c) => c.kind === r.contractKind && c.status !== "void") ? "Re-prepare" : "Prepare"}
              </Button>
            )}
            {r.contractKind && contracts.some((c) => c.kind === r.contractKind && c.status !== "void") && (
              <Button size="sm" variant="ghost" disabled={busy === `${key}-open`} onClick={() => void openContractPdf(r)}
                title="Open the prepared PDF to check every field" className="text-[11px] h-7">
                {busy === `${key}-open`
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <FileText className="w-3.5 h-3.5 mr-1" />}
                Review
              </Button>
            )}

            <Button
              size="sm"
              variant={supplied ? "default" : "outline"}
              className="text-[11px] h-7"
              onClick={() => void setRowState(r, supplied ? "needed" : "received")}
              title={supplied ? "Mark as still needed" : "Mark as supplied"}
            >
              {supplied ? <Undo2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </Button>
            <select
              className={`text-[11px] rounded px-2 py-1 border-0 font-medium ${STATE_STYLE[s]}`}
              value={s}
              onChange={(e) => void setRowState(r, e.target.value as RequiredState)}
            >
              {STATE_ORDER.map((v) => <option key={v} value={v}>{STATE_LABEL[v]}</option>)}
            </select>
          </div>
        </div>

        {isOpen && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
            {guide && (
              <>
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  <span className="font-semibold">What it is: </span>{guide.what}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground/70">How they get it: </span>{guide.how}
                </p>
              </>
            )}
            {attached.length > 0 ? (
              <div className="space-y-1">
                {attached.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => void openFile(f)}
                    className="flex items-center gap-1.5 text-[11px] text-teal-700 hover:underline"
                  >
                    <Paperclip className="w-3 h-3" />{f.name}
                    <span className="text-muted-foreground">· {f.origin}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Nothing uploaded for this item yet.</p>
            )}
          </div>
        )}
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
                <Button
                  size="sm" variant="outline" className="h-7 text-[11px]"
                  onClick={inferFromFile} disabled={inferring || !quoteAccepted}
                  title={quoteAccepted ? "Read the intake form, notes and email chain" : "Available once the seller accepts a quote"}
                >
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
                {(answers.people ?? []).map((p) => {
                  const dead = isDeceasedPerson(p, answers);
                  return (
                    <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[1fr_170px_1fr_auto_auto] gap-1.5 items-center">
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
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={dead}
                          onChange={(e) => {
                            const on = e.target.checked;
                            void persistAnswers({
                              ...answers,
                              people: (answers.people ?? []).map((x) =>
                                x.id === p.id ? { ...x, deceased: on, role: on ? "decedent" as PersonRole : x.role } : x),
                            });
                          }}
                        />
                        Deceased
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => removePerson(p.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* A married couple can execute a single instrument, each signature
                acknowledged separately — one POA instead of two. */}
            {canIssueJointPoa(answers) && (
              <label className="flex items-start gap-2 rounded-md border border-purple-200 bg-purple-50/70 px-2.5 py-2 text-[11px] text-purple-900">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={answers.jointPoa === "yes"}
                  onChange={(e) => setAnswer("jointPoa", e.target.checked ? "yes" : "no")}
                />
                <span>
                  <strong>Issue one joint Power of Attorney</strong> for{" "}
                  {roster.filter((p) => p.role !== "witness").map((p) => p.name).join(" & ")} to sign together.
                  Texas allows two principals on one instrument; each signature is acknowledged separately
                  before the notary, so they only pay and attend once.
                </span>
              </label>
            )}
          </div>


          {/* ── Listing agreement sits on its own, above the paperwork ── */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold">Listing agreement</span>
            <ContractsPanel
              submissionId={submissionId}
              sellerName={sellerName}
              sellerEmail={sellerEmail}
              kinds={["listing_agreement"]}
              hideHeader
            />
          </div>

          {/* ── Checklist ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold">
                Documents required ({documentRequirements.length})
                {outstanding.length > 0 && (
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                    · {outstanding.length} still outstanding
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={copyPacketLink}>
                  <Link2 className="w-3.5 h-3.5 mr-1" />Copy seller link
                </Button>
                <Button size="sm" variant="outline" onClick={syncChecklist} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                  Sync checklist
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                  onClick={() => setReview({ step: 1 })}
                  disabled={sending || !sellerEmail}
                  title={sellerEmail ? `Review, then send everything to ${sellerEmail}` : "No email on this submission"}
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Send document request
                </Button>
              </div>
            </div>



            {rules && Object.keys(rules).length > 0 && (
              <p className="text-[11px] text-stone-600 bg-stone-100 rounded px-2 py-1.5">
                <Building2 className="w-3 h-3 inline mr-1" />
                {cemName}'s own rules are applied{rules.notes ? ` — ${rules.notes}` : "."}
              </p>
            )}

            {answers.deed === "no" && deedOnFile && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2.5 space-y-2">
                <p className="text-[12px] text-emerald-900">
                  A certificate of ownership for this plot is already on file, so the
                  lost-certificate affidavit below isn't needed.
                </p>
                <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  onClick={() => setAnswer("deed", "yes")}>
                  We have the deed — drop the affidavit
                </Button>
              </div>
            )}

            {general.length > 0 && (
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                About the property · not tied to one person
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

            {/* The POA only appears here when the checklist itself has no POA line,
                otherwise it would ask for the same thing twice. */}
            {!requirements.some((r) => r.code === "D21") && (
              <div className="pt-1">
                <ContractsPanel
                  submissionId={submissionId}
                  sellerName={sellerName}
                  sellerEmail={sellerEmail}
                  kinds={["poa"]}
                  hideHeader
                />
              </div>
            )}
          </div>


          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The list updates as the answers change. Statutory references are guidance, not legal advice —
            anything flagged in amber needs a human decision before the seller signs.
            {sellerEmail ? ` Requests go to ${sellerEmail}.` : ""}
          </p>
        </div>
      ))}

      {/* ── Inline PDF check ── */}
      <Dialog open={!!pdfPreview} onOpenChange={(o) => !o && setPdfPreview(null)}>
        <DialogContent className="max-w-4xl z-[90]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" /> {pdfPreview?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Check every filled line before this goes out. Nothing has been sent to the seller.
            </DialogDescription>
          </DialogHeader>
          {pdfPreview && (
            <iframe src={pdfPreview.url} title={pdfPreview.title} className="w-full h-[70vh] rounded-md border bg-white" />
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => window.open(pdfPreview?.url, "_blank", "noopener")}>
              Open in new tab
            </Button>
            <Button size="sm" onClick={() => setPdfPreview(null)}>Looks right</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send document request: review → preview → confirm ── */}
      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" /> {review?.step === 1 ? "Check the request" : "This is exactly what they'll get"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {review?.step === 1
                ? `Nothing is sent until you press Send at the end. Recipient: ${sellerEmail || "—"}.`
                : review?.subject}
            </DialogDescription>
          </DialogHeader>

          {review?.step === 1 && (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto">
              <div className="rounded-md border p-3 space-y-1.5">
                <p className="text-xs font-semibold">{outstanding.length} item{outstanding.length === 1 ? "" : "s"} will be asked for</p>
                {outstanding.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Nothing outstanding — the email will simply confirm we're up to date.</p>
                ) : outstanding.map((r) => (
                  <div key={reqKey(r) + r.label} className="text-[12px] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>
                      {r.label}
                      {r.personName ? <span className="text-muted-foreground"> · {r.personName}</span> : null}
                      {r.needsNotary ? <span className="text-purple-700"> · notary</span> : null}
                    </span>
                  </div>
                ))}
              </div>

              {poaRequired && (
                <div className={`rounded-md border px-3 py-2.5 space-y-2 ${poaContract ? "border-emerald-300 bg-emerald-50" : "border-purple-300 bg-purple-50"}`}>
                  <p className="text-[12px]">
                    {poaContract
                      ? "The Power of Attorney is prepared and will be included in this email with the notary instructions."
                      : "This file needs a Power of Attorney and none has been prepared yet. Prepare it now and it travels inside the same email."}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white"
                      onClick={() => void preparePoa()} disabled={busy === "poa"}>
                      {busy === "poa" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSignature className="w-3.5 h-3.5 mr-1" />}
                      {poaContract ? "Re-prepare & check" : "Prepare the POA now"}
                    </Button>
                    {poaContract && (
                      <Button size="sm" variant="outline"
                        onClick={() => void openContractPdf(requirements.find((r) => r.contractKind === "poa") ?? requirements[0])}>
                        <FileText className="w-3.5 h-3.5 mr-1" />Check the PDF
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                  <Monitor className="w-3.5 h-3.5" /> The page the seller lands on
                </p>
                <iframe src={packetUrl} title="Seller document page" className="w-full h-[300px] rounded border bg-white" />
              </div>
            </div>
          )}

          {review?.step === 2 && (
            review.loading
              ? <div className="h-[60vh] grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              : <iframe srcDoc={review.html ?? ""} title="Email preview" className="w-full h-[60vh] rounded-md border bg-white" />
          )}

          <DialogFooter>
            {review?.step === 1 ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setReview(null)}>Cancel</Button>
                <Button size="sm" className="bg-[#1f2a37] hover:bg-[#111827] text-white" onClick={() => void loadEmailPreview()}>
                  Preview the email →
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setReview({ step: 1 })}>← Back</Button>
                <Button size="sm" className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                  onClick={() => void sendPacketEmail()} disabled={sending || review?.loading}>
                  {sending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Send to {sellerEmail}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

