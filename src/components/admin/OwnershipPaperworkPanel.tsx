import { formatPlotDescription } from "@/lib/plotDescription";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList, Loader2, Users, AlertTriangle, Plus, Trash2, RotateCcw,
  ShieldCheck, FileSignature, Building2, CheckCircle2, ChevronDown, Sparkles,
  Paperclip, Link2, Undo2, Send, FileText, Mail, Monitor, X, Check, Network,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { openFileViewer, type FileViewerSource } from "@/lib/fileViewer";
import ContractsPanel from "./ContractsPanel";
import ProofreadButton from "./ProofreadButton";
import FamilyTreeMap from "./FamilyTreeMap";
// Family tree diagram is parked for now — flip to true to bring it back.
const SHOW_FAMILY_TREE_MAP = false;
import SellerAnswersSummary, { type V2State } from "./SellerAnswersSummary";
import { softDelete } from "@/lib/softDelete";
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
  principal_key?: string | null;
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
  // Accents are folded ("Cantú" === "Cantu"): the same person is typed both ways
  // across the deed, the family tree and the prepared POA.
  const t = String(n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};
const reqDbKey = (r: Requirement) => `${r.code}::${personKey(r.personName)}`;
const keyOf = (code?: string | null, person?: string | null) => `${code ?? ""}::${personKey(person)}`;

/**
 * What a checklist row is *about*, regardless of how it was created. A broker
 * who typed "Photo ID - Carol Anderson" by hand made the very same item the
 * rules engine later emits as D2P for Carol, so the two must never both show.
 */
const DOC_FAMILIES: Array<[string, RegExp, RegExp]> = [
  // family, matching generated codes, matching free-text labels
  ["photo_id", /^(D2|D2P)$/, /(photo\s*id|photo\s*identification|driver'?s?\s*licen|state\s*id|passport)/i],
  ["death_certificate", /^D6$/, /death\s*certificate/i],
  ["marriage_certificate", /^D5$/, /marriage\s*(certificate|licen)/i],
  ["poa", /^D21$/, /power\s*of\s*attorney/i],
];
const docFamily = (code?: string | null, label?: string | null): string | null => {
  const c = String(code ?? "");
  const l = String(label ?? "");
  for (const [family, codeRe, labelRe] of DOC_FAMILIES) {
    if (c && codeRe.test(c)) return family;
    if (l && labelRe.test(l)) return family;
  }
  return null;
};
/** Ad-hoc rows a broker added by hand carry an "X-…" code. */
const isAdHoc = (code?: string | null) => /^X-/i.test(String(code ?? ""));
/** Person a row is about — from the field, or trailing "… - Name" in the label. */
const rowPerson = (code?: string | null, person?: string | null, label?: string | null) => {
  const direct = personKey(person);
  if (direct) return direct;
  const m = String(label ?? "").match(/[-–—]\s*([^-–—]+)$/);
  return personKey(m?.[1] ?? "");
};
const familyKey = (code?: string | null, person?: string | null, label?: string | null) => {
  const fam = docFamily(code, label);
  return fam ? `${fam}::${rowPerson(code, person, label)}` : null;
};

/** Stable DOM id so the family tree can jump straight to a checklist row. */
const anchorId = (r: Requirement) => `req-${reqKey(r).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

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
  why?: string | null;
  statute_ref?: string | null;
  issued_by_us?: boolean | null;
  needs_notary?: boolean | null;
  person_role?: string | null;
  sort_order?: number | null;
};

const STATE_STYLE: Record<RequiredState, string> = {
  not_needed: "bg-muted text-muted-foreground",
  maybe: "bg-slate-100 text-slate-700",
  needed: "bg-amber-100 text-amber-800",
  issued: "bg-blue-100 text-blue-800",
  sent: "bg-indigo-100 text-indigo-800",

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
  const hit = type ? TYPE_CODES.find((t) => t.test.test(type)) : undefined;
  if (hit) return hit.codes;
  // Nothing read yet (email attachments arrive unclassified): fall back to what
  // the file is actually called. "Power of Attorney - Donnis D. Hatchett.pdf"
  // coming back from the seller is plainly the returned POA.
  const name = String(f.name ?? "").toLowerCase();
  if (!name) return [];
  const byName = TYPE_CODES.find((t) => t.test.test(name));
  return byName ? byName.codes : [];
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
  // When the document request was last emailed — the send button turns green
  // and reads "Request sent" so it is obvious it has already gone out.
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [poaPrompt, setPoaPrompt] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);
  /** A prepared PDF shown inline so it can be checked without leaving the page. */
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string; source?: FileViewerSource } | null>(null);
  /** The send-document-request review flow. */
  const [review, setReview] = useState<null | { step: 1 | 2; html?: string; subject?: string; loading?: boolean }>(null);
  /** The broker's own touches on this request: who it greets and what it says. */
  const [greetName, setGreetName] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [pageNote, setPageNote] = useState("");
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
  const [newDoc, setNewDoc] = useState<{
    kind: "custom" | "poa" | "joint_poa" | "affidavit_heirship";
    label: string; why: string; person: string; person2: string; needsNotary: boolean;
  }>({ kind: "custom", label: "", why: "", person: "", person2: "", needsNotary: false });

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
    /** The already-prepared copy being revised — it is replaced when we save. */
    existingId?: string | null;
    /** True when that copy has already been signed or notarised. */
    locked?: boolean;
  }>(null);




  const didLoad = useRef(false);
  const load = useCallback(async () => {
    // Only the very first fetch swaps the panel for a spinner. Later refreshes
    // (deletes, realtime pings) patch state in place so the list never jumps.
    if (!didLoad.current) setLoading(true);
    const [{ data: sub }, { data: docs }, { data: cons }] = await Promise.all([
      supabase.from("contact_submissions")
        .select("ownership_answers, name, email, customer_profile_id, seller_attachments, deed_owner_names, documents_requested_at").eq("id", submissionId).maybeSingle(),
      supabase.from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url, file_urls, why, statute_ref, issued_by_us, needs_notary, person_role, sort_order").is("deleted_at", null)
        .eq("submission_id", submissionId),
      supabase.from("contracts")
        .select("id, kind, status, signature_name, fill_data, signed_at, notarized_at, completed_at, countersigned_at, sign_token, principal_key")
        .eq("submission_id", submissionId),
    ]);
    const a = ((sub as Record<string, unknown> | null)?.ownership_answers ?? {}) as OwnershipAnswers;
    setAnswers(a && typeof a === "object" ? a : {});
    setDeedNamesRaw(((sub as { deed_owner_names?: string | null } | null)?.deed_owner_names ?? "") || "");
    setRequestedAt(((sub as { documents_requested_at?: string | null } | null)?.documents_requested_at ?? null));

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
        .select("file_name, file_path, document_type, extracted_data, extracted_summary").is("deleted_at", null).eq("customer_profile_id", profileId);
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
    setThumbs((prev) => ({ ...prev, ...previews }));

    if (cemetery) {
      let { data: cem } = await supabase.from("texas_cemeteries")
        .select("name, doc_rules").ilike("name", cemetery).maybeSingle();
      if (!cem) {
        // Sellers type the cemetery name loosely ("Restland Cemetery, Dallas
        // Texas"). Fall back to matching on the distinctive first word so the
        // cemetery's own paperwork rules still apply.
        const stem = cemetery.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/)[0];
        if (stem && stem.length >= 4) {
          const { data: fuzzy } = await supabase.from("texas_cemeteries")
            .select("name, doc_rules").ilike("name", `%${stem}%`).limit(5);
          const rows = (fuzzy ?? []) as { name?: string; doc_rules?: unknown }[];
          cem = (rows.find(r => r.doc_rules && Object.keys(r.doc_rules as object).length > 0) ?? rows[0]) as typeof cem;
        }
      }
      setRules(((cem as Record<string, unknown> | null)?.doc_rules ?? null) as CemeteryDocRules | null);
      setCemName((cem as { name?: string } | null)?.name ?? null);
    }
    setLoading(false);
    didLoad.current = true;
  }, [submissionId, cemetery]);

  /**
   * Chrome refuses to render (or download) a cross-origin PDF served from a
   * signed storage URL inside our page — it shows "Blocked". Pulling the bytes
   * down and handing the browser a same-origin blob: URL always works, for both
   * the inline check and the new tab.
   */
  const blobUrlFor = async (bucket: "customer-files" | "portal-uploads" | "contracts", path: string) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;
    const type = data.type && data.type !== "application/octet-stream"
      ? data.type
      : (/\.pdf$/i.test(path) ? "application/pdf" : "application/octet-stream");
    return URL.createObjectURL(new Blob([data], { type }));
  };

  /** Pull a remote (signed) file down so we can show it from a same-origin blob. */
  const blobUrlFromUrl = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.blob();
      const type = data.type && data.type !== "application/octet-stream"
        ? data.type
        : (/\.pdf(\?|$)/i.test(url) ? "application/pdf" : "application/octet-stream");
      return URL.createObjectURL(new Blob([data], { type }));
    } catch { return null; }
  };

  /**
   * Show a PDF inline. We always render a same-origin blob (Chrome blocks
   * cross-origin PDFs in a frame) and keep the original source so "Open in new
   * tab" can go through /file-viewer — Chrome also blocks a blob: URL opened
   * directly as a top-level tab.
   */
  const showPdf = async (title: string, source: FileViewerSource) => {
    const url = "url" in source
      ? (await blobUrlFromUrl(source.url)) ?? source.url
      : (await blobUrlFor(source.bucket as "customer-files" | "portal-uploads" | "contracts", source.path)) ?? "";
    if (!url) { toast.error("That file could not be opened — try again in a moment."); return; }
    setPdfPreview({ url, title, source });
  };

  /** Open any collected file in a new tab. */
  const openFile = async (f: AnyFile) => {
    if (!openFileViewer({ bucket: f.bucket, path: f.path, name: f.name }))
      toast.error("Pop-up blocked — allow pop-ups for this site and try again");
  };



  useEffect(() => { void load(); }, [load]);

  // The seller's page writes straight into submission_documents — listen so the
  // checklist ticks itself the moment a file lands, with no manual refresh.
  // Debounced: a single delete fires several row events, and reloading on each
  // one is what made the list shuffle under the cursor.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const ch = supabase
      .channel(`docs-${submissionId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "submission_documents", filter: `submission_id=eq.${submissionId}` },
        () => { if (t) clearTimeout(t); t = setTimeout(() => { void load(); }, 600); })
      .subscribe();
    return () => { if (t) clearTimeout(t); void supabase.removeChannel(ch); };
  }, [submissionId, load]);


  const path = questionPath(answers);
  const prog = progress(answers);
  const computedRequirements = useMemo(() => {
    const removed = new Set(answers.removedDocs ?? []);
    return computeRequirements(answers, rules).filter((r) => !removed.has(reqKey(r)));
  }, [answers, rules]);

  // Once a document request has actually been emailed, the checklist is a
  // HISTORICAL record of what we asked that seller for. It must never be
  // silently re-computed by a later rules change — brokers need to see exactly
  // what was sent and when. So after `documents_requested_at` we render the
  // persisted rows themselves, and drop "family tree not completed" review
  // placeholders, which are meaningless once the request is out the door.
  const frozen = !!requestedAt && rows.some((r) => r.doc_code && r.doc_code !== "REVIEW");
  const requirements = useMemo(() => {
    if (!frozen) return computedRequirements;
    const byKey = new Map(computedRequirements.map((r) => [reqDbKey(r), r]));
    const persisted = rows
      .filter((r) => r.doc_code && r.doc_code !== "REVIEW")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((r) => {
        const match = byKey.get(keyOf(r.doc_code, r.person_name));
        return {
          ...(match ?? {}),
          code: r.doc_code as string,
          label: r.label,
          why: r.why ?? match?.why ?? "",
          statute: r.statute_ref ?? match?.statute,
          issuedByUs: r.issued_by_us ?? match?.issuedByUs,
          needsNotary: r.needs_notary ?? match?.needsNotary,
          personName: r.person_name ?? match?.personName,
          personRole: (r.person_role as Requirement["personRole"]) ?? match?.personRole,
        } as Requirement;
      });
    // Freezing protects the history of what we already asked for — it must not
    // swallow a document the broker adds afterwards (a photo ID, say). Anything
    // newly required that has no persisted row yet is appended, so it shows in
    // the checklist, syncs to the seller's page and rides the next request.
    const have = new Set(persisted.map((r) => reqDbKey(r)));
    const added = computedRequirements.filter((r) => !have.has(reqDbKey(r)));
    return [...persisted, ...added];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen, rows, computedRequirements]);

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
      if (c.status === "sent" || c.status === "viewed") return "sent";
      return null;
    };
    const codeFor: Record<string, string> = {
      listing_agreement: "LA",
      poa: "D21",
      affidavit_heirship: "D12",
      spousal_consent: "D3",
    };
    const rank: RequiredState[] = ["issued", "sent", "received", "notarized", "complete"];

    for (const c of contracts) {
      const st = stateOf(c);
      const code = codeFor[c.kind];
      if (!st || !code) continue;
      // POAs are per-person; everything else is a single submission-level item.
      const poaPeople = requirements.filter((r) => r.code === "D21").map((r) => r.personName).filter(Boolean);
      const poaPerson = c.signature_name
        || ((c.fill_data as Record<string, unknown> | null)?.seller_name as string | undefined)
        || c.principal_key
        || (poaPeople.length === 1 ? poaPeople[0] : "");
      const key = code === "D21" ? `D21::${personKey(poaPerson)}` : `${code}::`;
      const prev = m[key];
      if (!prev || rank.indexOf(st) > rank.indexOf(prev)) m[key] = st;
    }
    return m;
  }, [contracts, requirements]);

  /**
   * Documents we physically hold against an item — a seller upload, or a PDF
   * that came back as an email attachment. Anything here means the item has
   * been returned, whatever the checklist row still says.
   */
  const attachedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of requirements) {
      const key = reqDbKey(r);
      const row = rows.find((x) => `${x.doc_code}::${personKey(x.person_name)}` === key);
      const linked = answers.linkedFiles?.[reqKey(r)] ?? [];
      const detached = answers.unlinkedFiles?.[reqKey(r)] ?? [];
      const hit = files.some((f) => !detached.includes(f.path)
        && (linked.includes(f.path) || fileMatchesRequirement(f, r, row)));
      if (hit) s.add(key);
    }
    return s;
  }, [requirements, rows, files, answers]);

  const stateByKey = useMemo(() => {
    const m: Record<string, RequiredState> = { ...contractStates };

    const PROGRESS: RequiredState[] = ["not_needed", "maybe", "needed", "issued", "sent", "awaiting_seller", "received", "notarized", "complete"];
    const rankOf = (s?: RequiredState | null) => (s ? PROGRESS.indexOf(s) : -1);
    // Contracts are keyed by the name on the contract ("Danny Roby") which is
    // often a short form of the checklist person ("Danny Howard Roby"). Fall
    // back to a token-subset match so the real contract status still lands.
    const contractFor = (code: string, person?: string | null): RequiredState | undefined => {
      const exact = contractStates[`${code}::${personKey(person)}`];
      if (exact) return exact;
      const tokens = String(person ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      if (!tokens.length) return undefined;
      let best: RequiredState | undefined;
      for (const [k, v] of Object.entries(contractStates)) {
        if (!k.startsWith(`${code}::`)) continue;
        const other = k.slice(code.length + 2).split(/\s+/).filter(Boolean);
        if (!other.length) continue;
        const overlap = other.every((t) => tokens.includes(t)) || tokens.every((t) => other.includes(t));
        if (overlap && rankOf(v) > rankOf(best)) best = v;
      }
      return best;
    };
    for (const r of rows) {
      if (!r.doc_code) continue;
      const key = `${r.doc_code}::${personKey(r.person_name)}`;
      // A file the seller has actually sent for this item always outranks a
      // freshly re-computed "needed" — otherwise a checklist sync silently
      // un-ticks documents we already hold. It also outranks "we emailed it",
      // because a signed copy coming back is further along than sending it out.
      const held = !!r.file_url || (Array.isArray(r.file_urls) && r.file_urls.length > 0)
        || attachedKeys.has(key);
      const override = (r.manual_override as RequiredState | null) ?? null;
      const fromContract = contractFor(r.doc_code, r.person_name);
      const rowState = (r.required_state as RequiredState) ?? "needed";

      // "Not needed" is a deliberate admin decision and always wins.
      if (override === "not_needed") { m[key] = "not_needed"; continue; }

      // Otherwise take the furthest-along truth we have. A stale "issued"
      // override must never hide the fact that the contract was actually
      // emailed, and a returned file must never be hidden by either.
      let best: RequiredState = override ?? rowState;
      if (rankOf(fromContract) > rankOf(best)) best = fromContract as RequiredState;
      if (held && rankOf("received") > rankOf(best)) best = "received";
      // Everything on a request that has gone out is obviously "sent" — the
      // only thing a broker needs to see is whether it has come back. So the
      // drafted/sent stages collapse into the same plain "Needed" chip.
      if (best === "issued" || best === "sent") best = "needed";
      m[key] = best;

    }

    // Items with a returned file but no checklist row yet (or a row that
    // hasn't been re-read) still read as received.
    for (const key of attachedKeys) {
      if (rankOf(m[key]) < rankOf("received") && m[key] !== "not_needed") m[key] = "received";
    }

    return m;

  }, [rows, contractStates, attachedKeys]);


  // `summarise` keys states by the raw requirement key (`code::Person Name`)
  // while `stateByKey` uses the normalised person key, so hand it a re-keyed
  // copy — otherwise person-scoped rows silently read "needed" and the
  // "x of y complete" counter is wrong.
  const statsStates = useMemo(() => {
    const m: Record<string, RequiredState> = {};
    for (const r of requirements) m[reqKey(r)] = stateByKey[reqDbKey(r)] ?? "needed";
    return m;
  }, [requirements, stateByKey]);
  const stats = useMemo(() => summarise(requirements, statsStates), [requirements, statsStates]);

  // Keep the seller's own page honest: every time the computed checklist
  // changes (a document added by hand, one removed, a name corrected) publish
  // it straight into submission_documents. Waiting for someone to press "Sync"
  // is what left sellers looking at the original, superseded list.
  const lastSynced = useRef<string>("");
  const wantedSignature = useMemo(
    () => requirements.map(reqDbKey).sort().join("|"),
    [requirements],
  );
  useEffect(() => {
    if (!open || loading || saving) return;
    // Never rewrite a checklist we already sent to the seller.
    if (frozen) return;
    if (!requirements.length) return;
    if (lastSynced.current === wantedSignature) return;
    lastSynced.current = wantedSignature;
    setAutoSynced(true);
    void syncChecklist(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, wantedSignature, frozen]);


  useEffect(() => {
    if (review?.step !== 1) return;
    const a = answers as Record<string, unknown>;
    setGreetName(String(a.packetGreeting ?? "").trim() || (sellerName ?? "").trim().split(/\s+/)[0] || "");
    setEmailNote(String(a.packetEmailNote ?? ""));
    setPageNote(String(a.packetNote ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.step]);

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
      .select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url, file_urls, why, statute_ref, issued_by_us, needs_notary, person_role, sort_order").is("deleted_at", null)
      .eq("submission_id", submissionId);
    return (data ?? []) as DocRow[];
  };
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
      // Hand-added rows that mean the same thing as a generated requirement are
      // adopted rather than duplicated (one "Photo ID — Carol", not two).
      const adHocByFamily = new Map<string, DocRow>();
      for (const r of live) {
        if (!isAdHoc(r.doc_code)) continue;
        const fk = familyKey(r.doc_code, r.person_name, r.label);
        if (fk && !adHocByFamily.has(fk)) adHocByFamily.set(fk, r);
      }
      const adopted = new Set<string>();

      const seen = new Set<string>();
      const inserts: Record<string, unknown>[] = [];
      const updates: { id: string; patch: Record<string, unknown> }[] = [];

      requirements.forEach((r, i) => {
        const key = reqDbKey(r);
        if (seen.has(key)) return; // never write the same item twice in one pass
        seen.add(key);
        const fk = familyKey(r.code, r.personName, r.label);
        const twin = !existing.get(key) && fk ? adHocByFamily.get(fk) : undefined;
        if (twin) adopted.add(twin.id);
        const prev = existing.get(key) ?? twin;

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
        // A row that was removed earlier is still on the table, soft-deleted, and
        // the unique item key would collide with it. Bring those back to life
        // instead of inserting a second copy — that duplicate-key error is what
        // brokers were seeing when they re-sent a request.
        const { data: buried } = await supabase.from("submission_documents")
          .select("id, doc_code, person_name")
          .eq("submission_id", submissionId).not("deleted_at", "is", null);
        const buriedByKey = new Map(
          ((buried ?? []) as DocRow[]).filter((b) => b.doc_code)
            .map((b) => [keyOf(b.doc_code, b.person_name), b.id]),
        );
        const fresh: Record<string, unknown>[] = [];
        for (const ins of inserts) {
          const id = buriedByKey.get(keyOf(ins.doc_code as string, ins.person_name as string | null));
          if (id) {
            const { error } = await supabase.from("submission_documents")
              .update({ ...ins, deleted_at: null, deleted_by: null } as never).eq("id", id);
            if (error) throw error;
          } else {
            fresh.push(ins);
          }
        }
        if (fresh.length) {
          const { error } = await supabase.from("submission_documents").insert(fresh as never);
          if (error) throw error;
        }
      }

      for (const u of updates) {
        const { error } = await supabase.from("submission_documents")
          .update(u.patch as never).eq("id", u.id);
        if (error) throw error;
      }

      // Remove auto-generated rows that the rules no longer call for and that
      // nobody has touched (untouched = still pending, no file, no override).
      const wanted = new Set(requirements.map(reqDbKey));
      const wantedFamilies = new Set(
        requirements.map((r) => familyKey(r.code, r.personName, r.label)).filter(Boolean) as string[],
      );
      const stale = live.filter((r) => {
         const key = keyOf(r.doc_code, r.person_name);
         if (adopted.has(r.id)) return false;
         const supersededGeneralId = r.doc_code === "D2" && requirements.some((x) => x.code === "D2P");
         const supersededPlaceholder = !!r.person_name
           && /^(owner on the deed|each co-owner|each heir|executor|trustee|authorised officer|person acting under authority)$/i.test(r.person_name)
           && requirements.some((x) => x.code === r.doc_code && x.personName && x.personName !== r.person_name);
         // A hand-typed row that says the same thing as a generated requirement
         // for the same person is a duplicate — drop it (never when a file is on it).
         const fk = familyKey(r.doc_code, r.person_name, r.label);
         const duplicateAdHoc = isAdHoc(r.doc_code) && !!fk && wantedFamilies.has(fk);
         if (duplicateAdHoc) return !r.file_url && !(r.file_urls ?? []).length && r.status !== "received";
         return !!r.doc_code && !wanted.has(key) && !r.file_url
           && (supersededGeneralId || supersededPlaceholder || (!r.manual_override && (r.status === "pending" || !r.status)));
       });

      if (stale.length) {
        await softDelete("submission_documents", stale.map((s) => s.id));
      }

      // A prepared POA lives in `contracts`, and the seller's page offers every
      // non-void one of them. If the rules no longer call for that person's POA
      // (they were marked deceased, say) the checklist row goes but the prepared
      // contract used to stay — which is why sellers kept being asked to notarise
      // a POA the broker could no longer even see. Void those too.
      const wantedPoaPeople = new Set(
        requirements.filter((r) => r.code === "D21")
          .flatMap((r) => [r.personName, ...(r.jointNames ?? [])])
          .filter(Boolean)
          .map((n) => personKey(n as string)),
      );
      if (wantedPoaPeople.size) {
        const { data: poaContracts } = await supabase.from("contracts")
          .select("id, principal_key, signature_name, fill_data, signed_at, notarized_at, status")
          .eq("submission_id", submissionId).eq("kind", "poa").neq("status", "void");
        for (const c of (poaContracts ?? []) as Record<string, unknown>[]) {
          if (c.signed_at || c.notarized_at) continue; // never touch executed paper
          const names = String(
            (c.fill_data as Record<string, unknown> | null)?.seller_name
            ?? c.signature_name ?? c.principal_key ?? "",
          ).split(/\s*&\s*|\s+and\s+/i).map((n) => personKey(n)).filter(Boolean);
          if (!names.length) continue;
          if (names.some((n) => wantedPoaPeople.has(n))) continue;
          await supabase.from("contracts").update({ status: "void" }).eq("id", c.id as string);
        }
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
    } as never).select("id, doc_code, person_name, label, status, required_state, manual_override, notes, file_url, file_urls, why, statute_ref, issued_by_us, needs_notary, person_role, sort_order").maybeSingle();
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

  /** The items and completed POAs that make up the request, shared by preview and send. */
  const buildPacketPayload = async () => {
    // Every POA the checklist calls for, each as the finished PDF, so the seller
    // receives one email with the document already filled in and attached.
    const poas: { name: string | null; url: string | null; path: string | null }[] = [];
    // Only the POAs the current checklist still asks for. A POA removed by hand
    // must never reappear in the email, so there is deliberately no fallback to
    // "any prepared POA on this submission".
    const sources = poaRequirements.map((r) => ({ r, c: preparedPoaFor(r) }));

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
    // Any other document we prepare for them (affidavit of heirship, custom
    // contracts) travels as a PDF attachment too, so the email carries every
    // paper they have to print and sign.
    const docs: { label: string; path: string }[] = [];
    for (const r of requirements) {
      if (!r.contractKind || r.contractKind === "poa") continue;
      const match = contracts.find((x) => x.kind === r.contractKind && x.status !== "void");
      if (!match) continue;
      const { data: c } = await supabase.from("contracts")
        .select("filled_pdf_path").eq("id", match.id).maybeSingle();
      const path = (c as { filled_pdf_path?: string | null } | null)?.filled_pdf_path ?? null;
      if (!path || docs.some((d) => d.path === path)) continue;
      docs.push({ label: r.label, path });
    }

    const poaMailTo = poaRequirements.length
      ? (mailFor(poaRequirements[0])?.address ?? null)
      : ORIGINALS_MAIL_ADDRESS;
    return { items, poas, docs, poaUrl, poaFor, poaMailTo };

  };


  /** Save the greeting and messages so both the email and the seller's page use them. */
  const persistPacketMessages = async () => {
    await persistAnswers({
      ...answers,
      packetGreeting: greetName.trim(),
      packetEmailNote: emailNote,
      packetNote: pageNote,
    } as OwnershipAnswers);
  };

  /** Step 2 of the review: fetch the exact email without sending anything. */
  const loadEmailPreview = async () => {
    setReview({ step: 2, loading: true });
    try {
      // Publish the current checklist first — the email and the seller's page
      // must show the documents we decided on, not an earlier version.
      await syncChecklist(true);
      await persistPacketMessages();
      const { items, poas, docs, poaUrl, poaFor, poaMailTo } = await buildPacketPayload();
      const { data, error } = await supabase.functions.invoke("send-document-packet", {
        body: { submission_id: submissionId, items, packet_url: packetUrl, poas, docs, poa_url: poaUrl, poa_for: poaFor, poa_mail_to: poaMailTo, greeting_name: greetName.trim(), note: emailNote.trim(), preview: true },
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
      // Publish the current checklist first — the email and the seller's page
      // must show the documents we decided on, not an earlier version.
      await syncChecklist(true);
      await persistPacketMessages();
      const { items, poas, docs, poaUrl, poaFor, poaMailTo } = await buildPacketPayload();

      const { error } = await supabase.functions.invoke("send-document-packet", {
        body: { submission_id: submissionId, items, packet_url: packetUrl, poas, docs, poa_url: poaUrl, poa_for: poaFor, poa_mail_to: poaMailTo, greeting_name: greetName.trim(), note: emailNote.trim() },
      });
      if (error) throw error;
      toast.success(`Document request emailed to ${sellerEmail}`, {
        description: `${items.length} item${items.length === 1 ? "" : "s"}${poas.length ? ` + ${poas.length} Power of Attorney` : ""}${docs.length ? ` + ${docs.length} prepared document${docs.length === 1 ? "" : "s"}` : ""}`,
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
      // The copy already prepared for these people is the starting point, so an
      // edit is a true revision of that document — it keeps the admin's earlier
      // corrections and replaces the old version everywhere (including on the
      // seller's page) when it is saved.
      const wantedKeys = [r.jointNames?.[0], r.jointNames?.[1], r.personName]
        .filter(Boolean).map((n) => String(n).toLowerCase().split(" ")[0]);
      const live = contracts.filter((c) => c.kind === r.contractKind && c.status !== "void");
      const existing =
        live.find((c) => {
          const f = (c.fill_data ?? {}) as Record<string, unknown>;
          const name = `${String(f.seller_name ?? "")} ${c.signature_name ?? ""}`.toLowerCase();
          return wantedKeys.length ? wantedKeys.some((k) => name.includes(k)) : true;
        }) ?? (wantedKeys.length ? undefined : live[0]);
      const prior = (existing?.fill_data ?? undefined) as Record<string, unknown> | undefined;
      const locked = !!(existing && ["signed", "notarized", "completed"].includes(String(existing.status)));
      const nameHints = await collectNameSpellings(s, r);
      const plotHints = await collectDeedPlots(s);
      setDocEdit((cur) => cur && cur.r === r ? {
        ...cur,
        loading: false,
        nameHints,
        plotHints,
        existingId: existing?.id ?? null,
        locked,

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
            plot_description: str(prior?.plot_description) || str(s.plot_description) || plotHints[0]?.text ||
              formatPlotDescription({ section: str(s.section), lawn: str(s.lawn), space_numbers: str(s.space_numbers) }),
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
      .select("file_name, document_type, extracted_data").is("deleted_at", null)
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
            .select("file_name, document_type, extracted_data").is("deleted_at", null).eq("customer_profile_id", profileId).limit(40)
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




  const generateDoc = async (
    r: Requirement,
    overrideFields?: DocFields,
    silent = false,
    supersedeId?: string | null,
  ) => {
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
      // Revising an existing copy: the old version is retired server-side so the
      // seller's page can never keep showing it.
      if (supersedeId) overrides.supersede_contract_id = supersedeId;
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { submission_id: submissionId, kind: r.contractKind, overrides },
      });
      if (error) throw error;
      const res = data as { pdf_url?: string | null; sign_token?: string | null; error?: string; contract?: ContractRow | null };
      if (res?.error) throw new Error(res.error);
      setDocEdit(null);
      // Show it as ready immediately — no waiting on a full panel reload.
      if (res?.contract) {
        setContracts((prev) => [
          ...prev.filter((c) => c.id !== res.contract!.id && c.id !== supersedeId),
          res.contract!,
        ]);
      }
      if (!silent) {
        // Show the filled PDF inline so it can be checked line by line.
        if (res?.pdf_url) void showPdf(r.label, { url: res.pdf_url, name: `${r.label}.pdf`, mime: "application/pdf" });
        toast.success(`${r.label} updated`, {
          description: supersedeId
            ? "The seller's document page now shows this revised version — the old copy has been retired."
            : res?.pdf_url ? "Opened below so you can check every field." : "Open the contract to review it.",
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
        const url = await blobUrlFor("contracts", path);
        if (url) { setPdfPreview({ url, title: r.label, source: { bucket: "contracts", path, name: `${r.label}.pdf`, mime: "application/pdf" } }); return; }

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
    const kind = newDoc.kind;
    const person = newDoc.person.trim();
    const person2 = newDoc.person2.trim();
    if (kind === "poa" && !person) return toast.error("Who is the power of attorney for?");
    if (kind === "joint_poa" && (!person || !person2)) return toast.error("Name both people signing the joint POA");
    const label = newDoc.label.trim() || (
      kind === "poa" ? `Limited power of attorney to Texas Cemetery Brokers — ${person}`
        : kind === "joint_poa" ? `Joint limited power of attorney — ${person} & ${person2}`
          : kind === "affidavit_heirship" ? "Affidavit of Heirship"
            : "");
    if (!label) return toast.error("Give the document a name");
    const addedDoc = {
      id: crypto.randomUUID().slice(0, 8),
      kind,
      label,
      why: newDoc.why.trim() || undefined,
      person: person || undefined,
      person2: person2 || undefined,
      needsNotary: kind === "custom" ? newDoc.needsNotary : true,
    };
    const extraDocs = [...(answers.extraDocs ?? []), addedDoc];
    // A broker may remove an automatically suggested POA and then add the right
    // POA by hand. The old removal key must not hide the newly added document.
    const addedCode = kind === "affidavit_heirship" ? "D12" : kind === "custom" ? `X-${addedDoc.id}` : "D21";
    const addedKey = `${addedCode}::${person}`;
    const nextAnswers = {
      ...answers,
      extraDocs,
      removedDocs: (answers.removedDocs ?? []).filter((key) => key !== addedKey),
    } as OwnershipAnswers;
    await persistAnswers(nextAnswers);
    setNewDoc({ kind: "custom", label: "", why: "", person: "", person2: "", needsNotary: false });
    // Plain "send us this" documents usually come in batches, so the dialog
    // stays open (fields cleared) until the broker closes it themselves.
    if (kind !== "custom") setAddDocOpen(false);

    // Anything we prepare ourselves goes straight into the field check, so the
    // broker fills it in there and then instead of hunting for an Edit button.
    if (kind !== "custom") {
      const r: Requirement = {
        code: kind === "affidavit_heirship" ? "D12" : "D21",
        label,
        why: newDoc.why.trim() || "Added for this file by the broker.",
        issuedByUs: true,
        needsNotary: true,
        contractKind: kind === "affidavit_heirship" ? "affidavit_heirship" : "poa",
        ...(person ? { personName: person } : {}),
        ...(kind === "joint_poa" ? { jointNames: [person, person2] } : {}),
      };
      // Don't let the background auto-prepare race the editor.
      autoPrepped.current.add(reqKey(r));
      void openDocEditor(r);
      return;
    }
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
    if (match.length) await softDelete("submission_documents", match);
    // A prepared POA / affidavit lives in `contracts`, not the checklist. Void it
    // too, otherwise the seller's page keeps offering the document we dropped.
    await voidPreparedFor(r);
    await load();
    toast.success(`"${r.label}" removed from the request`);
  };

  /** Void any prepared contract belonging to a requirement we've just dropped. */
  const voidPreparedFor = async (r: Requirement) => {
    if (!r.contractKind) return;
    const names = [r.personName, ...(r.jointNames ?? [])].filter(Boolean) as string[];
    const keys = new Set(names.map((n) => personKey(n)));
    const { data } = await supabase.from("contracts")
      .select("id, kind, principal_key, signature_name, fill_data")
      .eq("submission_id", submissionId).neq("status", "void");
    for (const c of (data ?? []) as Record<string, unknown>[]) {
      if (c.kind !== r.contractKind) continue;
      const signer = String(
        (c.fill_data as Record<string, unknown> | null)?.seller_name ?? c.signature_name ?? c.principal_key ?? "",
      );
      if (!keys.size || keys.has(personKey(signer)) || keys.has(personKey(String(c.principal_key ?? "")))) {
        await supabase.from("contracts").update({ status: "void" }).eq("id", c.id as string);
      }
    }
  };


  const removeExtraDoc = async (id: string) => {
    const gone = (answers.extraDocs ?? []).find((d) => d.id === id);
    await persistAnswers({ ...answers, extraDocs: (answers.extraDocs ?? []).filter((d) => d.id !== id) });
    await supabase.from("submission_documents")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("submission_id", submissionId).eq("doc_code", `X-${id}`);
    // Hand-added POAs and affidavits also have a prepared PDF behind them.
    if (gone && gone.kind && gone.kind !== "custom") {
      await voidPreparedFor({
        code: gone.kind === "affidavit_heirship" ? "D12" : "D21",
        label: gone.label,
        why: gone.why ?? "",
        contractKind: gone.kind === "affidavit_heirship" ? "affidavit_heirship" : "poa",
        ...(gone.person ? { personName: gone.person } : {}),
        ...(gone.person2 ? { jointNames: [gone.person ?? "", gone.person2] } : {}),
      } as Requirement);
    }
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
  /** The seller ticks "this is in the post" on their page — surface that here. */
  const mailedConfirmed =
    ((answers as Record<string, unknown>).mailedConfirmed as Record<string, string> | undefined) ?? {};
  const postedAt = (r: Requirement): string | undefined => {
    const exact = mailedConfirmed[reqKey(r)];
    if (exact) return exact;
    const want = `${r.code}::${personKey(r.personName)}`;
    for (const [k, v] of Object.entries(mailedConfirmed)) {
      const [code, person] = k.split("::");
      if (`${code}::${personKey(person)}` === want) return v;
    }
    // Legacy single-signer ticks were stored without a name.
    if (r.code === "D21" && mailedConfirmed["D21::"]) return mailedConfirmed["D21::"];
    return undefined;
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
  /** Everything tied to a named person — what the family tree draws. */
  const personRequirements = documentRequirements.filter(
    (r) => !!r.personName || !!r.jointNames?.length,
  );
  const general = documentRequirements.filter((r) => !r.personName);
  // Match names the same way everywhere else in this panel. Exact string
  // matching caused hand-added rows with a middle name/initial variation to be
  // considered claimed, but then rendered in neither the roster nor orphan list.
  const byPerson = roster.map((p) => ({
    person: p,
    items: documentRequirements.filter((r) => r.personName && personKey(r.personName) === personKey(p.name)),
  }))
    .filter((g) => g.items.length);

  // A broker can add a power of attorney by hand for somebody who is not in the
  // signing roster yet. Those rows used to vanish — they belong to a person, but
  // no roster group claimed them. Group them under their own name instead.
  const claimed = new Set(roster.map((p) => personKey(p.name)));
  const orphanGroups = (() => {
    const m = new Map<string, { name: string; items: Requirement[] }>();
    for (const r of documentRequirements) {
      if (!r.personName || claimed.has(personKey(r.personName))) continue;
      const k = personKey(r.personName);
      if (!m.has(k)) m.set(k, { name: r.personName, items: [] });
      m.get(k)!.items.push(r);
    }
    return [...m.values()];
  })();


  /** Do we physically hold a certificate of ownership / plot deed already? */
  const deedOnFile = files.some((f) => codesForFile(f).includes("D1"));


  /** Files that look like they satisfy this requirement, plus any linked by hand. */
  const filesFor = (r: Requirement): AnyFile[] => {
    const row = rowFor(r);
    const key = reqKey(r);
    const linked = answers.linkedFiles?.[key] ?? [];
    const detached = answers.unlinkedFiles?.[key] ?? [];
    return files.filter((f) => !detached.includes(f.path)
      && (linked.includes(f.path) || fileMatchesRequirement(f, r, row)));
  };

  /** Attach a document we already hold (an email attachment, say) to an item. */
  const linkFileToRequirement = async (r: Requirement, path: string) => {
    const key = reqKey(r);
    const next = { ...(answers.linkedFiles ?? {}) };
    next[key] = [...new Set([...(next[key] ?? []), path])];
    const detached = { ...(answers.unlinkedFiles ?? {}) };
    detached[key] = (detached[key] ?? []).filter((p) => p !== path);
    await persistAnswers({ ...answers, linkedFiles: next, unlinkedFiles: detached } as OwnershipAnswers);
    await setRowState(r, "received");
    toast.success("Linked — this item now counts as received");
  };

  /** Take a wrongly attached file back off an item (the little ×). */
  const unlinkFileFromRequirement = async (r: Requirement, path: string) => {
    const key = reqKey(r);
    const linked = { ...(answers.linkedFiles ?? {}) };
    linked[key] = (linked[key] ?? []).filter((p) => p !== path);
    const detached = { ...(answers.unlinkedFiles ?? {}) };
    detached[key] = [...new Set([...(detached[key] ?? []), path])];
    await persistAnswers({ ...answers, linkedFiles: linked, unlinkedFiles: detached } as OwnershipAnswers);
    // Nothing left on the item? Then it is still outstanding.
    if (filesFor(r).filter((f) => f.path !== path).length === 0) await setRowState(r, "needed");
    toast.success("Removed from this document");
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
      <div id={anchorId(r)} className={`border rounded-md px-3 py-2 scroll-mt-24 ${r.review ? "border-amber-300 bg-amber-50/50" : "bg-background/60"}`}>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {r.review && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              <span className="text-sm font-medium">{r.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.code}</span>
              {postedAt(r) && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 inline-flex items-center gap-0.5"
                  title={`Seller ticked "it's in the post" on ${new Date(postedAt(r)!).toLocaleString()}`}
                >
                  <Send className="w-2.5 h-2.5" />Seller mailed {new Date(postedAt(r)!).toLocaleDateString()}
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
                  <div key={f.path} className="relative w-[104px]">
                    <button
                      onClick={() => void openFile(f)}
                      className="group w-full text-left rounded-lg border border-border/60 bg-background overflow-hidden hover:border-teal-400 hover:shadow-sm transition"
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
                    <button
                      type="button"
                      onClick={() => void unlinkFileFromRequirement(r, f.path)}
                      title="Take this file off this document"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border text-muted-foreground hover:text-rose-600 hover:border-rose-300 shadow-sm flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Nothing uploaded for this item yet.</p>
            )}
            {!r.issuedByUs && files.filter((f) => !attached.some((a) => a.path === f.path)).length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Already have it on file?</span>
                <select
                  className="text-[11px] border border-border rounded px-1.5 py-1 bg-background max-w-[240px]"
                  value=""
                  onChange={(e) => { const p = e.target.value; if (p) void linkFileToRequirement(r, p); }}
                >
                  <option value="">Link a file we hold…</option>
                  {files.filter((f) => !attached.some((a) => a.path === f.path)).map((f) => (
                    <option key={f.path} value={f.path}>{f.origin} — {f.name}</option>
                  ))}
                </select>
              </div>
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

          {/* ── The family tree map is hidden for now (kept for later) ── */}
          {SHOW_FAMILY_TREE_MAP ? (
          <div className="border rounded-lg p-3 bg-background/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-muted-foreground" /> Family tree · who needs what
              </span>
              <span className="text-[10px] text-muted-foreground">
                Click a document to check or edit it · “+” adds one to that person
              </span>
            </div>
            <FamilyTreeMap
              answers={answers}
              people={(answers.people ?? []).length ? (answers.people as RosterPerson[]) : roster}
              requirements={personRequirements}
              stateOf={(r) => stateByKey[reqDbKey(r)] ?? (r.review ? "maybe" : "needed")}
              onDocClick={(r) => {
                if (r.contractKind) { void openDocEditor(r); return; }
                setExpanded((e) => ({ ...e, [reqKey(r)]: true }));
                requestAnimationFrame(() => {
                  document.getElementById(anchorId(r))?.scrollIntoView({ behavior: "smooth", block: "center" });
                });
              }}
              onAddDoc={(name) => {
                setNewDoc({ kind: "custom", label: "", why: "", person: name, person2: "", needsNotary: false });
                setAddDocOpen(true);
              }}
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
                  className={requestedAt
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-[#1f2a37] hover:bg-[#111827] text-white"}
                  onClick={() => setReview({ step: 1 })}
                  disabled={sending || !sellerEmail}
                  title={requestedAt
                    ? `Sent ${new Date(requestedAt).toLocaleString()} — click to send again`
                    : sellerEmail ? `Review, then send everything to ${sellerEmail}` : "No email on this submission"}
                >
                  {sending
                    ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    : requestedAt ? <Check className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  {requestedAt
                    ? `Request sent ${new Date(requestedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    : "Send document request"}
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

            {orphanGroups.map((g) => (
              <div key={`orphan-${g.name}`} className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {g.name} · Added by hand
                </p>
                {g.items.map((r) => <Chip key={reqKey(r) + r.label} r={r} />)}
              </div>
            ))}

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
        <DialogContent className="max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" /> Add a document to this request
            </DialogTitle>
            <DialogDescription className="text-xs">
              It joins the checklist, the seller's upload page and the next document request email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-y-auto -mx-1 px-1 pb-1">

            <div>
              <Label className="text-xs">What kind of document?</Label>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {([
                  { k: "custom", l: "Something to send us" },
                  { k: "poa", l: "Power of attorney" },
                  { k: "joint_poa", l: "Joint power of attorney" },
                  { k: "affidavit_heirship", l: "Affidavit of heirship" },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setNewDoc({ ...newDoc, kind: o.k, label: "" })}
                    className={`text-[12px] rounded-md border px-2 py-1.5 text-left transition ${
                      newDoc.kind === o.k
                        ? "border-[#1f2a37] bg-[#1f2a37] text-white"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              {newDoc.kind !== "custom" && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  We prepare and fill this one ourselves — it appears in the checklist ready to check, edit and send for notarising.
                </p>
              )}
            </div>
            <datalist id="roster-names">
              {(answers.people ?? []).filter((p) => p.name?.trim()).map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            {newDoc.kind === "custom" && (
              <div>
                <Label className="text-xs">What is it called?</Label>
                <Input className="mt-1" value={newDoc.label} placeholder="e.g. Divorce decree"
                  onChange={(e) => setNewDoc({ ...newDoc, label: e.target.value })} />
              </div>
            )}
            <div>
              <Label className="text-xs">Why we need it (shown to the seller)</Label>
              <Input className="mt-1" value={newDoc.why} placeholder="e.g. The cemetery needs proof the plot was awarded to you"
                onChange={(e) => setNewDoc({ ...newDoc, why: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">
                {newDoc.kind === "poa" ? "Who signs it?"
                  : newDoc.kind === "joint_poa" ? "First person signing"
                    : newDoc.kind === "affidavit_heirship" ? "Affiant (optional)"
                      : "For one person only (optional)"}
              </Label>
              <Input className="mt-1" list="roster-names" value={newDoc.person}
                placeholder={newDoc.kind === "custom" ? "Leave blank if it's about the property" : "Full legal name"}
                onChange={(e) => setNewDoc({ ...newDoc, person: e.target.value })} />
            </div>
            {newDoc.kind === "joint_poa" && (
              <div>
                <Label className="text-xs">Second person signing</Label>
                <Input className="mt-1" list="roster-names" value={newDoc.person2} placeholder="Full legal name"
                  onChange={(e) => setNewDoc({ ...newDoc, person2: e.target.value })} />
              </div>
            )}
            {newDoc.kind === "custom" && (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newDoc.needsNotary}
                  onChange={(e) => setNewDoc({ ...newDoc, needsNotary: e.target.checked })} />
                This one has to be notarized
              </label>
            )}

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
          <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border pt-3 mt-1 bg-background">
            <Button variant="ghost" size="sm" onClick={() => setAddDocOpen(false)}>Close</Button>
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
              {docEdit?.locked
                ? "This copy has already been signed or notarised — saving prepares a fresh version and leaves the signed one untouched."
                : docEdit?.existingId
                  ? "Revising the copy already prepared. When you save, the seller's document page updates to this new version straight away and the old one is retired."
                  : docEdit?.r.jointNames?.length
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

              {/* A Power of Attorney is signed in front of a notary, and the
                  signer writes their own address on it — nothing to fill here. */}
              {docEdit.r.contractKind !== "poa" && (
                <>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Mailing address</Label>
                    <Input value={docEdit.fields.address} placeholder="Street address"
                      onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, address: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">City, State, ZIP</Label>
                    <Input value={docEdit.fields.city_state_zip}
                      onChange={(e) => setDocEdit({ ...docEdit, fields: { ...docEdit.fields, city_state_zip: e.target.value } })} />
                  </div>
                </>
              )}
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
              onClick={() => docEdit && void generateDoc(
                docEdit.r, docEdit.fields, false, docEdit.locked ? null : docEdit.existingId ?? null)}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSignature className="w-3.5 h-3.5 mr-1" />}
              {docEdit?.existingId && !docEdit?.locked ? "Save revision & update seller page" : "Generate & preview"}
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
            <Button variant="outline" size="sm" onClick={() => {
              if (!pdfPreview) return;
              const tab = window.open(pdfPreview.url, "_blank");
              if (!tab) toast.error("Pop-up blocked — allow pop-ups for this site and try again");
              else tab.opener = null;
            }}>
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
              <div className="rounded-md border p-3 space-y-2.5">
                <div>
                  <p className="text-xs font-semibold">Who the email greets</p>
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    Used as "Dear …" — change it if the name we picked is wrong.
                  </p>
                  <Input value={greetName} onChange={(e) => setGreetName(e.target.value)}
                    placeholder="First name" className="h-8 text-xs" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">Your message in the email</p>
                    <ProofreadButton
                      value={emailNote}
                      onFixed={setEmailNote}
                      subject="Document request"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Optional — appears at the top, above the checklist.</p>
                  <Textarea value={emailNote} onChange={(e) => setEmailNote(e.target.value)} rows={3}
                    placeholder="Hi Joel, lovely speaking with you today…" className="text-xs" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">Your message on their document page</p>
                    <ProofreadButton
                      value={pageNote}
                      onFixed={setPageNote}
                      subject="Note on document page"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Optional — shown as a note from you at the top of the page.</p>
                  <Textarea value={pageNote} onChange={(e) => setPageNote(e.target.value)} rows={3}
                    placeholder="Anything they should know before uploading…" className="text-xs" />
                </div>

              </div>

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

