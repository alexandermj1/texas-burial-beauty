import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import SellerAnswersSummary, { type V2State } from "./SellerAnswersSummary";
import {
  QUESTIONS, questionPath, progress, computeRequirements, signingRoster,
  summarise, reqKey, ROLE_LABEL, STATE_LABEL, STATE_ORDER, DOC_GUIDE,
  canIssueJointPoa, isDeceasedPerson, mailsByDefault,
  ORIGINALS_MAIL_ADDRESS, ORIGINALS_MAIL_REASON,

  type OwnershipAnswers, type RosterPerson, type PersonRole,
  type RequiredState, type Requirement, type CemeteryDocRules,
} from "@/lib/ownershipRules";



type DocFields = {
  seller_name: string; joint_second: string; address: string; city_state_zip: string;
  phone: string; email: string; cemetery: string; county_state: string;
  plot_description: string; plot_count: string;
  listing_option: string; authorized_min_total: string;
};

type Props = {
  submissionId: string;
  cemetery?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  /** AI reading only runs once the seller has accepted a quote — it costs money. */
  quoteAccepted?: boolean;
  /** Fires after the family-tree questionnaire is emailed, so the row badge updates. */
  onSent?: () => void;
};

type ContractRow = {
  id: string;
  kind: string;
  status: string;
  signature_name: string | null;
  fill_data?: Record<string, unknown> | null;
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
  deed_owners?: { name: string; role: PersonRole; deceased?: boolean }[];
  open_questions?: string[];
  sources?: { emails: number; notes: number };
};

/**
 * Loose name key (first + last, lowercased) so a middle name or a spelling
 * variant — "David Alan Cline" vs "David Allan Cline" — is treated as the same
 * person and never spawns a duplicate checklist row.
 */
const personKey = (n?: string | null) => {
  const t = String(n ?? "").toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};
const reqDbKey = (r: Requirement) => `${r.code}::${personKey(r.personName)}`;

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
  file_urls?: string[] | null;
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



export default function OwnershipPaperworkPanel({ submissionId, cemetery, sellerName, sellerEmail, quoteAccepted, onSent }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [answers, setAnswers] = useState<OwnershipAnswers>({});
  /** The deed names an admin has typed off the deed, as stored on the submission. */
  const [deedNamesRaw, setDeedNamesRaw] = useState("");

  const [rules, setRules] = useState<CemeteryDocRules | null>(null);
  const [cemName, setCemName] = useState<string | null>(null);
  const [rows, setRows] = useState<DocRow[]>([]);
  // A file with an accepted quote is always in paperwork mode, so open on arrival.
  const [open, setOpen] = useState(!!quoteAccepted);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  /** Requirements whose auto-fill failed — shown with a retry rather than an endless spinner. */
  const [genFailed, setGenFailed] = useState<Set<string>>(new Set());
  const [inferring, setInferring] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [files, setFiles] = useState<AnyFile[]>([]);
  /** Signed preview URLs for image uploads, keyed by storage path. */
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [poaPrompt, setPoaPrompt] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);
  /** A prepared PDF shown inline so it can be checked without leaving the page. */
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  /** The send-document-request review flow. */
  const [review, setReview] = useState<null | { step: 1 | 2; html?: string; subject?: string; loading?: boolean }>(null);
  /** The "ask the seller these questions" email review flow. */
  const [ask, setAsk] = useState<null | {
    /** "names" = admin types the deed names off the deed; "email" = review + send. */
    step?: "names" | "email";
    deedNames?: { name: string; deceased: boolean }[];
    loading?: boolean; sending?: boolean; html?: string; subject?: string;
    known?: { label: string; value: string }[]; missing?: string[];
  }>(null);

  /** Adding a one-off document to this file's checklist. */
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ label: "", why: "", person: "", needsNotary: false });
  /** Switching a document to "post us the original" and setting the address. */
  const [mailDoc, setMailDoc] = useState<{ r: Requirement; address: string } | null>(null);
  /** Inline editor for a contract (POA / Listing Agreement) before it is generated. */
  const [docEdit, setDocEdit] = useState<null | {
    r: Requirement;
    loading: boolean;
    fields: DocFields;
    /** Every spelling of the seller's name we can find, and where it came from. */
    nameHints?: { name: string; source: string }[];
    /** Plot descriptions exactly as printed on the deed / certificate. */
    plotHints?: { text: string; source: string }[];
  }>(null);



  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sub }, { data: docs }, { data: cons }] = await Promise.all([
      supabase.from("contact_submissions")
        .select("ownership_answers, name, email, customer_profile_id, seller_attachments, deed_owner_names").eq("id", submissionId).maybeSingle(),
      supabase.from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url, file_urls")
        .eq("submission_id", submissionId),
      supabase.from("contracts")
        .select("id, kind, status, signature_name, fill_data, signed_at, notarized_at, completed_at, countersigned_at, sign_token")
        .eq("submission_id", submissionId),
    ]);
    const a = ((sub as Record<string, unknown> | null)?.ownership_answers ?? {}) as OwnershipAnswers;
    setAnswers(a && typeof a === "object" ? a : {});
    setDeedNamesRaw(((sub as { deed_owner_names?: string | null } | null)?.deed_owner_names ?? "") || "");

    // The AI reading is stored on the file, so its explanation survives a reload.
    if (a?.aiReading) setReading(a.aiReading as Reading);
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
      // Sellers often send more than one image per item (front and back of an
      // ID, several deed pages) — show every one of them, not just the last.
      const docPaths = [
        ...(Array.isArray((d as DocRow).file_urls) ? ((d as DocRow).file_urls as string[]) : []),
        ...(d.file_url ? [d.file_url] : []),
      ];
      for (const pth of docPaths) {
        if (!pth || collected.some((c) => c.path === pth)) continue;
        collected.push({
          name: pth.split("/").pop() ?? pth,
          path: pth,
          bucket: "portal-uploads",
          origin: (d as DocRow).label ?? "Document packet",
          docId: d.id,
        });
      }
    }
    setFiles(collected);

    // Signed preview URLs so image uploads can be seen as thumbnails inline.
    const imgs = collected.filter((f) => /\.(jpe?g|png|gif|webp|heic)$/i.test(f.path));
    const previews: Record<string, string> = {};
    await Promise.all(imgs.map(async (f) => {
      const { data } = await supabase.storage.from(f.bucket).createSignedUrl(f.path, 60 * 30);
      if (data?.signedUrl) previews[f.path] = data.signedUrl;
    }));
    setThumbs(previews);

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
  const requirements = useMemo(() => {
    const removed = new Set(answers.removedDocs ?? []);
    return computeRequirements(answers, rules).filter((r) => !removed.has(reqKey(r)));
  }, [answers, rules]);
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
      const key = code === "D21" ? `D21::${personKey(poaPerson)}` : `${code}::`;
      const prev = m[key];
      if (!prev || rank.indexOf(st) > rank.indexOf(prev)) m[key] = st;
    }
    return m;
  }, [contracts, requirements]);

  const stateByKey = useMemo(() => {
    const m: Record<string, RequiredState> = { ...contractStates };
    for (const r of rows) {
      if (!r.doc_code) continue;
      const key = `${r.doc_code}::${personKey(r.person_name)}`;
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
    if (!requirements.length) return;
    setAutoSynced(true);
    void syncChecklist(true);
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
      const keep = {
        answers: r?.answers,
        reasons: r?.reasons ?? [],
        open_questions: r?.open_questions ?? [],
        sources: r?.sources,
        at: new Date().toISOString(),
      } as OwnershipAnswers["aiReading"];
      if (!r?.answers || !Object.keys(r.answers).length) {
        setReading(r ?? null);
        if (r) await persistAnswers({ ...answers, aiReading: keep } as OwnershipAnswers);
        toast.message("Nothing in the file was clear enough to answer with");
        return;
      }
      setReading(r);
      const suggested = Object.keys(r.answers);
      const people = (r.people ?? [])
        .filter((p) => p.name?.trim())
        .map((p) => ({ id: crypto.randomUUID(), ...p }));
      const existing = answers.people ?? [];
      const deedRoles: PersonRole[] = ["owner", "co_owner", "decedent"];
      const authoritativeDeed = (r.deed_owners ?? [])
        .filter((p) => p.name?.trim())
        .map((p) => ({ id: crypto.randomUUID(), ...p }));
      const baseExisting = authoritativeDeed.length
        ? existing.filter((p) => !deedRoles.includes(p.role))
        : existing;
      const merged = [
        ...authoritativeDeed,
        ...baseExisting,
        ...people.filter((p) =>
          !authoritativeDeed.some((d) => d.name.trim().toLowerCase() === p.name.trim().toLowerCase()) &&
          !baseExisting.some((e) => e.name.trim().toLowerCase() === p.name.trim().toLowerCase())),
      ];
      await persistAnswers({
        ...answers,
        ...r.answers,
        people: merged,
        aiReading: keep,
        aiSuggested: [...new Set([...(answers.aiSuggested ?? []), ...suggested])],
      } as OwnershipAnswers);

      toast.success(`Read the file and filled ${suggested.length} answer${suggested.length === 1 ? "" : "s"} — check each one`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInferring(false);
    }
  };

  /**
   * Send the seller their own copy of this questionnaire: what we believe,
   * ready to confirm, plus whatever the AI could not work out.
   */
  /**
   * Step one: an admin reads the deed themselves and types the names exactly as
   * printed. We never ask the seller to correct a machine guess.
   */
  const openAsk = () => {
    const fromRoster = (answers.people ?? [])
      .filter((p) => p.role === "owner" || p.role === "co_owner" || p.role === "decedent")
      .map((p) => ({ name: p.name, deceased: !!p.deceased || p.role === "decedent" }));
    const fromRaw = deedNamesRaw
      .split(/[,;\n]|\band\b|&/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, deceased: false }));
    const seeded = (fromRoster.length ? fromRoster : fromRaw);
    setAsk({ step: "names", deedNames: seeded.length ? seeded : [{ name: "", deceased: false }] });
  };

  /** Save the typed deed names onto the file, then move to the email review. */
  const saveDeedNamesAndPreview = async () => {
    const names = (ask?.deedNames ?? []).map((n) => ({ ...n, name: n.name.trim() })).filter((n) => n.name);
    if (!names.length) { toast.error("Type at least one name from the deed"); return; }

    const others = (answers.people ?? []).filter(
      (p) => !(p.role === "owner" || p.role === "co_owner" || p.role === "decedent"),
    );
    const people: RosterPerson[] = [
      ...names.map((n, i) => {
        const prev = (answers.people ?? []).find((p) => p.name.toLowerCase() === n.name.toLowerCase());
        return {
          ...(prev ?? {}),
          id: prev?.id ?? `deed-${i}-${Date.now()}`,
          name: n.name,
          role: (n.deceased ? "decedent" : i === 0 ? "owner" : "co_owner") as PersonRole,
          deceased: n.deceased,
        } as RosterPerson;
      }),
      ...others,
    ];

    await supabase.from("contact_submissions")
      .update({ deed_owner_names: names.map((n) => n.name).join(", ") })
      .eq("id", submissionId);
    setDeedNamesRaw(names.map((n) => n.name).join(", "));
    await persistAnswers({
      ...answers,
      people,
      deceasedAny: names.some((n) => n.deceased) ? "yes" : answers.deceasedAny,
      derived: [...new Set([...(answers.derived ?? []), "_deedNames"])],
    } as OwnershipAnswers);

    await loadAskPreview();
  };

  /**
   * Send the seller their own copy of this questionnaire: what we believe,
   * ready to confirm, plus whatever the AI could not work out.
   */
  const loadAskPreview = async () => {
    setAsk((a) => ({ ...(a ?? {}), step: "email", loading: true }));
    try {
      const known = questionPath(answers)
        .filter((k) => !!(answers as Record<string, unknown>)[k])
        .map((k) => ({
          label: QUESTIONS[k]?.question ?? k,
          value: QUESTIONS[k]?.answers.find((a) => a.value === (answers as Record<string, string>)[k])?.label ?? "",
        }));
      const missing = questionPath(answers)
        .filter((k) => !(answers as Record<string, unknown>)[k])
        .map((k) => QUESTIONS[k]?.question ?? k);
      const { data, error } = await supabase.functions.invoke("ownership-questions", {
        body: { action: "preview", submission_id: submissionId, known, missing },
      });
      if (error) throw error;
      const r = data as { html?: string; subject?: string; error?: string };
      if (r?.error) throw new Error(r.error);
      setAsk((a) => ({ ...(a ?? {}), step: "email", loading: false, html: r.html, subject: r.subject, known, missing }));
    } catch (e) {
      setAsk(null);
      toast.error((e as Error).message);
    }
  };


  const sendAsk = async () => {
    if (!ask) return;
    setAsk({ ...ask, sending: true });
    try {
      const { data, error } = await supabase.functions.invoke("ownership-questions", {
        body: { action: "send", submission_id: submissionId, known: ask.known, missing: ask.missing },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
      toast.success("Sent — the seller can now confirm or correct every answer");
      setAsk(null);
      setAnswers({ ...answers, questionsSentAt: new Date().toISOString() } as OwnershipAnswers);
      onSent?.();
    } catch (e) {
      setAsk({ ...ask, sending: false });
      toast.error((e as Error).message);
    }
  };



  /** The live checklist rows, keyed the same way the DB's unique item index is. */
  const fetchLiveRows = async (): Promise<DocRow[]> => {
    const { data } = await supabase.from("submission_documents")
      .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url, file_urls")
      .eq("submission_id", submissionId);
    return (data ?? []) as DocRow[];
  };
  const keyOf = (code?: string | null, person?: string | null) => `${code ?? ""}::${personKey(person)}`;
  /** Same requirement, matched loosely on the person's name. */
  const rowFor = (r: Requirement) => rows.find((x) => keyOf(x.doc_code, x.person_name) === reqDbKey(r));

  /** Write the computed checklist into submission_documents, preserving progress. */
  const syncChecklist = async (silent = false) => {
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
        const key = reqDbKey(r);
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
      const wanted = new Set(requirements.map(reqDbKey));
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
      if (!silent) toast.success("Paperwork checklist updated");
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
    const local = rowFor(r);
    if (local) {
      setRows((prev) => prev.map((x) => (x.id === local.id ? { ...x, ...patch } : x)));
      const { error } = await supabase.from("submission_documents").update(patch).eq("id", local.id);
      if (error) toast.error(error.message);
      return;
    }
    // No local row — the DB may still hold one (another tab, the seller page).
    const live = await fetchLiveRows();
    const remote = live.find((x) => keyOf(x.doc_code, x.person_name) === reqDbKey(r));
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
    } as never).select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url, file_urls").maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) setRows((prev) => [...prev, data as DocRow]);
  };


  /** The seller's curated upload page — one link with everything on it. */
  const packetUrl = `${PUBLIC_SITE_URL}/documents?s=${submissionId}`;
  const openPacketLink = () => {
    window.open(packetUrl, "_blank", "noopener,noreferrer");
  };
  /** Everything still owed by the seller, in the order the checklist shows it. */
  const outstanding = useMemo(() => requirements.filter((r) => {
    if (r.code === "REVIEW" || r.code === "NOTE" || r.code === "LA") return false;
    const s = stateByKey[reqDbKey(r)] ?? (r.review ? "maybe" : "needed");
    return !["complete", "received", "notarized", "not_needed"].includes(s);
  }), [requirements, stateByKey]);

  const poaRequired = requirements.some((r) => r.contractKind === "poa");
  const poaContract = contracts.find((c) => c.kind === "poa" && c.status !== "void");

  /** The items and completed POAs that make up the request, shared by preview and send. */
  const buildPacketPayload = async () => {
    // Every POA the checklist calls for, each as the finished PDF, so the seller
    // receives one email with the document already filled in and attached.
    const poas: { name: string | null; url: string | null; path: string | null }[] = [];
    const sources = poaRequirements.length
      ? poaRequirements.map((r) => ({ r, c: preparedPoaFor(r) }))
      : (poaContract ? [{ r: null as Requirement | null, c: poaContract }] : []);
    for (const { r, c: chosen } of sources) {
      if (!chosen) continue;
      const { data: c } = await supabase.from("contracts")
        .select("sign_token, signature_name, fill_data, filled_pdf_path").eq("id", chosen.id).maybeSingle();
      if (!c) continue;
      const path = (c as { filled_pdf_path?: string | null }).filled_pdf_path ?? null;
      const url = c.sign_token ? `${PUBLIC_SITE_URL}/sign/${c.sign_token}` : null;
      if (path && poas.some((p) => p.path === path)) continue;
      const name = (c as { signature_name?: string | null }).signature_name
        ?? ((c as { fill_data?: Record<string, unknown> | null }).fill_data?.seller_name as string | undefined)
        ?? (r?.jointNames?.length ? r.jointNames.join(" & ") : null)
        ?? r?.personName ?? null;
      poas.push({ name: name ?? null, url, path });
    }
    const poaUrl = poas[0]?.url ?? null;
    const poaFor = poas[0]?.name ?? null;

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
        mailTo: mailFor(r)?.address ?? null,

      };
    });
    const poaMailTo = poaRequirements.length
      ? (mailFor(poaRequirements[0])?.address ?? null)
      : ORIGINALS_MAIL_ADDRESS;
    return { items, poas, poaUrl, poaFor, poaMailTo };

  };

  /** Step 2 of the review: fetch the exact email without sending anything. */
  const loadEmailPreview = async () => {
    setReview({ step: 2, loading: true });
    try {
      if (!rows.some((r) => r.doc_code)) await syncChecklist();
      const { items, poas, poaUrl, poaFor, poaMailTo } = await buildPacketPayload();
      const { data, error } = await supabase.functions.invoke("send-document-packet", {
        body: { submission_id: submissionId, items, packet_url: packetUrl, poas, poa_url: poaUrl, poa_for: poaFor, poa_mail_to: poaMailTo, preview: true },
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
      const { items, poas, poaUrl, poaFor, poaMailTo } = await buildPacketPayload();

      const { error } = await supabase.functions.invoke("send-document-packet", {
        body: { submission_id: submissionId, items, packet_url: packetUrl, poas, poa_url: poaUrl, poa_for: poaFor, poa_mail_to: poaMailTo },
      });
      if (error) throw error;
      toast.success(`Document request emailed to ${sellerEmail}`, {
        description: `${items.length} item${items.length === 1 ? "" : "s"}${poas.length ? ` + ${poas.length} Power of Attorney` : ""}`,
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


  /** One signer's mailing details exactly as the seller typed them in the family confirmation. */
  const questionnaireContact = (name: string) => {
    const key = (n: string) => {
      const t = String(n ?? "").toLowerCase().replace(/[.,'’]/g, " ").replace(/\s+/g, " ").trim();
      if (!t) return "";
      const p = t.split(" ");
      return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
    };
    // The seller's confirmation page saves these under `v2.contacts`; the older
    // roster editor put them at the top level or on each person.
    const a = answers as Record<string, unknown>;
    const v2c = ((a.v2 as Record<string, unknown> | undefined)?.contacts ?? {}) as Record<
      string, { addr?: string; email?: string; phone?: string }
    >;
    const contacts: Record<string, { addr?: string; email?: string; phone?: string }> = {
      ...v2c,
      ...((a.contacts ?? {}) as Record<string, { addr?: string; email?: string; phone?: string }>),
    };
    for (const p of (Array.isArray(a.people) ? (a.people as Record<string, string>[]) : [])) {
      const pk = key(p?.name);
      if (!pk) continue;
      const ex = contacts[pk] ?? {};
      contacts[pk] = {
        addr: ex.addr || String(p?.address ?? ""),
        email: ex.email || String(p?.email ?? ""),
        phone: ex.phone || String(p?.phone ?? ""),
      };
    }
    const k = key(name);
    let hit = k ? contacts[k] : undefined;
    if (!hit && k) {
      const [first] = k.split(" ");
      const last = k.split(" ").slice(-1)[0];
      hit = Object.entries(contacts).find(([ck]) => ck.startsWith(first) && ck.endsWith(last))?.[1];
    }
    const raw = String(hit?.addr ?? "").replace(/\r/g, "").trim();
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    let address = raw, city_state_zip = "";
    if (lines.length > 1) {
      address = lines.slice(0, -1).join(", ");
      city_state_zip = lines[lines.length - 1];
    } else {
      const m = /^(.*?),\s*([^,]+,\s*[A-Za-z]{2}\.?\s*\d{5}(?:-\d{4})?)$/.exec(raw);
      if (m) { address = m[1].trim(); city_state_zip = m[2].trim(); }
    }
    return { address, city_state_zip, phone: String(hit?.phone ?? ""), email: String(hit?.email ?? "") };
  };

  /**
   * "Prepare" now opens an inline editor first (same idea as the Listing Agreement
   * panel): the admin checks/fills every blank, then generates the PDF.
   */

  const openDocEditor = async (r: Requirement) => {
    if (!r.contractKind) return;
    const blank = {
      seller_name: r.jointNames?.[0] ?? r.personName ?? sellerName ?? "",
      joint_second: r.jointNames?.[1] ?? "",
      address: "", city_state_zip: "", phone: "", email: sellerEmail ?? "",
      cemetery: cemName ?? cemetery ?? "", county_state: "",
      plot_description: "", plot_count: "",
      listing_option: "Starter", authorized_min_total: "",
    };
    setDocEdit({ r, loading: true, fields: blank });
    try {
      const { data: sub } = await supabase.from("contact_submissions")
        .select("name, email, phone, cemetery, cemetery_city, section, lawn, spaces, space_numbers, plot_count, quote_amount, listing_tier, deed_owner_names, customer_profile_id, ownership_roster")
        .eq("id", submissionId).maybeSingle();
      const s = (sub ?? {}) as Record<string, unknown>;
      const str = (v: unknown) => (v == null ? "" : String(v));
      // A previously prepared copy is the best starting point — keep the admin's earlier edits.
      const prior = contracts.filter((c) => c.kind === r.contractKind && c.status !== "void")
        .map((c) => (c.fill_data ?? {}) as Record<string, unknown>)
        .find((f) => !r.personName || String(f.seller_name ?? "").toLowerCase().includes(r.personName.split(" ")[0].toLowerCase()));
      const nameHints = await collectNameSpellings(s, r);
      const plotHints = await collectDeedPlots(s);
      setDocEdit((cur) => cur && cur.r === r ? {
        ...cur,
        loading: false,
        nameHints,
        plotHints,
        fields: (() => {
          const principal = r.jointNames?.[0] ?? r.personName ?? str(prior?.seller_name) ?? str(s.name) ?? "";
          // The seller already gave us their mailing address in the family
          // confirmation — the POA is built from that, not asked for again.
          const c = questionnaireContact(principal);
          return {
            seller_name: principal,
            joint_second: r.jointNames?.[1] ?? "",
            address: str(prior?.address) || c.address,
            city_state_zip: str(prior?.city_state_zip) || c.city_state_zip,
            phone: str(prior?.phone) || c.phone || str(s.phone),
            email: str(prior?.email) || c.email || str(s.email),
            cemetery: str(prior?.cemetery) || str(s.cemetery) || (cemName ?? ""),
            county_state: str(prior?.county_state) || (s.cemetery_city ? `${str(s.cemetery_city)}, TX` : ""),
            // The deed is the controlling description — use it verbatim when we hold one.
            plot_description: str(prior?.plot_description) || plotHints[0]?.text ||
              [s.section && `Section ${str(s.section)}`, s.lawn && str(s.lawn), s.space_numbers && `Spaces ${str(s.space_numbers)}`]
                .filter(Boolean).join(" · "),
            plot_count: str(prior?.plot_count) || str(s.plot_count) || str(s.spaces),
            listing_option: str(prior?.listing_option) || str(s.listing_tier) || "Starter",
            authorized_min_total: str(prior?.authorized_min_total) || str(s.quote_amount),
          };
        })(),

      } : cur);
    } catch {
      setDocEdit((cur) => (cur ? { ...cur, loading: false } : cur));
    }
  };

  /**
   * The plot has to be described on the POA exactly as it is written on the
   * cemetery's deed / certificate of ownership, so we rebuild it from what the
   * extractor read off those documents rather than from our own intake fields.
   */
  const collectDeedPlots = async (s: Record<string, unknown>) => {
    const profileId = s.customer_profile_id as string | undefined;
    if (!profileId) return [];
    const { data: cfiles } = await supabase.from("customer_files")
      .select("file_name, document_type, extracted_data")
      .eq("customer_profile_id", profileId).limit(40);
    const out: { text: string; source: string }[] = [];
    const seen = new Set<string>();
    for (const f of (cfiles ?? []) as Record<string, unknown>[]) {
      const d = (f.extracted_data ?? {}) as Record<string, unknown>;
      const type = String(d.document_type ?? f.document_type ?? "");
      if (!/deed|certificate|interment|ownership|contract/i.test(`${type} ${String(f.file_name ?? "")}`)) continue;
      const val = (k: string) => {
        const v = d[k];
        return v == null ? "" : String(v).replace(/\s+/g, " ").trim();
      };
      // Keep the deed's own wording and ordering: Section, Block, Lot, Space(s).
      const parts = [
        val("section") && `Section ${val("section")}`,
        val("block") && `Block ${val("block")}`,
        val("lot") && `Lot ${val("lot")}`,
        val("space") && `Space${/[,&]|\band\b|-/.test(val("space")) ? "s" : ""} ${val("space")}`,
        val("plot_type"),
      ].filter(Boolean) as string[];
      if (!parts.length) continue;
      const text = parts.join(", ");
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text, source: type || String(f.file_name ?? "Document") });
    }
    return out;
  };

  /** Words that mean a name belongs to an official, not to a person who signs. */
  const NON_SIGNER = /\b(president|vice|director|manager|superintendent|secretary|treasurer|notary|clerk|witness|counselor|counsellor|advisor|adviser|representative of|funeral|mortuary|cemetery|memorial park|association|company|corporation|corp|inc\.?|llc|l\.l\.c\.|trust company|bank|attorney at law|escrow|title co)\b/i;

  /**
   * The legal name has to be spelled exactly as it appears on the deed / ID, so
   * before a POA is prepared we sweep every place a spelling can hide — but we
   * only keep names belonging to the people who actually have to sign this
   * document. Cemetery officials, funeral directors and other third parties
   * named on the paperwork are discarded.
   */
  const collectNameSpellings = async (s: Record<string, unknown>, r: Requirement) => {
    const out: { name: string; source: string }[] = [];
    const seen = new Set<string>();
    const push = (raw: unknown, source: string) => {
      const v = String(raw ?? "").replace(/\s+/g, " ").trim();
      if (!v || v.length < 3 || v.length > 80) return;
      if (!/[a-z]/i.test(v)) return;
      if (NON_SIGNER.test(v)) return;
      const key = v.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ name: v, source });
    };

    push(s.name, "Submission");
    for (const n of String(s.deed_owner_names ?? "").split(/[,;\n]|\band\b|&/)) push(n, "Deed owner names");
    for (const p of (Array.isArray(s.ownership_roster) ? s.ownership_roster : []) as Record<string, unknown>[]) {
      push(p?.name, "Owner roster");
    }

    const profileId = s.customer_profile_id as string | undefined;
    const [{ data: cfiles }, { data: mails }] = await Promise.all([
      profileId
        ? supabase.from("customer_files")
            .select("file_name, document_type, extracted_data").eq("customer_profile_id", profileId).limit(40)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      supabase.from("email_messages")
        .select("from_name, from_email, body_text").eq("matched_submission_id", submissionId)
        .order("received_at", { ascending: false }).limit(25),
    ]);

    // Only owner/signer roles off the uploaded deeds and IDs — never "parties",
    // which is where witnesses and cemetery staff end up.
    const SIGNER_KEYS = ["owners", "previous_owners", "purchaser", "principal", "seller", "owner", "purchaser_name", "grantee", "name_on_id", "full_name"];
    for (const f of (cfiles ?? []) as Record<string, unknown>[]) {
      const d = (f.extracted_data ?? {}) as Record<string, unknown>;
      const label = `Uploaded: ${String(d.document_type || f.document_type || f.file_name || "document")}`;
      for (const k of SIGNER_KEYS) {
        const v = d[k];
        if (typeof v === "string") push(v, label);
        else if (Array.isArray(v)) for (const x of v) if (typeof x === "string") push(x, label);
      }
    }

    // How the seller writes their own name in email — display name and sign-off.
    for (const m of (mails ?? []) as Record<string, unknown>[]) {
      const from = String(m.from_email ?? "").toLowerCase();
      if (sellerEmail && from && from !== sellerEmail.toLowerCase()) continue;
      push(m.from_name, "Email display name");
      const body = String(m.body_text ?? "");
      const tail = body.trim().split(/\n/).slice(-6).join("\n");
      const sig = tail.match(/(?:regards|thanks|thank you|sincerely|best)[,!.]?\s*\n+\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/i);
      if (sig?.[1]) push(sig[1], "Email sign-off");
    }

    // Finally, keep only spellings that plausibly belong to a signer on this
    // document: the named principal(s), or anyone sharing a name part with them.
    const signers = [r.personName, ...(r.jointNames ?? []), String(s.name ?? "")]
      .filter(Boolean).map((n) => String(n).toLowerCase());
    const parts = new Set(
      signers.flatMap((n) => n.split(/\s+/).filter((w) => w.length > 2)),
    );
    if (!parts.size) return out;
    const matched = out.filter((h) =>
      h.name.toLowerCase().split(/\s+/).some((w) => parts.has(w)));
    return matched.length ? matched : out;
  };




  const generateDoc = async (r: Requirement, overrideFields?: DocFields, silent = false) => {
    if (!r.contractKind) return;
    setBusy(reqKey(r));
    setGenFailed((s) => { const n = new Set(s); n.delete(reqKey(r)); return n; });
    try {
      const f = overrideFields;
      const jointNames = f
        ? [f.seller_name, f.joint_second].filter((n) => n && n.trim())
        : r.jointNames;
      const overrides: Record<string, unknown> = f
        ? {
            seller_name: f.seller_name,
            address: f.address, city_state_zip: f.city_state_zip,
            phone: f.phone, email: f.email,
            cemetery: f.cemetery, county_state: f.county_state,
            county: f.county_state,
            plot_description: f.plot_description,
            ...(f.plot_count ? { plot_count: Number(f.plot_count) } : {}),
            ...(r.contractKind === "listing_agreement"
              ? {
                  listing_option: f.listing_option,
                  ...(f.authorized_min_total ? { authorized_min_total: Number(f.authorized_min_total) } : {}),
                }
              : {}),
            ...(jointNames && jointNames.length > 1 ? { joint_names: jointNames } : {}),
          }
        : {
            ...(r.personName ? { seller_name: r.personName } : {}),
            ...(r.jointNames ? { joint_names: r.jointNames } : {}),
          };
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { submission_id: submissionId, kind: r.contractKind, overrides },
      });
      if (error) throw error;
      const res = data as { pdf_url?: string | null; sign_token?: string | null; error?: string; contract?: ContractRow | null };
      if (res?.error) throw new Error(res.error);
      setDocEdit(null);
      // Show it as ready immediately — no waiting on a full panel reload.
      if (res?.contract) {
        setContracts((prev) => [...prev.filter((c) => c.id !== res.contract!.id), res.contract!]);
      }
      if (!silent) {
        // Show the filled PDF inline so it can be checked line by line.
        if (res?.pdf_url) setPdfPreview({ url: res.pdf_url, title: r.label });
        toast.success(`${r.label} ready`, {
          description: res?.pdf_url ? "Opened below so you can check every field." : "Open the contract to review it.",
        });
      }
      void setRowState(r, "issued").then(() => load());
    } catch (e) {
      setGenFailed((s) => new Set(s).add(reqKey(r)));
      if (!silent) toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };



  /** Who a prepared contract is made out to — the signature if signed, else the filled name. */
  const contractNameOf = (c: ContractRow) =>
    (c.signature_name
      || ((c.fill_data as Record<string, unknown> | null)?.seller_name as string | undefined)
      || "").toLowerCase();

  /** Re-open the already-prepared contract PDF for a requirement, inline. */
  const openContractPdf = async (r: Requirement) => {
    const matches = contracts.filter((x) => x.kind === r.contractKind && x.status !== "void");
    // Several POAs can exist (one per signer) — prefer the one made for this person.
    const wanted = (r.jointNames?.join(" & ") ?? r.personName ?? "").toLowerCase();
    const c = matches.find((x) => contractNameOf(x) === wanted)
      ?? matches.find((x) => wanted && contractNameOf(x).includes(wanted.split(" ")[0]))
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
      toast.error("The PDF is still being completed — try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  /** Every POA the checklist calls for, and whether a prepared copy matches it. */
  const poaRequirements = requirements.filter((r) => r.contractKind === "poa");
  const preparedPoaFor = (r: Requirement) => {
    const wanted = (r.jointNames?.join(" & ") ?? r.personName ?? "").toLowerCase();
    const list = contracts.filter((x) => x.kind === "poa" && x.status !== "void");
    return list.find((x) => contractNameOf(x) === wanted)
      ?? (wanted ? list.find((x) => contractNameOf(x).includes(wanted.split(" ")[0])) : list[0]);
  };
  /** A joint POA was asked for but the prepared copy only names one person. */
  const jointMismatch = (r: Requirement) => {
    if (!r.jointNames || r.jointNames.length < 2) return false;
    const c = preparedPoaFor(r);
    if (!c) return false;
    const name = contractNameOf(c);
    return !r.jointNames.every((n) => name.includes(n.trim().toLowerCase().split(" ")[0]));
  };

  /**
   * POAs build themselves. The family-tree answers tell us exactly who has to
   * sign, and every field comes from those answers, so as soon as a POA appears
   * on the checklist we fill it in the background. Nobody — us or the seller —
   * has anything to "prepare"; it is only ever checked or edited.
   */
  const autoPrepped = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!poaRequirements.length) return;
    for (const r of poaRequirements) {
      const key = reqKey(r);
      if (autoPrepped.current.has(key)) continue;
      if (preparedPoaFor(r) && !jointMismatch(r)) continue;
      autoPrepped.current.add(key);
      void generateDoc(r, undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements, contracts]);


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

  /** Take a requirement off this file's checklist for good (not just "not needed"). */
  const removeRequirement = async (r: Requirement) => {
    const id = r.code.startsWith("X-") ? r.code.slice(2) : null;
    if (id) return removeExtraDoc(id);
    if (!window.confirm(`Remove "${r.label}" from this request? It will disappear from the seller's page.`)) return;
    await persistAnswers({
      ...answers,
      removedDocs: [...new Set([...(answers.removedDocs ?? []), reqKey(r)])],
    } as OwnershipAnswers);
    const live = await fetchLiveRows();
    const match = live.filter((x) => keyOf(x.doc_code, x.person_name) === reqDbKey(r)).map((x) => x.id);
    if (match.length) await supabase.from("submission_documents").delete().in("id", match);
    await load();
    toast.success(`"${r.label}" removed from the request`);
  };

  const removeExtraDoc = async (id: string) => {
    await persistAnswers({ ...answers, extraDocs: (answers.extraDocs ?? []).filter((d) => d.id !== id) });
    await supabase.from("submission_documents").delete()
      .eq("submission_id", submissionId).eq("doc_code", `X-${id}`);
    await load();
  };

  // ── Originals by post ──────────────────────────────────────────────────────
  // Some cemeteries will only accept the original paper (death certificates in
  // particular). For those items the seller is asked to post the document to us
  // rather than photograph it, and we hold the original on file.
  const mailOriginals = answers.mailOriginals ?? {};
  const mailSkip = answers.mailSkip ?? [];
  const defaultMailAddress = answers.originalsAddress?.trim() || ORIGINALS_MAIL_ADDRESS;
  /** Everything except photo ID is posted to our partner by default. */
  const mailFor = (r: Requirement): { address: string } | undefined => {
    const explicit = mailOriginals[reqKey(r)];
    if (explicit) return explicit;
    if (mailSkip.includes(reqKey(r))) return undefined;
    return mailsByDefault(r.code) ? { address: defaultMailAddress } : undefined;
  };
  const openMailDialog = (r: Requirement) =>
    setMailDoc({ r, address: mailFor(r)?.address ?? defaultMailAddress });
  const saveMailOriginal = async () => {
    if (!mailDoc) return;
    const address = mailDoc.address.trim();
    if (!address) return toast.error("Enter the address the original should be posted to");
    await persistAnswers({
      ...answers,
      originalsAddress: address,
      mailSkip: mailSkip.filter((k) => k !== reqKey(mailDoc.r)),
      mailOriginals: { ...mailOriginals, [reqKey(mailDoc.r)]: { address } },
    } as OwnershipAnswers);
    setMailDoc(null);
    toast.success("This document will be requested as an original by post");
  };
  const clearMailOriginal = async (r: Requirement) => {
    const next = { ...mailOriginals };
    delete next[reqKey(r)];
    await persistAnswers({
      ...answers,
      mailOriginals: next,
      mailSkip: [...new Set([...mailSkip, reqKey(r)])],
    } as OwnershipAnswers);
  };



  const documentRequirements = requirements.filter((r) => r.code !== "LA");
  const general = documentRequirements.filter((r) => !r.personName);
  const byPerson = roster.map((p) => ({ person: p, items: requirements.filter((r) => r.personName === p.name) }))
    .filter((g) => g.items.length);

  /** Do we physically hold a certificate of ownership / plot deed already? */
  const deedOnFile = files.some((f) => codesForFile(f).includes("D1"));


  /** Files that look like they satisfy this requirement. */
  const filesFor = (r: Requirement): AnyFile[] => {
    const row = rowFor(r);
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
      const row = rowFor(r);
      const state = stateByKey[reqDbKey(r)];
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
    const s = stateByKey[reqDbKey(r)] ?? (r.review ? "maybe" : "needed");
    const row = rowFor(r);
    const fromContract = !row?.manual_override && !!contractStates[reqDbKey(r)];
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
              {mailFor(r) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 inline-flex items-center gap-0.5">
                  <Mail className="w-2.5 h-2.5" />Original by post
                </span>
              )}

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
            {r.contractKind && contracts.some((c) => c.kind === r.contractKind && c.status !== "void") && (
              <Button size="sm" variant="outline" disabled={busy === `${key}-open`} onClick={() => void openContractPdf(r)}
                title="Open the completed PDF and read every field" className="text-[11px] h-7">
                {busy === `${key}-open`
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <FileText className="w-3.5 h-3.5 mr-1" />}
                Check
              </Button>
            )}
            {r.contractKind && (
              <Button size="sm" variant="ghost" disabled={busy === key} onClick={() => void openDocEditor(r)}
                title={`Edit ${r.label} — it is already filled in from their answers`} className="text-[11px] h-7">
                {busy === key
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <FileSignature className="w-3.5 h-3.5 mr-1" />}
                Edit
              </Button>
            )}

            {r.code !== "REVIEW" && r.code !== "NOTE" && (
              <Button
                size="sm"
                variant={mailFor(r) ? "default" : "ghost"}
                className="text-[11px] h-7"
                onClick={() => (mailFor(r) ? void clearMailOriginal(r) : openMailDialog(r))}
                title={mailFor(r)
                  ? "Posted original required — click to go back to a photo upload"
                  : "Ask the seller to post us the original instead of photographing it"}
              >
                <Mail className="w-3.5 h-3.5" />
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
            {r.code !== "REVIEW" && r.code !== "NOTE" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-[11px] h-7 text-muted-foreground hover:text-rose-600"
                onClick={() => void removeRequirement(r)}
                title="Remove this document from the request altogether"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
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
              <div className="flex flex-wrap gap-2">
                {attached.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => void openFile(f)}
                    className="group w-[104px] text-left rounded-lg border border-border/60 bg-background overflow-hidden hover:border-teal-400 hover:shadow-sm transition"
                    title={f.name}
                  >
                    <div className="h-[72px] bg-muted/50 flex items-center justify-center overflow-hidden">
                      {thumbs[f.path] ? (
                        <img src={thumbs[f.path]} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="px-1.5 py-1">
                      <span className="block text-[9px] font-semibold uppercase tracking-wide text-teal-700 truncate">{f.origin}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">{f.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Nothing uploaded for this item yet.</p>
            )}
            {mailFor(r) && (
              <div className="rounded-md border border-rose-200 bg-rose-50/60 px-2.5 py-2">
                <p className="text-[11px] font-medium text-rose-900 flex items-center gap-1">
                  <Mail className="w-3 h-3" />The original is posted to us
                </p>
                <p className="text-[11px] text-rose-900/70 mt-0.5">{ORIGINALS_MAIL_REASON}</p>
                <p className="text-[11px] text-rose-900/80 whitespace-pre-line mt-0.5">{mailFor(r)!.address}</p>
                <button type="button" onClick={() => openMailDialog(r)} className="text-[11px] underline text-rose-900/70 mt-1">
                  Change the address
                </button>
              </div>

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
          {/* How the two halves fit together, in one line, so it's obvious that the
              documents (and the POA inside them) come out of the seller's answers. */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="px-2 py-1 rounded-full bg-muted font-medium text-foreground">1 · Ask the seller</span>
            <span className="opacity-60">→</span>
            <span className={`px-2 py-1 rounded-full ${answers.sellerConfirmedAt ? "bg-muted font-medium text-foreground" : "border border-dashed border-border"}`}>
              2 · Their answers decide the documents
            </span>
            <span className="opacity-60">→</span>
            <span className={`px-2 py-1 rounded-full ${answers.sellerConfirmedAt ? "bg-muted font-medium text-foreground" : "border border-dashed border-border"}`}>
              3 · POA fills itself &amp; goes out with the request
            </span>
          </div>

          {/* ── The seller's own confirmation ──
              We no longer guess the ownership answers here. The seller fills in
              their own page, and the documents follow from what comes back. */}
          <div className="border rounded-lg p-3 bg-background/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Step 1 · Family confirmation
              </span>
              <Button
                size="sm" variant="outline" className="h-7 text-[11px]"
                onClick={openAsk}
                title="Type the deed names, then email the seller their own page"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Ask the seller
              </Button>
            </div>


            {answers.sellerConfirmedAt ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-2">
                <p className="text-[11px] text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Seller confirmed on {new Date(answers.sellerConfirmedAt).toLocaleString()}
                </p>
                {answers.sellerNotes && (
                  <p className="text-[11px] text-emerald-900/80 mt-1 whitespace-pre-line">“{answers.sellerNotes}”</p>
                )}
              </div>
            ) : answers.questionsSentAt ? (
              <p className="text-[11px] text-muted-foreground">
                Sent to the seller {new Date(answers.questionsSentAt).toLocaleString()} — waiting on their answers
                before we decide which documents to request.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Send the seller their family confirmation page. Once it comes back, the people below and the
                documents they need follow from their answers.
              </p>
            )}
          </div>


          {/* ── Exactly what the seller selected on their page ── */}
          {(answers as Record<string, unknown>).v2 ? (
            <div className="border rounded-lg p-3 bg-background/60 space-y-2">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" /> The seller's answers
              </span>
              <SellerAnswersSummary
                v2={(answers as Record<string, unknown>).v2 as V2State}
                people={(answers.people ?? []) as { name: string; relationship?: string; deceased?: boolean }[]}
                notes={(answers as { sellerNotes?: string }).sellerNotes}
                deedNames={deedNamesRaw}
              />
            </div>
          ) : null}



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
                Step 2 · Documents required ({documentRequirements.length})
                {outstanding.length > 0 && (
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                    · {outstanding.length} still outstanding
                  </span>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setAddDocOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add a document
                </Button>
                <Button size="sm" variant="ghost" onClick={openPacketLink} title="Open the seller's document page in a new tab">
                  <Link2 className="w-3.5 h-3.5 mr-1" />Open seller page
                </Button>
                <Button size="sm" variant="outline" onClick={() => void syncChecklist()} disabled={saving}>
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


            {/* Where this list comes from, in plain words. */}
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              {answers.sellerConfirmedAt
                ? "Built from the seller's family confirmation above. The power of attorney fills itself in from those same answers and is attached to the document request — nothing for them to complete by hand."
                : documentRequirements.length > 0
                  ? "Provisional list. It will be rebuilt from the seller's family confirmation once it comes back, and the power of attorney fills itself from those answers."
                  : "Nothing to request yet — send the family confirmation above first, and the documents (plus a pre-filled power of attorney) follow from the seller's answers."}
            </p>


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

      {/* ── Add a one-off document ── */}
      <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" /> Add a document to this request
            </DialogTitle>
            <DialogDescription className="text-xs">
              It joins the checklist, the seller's upload page and the next document request email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">What is it called?</Label>
              <Input className="mt-1" value={newDoc.label} placeholder="e.g. Divorce decree"
                onChange={(e) => setNewDoc({ ...newDoc, label: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Why we need it (shown to the seller)</Label>
              <Input className="mt-1" value={newDoc.why} placeholder="e.g. The cemetery needs proof the plot was awarded to you"
                onChange={(e) => setNewDoc({ ...newDoc, why: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">For one person only (optional)</Label>
              <Input className="mt-1" value={newDoc.person} placeholder="Leave blank if it's about the property"
                onChange={(e) => setNewDoc({ ...newDoc, person: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={newDoc.needsNotary}
                onChange={(e) => setNewDoc({ ...newDoc, needsNotary: e.target.checked })} />
              This one has to be notarized
            </label>
            {(answers.extraDocs ?? []).length > 0 && (
              <div className="pt-1 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Already added by hand</p>
                {(answers.extraDocs ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-[12px] border rounded px-2 py-1">
                    <span>{d.label}{d.person ? <span className="text-muted-foreground"> · {d.person}</span> : null}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void removeExtraDoc(d.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAddDocOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-[#1f2a37] hover:bg-[#111827] text-white" onClick={() => void addExtraDoc()}>
              Add it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Ask for the original by post ── */}
      <Dialog open={!!mailDoc} onOpenChange={(o) => !o && setMailDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" /> Ask for the original by post
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mailDoc?.r.label} — the seller will be told the cemetery requires an original copy, that we store all
              originals, and where to post it. No photo upload is offered for this item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Postal address for the original</Label>
            <textarea
              rows={4}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
              placeholder={"Texas Cemetery Brokers\n123 Example Street, Suite 100\nDallas, TX 75201"}
              value={mailDoc?.address ?? ""}
              onChange={(e) => setMailDoc(mailDoc ? { ...mailDoc, address: e.target.value } : null)}
            />
            <p className="text-[11px] text-muted-foreground">
              This address is remembered for this file, so the next original you request is pre-filled.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setMailDoc(null)}>Cancel</Button>
            <Button size="sm" className="bg-[#1f2a37] hover:bg-[#111827] text-white" onClick={() => void saveMailOriginal()}>
              Request the original
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* ── Inline field editor before a contract is generated ── */}
      <Dialog open={!!docEdit} onOpenChange={(o) => !o && setDocEdit(null)}>
        <DialogContent className="max-w-2xl z-[95] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSignature className="w-4 h-4" /> Check or edit the {docEdit?.r.label ?? "document"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {docEdit?.r.jointNames?.length
                ? "Joint document — both principals appear on the same instrument and each gets their own notary block."
                : "Check every blank before it is generated. Nothing is sent to the seller yet."}
            </DialogDescription>
          </DialogHeader>
          {docEdit?.loading || !docEdit ? (
            <div className="py-10 grid place-items-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              <div className={docEdit.r.jointNames?.length ? "" : "md:col-span-2"}>
                <Label className="text-xs">{docEdit.r.jointNames?.length ? "First principal" : "Full legal name"}</Label>
                <Input value={docEdit.fields.seller_name}
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, seller_name: e.target.value } })} />
              </div>
              {!!docEdit.r.jointNames?.length && (
                <div>
                  <Label className="text-xs">Second principal</Label>
                  <Input value={docEdit.fields.joint_second}
                    onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, joint_second: e.target.value } })} />
                </div>
              )}

              {/* Spelling matters on a notarised instrument — every version of the
                  name we hold is offered here, with where it came from. */}
              {!!docEdit.nameHints?.length && (
                <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-2">
                  <p className="text-[11px] font-medium text-amber-900 mb-1.5">
                    How the name is spelled elsewhere — tap to use it exactly
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {docEdit.nameHints.map((h) => {
                      const active = h.name.toLowerCase() === docEdit.fields.seller_name.trim().toLowerCase();
                      return (
                        <button
                          key={h.source + h.name}
                          type="button"
                          onClick={() => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, seller_name: h.name } })}
                          className={`text-[11px] rounded-full border px-2 py-1 transition-colors ${active
                            ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                            : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"}`}
                          title={h.source}
                        >
                          {h.name} <span className="opacity-60">· {h.source}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <Label className="text-xs">Mailing address</Label>
                <Input value={docEdit.fields.address} placeholder="Street address"
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, address: e.target.value } })} />
              </div>
              <div className={docEdit.r.contractKind === "poa" ? "md:col-span-2" : ""}>
                <Label className="text-xs">City, State, ZIP</Label>
                <Input value={docEdit.fields.city_state_zip}
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, city_state_zip: e.target.value } })} />
              </div>
              {/* Phone and email only ever print on the Listing Agreement. */}
              {docEdit.r.contractKind !== "poa" && (
                <>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={docEdit.fields.phone}
                      onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, phone: e.target.value } })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={docEdit.fields.email}
                      onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, email: e.target.value } })} />
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs">Cemetery</Label>
                <Input value={docEdit.fields.cemetery}
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, cemetery: e.target.value } })} />
              </div>
              <div>
                <Label className="text-xs">County / State (venue)</Label>
                <Input value={docEdit.fields.county_state} placeholder="e.g. Harris County, TX"
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, county_state: e.target.value } })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Plot description (section / lot / spaces)</Label>
                <Input value={docEdit.fields.plot_description}
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, plot_description: e.target.value } })} />
                {/* The deed controls — offer its exact wording. */}
                {!!docEdit.plotHints?.length && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">From the deed:</span>
                    {docEdit.plotHints.map((p) => {
                      const active = p.text.toLowerCase() === docEdit.fields.plot_description.trim().toLowerCase();
                      return (
                        <button
                          key={p.source + p.text}
                          type="button"
                          title={p.source}
                          onClick={() => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, plot_description: p.text } })}
                          className={`text-[11px] rounded-full border px-2 py-1 transition-colors ${active
                            ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                            : "border-border bg-muted/40 hover:bg-muted"}`}
                        >
                          {p.text} <span className="opacity-60">· {p.source}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Plot count</Label>
                <Input type="number" value={docEdit.fields.plot_count}
                  onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, plot_count: e.target.value } })} />
              </div>
              {docEdit.r.contractKind === "listing_agreement" && (
                <>
                  <div>
                    <Label className="text-xs">Listing option</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={docEdit.fields.listing_option}
                      onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, listing_option: e.target.value } })}
                    >
                      <option value="Starter">Starter</option>
                      <option value="Pro">Pro</option>
                      <option value="Featured">Featured</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Authorized minimum total ($)</Label>
                    <Input type="number" value={docEdit.fields.authorized_min_total}
                      onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, authorized_min_total: e.target.value } })} />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDocEdit(null)}>Cancel</Button>
            <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white"
              disabled={!docEdit || docEdit.loading || !!busy}
              onClick={() => docEdit && void generateDoc(docEdit.r, docEdit.fields)}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSignature className="w-3.5 h-3.5 mr-1" />}
              Generate &amp; preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="rounded-md border border-purple-300 bg-purple-50/60 px-3 py-2.5 space-y-2.5">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5" /> Powers of Attorney — already completed and attached
                  </p>
                  {poaRequirements.map((r) => {
                    const prepared = preparedPoaFor(r);
                    const bad = jointMismatch(r);
                    return (
                      <div key={reqKey(r)} className={`rounded border px-2.5 py-2 bg-white ${bad ? "border-rose-300" : prepared ? "border-emerald-300" : "border-purple-200"}`}>
                        <p className="text-[12px]">
                          {r.jointNames?.length ? `Joint POA — ${r.jointNames.join(" & ")}` : r.label}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${bad || (!prepared && genFailed.has(reqKey(r))) ? "text-rose-700" : "text-muted-foreground"}`}>
                          {bad
                            ? `This copy names ${prepared?.signature_name ?? (prepared?.fill_data as { seller_name?: string } | null)?.seller_name ?? "one person"} only — edit it so both principals appear.`
                            : prepared
                              ? `Completed for ${prepared.signature_name ?? (prepared.fill_data as { seller_name?: string } | null)?.seller_name ?? "the signer"} from their family-tree answers. Check it — this exact PDF is attached for them to print and notarise. They cannot change it.`
                              : genFailed.has(reqKey(r))
                                ? "This one didn't save — press Fill it in now to build it again."
                                : "Being completed automatically from their family-tree answers…"}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2">
                          {prepared ? (
                            <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white"
                              onClick={() => void openContractPdf(r)} disabled={busy === `${reqKey(r)}-open`}>
                              {busy === `${reqKey(r)}-open` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
                              Check the POA
                            </Button>
                          ) : genFailed.has(reqKey(r)) ? (
                            <Button size="sm" variant="outline" className="border-rose-300 text-rose-700"
                              onClick={() => void generateDoc(r)} disabled={busy === reqKey(r)}>
                              {busy === reqKey(r) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSignature className="w-3.5 h-3.5 mr-1" />}
                              Fill it in now
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Filling it in…
                            </span>
                          )}

                          <Button size="sm" variant="outline" onClick={() => void openDocEditor(r)} disabled={busy === reqKey(r)}>
                            {busy === reqKey(r) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSignature className="w-3.5 h-3.5 mr-1" />}
                            Edit
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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

      {/* ── Ask the seller to confirm the ownership answers ── */}
      <Dialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
        <DialogContent className="max-w-3xl">
          {ask?.step === "names" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" /> Who is named on the deed?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Read the deed on the right and type each name exactly as printed. These are the names the seller
                  will see — they are never guessed.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem] max-h-[58vh] overflow-auto pr-1">
                <div className="space-y-2">
                  {(ask.deedNames ?? []).map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={n.name}
                        placeholder="Full name as printed on the deed"
                        className="h-8 text-xs"
                        onChange={(e) => setAsk((a) => {
                          const list = [...(a?.deedNames ?? [])];
                          list[i] = { ...list[i], name: e.target.value };
                          return { ...(a ?? {}), deedNames: list };
                        })}
                      />
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={n.deceased}
                          onChange={(e) => setAsk((a) => {
                            const list = [...(a?.deedNames ?? [])];
                            list[i] = { ...list[i], deceased: e.target.checked };
                            return { ...(a ?? {}), deedNames: list };
                          })}
                        />
                        Deceased
                      </label>
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => setAsk((a) => ({
                          ...(a ?? {}),
                          deedNames: (a?.deedNames ?? []).filter((_, j) => j !== i),
                        }))}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline" size="sm" className="h-7 text-[11px]"
                    onClick={() => setAsk((a) => ({
                      ...(a ?? {}),
                      deedNames: [...(a?.deedNames ?? []), { name: "", deceased: false }],
                    }))}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add another name
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">The deed on file</p>
                  {files.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">Nothing uploaded yet.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {files.map((f) => (
                      <button
                        key={f.path}
                        className="rounded-md border overflow-hidden text-left hover:border-primary/60"
                        onClick={() => setPdfPreview({ url: thumbs[f.path] ?? "", title: f.name })}
                        title={f.name}
                      >
                        <div className="aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
                          {thumbs[f.path]
                            ? <img src={thumbs[f.path]} alt={f.name} className="w-full h-full object-cover" />
                            : <FileText className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <p className="px-1.5 py-1 text-[9px] text-muted-foreground truncate">{f.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setAsk(null)}>Cancel</Button>
                <Button size="sm" className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                  onClick={() => void saveDeedNamesAndPreview()}>
                  Save names and preview the email →
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Send className="w-4 h-4" /> Ask the seller these questions
                </DialogTitle>
                <DialogDescription className="text-xs">
                  They get their own page: {ask?.known?.length ?? 0} answer{(ask?.known?.length ?? 0) === 1 ? "" : "s"} to
                  confirm, {ask?.missing?.length ?? 0} still to answer, plus the family tree.
                </DialogDescription>
              </DialogHeader>
              {ask?.loading
                ? <div className="h-[55vh] grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                : <iframe srcDoc={ask?.html ?? ""} title="Questionnaire email preview" className="w-full h-[55vh] rounded-md border bg-white" />}
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setAsk((a) => ({ ...(a ?? {}), step: "names" }))}>
                  ← Back to names
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => { void navigator.clipboard.writeText(`${PUBLIC_SITE_URL}/confirm?s=${submissionId}`); toast.success("Link copied"); }}>
                  <Link2 className="w-3.5 h-3.5 mr-1" /> Copy link
                </Button>
                <Button size="sm" className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                  onClick={() => void sendAsk()} disabled={ask?.sending || ask?.loading}>
                  {ask?.sending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Send to {sellerEmail}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>

  );
}

