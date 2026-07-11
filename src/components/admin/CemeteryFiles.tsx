// Attachments for a cemetery profile — labeled documents like site maps,
// price lists, transfer paperwork templates, contracts, etc.
// Files live in the private "cemetery-files" storage bucket; metadata in
// public.cemetery_files. Admin/agent only.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cleanDisplayName } from "@/lib/displayName";
import { Paperclip, Upload, Trash2, Download, Loader2, FileText, Image as ImageIcon } from "lucide-react";

interface CemeteryFileRow {
  id: string;
  label: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

const formatBytes = (b: number | null) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const isImageMime = (m: string | null) => !!m && m.startsWith("image/");

export default function CemeteryFiles({ cemeteryId, cemeteryName }: { cemeteryId: string; cemeteryName: string }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<CemeteryFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cemetery_files" as any)
      .select("*")
      .eq("cemetery_id", cemeteryId)
      .order("created_at", { ascending: false });
    if (!error && data) setFiles(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [cemeteryId]);

  const handlePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 25 MB per file.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    setLabel(prev => prev || file.name.replace(/\.[^/.]+$/, ""));
  };

  const doUpload = async () => {
    if (!pendingFile) return;
    const actorName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "admin";
    setUploading(true);
    try {
      const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${cemeteryId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("cemetery-files").upload(path, pendingFile, {
        contentType: pendingFile.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("cemetery_files" as any).insert({
        cemetery_id: cemeteryId,
        uploaded_by_user_id: user?.id ?? null,
        uploaded_by_name: actorName,
        label: label.trim() || null,
        file_name: pendingFile.name,
        file_path: path,
        file_size: pendingFile.size,
        mime_type: pendingFile.type,
      });
      if (insErr) throw insErr;
      toast({ title: "File attached", description: `${label.trim() || pendingFile.name} · ${cemeteryName}` });
      setPendingFile(null);
      setLabel("");
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
    setLabel("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const fetchBlobUrl = async (row: CemeteryFileRow): Promise<string | null> => {
    const { data, error } = await supabase.storage.from("cemetery-files").download(row.file_path);
    if (error || !data) {
      toast({ title: "Could not load file", description: error?.message, variant: "destructive" });
      return null;
    }
    const typed = row.mime_type ? new Blob([data], { type: row.mime_type }) : data;
    return URL.createObjectURL(typed);
  };

  const openFile = async (row: CemeteryFileRow) => {
    const url = await fetchBlobUrl(row);
    if (!url) return;
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadFile = async (row: CemeteryFileRow) => {
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

  const deleteFile = async (row: CemeteryFileRow) => {
    if (!confirm(`Delete "${row.label || row.file_name}"? This cannot be undone.`)) return;
    const { error: rmErr } = await supabase.storage.from("cemetery-files").remove([row.file_path]);
    if (rmErr) {
      toast({ title: "Storage delete failed", description: rmErr.message, variant: "destructive" });
      return;
    }
    await supabase.from("cemetery_files" as any).delete().eq("id", row.id);
    toast({ title: "File deleted" });
    fetchFiles();
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 font-semibold">
          <Paperclip className="w-3 h-3" /> Cemetery attachments ({files.length})
        </p>
        {!pendingFile && (
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={handlePicked} />
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
            >
              <Upload className="w-3.5 h-3.5" /> Add attachment
            </button>
          </>
        )}
      </div>

      {pendingFile && (
        <div className="mb-3 rounded-md border border-border bg-background p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Selected: <span className="text-foreground font-medium">{pendingFile.name}</span> ({formatBytes(pendingFile.size)})
          </p>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Site map, Price list 2026, Transfer template"
              className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
            />
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
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No attachments yet. Add site maps, price sheets, transfer paperwork templates, or contracts specific to {cemeteryName}.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map(f => {
            const Icon = isImageMime(f.mime_type) ? ImageIcon : FileText;
            return (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 group"
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <button
                  onClick={() => openFile(f)}
                  className="flex-1 min-w-0 text-left hover:underline"
                  title={f.file_name}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {f.label && (
                      <span className="text-xs font-medium text-foreground">{f.label}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground truncate">{f.file_name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(f.file_size)} · {formatDate(f.created_at)}
                    {f.uploaded_by_name ? ` · ${f.uploaded_by_name}` : ""}
                  </p>
                </button>
                <button
                  onClick={() => downloadFile(f)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => deleteFile(f)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
