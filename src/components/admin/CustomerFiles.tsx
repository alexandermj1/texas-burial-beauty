// Per-customer file uploads (PoA, deeds, IDs, death certs, etc.)
// Files live in the private "customer-files" storage bucket; metadata in customer_files.
// Renders as a grid of mini thumbnail tiles at the bottom of the submission view —
// images preview inline (signed URLs), other files show a typed icon. Click a tile to open.
import { useEffect, useRef, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cleanDisplayName } from "@/lib/displayName";
import { Paperclip, Upload, Trash2, Download, FileText, Loader2, Image as ImageIcon, FileQuestion, Sparkles, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface CustomerFileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: string | null;
  notes: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  extracted_data: Record<string, any> | null;
  extracted_summary: string | null;
  extraction_status: string | null;
  extraction_error: string | null;
  extracted_at: string | null;
}

const DOC_TYPES = [
  "Power of Attorney",
  "Deed",
  "Government ID",
  "Death Certificate",
  "Listing Agreement",
  "Multi-Owner Permission",
  "Other",
];

const formatBytes = (b: number | null) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const isImageMime = (m: string | null) => !!m && m.startsWith("image/");

export default function CustomerFiles({ customerId, customerName }: { customerId: string; customerName: string | null }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<CustomerFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("Power of Attorney");
  const [otherType, setOtherType] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_files" as any)
      .select("*")
      .eq("customer_profile_id", customerId)
      .order("created_at", { ascending: false });
    if (!error && data) setFiles(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [customerId]);

  // Generate signed thumbnail URLs for image files
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      const imageRows = files.filter(f => isImageMime(f.mime_type) && !thumbs[f.id]);
      for (const f of imageRows) {
        const { data } = await supabase.storage.from("customer-files").createSignedUrl(f.file_path, 60 * 30);
        if (data?.signedUrl) next[f.id] = data.signedUrl;
      }
      if (!cancelled && Object.keys(next).length) {
        setThumbs(prev => ({ ...prev, ...next }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handlePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 25 MB per file.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    // Default the display name to the file's base name (without extension)
    const base = file.name.replace(/\.[^/.]+$/, "");
    setDisplayName(prev => prev || base);
  };

  const doUpload = async () => {
    if (!pendingFile) return;
    const finalDocType = docType === "Other"
      ? (otherType.trim() || "File")
      : docType;
    const ext = pendingFile.name.includes(".") ? pendingFile.name.split(".").pop() : "";
    const baseDisplay = (displayName.trim() || pendingFile.name).replace(/\.[^/.]+$/, "");
    const finalDisplayName = ext && !baseDisplay.toLowerCase().endsWith("." + ext.toLowerCase())
      ? `${baseDisplay}.${ext}`
      : baseDisplay;
    const actorName = cleanDisplayName(user?.user_metadata?.full_name) || (user?.email?.split("@")[0]) || "admin";
    setUploading(true);
    try {
      const safeName = finalDisplayName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${customerId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("customer-files").upload(path, pendingFile, {
        contentType: pendingFile.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: insRow, error: insErr } = await supabase.from("customer_files" as any).insert({
        customer_profile_id: customerId,
        uploaded_by_user_id: user?.id ?? null,
        uploaded_by_name: actorName,
        file_name: finalDisplayName,
        file_path: path,
        file_size: pendingFile.size,
        mime_type: pendingFile.type,
        document_type: finalDocType,
      }).select("id").single();
      if (insErr) throw insErr;
      // Fire-and-forget AI extraction
      if ((insRow as any)?.id) {
        supabase.functions.invoke("extract-attachment-info", { body: { file_id: (insRow as any).id } }).catch(() => {});
      }
      const destination = customerName ? `to ${customerName}'s file` : "to customer file";
      await supabase.from("customer_activity_log" as any).insert({
        customer_profile_id: customerId,
        actor_user_id: user?.id ?? null,
        actor_name: actorName,
        action_type: "file_uploaded",
        action_summary: `Uploaded ${finalDisplayName} (${finalDocType}) ${destination}`,
      });
      toast({ title: "File uploaded", description: finalDisplayName });
      setPendingFile(null);
      setDisplayName("");
      setOtherType("");
      if (inputRef.current) inputRef.current.value = "";
      fetchFiles();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const cancelPending = () => {
    setPendingFile(null);
    setDisplayName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // Fetch the file as a blob and open via blob: URL — this avoids ad-blockers
  // (uBlock/Brave/Adblock) that block direct *.supabase.co links with ERR_BLOCKED_BY_CLIENT.
  const fetchBlobUrl = async (row: CustomerFileRow): Promise<string | null> => {
    const { data, error } = await supabase.storage.from("customer-files").download(row.file_path);
    if (error || !data) {
      toast({ title: "Could not load file", description: error?.message, variant: "destructive" });
      return null;
    }
    const typed = row.mime_type ? new Blob([data], { type: row.mime_type }) : data;
    return URL.createObjectURL(typed);
  };

  const openFile = async (row: CustomerFileRow) => {
    const url = await fetchBlobUrl(row);
    if (!url) return;
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadFile = async (row: CustomerFileRow) => {
    const url = await fetchBlobUrl(row);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = row.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const deleteFile = async (row: CustomerFileRow) => {
    if (!confirm(`Delete ${row.file_name}? This cannot be undone.`)) return;
    const { error: rmErr } = await supabase.storage.from("customer-files").remove([row.file_path]);
    if (rmErr) {
      toast({ title: "Storage delete failed", description: rmErr.message, variant: "destructive" });
      return;
    }
    await supabase.from("customer_files" as any).delete().eq("id", row.id);
    const actorName = cleanDisplayName(user?.user_metadata?.full_name) || (user?.email?.split("@")[0]) || "admin";
    await supabase.from("customer_activity_log" as any).insert({
      customer_profile_id: customerId,
      actor_user_id: user?.id ?? null,
      actor_name: actorName,
      action_type: "file_deleted",
      action_summary: `Deleted ${row.file_name} (${row.document_type || "file"})`,
    });
    toast({ title: "File deleted" });
    fetchFiles();
  };

  const reExtract = async (row: CustomerFileRow) => {
    toast({ title: "AI reading file…", description: row.file_name });
    const { error } = await supabase.functions.invoke("extract-attachment-info", { body: { file_id: row.id } });
    if (error) {
      toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "AI extraction complete" });
    }
    fetchFiles();
  };

  const [detailsFor, setDetailsFor] = useState<CustomerFileRow | null>(null);

  const renderExtracted = (data: Record<string, any> | null) => {
    if (!data || typeof data !== "object") return null;
    const skip = new Set(["summary"]);
    const entries = Object.entries(data).filter(([k, v]) => {
      if (skip.has(k)) return false;
      if (v == null) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === "string" && !v.trim()) return false;
      return true;
    });
    if (entries.length === 0) return null;
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        {entries.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-muted-foreground capitalize font-medium">{k.replace(/_/g, " ")}</dt>
            <dd className="text-foreground break-words">
              {Array.isArray(v)
                ? (typeof v[0] === "object"
                    ? <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-2">{JSON.stringify(v, null, 2)}</pre>
                    : v.join(", "))
                : typeof v === "object"
                ? <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-2">{JSON.stringify(v, null, 2)}</pre>
                : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
            </dd>
          </Fragment>
        ))}
      </dl>
    );
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="w-3 h-3" /> Files & documents ({files.length})
        </p>
        {!pendingFile && (
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" className="hidden" onChange={handlePicked} />
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
            >
              <Upload className="w-3.5 h-3.5" /> Choose file
            </button>
          </div>
        )}
      </div>

      {/* Pending upload form — appears once a file is picked */}
      {pendingFile && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Selected: <span className="text-foreground font-medium">{pendingFile.name}</span> ({formatBytes(pendingFile.size)})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Document type</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {docType === "Other" && (
                <input
                  type="text"
                  value={otherType}
                  onChange={e => setOtherType(e.target.value)}
                  placeholder="Type the document name (e.g. Probate order)"
                  className="mt-1.5 w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                />
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Friendly name for this file"
                className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={doUpload}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={cancelPending}
              disabled={uploading}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No files uploaded yet. Upload Power of Attorney, deeds, IDs, or other documents related to {customerName || "this customer"}.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map(f => {
            const isImg = isImageMime(f.mime_type);
            const isPdf = f.mime_type === "application/pdf";
            const thumb = thumbs[f.id];
            return (
              <div key={f.id} className="group bg-muted/30 rounded-lg border border-border/50 overflow-hidden flex flex-col hover:border-primary/40 transition-colors">
                <button
                  onClick={() => openFile(f)}
                  className="relative aspect-[4/3] w-full bg-background flex items-center justify-center overflow-hidden"
                  title={`Open ${f.file_name}`}
                >
                  {isImg && thumb ? (
                    <img src={thumb} alt={f.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : isImg ? (
                    <ImageIcon className="w-10 h-10 text-muted-foreground/60" />
                  ) : isPdf ? (
                    <div className="flex flex-col items-center gap-1 text-destructive/80">
                      <FileText className="w-10 h-10" />
                      <span className="text-[9px] font-bold tracking-wider">PDF</span>
                    </div>
                  ) : (
                    <FileQuestion className="w-10 h-10 text-muted-foreground/60" />
                  )}
                  {f.document_type && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-background/90 text-foreground border border-border/50 backdrop-blur-sm">
                      {f.document_type}
                    </span>
                  )}
                </button>
                <div className="p-2 flex flex-col gap-1">
                  <button onClick={() => openFile(f)} className="text-left text-xs font-medium text-foreground truncate hover:text-primary" title={f.file_name}>
                    {f.file_name}
                  </button>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatBytes(f.file_size)} · {f.uploaded_by_name || "admin"} · {formatDate(f.created_at)}
                  </p>
                  {/* AI summary block */}
                  {f.extraction_status === "pending" && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI reading…</p>
                  )}
                  {f.extraction_status === "done" && (
                    <div className="mt-1 rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
                      <div className="flex items-start gap-1.5 text-xs text-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="leading-snug">{f.extracted_summary || "Extracted"}</span>
                      </div>
                      {f.extracted_data && (
                        <button
                          onClick={() => setDetailsFor(f)}
                          className="mt-1.5 inline-flex items-center gap-0.5 text-xs text-primary hover:underline font-medium"
                        >
                          <ChevronDown className="w-3.5 h-3.5" /> View details
                        </button>
                      )}
                    </div>
                  )}
                  {f.extraction_status === "failed" && (
                    <p className="text-[10px] text-destructive truncate" title={f.extraction_error || ""}>AI read failed</p>
                  )}
                  {f.extraction_status === "unsupported" && (
                    <p className="text-[10px] text-muted-foreground">AI: unsupported file type</p>
                  )}
                  <div className="flex items-center justify-end gap-0.5 -mr-1">
                    <button onClick={() => reExtract(f)} title="Re-run AI extraction" className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-primary">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button onClick={() => downloadFile(f)} title="Download" className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Download className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteFile(f)} title="Delete" className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
