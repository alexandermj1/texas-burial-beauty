import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Camera, Check, ChevronDown, ChevronUp, ExternalLink, FolderOpen, Loader2, Plus, RefreshCw, RotateCcw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GLENDALE_BUCKET, MAX_SCAN_PAGES, scanName, scanPagePath, validScanPages } from '@/lib/glendaleDocuments';

type Scan = { id: string; name: string; pages: string[]; created_at: string };
type Page = { id: string; blob: Blob; url: string };
export default function GlendaleDocumentsPanel({ phone = false }: { phone?: boolean }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [qr, setQr] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const pagesRef = useRef<Page[]>([]);
  const documentId = useRef(crypto.randomUUID());
  const uploaded = useRef(new Set<string>());
  const [camera, setCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<{name: string; urls: string[]} | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scanOrigin = window.location.hostname === 'localhost' ? 'https://www.texascemeterybrokers.com' : window.location.origin;
  const scanUrl = `${scanOrigin}/admin/glendale-scan`;
  const load = async (append = false) => {
    if (!user) return;
    setLoading(true);
    const start = append ? docs.length : 0;
    try {
      const { data, error } = await supabase.from('glendale_documents' as any).select('id,name,pages,created_at').is('deleted_at', null).order('created_at', { ascending: false }).range(start, start + 29);
      if (error) throw error;
      const rows = (data || []) as unknown as Scan[];
      setDocs(old => append ? [...old, ...rows] : rows);
      setMore(rows.length === 30);
    } catch { setError('Could not load the document folder. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user?.id]);
  useEffect(() => { if (!phone) QRCode.toDataURL(scanUrl, { width: 220, margin: 2 }).then(setQr).catch(() => setError('Could not create the QR code. Use Open phone page instead.')); }, [scanUrl, phone]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => () => { pagesRef.current.forEach(p => URL.revokeObjectURL(p.url)); }, []);
  useEffect(() => {
    if (!camera) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    setCameraReady(false);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2400 }, height: { ideal: 3200 } }, audio: false });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        const element = video.current;
        if (!element) return;
        element.srcObject = stream;
        await element.play();
        setCameraReady(true);
      } catch { setError('Camera could not open. Allow camera access in your browser settings, then try again.'); setCamera(false); }
    })();
    return () => { stopped = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [camera]);
  const capture = async () => {
    const element = video.current;
    if (!element || !element.videoWidth || busy || pages.length >= MAX_SCAN_PAGES) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 2400 / Math.max(element.videoWidth, element.videoHeight));
      canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Camera image unavailable');
      ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Photo failed')), 'image/jpeg', 0.92));
      setPages(old => [...old, { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) }]);
    } catch { setError('Could not capture this page. Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = (id: string) => {
    const page = pages.find(p => p.id === id); if (page) URL.revokeObjectURL(page.url);
    setPages(old => old.filter(p => p.id !== id));
  };
  const move = (index: number, direction: number) => {
    setPages(old => { const next = [...old]; const destination = index + direction; if (destination < 0 || destination >= next.length) return old; [next[index], next[destination]] = [next[destination], next[index]]; return next; });
  };
  const save = async () => {
    if (!user || busy || !pages.length) return;
    setCamera(false); setBusy(true); setError(''); setNotice('');
    const paths = pages.map(p => scanPagePath(user.id, documentId.current, p.id));
    try {
      if (!validScanPages(paths)) throw new Error('Invalid document pages');
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]; const path = paths[i];
        if (uploaded.current.has(path)) continue;
        const { error } = await supabase.storage.from(GLENDALE_BUCKET).upload(path, page.blob, { contentType: 'image/jpeg', upsert: false });
        if (error && !/already exists|duplicate/i.test(error.message)) throw error;
        uploaded.current.add(path);
      }
      const { error: insertError } = await supabase.from('glendale_documents' as any).insert({ id: documentId.current, name: scanName(name), pages: paths, created_by: user.id });
      if (insertError && insertError.code !== '23505') throw insertError;
      const { data, error: readError } = await supabase.from('glendale_documents' as any).select('id,name,pages').eq('id', documentId.current).single();
      const saved = data as unknown as Scan | null;
      if (readError || !saved || JSON.stringify(saved.pages) !== JSON.stringify(paths)) throw new Error('Could not confirm saved document');
      setNotice(`${saved.name} saved · ${paths.length} ${paths.length === 1 ? 'page' : 'pages'}`);
      pages.forEach(p => URL.revokeObjectURL(p.url)); setPages([]); setName(''); setEditing(false);
      documentId.current = crypto.randomUUID(); uploaded.current.clear();
      await load();
    } catch { setError('Upload could not be confirmed. Your pages are still here; retry without closing this page.'); }
    finally { setBusy(false); }
  };
  const open = async (doc: Scan) => {
    setError('');
    try {
      const urls = await Promise.all(doc.pages.map(async path => {
        const { data, error } = await supabase.storage.from(GLENDALE_BUCKET).createSignedUrl(path, 300);
        if (error || !data?.signedUrl) throw error || new Error('Missing page');
        return data.signedUrl;
      }));
      setView({ name: doc.name, urls });
    } catch { setError('Could not open these pages. Please try again.'); }
  };
  return <section className="mx-auto w-full max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase text-muted-foreground">Bayer office</p><h1 className="font-display text-2xl text-foreground">Documents at Glendale</h1></div>
      <div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Refresh documents" disabled={loading} onClick={() => { setError(''); void load(); }}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></Button>
      {!editing && <Button onClick={() => { setEditing(true); setNotice(''); setError(''); }}><Plus className="mr-2 h-4 w-4" />Upload new doc</Button>}</div>
    </header>
    {!phone && <div className="flex flex-wrap items-center gap-5 border-y border-border py-5">
      {qr && <img src={qr} alt="QR code for the private Glendale scanning page" className="h-36 w-36" />}
      <div className="space-y-2"><h2 className="font-medium">Phone scanner</h2><p className="text-sm text-muted-foreground">Staff sign-in required · Private document folder</p><Button variant="outline" asChild><a href={scanUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open phone page</a></Button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Check className="h-4 w-4" />{notice}</p>}
    {editing && <div className="space-y-4 border-y border-border py-5">
      <label className="block space-y-2"><span className="text-sm font-medium">Document name (optional)</span><Input value={name} maxLength={200} disabled={busy} onChange={e => setName(e.target.value)} placeholder="e.g. Gerri Rougeau — deed" /></label>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || pages.length >= MAX_SCAN_PAGES} onClick={() => { setError(''); setCamera(true); }}><Camera className="mr-2 h-4 w-4" />{pages.length ? 'Add another page' : 'Take first page'}</Button>
      <Button disabled={busy || !pages.length} onClick={() => void save()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Submit document{pages.length ? ` (${pages.length})` : ''}</Button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{pages.map((page, index) => <div key={page.id} className="rounded-lg border border-border p-2"><img src={page.url} alt={`Document page ${index + 1}`} className="aspect-[3/4] w-full object-contain bg-muted" /><div className="mt-2 flex flex-wrap items-center justify-between gap-1"><span className="text-xs">Page {index + 1}</span><div className="flex"><Button variant="ghost" size="icon" title="Move page earlier" aria-label={`Move page ${index + 1} earlier`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Move page later" aria-label={`Move page ${index + 1} later`} disabled={busy || index === pages.length - 1} onClick={() => move(index, 1)}><ChevronDown className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Remove page" aria-label={`Remove page ${index + 1}`} disabled={busy} onClick={() => remove(page.id)}><X className="h-4 w-4" /></Button></div></div></div>)}</div>
    </div>}
    <div className="divide-y divide-border">{docs.map(doc => <div key={doc.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><h2 className="break-words text-sm font-medium">{doc.name}</h2><p className="text-xs text-muted-foreground">{doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} · {new Date(doc.created_at).toLocaleDateString()}</p></div><Button variant="outline" onClick={() => void open(doc)}><FolderOpen className="mr-2 h-4 w-4" />View</Button></div>)}{!docs.length && !loading && <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>}</div>
    {more && <Button variant="outline" disabled={loading} onClick={() => void load(true)}>Load more</Button>}
    {phone && <Button asChild variant="ghost"><Link to="/admin">Back to admin</Link></Button>}
    <Dialog open={camera} onOpenChange={open => { if (!busy) setCamera(open); }}><DialogContent className="max-h-[95svh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Page {pages.length + 1}</DialogTitle></DialogHeader>
      <video ref={video} autoPlay playsInline muted className="aspect-[3/4] max-h-[65svh] w-full bg-muted object-contain" />
      <div className="flex flex-wrap justify-center gap-2"><Button disabled={!cameraReady || busy || pages.length >= MAX_SCAN_PAGES} onClick={() => void capture()}><Camera className="mr-2 h-4 w-4" />Capture page</Button><Button variant="outline" disabled={busy} onClick={() => setCamera(false)}><Check className="mr-2 h-4 w-4" />Review {pages.length} pages</Button></div>
      {pages.length > 0 && <div className="flex items-center gap-3"><img src={pages[pages.length - 1]?.url} alt="Latest captured page" className="h-20 w-16 object-contain" /><span className="text-sm">{pages.length} captured</span><Button variant="ghost" disabled={busy} onClick={() => { const last = pages[pages.length - 1]; if (last) remove(last.id); }}><RotateCcw className="mr-2 h-4 w-4" />Retake last</Button></div>}
    </DialogContent></Dialog>
    <Dialog open={!!view} onOpenChange={open => { if (!open) setView(null); }}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{view?.name}</DialogTitle></DialogHeader>{view?.urls.map((url, i) => <figure key={url} className="space-y-2"><figcaption className="text-xs text-muted-foreground">Page {i + 1}</figcaption><img src={url} alt={`${view.name} page ${i + 1}`} className="w-full object-contain" /></figure>)}</DialogContent></Dialog>
  </section>;
}
