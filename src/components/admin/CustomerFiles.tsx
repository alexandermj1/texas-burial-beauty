// Per-customer file uploads (PoA, deeds, IDs, death certs, etc.)
// Files live in the private "customer-files" storage bucket; metadata in customer_files.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Paperclip, Upload, Trash2, Download, FileText, Loader2 } from "lucide-react";

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
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function CustomerFiles({ customerId, customerName }: { customerId: string; customerName: string | null }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<CustomerFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("Power of Attorney");
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 25 MB per file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${customerId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("customer-files").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("customer_files" as any).insert({
        customer_profile_id: customerId,
        uploaded_by_user_id: user?.id ?? null,
        uploaded_by_name: user?.email ?? "admin",
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        document_type: docType,
      });
      if (insErr) throw insErr;
      await supabase.from("customer_activity_log" as any).insert({
        customer_profile_id: customerId,
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "admin",
        action_type: "file_uploaded",
        action_summary: `Uploaded ${docType}: ${file.name}`,
      });
      toast({ title: "File uploaded", description: file.name });
      fetchFiles();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openFile = async (row: CustomerFileRow) => {
    const { data, error } = await supabase.storage.from("customer-files").createSignedUrl(row.file_path, 60 * 10);
    if (error || !data) {
      toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const downloadFile = async (row: CustomerFileRow) => {
    const { data, error } = await supabase.storage.from("customer-files").createSignedUrl(row.file_path, 60 * 10, { download: row.file_name });
    if (error || !data) {
      toast({ title: "Could not download", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const deleteFile = async (row: CustomerFileRow) => {
    if (!confirm(`Delete ${row.file_name}? This cannot be undone.`)) return;
    const { error: rmErr } = await supabase.storage.from("customer-files").remove([row.file_path]);
    if (rmErr) {
      toast({ title: "Storage delete failed", description: rmErr.message, variant: "destructive" });
      return;
    }
    await supabase.from("customer_files" as any).delete().eq("id", row.id);
    await supabase.from("customer_activity_log" as any).insert({
      customer_profile_id: customerId,
      actor_user_id: user?.id ?? null,
      actor_name: user?.email ?? "admin",
      action_type: "file_deleted",
      action_summary: `Deleted ${row.document_type || "file"}: ${row.file_name}`,
    });
    toast({ title: "File deleted" });
    fetchFiles();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="w-3 h-3" /> Files & documents ({files.length})
        </p>
        <div className="flex items-center gap-2">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Upload file"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No files uploaded yet. Upload Power of Attorney, deeds, IDs, or other documents related to {customerName || "this customer"}.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map(f => (
            <li key={f.id} className="bg-muted/40 rounded-lg p-3 border border-border/50 flex items-center justify-between gap-3">
              <button onClick={() => openFile(f)} className="flex items-start gap-3 text-left min-w-0 flex-1 hover:opacity-80">
                <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{f.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {f.document_type || "File"}{f.file_size ? ` · ${formatBytes(f.file_size)}` : ""} · {f.uploaded_by_name || "admin"} · {formatDate(f.created_at)}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => downloadFile(f)} title="Download" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteFile(f)} title="Delete" className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
