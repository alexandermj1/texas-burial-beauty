import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  CheckCircle2, Loader2, Upload, Smartphone, FileText, ShieldCheck,
  ChevronDown, Stamp, X, Mail, Trash2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DOC_GUIDE } from "@/lib/ownershipRules";
import { openFileViewer } from "@/lib/fileViewer";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";

/**
 * One curated page per seller, linked from a single email. Every document we
 * still need, explained in plain English, uploadable from the computer or by
 * scanning a QR with a phone camera.
 */

type PacketDoc = {
  id: string;
  code: string | null;
  label: string;
  person_name: string | null;
  why: string | null;
  needs_notary: boolean | null;
  issued_by_us: boolean | null;
  /** The finished PDF when this is a document we prepared for them (affidavit, consent). */
  prepared_pdf_url?: string | null;
  /** When set, the cemetery only accepts the original — post it to this address. */
  mail_to?: string | null;
  /** Set once the seller has ticked "this is in the post". */
  mailed_confirmed_at?: string | null;
  state: string;
  complete?: boolean;
  uploaded: boolean;
};


type Poa = {
  contract_id?: string | null;
  principal_key?: string | null;
  signer_name?: string | null;
  sign_token: string | null;
  pdf_url?: string | null;
  notarized: boolean;
  signed: boolean;
  mail_to?: string | null;
  mail_key?: string | null;
  mailed_confirmed_at?: string | null;
} | null;



const MAIL_ADDRESS = "Bayer Cemetery Brokers\n100 N Brand Blvd, Ste 213\nGlendale, CA 91203";
const MAIL_REASON =
  "We work with Bayer Cemetery Brokers, our partner, who receive and store original documents securely for us — that way the paperwork is ready the moment the cemetery asks for the paper copy and your transfer goes through quickly.";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Why does the cemetery need originals rather than photos?",
    a: "Cemetery offices are transferring legal title to an interment right, so most of them will only accept wet-ink originals with a notary stamp. We ask for a photo first so we can check every page is correct before you post anything — then the original follows in the mail to our partner, Bayer Cemetery Brokers, in Glendale, California.",
  },
  {
    q: "What exactly does the Power of Attorney let you do?",
    a: "Only what is needed to sell this plot: talk to the cemetery, collect and submit their transfer forms, and complete the paperwork at closing. It does not allow us to touch your money, sell at a price you have not agreed, or act on anything other than this property. It expires when the sale completes and you can revoke it in writing at any time.",
  },
  {
    q: "Where do I find a notary, and what does it cost?",
    a: "Most banks and credit unions notarise free for their customers. UPS Store, FedEx Office, courthouses, title companies and public libraries also offer it, usually $6–$15 per signature in Texas. Mobile notaries will come to your home for around $25–$75. Bring your unsigned document and a valid photo ID — the notary must watch you sign.",
  },
  {
    q: "Do I have to pay for anything on this page?",
    a: "No. There is no charge from us for any of this paperwork, and no fee at all until your plot sells. The only costs you may face are a notary's fee, postage, and any certified-copy fee a county charges for a death certificate or court order.",
  },
  {
    q: "Is my information safe?",
    a: "Your files are stored privately, are visible only to your broker, and are used solely to transfer this plot. We never sell or share your details, and originals are returned to you if the sale does not complete.",
  },
];

type ListingAgreement = { signed: boolean; completed: boolean; signed_at: string | null } | null;

type Packet = { seller_name: string | null; broker_note?: string | null; cemetery: string | null; documents: PacketDoc[]; poa?: Poa; poas?: Poa[]; listing_agreement?: ListingAgreement };

const DONE = ["received", "notarized", "complete"];
const PUBLIC_SITE_URL = "https://www.texascemeterybrokers.com";

type Uploaded = { name: string; path: string; url: string; isImage: boolean };

const openPrivateFile = async (url: string, setError: (message: string) => void) => {
  if (!openFileViewer({ url })) setError("Your browser blocked the new tab. Allow pop-ups for this site, then try again.");
};

/**
 * The seller ticks this to tell us the original is in the post, so our team —
 * and Bayer, who receive it — know to expect it.
 */
const MailTick = ({
  submissionId, itemKey, confirmedAt, onDone,
}: { submissionId: string; itemKey: string; confirmedAt?: string | null; onDone: () => void }) => {
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(!!confirmedAt);

  const toggle = async () => {
    const next = !confirmed;
    setSaving(true);
    setConfirmed(next);
    try {
      await supabase.functions.invoke("seller-packet", {
        body: { action: "confirm_mail", submission_id: submissionId, key: itemKey, undo: !next },
      });
      onDone();
    } catch {
      setConfirmed(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`mt-3 w-full text-left inline-flex items-start gap-2.5 rounded-xl border px-4 py-3 transition-colors disabled:opacity-60 ${
        confirmed ? "border-primary/40 bg-primary/[0.06]" : "border-border/70 bg-card/70 hover:border-primary/40"
      }`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${confirmed ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
        {confirmed && <CheckCircle2 className="w-3 h-3" />}
      </span>
      <span className="text-xs text-foreground leading-relaxed">
        {confirmed
          ? "Thank you — we've told our team to expect the original in the post."
          : "Tick here to confirm you're posting the original to us."}
      </span>
    </button>
  );
};



const PoaUpload = ({
  submissionId,
  onDone,
  alreadyDone = false,
  contractId,
  signerName,
  principalKey,
}: {
  submissionId: string;
  onDone: () => void;
  alreadyDone?: boolean;
  /** A submission can need one POA per signer, so each card keeps its own files. */
  contractId?: string | null;
  signerName?: string | null;
  principalKey?: string | null;
}) => {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(alreadyDone);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState(false);
  const [qr, setQr] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<Uploaded[]>([]);

  const slug = String(principalKey ?? "").replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");
  const docKey = slug ? `poa-notarized-${slug}` : "poa-notarized";
  const uploadLabel = signerName ? `notarized POA for ${signerName}` : "notarized POA";
  const mobileUrl = typeof window !== "undefined"
    ? `${PUBLIC_SITE_URL}/seller-portal/upload/mobile?session=${submissionId}&doc=${encodeURIComponent(docKey)}&label=${encodeURIComponent(uploadLabel)}`
    : "";


  useEffect(() => {
    if (!phone || !mobileUrl) return;
    QRCode.toDataURL(mobileUrl, { margin: 1, width: 240, color: { dark: "#3f5d47", light: "#00000000" } })
      .then(setQr).catch(() => setQr(""));
  }, [phone, mobileUrl]);

  const refreshUploads = useCallback(async () => {
    const { data } = await supabase.storage
      .from("portal-uploads")
      .list(submissionId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const mine = (data ?? []).filter((f) => f.name.startsWith(`${docKey}-`));
    if (!mine.length) { setUploads([]); return []; }
    const paths = mine.map((f) => `${submissionId}/${f.name}`);
    const { data: signed } = await supabase.storage.from("portal-uploads").createSignedUrls(paths, 3600);
    const next: Uploaded[] = mine.map((f, i) => ({
      name: f.name,
      path: paths[i],
      url: signed?.[i]?.signedUrl ?? "",
      isImage: /\.(jpe?g|png|heic|webp|gif)$/i.test(f.name),
    }));
    setUploads(next);
    return next;
  }, [submissionId, docKey]);


  useEffect(() => { void refreshUploads(); }, [refreshUploads]);

  const record = useCallback(async (path: string, name: string) => {
    const { error: err } = await supabase.functions.invoke("seller-packet", {
      body: {
        action: "record_poa", submission_id: submissionId, path, name,
        contract_id: contractId ?? null, signer_name: signerName ?? null,
      },
    });
    if (err) throw err;
    setDone(true);
    onDone();
  }, [submissionId, onDone, contractId, signerName]);


  useEffect(() => {
    if (!phone) return;
    let seen = uploads.length;
    const check = async () => {
      const next = await refreshUploads();
      if (next.length > seen) {
        seen = next.length;
        const newest = next[0];
        await record(newest.path, newest.name);
      }
    };
    const t = window.setInterval(check, 2500);
    void check();
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, refreshUploads, record]);

  const handleFiles = async (list: FileList) => {
    setUploading(true);
    setError("");
    try {
      for (const f of Array.from(list)) {
        const ext = (f.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${submissionId}/${docKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || "pdf"}`;
        const { error } = await supabase.storage
          .from("portal-uploads")
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        if (error) throw error;
        await record(path, f.name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeUpload = async (upload: Uploaded) => {
    if (!window.confirm("Remove this uploaded POA? It will be needed again.")) return;
    setError("");
    const { data, error: removeError } = await supabase.functions.invoke("seller-packet", {
      body: {
        action: "remove_upload", submission_id: submissionId, path: upload.path, kind: "poa",
        doc_key: docKey, contract_id: contractId ?? null, signer_name: signerName ?? null,
      },
    });

    if (removeError || (data as { error?: string } | null)?.error) {
      setError((data as { error?: string } | null)?.error ?? removeError?.message ?? "The upload could not be removed.");
      return;
    }
    const next = await refreshUploads();
    setDone(next.length > 0);
    onDone();
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
          {done ? <CheckCircle2 className="w-5 h-5" /> : <Stamp className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg text-foreground leading-snug">
            Upload the notarized POA{signerName ? ` for ${signerName}` : ""}
          </p>

          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Once a notary has signed and stamped it, send the document back here. A photo or PDF of every page is fine.
          </p>
          {done && (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/[0.05] px-4 py-3">
              <p className="text-xs text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> We have the notarized copy — thank you. You can
                still send a clearer photo or a different copy below if you need to.
              </p>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { const fs = e.target.files; if (fs?.length) void handleFiles(fs); }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full disabled:opacity-60 ${done ? "border border-border hover:border-primary/40" : uploading ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Uploading…" : done ? "Replace or add a page" : "Upload from this computer"}
            </button>
            <button
              onClick={() => setPhone((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border hover:border-primary/40"
            >
              {phone ? <X className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />} Phone
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive px-4 py-3">
              {error}
            </div>
          )}
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 border-t border-border/60 px-1 pt-4">
          <p className="text-[11px] text-muted-foreground mb-3">
            {uploads.length} {uploads.length === 1 ? "file" : "files"} received — tap to view.
          </p>
          <div className="flex flex-wrap gap-3">
            {uploads.map((u) => (
              <div
                key={u.path}
                className="group relative block w-24 h-24 rounded-xl overflow-hidden border border-border/70 bg-card hover:border-primary/50"
                title={u.name}
              >
                <button type="button" onClick={() => void openPrivateFile(u.url, setError)} className="absolute inset-0 z-0" aria-label={`Open ${u.name}`} />
                {u.isImage ? (
                  <img src={u.url} alt="Notarized POA" className="w-full h-full object-cover group-hover:opacity-90" />
                ) : (
                  <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground px-2 text-center">
                    <FileText className="w-5 h-5 text-primary" /> View file
                  </span>
                )}
                <button type="button" onClick={() => void removeUpload(u)} className="absolute z-10 top-1 right-1 rounded-full bg-background/90 p-1 text-destructive shadow" title="Remove upload" aria-label={`Remove ${u.name}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {phone && (

        <div className="border-t border-border/60 mt-4 pt-5 text-center bg-muted/20 rounded-xl px-5 py-6">
          <p className="text-sm text-foreground mb-3">Scan with your phone camera, then photograph the notarized POA.</p>
          {qr ? <img src={qr} alt="QR code to upload from your phone" className="w-40 h-40 mx-auto" /> : <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />}
          <p className="text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Photos appear here automatically as you take them.
          </p>
        </div>
      )}
    </div>
  );
};

const DocRow = ({
  doc, submissionId, onDone,
}: { doc: PacketDoc; submissionId: string; onDone: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [phone, setPhone] = useState(false);
  const [qr, setQr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(!!doc.complete || doc.uploaded || DONE.includes(doc.state));
  const [uploads, setUploads] = useState<Uploaded[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const guide = DOC_GUIDE[doc.code ?? ""];

  const mobileUrl = typeof window !== "undefined"
    ? `${PUBLIC_SITE_URL}/seller-portal/upload/mobile?session=${submissionId}&doc=${encodeURIComponent(doc.id)}&label=${encodeURIComponent(doc.label)}`
    : "";

  useEffect(() => {
    if (!phone || !mobileUrl) return;
    QRCode.toDataURL(mobileUrl, { margin: 1, width: 240, color: { dark: "#3f5d47", light: "#00000000" } })
      .then(setQr).catch(() => setQr(""));
  }, [phone, mobileUrl]);

  /** Everything this seller has already sent for this item, with previews. */
  const refreshUploads = useCallback(async () => {
    const { data } = await supabase.storage
      .from("portal-uploads")
      .list(submissionId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const mine = (data ?? []).filter((f) => f.name.startsWith(`${doc.id}-`));
    if (!mine.length) { setUploads([]); return []; }
    const paths = mine.map((f) => `${submissionId}/${f.name}`);
    const { data: signed } = await supabase.storage.from("portal-uploads").createSignedUrls(paths, 3600);
    const next: Uploaded[] = mine.map((f, i) => ({
      name: f.name,
      path: paths[i],
      url: signed?.[i]?.signedUrl ?? "",
      isImage: /\.(jpe?g|png|heic|webp|gif)$/i.test(f.name),
    }));
    setUploads(next);
    return next;
  }, [submissionId, doc.id]);

  useEffect(() => { void refreshUploads(); }, [refreshUploads]);

  const record = useCallback(async (path: string, name: string, size?: number, type?: string) => {
    await supabase.functions.invoke("seller-packet", {
      body: { action: "record", submission_id: submissionId, doc_id: doc.id, path, name, size, type },
    });
    setDone(true);
    await refreshUploads();
    onDone();
  }, [doc.id, submissionId, onDone, refreshUploads]);

  // Watch the bucket for anything the phone sends across, so the photo shows up
  // here the moment it is taken — and keeps showing every extra photo.
  useEffect(() => {
    if (!phone) return;
    let seen = uploads.length;
    const check = async () => {
      const next = await refreshUploads();
      if (next.length > seen) {
        seen = next.length;
        const newest = next[0];
        await record(newest.path, newest.name);
      }
    };
    const t = window.setInterval(check, 2500);
    void check();
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, refreshUploads, record]);

  const handleFiles = async (list: FileList) => {
    setUploading(true);
    try {
      for (const f of Array.from(list)) {
        const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${submissionId}/${doc.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || "bin"}`;
        const { error } = await supabase.storage
          .from("portal-uploads")
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        if (error) throw error;
        await record(path, f.name, f.size, f.type);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeUpload = async (upload: Uploaded) => {
    if (!window.confirm("Remove this upload? This document will be marked as needed again if no other files remain.")) return;
    const { data, error } = await supabase.functions.invoke("seller-packet", {
      body: { action: "remove_upload", submission_id: submissionId, doc_id: doc.id, path: upload.path, kind: "document" },
    });
    if (error || (data as { error?: string } | null)?.error) return;
    const next = await refreshUploads();
    setDone(next.length > 0 || !!doc.complete);
    onDone();
  };

  return (
    <div className={`rounded-2xl border transition-colors overflow-hidden ${done ? "border-primary/40 bg-primary/[0.04]" : "border-border/70 bg-card/70"}`}>
      <div className="flex items-start gap-4 p-5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
          {done ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-foreground leading-snug">{doc.label}</p>
          {doc.why && <p className="text-xs text-muted-foreground mt-0.5">{doc.why}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {doc.needs_notary && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
                <Stamp className="w-3 h-3" />Notary
              </span>
            )}
            {doc.issued_by_us && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {doc.prepared_pdf_url ? "We prepared this for you" : "We send this to you"}
              </span>
            )}
            {done && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />Complete
              </span>
            )}
            {!done && doc.mail_to && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/20 text-foreground inline-flex items-center gap-1">
                <Mail className="w-3 h-3" />Original by post
              </span>
            )}

            {guide && (
              <button onClick={() => setExpanded((v) => !v)} className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                What is this? <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
          {expanded && guide && (
            <div className="mt-3 rounded-xl bg-muted/40 px-4 py-3 space-y-2">
              <p className="text-xs text-foreground/80 leading-relaxed">{guide.what}</p>
              <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-foreground/70">How to get it: </span>{guide.how}</p>
            </div>
          )}
          {doc.prepared_pdf_url && (
            <div className="mt-3 rounded-xl bg-card/70 border border-border/60 px-4 py-3">
              <p className="text-[11px] font-medium text-foreground">What to do — about 15 minutes</p>
              <ol className="mt-1.5 space-y-1 text-[11px] text-muted-foreground leading-relaxed list-decimal pl-4">
                <li>Open the document below and print every page — it is already filled in from your answers.</li>
                <li>Do <span className="text-foreground">not</span> sign it yet{doc.needs_notary ? " — the notary has to watch you sign" : ""}.</li>
                <li>{doc.needs_notary ? "Take it, with your photo ID, to any notary and sign in front of them." : "Sign and date every page."}</li>
                <li>Photograph or scan every page and upload it here{doc.mail_to ? ", then post the original to the address below" : ""}.</li>
              </ol>
              <button
                type="button"
                onClick={() => void openPrivateFile(doc.prepared_pdf_url!, () => {})}
                className="inline-flex items-center gap-1.5 mt-3 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
              >
                <Stamp className="w-3.5 h-3.5" /> Open the document we prepared
              </button>
            </div>
          )}
          {done && (
            <p className="mt-3 text-xs text-primary inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> We already have this — nothing more to do for this item.
            </p>
          )}
          {!done && doc.mail_to && (
            <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
              <p className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />Please post us the original of this document
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                We work with Bayer Cemetery Brokers, our partner, who receive and store original documents securely for us —
                that way the paperwork is ready the moment the cemetery asks for it and your transfer is processed quickly.
                Originals stay safely with your file and are returned to you if the sale does not complete.
              </p>
              <p className="text-xs text-foreground/90 whitespace-pre-line mt-2 font-medium">{doc.mail_to}</p>
              <MailTick
                submissionId={submissionId}
                itemKey={`${doc.code ?? ""}::${doc.person_name ?? ""}`}
                confirmedAt={doc.mailed_confirmed_at}
                onDone={onDone}
              />
            </div>
          )}
        </div>
        {(!doc.issued_by_us || !!doc.prepared_pdf_url) && !done && (

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { const fs = e.target.files; if (fs?.length) void handleFiles(fs); }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full disabled:opacity-60 bg-primary text-primary-foreground hover:opacity-90"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload
            </button>
            <button
              onClick={() => setPhone((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-border hover:border-primary/40"
            >
              {phone ? <X className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />} Phone
            </button>
          </div>
        )}

      </div>

      {uploads.length > 0 && (
        <div className="border-t border-border/60 px-5 py-4 bg-primary/[0.03]">
          <p className="text-[11px] text-muted-foreground mb-3">
            {uploads.length} {uploads.length === 1 ? "file" : "files"} received — tap to view full size.
          </p>
          <div className="flex flex-wrap gap-3">
            {uploads.map((u) => (
              <div
                key={u.path}
                className="group relative block w-24 h-24 rounded-xl overflow-hidden border border-border/70 bg-card hover:border-primary/50"
                title={u.name}
              >
                <button type="button" onClick={() => void openPrivateFile(u.url, () => {})} className="absolute inset-0 z-0" aria-label={`Open ${u.name}`} />
                {u.isImage ? (
                  <img src={u.url} alt={doc.label} className="w-full h-full object-cover group-hover:opacity-90" />
                ) : (
                  <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground px-2 text-center">
                    <FileText className="w-5 h-5 text-primary" /> View file
                  </span>
                )}
                <button type="button" onClick={() => void removeUpload(u)} className="absolute z-10 top-1 right-1 rounded-full bg-background/90 p-1 text-destructive shadow" title="Remove upload" aria-label={`Remove ${u.name}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {phone && (
        <div className="border-t border-border/60 px-5 py-6 text-center bg-muted/20">
          <p className="text-sm text-foreground mb-3">Scan with your phone camera, then take a photo of the document. You can take as many photos as you need.</p>
          {qr ? <img src={qr} alt="QR code to upload from your phone" className="w-40 h-40 mx-auto" /> : <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />}
          <p className="text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Photos appear here automatically as you take them.
          </p>
        </div>
      )}
    </div>
  );
};


const SellerDocuments = () => {
  const [params] = useSearchParams();
  const submissionId = params.get("s") ?? "";
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!submissionId) { setError("This link is missing its reference."); setLoading(false); return; }
    const { data, error: err } = await supabase.functions.invoke("seller-packet", {
      body: { action: "get", submission_id: submissionId },
    });
    if (err || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? "We couldn't open this link.");
    } else {
      setPacket(data as Packet);
    }
    setLoading(false);
  }, [submissionId]);

  useEffect(() => {
    document.title = "Your documents · Texas Cemetery Brokers";
    void load();
  }, [load]);

  // Every action on this page counts — the uploads and each power of attorney —
  // otherwise the bar reads "0 of 3" while five things are still outstanding.
  const { done, total } = useMemo(() => {
    const docs = packet?.documents ?? [];
    const poas = packet?.poas ?? (packet?.poa ? [packet.poa] : []);
    const docsDone = docs.filter((d) => d.complete || d.uploaded || DONE.includes(d.state)).length;
    const poasDone = poas.filter((p) => p?.notarized || p?.signed).length;
    return { done: docsDone + poasDone, total: docs.length + poas.length };
  }, [packet]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${hibiscusCoral.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
      />
      <div className="relative max-w-3xl mx-auto px-5 py-16">
        <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-3">Texas Cemetery Brokers</div>
        {packet?.seller_name && (
          <p className="text-xs font-medium text-foreground mb-2">Private document page for {packet.seller_name}</p>
        )}
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-foreground mb-4">
          {packet?.seller_name ? `${packet.seller_name.split(" ")[0]}, here's` : "Here's"} everything we need to{" "}
          <em className="italic text-primary">complete your sale</em>.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          One page, one list. Upload from this computer, or tap <span className="text-foreground">Phone</span> on any
          item and photograph it with your camera{packet?.cemetery ? ` — everything below is what ${packet.cemetery} requires` : ""}.
        </p>

        {packet?.broker_note && (
          <div className="mt-6 rounded-2xl border-l-4 border-primary bg-primary/[0.06] px-5 py-4">
            <p className="text-[10px] tracking-[0.22em] uppercase text-primary mb-2">A note from your broker</p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{packet.broker_note}</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 px-5 py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our team has already worked directly with {packet?.cemetery ?? "the cemetery"} to confirm this list. It is
            the <span className="text-foreground">complete set of documents</span> you need in order to sell your
            property — these would be required no matter how you sold it, privately or through a broker. The only item
            unique to selling through us is the Limited Power of Attorney, which lets us do the running around for you.
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4">
          <p className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Where the original paperwork goes
          </p>
          <p className="text-xs text-foreground/90 whitespace-pre-line mt-2 font-medium">{MAIL_ADDRESS}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
            {MAIL_REASON} Upload a photo of each item here first so we can start straight away, then post the originals
            — apart from your photo ID, which we only ever need as a photograph. Originals stay with your file and are
            returned to you if the sale does not complete.
          </p>
        </div>




        {total > 0 && (
          <div className="mt-8 mb-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> {done} of {total} received</span>
              <span>{Math.round((done / total) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>
        )}

        {packet?.listing_agreement?.signed && (
          <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/[0.05] p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-display text-lg text-foreground">Listing Agreement signed</p>
              <p className="text-xs text-muted-foreground mt-1">
                We already have your signed Listing Agreement on file{packet.listing_agreement.signed_at ? ` from ${new Date(packet.listing_agreement.signed_at).toLocaleDateString()}` : ""}. You do not need to sign it again.
              </p>
            </div>
          </div>
        )}

        {(packet?.poas?.length ? packet.poas : packet?.poa ? [packet.poa] : []).map((poa, i, all) => poa && (
          <div key={poa.contract_id ?? i} className="mb-6 rounded-2xl border border-primary/30 bg-primary/[0.05] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-primary mb-1">
              {poa.notarized ? "Received" : all.length > 1 ? `Also to do — ${i + 1} of ${all.length}` : "Also to do"}
            </div>

            <p className="font-display text-xl text-foreground leading-snug">
              {poa.signer_name && all.length > 1
                ? `Limited Power of Attorney — ${poa.signer_name}`
                : "Your Limited Power of Attorney"}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Cemeteries will only discuss or transfer a plot with the person named on the deed. The Limited Power of
              Attorney is the single page that lets us speak to {packet?.cemetery ?? "the cemetery"} on
              {poa.signer_name && all.length > 1 ? ` ${poa.signer_name}'s` : " your"} behalf,
              request the transfer forms, and hand the paperwork to the buyer at closing — so you are not the one
              chasing the office, posting forms or taking time off work.
            </p>
            {all.length > 1 && (
              <p className="text-[11px] text-foreground/90 mt-2">
                Everyone named on the deed needs their own notarized copy — this one is
                for <span className="font-medium">{poa.signer_name ?? "this signer"}</span>.
              </p>
            )}
            <div className="mt-3 rounded-xl bg-card/70 border border-border/60 px-4 py-3">
              <p className="text-[11px] font-medium text-foreground">It is deliberately limited.</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                It covers this plot and this sale only. It does not give us access to your money, your bank accounts or
                any other property, it does not let us accept an offer or set a price without your say-so, and it ends
                automatically when the sale completes. You can revoke it in writing at any time.
              </p>
            </div>
            <div className="mt-3 rounded-xl bg-card/70 border border-border/60 px-4 py-3">
              <p className="text-[11px] font-medium text-foreground">What to do — about 15 minutes</p>
              <ol className="mt-1.5 space-y-1 text-[11px] text-muted-foreground leading-relaxed list-decimal pl-4">
                <li>Open the PDF below and print every page. It is already filled in from your answers — nothing to complete.</li>
                <li>Do <span className="text-foreground">not</span> sign it yet. The notary has to watch you sign.</li>
                <li>Take it, with {poa.signer_name && all.length > 1 ? `${poa.signer_name}'s` : "your"} photo ID, to any notary: most banks and credit unions (often free for customers), UPS Store, FedEx Office, courthouses, or a mobile notary who comes to you.</li>
                <li>Sign in front of them; they stamp and sign it.</li>
                <li>Photograph or scan every page and upload it here — then post the original to the address below.</li>
              </ol>
            </div>
            {poa.mail_to && (
              <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
                <p className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Post the signed original to
                </p>
                <p className="text-xs text-foreground/90 whitespace-pre-line mt-2 font-medium">{poa.mail_to}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
                  {MAIL_REASON}
                </p>
                <MailTick
                  submissionId={submissionId}
                  itemKey={poa.mail_key ?? "D21::"}
                  confirmedAt={poa.mailed_confirmed_at}
                  onDone={load}
                />
              </div>

            )}
            {poa.pdf_url && (
              <button
                type="button"
                onClick={() => void openPrivateFile(poa.pdf_url!, setError)}
                className="inline-flex items-center gap-1.5 mt-4 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
              >
                <Stamp className="w-3.5 h-3.5" /> Open the completed Power of Attorney
              </button>
            )}
            <PoaUpload
              submissionId={submissionId}
              onDone={load}
              alreadyDone={!!poa.notarized}
              contractId={poa.contract_id}
              signerName={all.length > 1 ? poa.signer_name : null}
              principalKey={poa.principal_key}
            />
          </div>
        ))}




        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Opening your file…
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>
        ) : (packet?.documents.length ?? 0) === 0 ? (
          <div className="mt-10 rounded-2xl border border-border/70 bg-card/70 px-5 py-6 text-sm text-muted-foreground">
            Nothing is outstanding right now — we'll email you the moment something is needed.
          </div>
        ) : (
          <div className="space-y-3">
            {packet!.documents.map((d) => (
              <DocRow key={d.id} doc={d} submissionId={submissionId} onDone={load} />
            ))}
          </div>
        )}

        <div className="mt-12">
          <div className="text-[10px] uppercase tracking-[0.28em] text-primary mb-3">Your questions, answered</div>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border/70 bg-card/70 px-5 py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="font-display text-base text-foreground leading-snug">{f.q}</span>
                  <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-xs text-muted-foreground leading-relaxed mt-3 whitespace-pre-line">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/[0.04] px-5 py-5">
          <div className="text-[10px] uppercase tracking-[0.28em] text-primary mb-1.5">Still not sure about something?</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A broker will walk you through any item on this page — there is never a charge for asking.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <a href="tel:+12142304740" className="text-foreground hover:text-primary">(214) 230-4740</a>
            <a href="mailto:info@texascemeterybrokers.com" className="text-foreground hover:text-primary">info@texascemeterybrokers.com</a>
          </div>
        </div>


        <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
          Your documents are stored privately and used only to transfer this plot.
        </p>

      </div>
    </div>
  );
};

export default SellerDocuments;
