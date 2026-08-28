import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as exifr from "exifr";
import {
  Upload, FolderOpen, MapPin, Check, X, Loader2, ImageIcon,
  ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, Trash2, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { bayCemeteries } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BUCKET = "cemetery-photos";
const GPS_MATCH_THRESHOLD_M = 800;

interface StagedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  folderName: string | null;
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
  cemeteryName: string | null;
  matchMethod: "gps" | "folder" | null;
  matchDistanceM: number | null;
}

interface PhotoRow {
  id: string;
  cemetery_name: string | null;
  cemetery_slug: string | null;
  city: string | null;
  file_name: string;
  file_path: string;
  folder_name: string | null;
  caption: string | null;
  alt_text: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  status: string;
  match_method: string | null;
  match_distance_m: number | null;
  created_at: string;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function matchByFolder(folder: string | null): string | null {
  if (!folder) return null;
  const f = normalize(folder);
  if (!f) return null;
  let best: string | null = null;
  let bestLen = 0;
  for (const c of bayCemeteries) {
    const n = normalize(c.name);
    if (n.length > 5 && (f.includes(n) || n.includes(f)) && n.length > bestLen) {
      best = c.name;
      bestLen = n.length;
    }
  }
  return best;
}

function matchByGps(lat: number, lng: number): { name: string; distanceM: number } | null {
  let best: { name: string; distanceM: number } | null = null;
  for (const c of bayCemeteries) {
    const d = haversineM(lat, lng, c.lat, c.lng);
    if (d <= GPS_MATCH_THRESHOLD_M && (!best || d < best.distanceM)) {
      best = { name: c.name, distanceM: Math.round(d) };
    }
  }
  return best;
}

export default function PhotoLibrary() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [cemeteryFilter, setCemeteryFilter] = useState<string>("all");
  const [editPhoto, setEditPhoto] = useState<PhotoRow | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editCemetery, setEditCemetery] = useState<string>("");

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    const { data, error } = await supabase
      .from("cemetery_photos" as any)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load photos", description: error.message, variant: "destructive" });
    } else {
      setPhotos((data as any as PhotoRow[]) || []);
    }
    setLoadingLibrary(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadLibrary();
  }, [isAdmin, loadLibrary]);

  // Signed thumbnails for visible rows
  useEffect(() => {
    const missing = photos.filter((p) => !thumbs[p.id]).slice(0, 60);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(missing.map((p) => p.file_path), 3600);
      if (cancelled || !data) return;
      setThumbs((prev) => {
        const next = { ...prev };
        data.forEach((r, i) => {
          if (r.signedUrl) next[missing[i].id] = r.signedUrl;
        });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [photos, thumbs]);

  const analyzeFiles = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setAnalyzing(true);
    const batch: StagedPhoto[] = [];
    for (const file of images) {
      const rel = (file as any).webkitRelativePath as string | undefined;
      const folderName = rel && rel.includes("/") ? rel.split("/").slice(0, -1).pop() || null : null;
      let lat: number | null = null;
      let lng: number | null = null;
      let takenAt: string | null = null;
      try {
        const gps = await exifr.gps(file);
        if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
          lat = gps.latitude;
          lng = gps.longitude;
        }
        const meta = await exifr.parse(file, { pick: ["DateTimeOriginal"] });
        if (meta?.DateTimeOriginal instanceof Date) takenAt = meta.DateTimeOriginal.toISOString();
      } catch {
        /* no exif */
      }
      let cemeteryName: string | null = null;
      let matchMethod: "gps" | "folder" | null = null;
      let matchDistanceM: number | null = null;
      if (lat != null && lng != null) {
        const m = matchByGps(lat, lng);
        if (m) {
          cemeteryName = m.name;
          matchMethod = "gps";
          matchDistanceM = m.distanceM;
        }
      }
      if (!cemeteryName) {
        const fm = matchByFolder(folderName);
        if (fm) {
          cemeteryName = fm;
          matchMethod = "folder";
        }
      }
      batch.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        folderName,
        lat,
        lng,
        takenAt,
        cemeteryName,
        matchMethod,
        matchDistanceM,
      });
    }
    setStaged((prev) => [...prev, ...batch]);
    setAnalyzing(false);
    toast({ title: `${batch.length} photo${batch.length === 1 ? "" : "s"} analyzed`, description: `${batch.filter((b) => b.cemeteryName).length} matched to a cemetery.` });
  };

  const uploadStaged = async () => {
    if (!staged.length || !user) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: staged.length });
    let failed = 0;
    for (const s of staged) {
      const slug = s.cemeteryName ? slugify(s.cemeteryName) : "unmatched";
      const path = `${slug}/${Date.now()}-${s.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, s.file, {
        contentType: s.file.type,
        upsert: false,
      });
      if (upErr) { failed++; setUploadProgress((p) => ({ ...p, done: p.done + 1 })); continue; }
      const cem = bayCemeteries.find((c) => c.name === s.cemeteryName);
      const { error: insErr } = await supabase.from("cemetery_photos" as any).insert({
        cemetery_name: s.cemeteryName,
        cemetery_slug: s.cemeteryName ? slugify(s.cemeteryName) : null,
        city: cem?.city ?? null,
        file_name: s.file.name,
        file_path: path,
        folder_name: s.folderName,
        latitude: s.lat,
        longitude: s.lng,
        taken_at: s.takenAt,
        file_size: s.file.size,
        mime_type: s.file.type,
        match_method: s.matchMethod,
        match_distance_m: s.matchDistanceM,
        status: "pending",
        uploaded_by: user.id,
      } as any);
      if (insErr) failed++;
      URL.revokeObjectURL(s.previewUrl);
      setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setUploading(false);
    setStaged([]);
    toast({
      title: "Upload complete",
      description: failed ? `${staged.length - failed} uploaded, ${failed} failed.` : `${staged.length} photos added to the library.`,
      variant: failed ? "destructive" : "default",
    });
    loadLibrary();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("cemetery_photos" as any).update({ status, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const softDelete = async (id: string) => {
    const { error } = await supabase.from("cemetery_photos" as any).update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const saveEdit = async () => {
    if (!editPhoto) return;
    const cem = bayCemeteries.find((c) => c.name === editCemetery);
    const { error } = await supabase.from("cemetery_photos" as any).update({
      caption: editCaption || null,
      alt_text: editAlt || null,
      cemetery_name: editCemetery || null,
      cemetery_slug: editCemetery ? slugify(editCemetery) : null,
      city: cem?.city ?? null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", editPhoto.id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setPhotos((prev) => prev.map((p) => p.id === editPhoto.id ? { ...p, caption: editCaption || null, alt_text: editAlt || null, cemetery_name: editCemetery || null, cemetery_slug: editCemetery ? slugify(editCemetery) : null, city: cem?.city ?? null } : p));
      setEditPhoto(null);
    }
  };

  const cemeteriesInLibrary = useMemo(() => {
    const set = new Map<string, number>();
    photos.forEach((p) => {
      const key = p.cemetery_name || "Unmatched";
      set.set(key, (set.get(key) || 0) + 1);
    });
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [photos]);

  const filtered = photos.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (cemeteryFilter !== "all" && (p.cemetery_name || "Unmatched") !== cemeteryFilter) return false;
    return true;
  });

  const counts = useMemo(() => ({
    pending: photos.filter((p) => p.status === "pending").length,
    approved: photos.filter((p) => p.status === "approved").length,
    rejected: photos.filter((p) => p.status === "rejected").length,
    unmatched: photos.filter((p) => !p.cemetery_name).length,
  }), [photos]);

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Admin access required.</p>
        <Button asChild variant="outline"><Link to="/admin">Back to admin</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4 flex-wrap">
          <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Link></Button>
          <div>
            <h1 className="text-xl font-semibold">Cemetery Photo Library</h1>
            <p className="text-xs text-muted-foreground">Upload folders of photos — GPS and folder names are used to match each photo to a cemetery automatically.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-4 w-4 mr-2" /> Pick photos</Button>
            <Button onClick={() => folderInputRef.current?.click()}><FolderOpen className="h-4 w-4 mr-2" /> Upload a folder</Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && analyzeFiles(e.target.files)} />
          <input ref={folderInputRef} type="file" accept="image/*" multiple className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} onChange={(e) => e.target.files && analyzeFiles(e.target.files)} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Staging area */}
        {(staged.length > 0 || analyzing) && (
          <section className="rounded-2xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold flex items-center gap-2">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Ready to upload — {staged.length} photo{staged.length === 1 ? "" : "s"}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { staged.forEach((s) => URL.revokeObjectURL(s.previewUrl)); setStaged([]); }} disabled={uploading}>Clear</Button>
                <Button size="sm" onClick={uploadStaged} disabled={uploading || analyzing || !staged.length}>
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {uploadProgress.done}/{uploadProgress.total}</> : "Upload all to library"}
                </Button>
              </div>
            </div>
            {uploading && (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(uploadProgress.done / Math.max(1, uploadProgress.total)) * 100}%` }} />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {staged.map((s) => (
                <div key={s.id} className="rounded-xl border bg-background overflow-hidden">
                  <img src={s.previewUrl} alt={s.file.name} className="aspect-square w-full object-cover" />
                  <div className="p-2 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground truncate" title={s.file.name}>{s.file.name}</p>
                    <Select value={s.cemeteryName || "unmatched"} onValueChange={(v) => setStaged((prev) => prev.map((p) => p.id === s.id ? { ...p, cemeteryName: v === "unmatched" ? null : v, matchMethod: v === "unmatched" ? null : (p.matchMethod || "folder") } : p))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="unmatched">Unmatched</SelectItem>
                        {bayCemeteries.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      {s.matchMethod === "gps" && <Badge variant="secondary" className="text-[9px] px-1.5 py-0"><MapPin className="h-2.5 w-2.5 mr-0.5" />GPS {s.matchDistanceM}m</Badge>}
                      {s.matchMethod === "folder" && <Badge variant="secondary" className="text-[9px] px-1.5 py-0"><FolderOpen className="h-2.5 w-2.5 mr-0.5" />Folder</Badge>}
                      {!s.matchMethod && <Badge variant="outline" className="text-[9px] px-1.5 py-0"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />No match</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Library */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold">Library ({photos.length})</h2>
            <div className="flex gap-2 flex-wrap">
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize">
                  {s} {s !== "all" && `(${counts[s as keyof typeof counts] ?? 0})`}
                </Button>
              ))}
            </div>
            <Select value={cemeteryFilter} onValueChange={setCemeteryFilter}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="All cemeteries" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All cemeteries</SelectItem>
                {cemeteriesInLibrary.map(([name, n]) => <SelectItem key={name} value={name}>{name} ({n})</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={loadLibrary}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          {loadingLibrary ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-16 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No photos here yet. Upload a folder to get started — iCloud exports keep their GPS data, so most photos will match themselves.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-2xl border bg-card overflow-hidden group">
                  <div className="relative">
                    {thumbs[p.id] ? (
                      <img src={thumbs[p.id]} alt={p.alt_text || p.file_name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {p.status === "approved" && <Badge className="bg-primary text-primary-foreground text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>}
                      {p.status === "rejected" && <Badge variant="destructive" className="text-[10px]">Rejected</Badge>}
                      {p.status === "pending" && <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium truncate">{p.cemetery_name || "Unmatched"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.caption || p.file_name}</p>
                    <div className="flex gap-1">
                      {p.status !== "approved" && <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Approve" onClick={() => setStatus(p.id, "approved")}><Check className="h-4 w-4" /></Button>}
                      {p.status !== "rejected" && <Button size="icon" variant="ghost" className="h-7 w-7" title="Reject" onClick={() => setStatus(p.id, "rejected")}><X className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit details" onClick={() => { setEditPhoto(p); setEditCaption(p.caption || ""); setEditAlt(p.alt_text || ""); setEditCemetery(p.cemetery_name || ""); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive ml-auto" title="Remove" onClick={() => softDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!editPhoto} onOpenChange={(o) => !o && setEditPhoto(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit photo details</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editPhoto && thumbs[editPhoto.id] && <img src={thumbs[editPhoto.id]} alt="" className="rounded-xl w-full max-h-64 object-cover" />}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Cemetery</label>
              <Select value={editCemetery || "unmatched"} onValueChange={(v) => setEditCemetery(v === "unmatched" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  {bayCemeteries.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Caption</label>
              <Input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} placeholder="e.g. Garden of Memories at Restland Memorial Park" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">SEO alt text</label>
              <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} placeholder="e.g. Burial plots at Restland Memorial Park in Dallas Texas" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPhoto(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
