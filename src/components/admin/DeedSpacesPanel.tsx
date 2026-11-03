// Reads the seller's deed with AI, lets staff pick which spaces are being sold
// (prices recalculate per space), and shows/saves the blurred deed copy the
// buyer will receive with the purchase agreement email.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ScanText, Eraser } from "lucide-react";
import { paCall } from "@/lib/purchaseAgreement";

type Space = { label: string; section?: string; lot?: string; space?: string };
type Box = { what?: string; box_2d: [number, number, number, number] };
type Scan = { image: string; rotation: number; spaces: Space[]; redact: Box[]; notes: string; file: { id: string; name: string }; files: { id: string; name: string }[] };

/** Blur each box (0-1000 coords on the original image), then rotate upright. */
async function redact(src: string, boxes: Box[], rotation: number): Promise<string> {
  const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
  const blurPx = Math.max(12, Math.round(Math.min(W, H) / 60));
  for (const b of boxes) {
    const [y0, x0, y1, x1] = b.box_2d;
    const pad = 12; // generous margin around AI boxes
    const x = Math.max(0, ((Math.min(x0, x1) - pad) / 1000) * W), y = Math.max(0, ((Math.min(y0, y1) - pad) / 1000) * H);
    const w = Math.min(W - x, ((Math.abs(x1 - x0) + 2 * pad) / 1000) * W), h = Math.min(H - y, ((Math.abs(y1 - y0) + 2 * pad) / 1000) * H);
    if (w <= 0 || h <= 0) continue;
    for (let k = 0; k < 3; k++) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.filter = `blur(${blurPx}px)`; g.drawImage(c, 0, 0); g.restore(); }
  }
  const r = ((rotation % 360) + 360) % 360;
  const out = document.createElement("canvas");
  out.width = r % 180 ? H : W; out.height = r % 180 ? W : H;
  const o = out.getContext("2d")!;
  o.translate(out.width / 2, out.height / 2); o.rotate((r * Math.PI) / 180); o.drawImage(c, -W / 2, -H / 2);
  // Keep the email attachment a sensible size.
  const max = 1800, s = Math.min(1, max / Math.max(out.width, out.height));
  const fin = document.createElement("canvas"); fin.width = Math.round(out.width * s); fin.height = Math.round(out.height * s);
  fin.getContext("2d")!.drawImage(out, 0, 0, fin.width, fin.height);
  return fin.toDataURL("image/jpeg", 0.85);
}

export default function DeedSpacesPanel({ agreementId, editable, onSpaces }: { agreementId: string; editable: boolean; onSpaces: (labels: string[]) => void }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [rotation, setRotation] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => { paCall<{ url: string | null }>({ action: "deed_preview", id: agreementId }).then((r) => r.url && setPreview(r.url)).catch(() => {}); }, [agreementId]);

  const read = async (fileId?: string) => {
    setBusy("scan");
    try {
      const r = await paCall<Scan>({ action: "deed_scan", id: agreementId, ...(fileId ? { file_id: fileId } : {}) });
      setScan(r); setBoxes(r.redact ?? []); setRotation(r.rotation ?? 0); setPicked(new Set());
      await rebuild(r.image, r.redact ?? [], r.rotation ?? 0, false);
      if (!r.spaces.length) toast.warning("The AI could not find individual spaces on this deed — enter them by hand.");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const rebuild = async (src: string, b: Box[], rot: number, save = false) => {
    const url = await redact(src, b, rot); setPreview(url);
    if (save) await paCall({ action: "save_deed", id: agreementId, image: url });
    return url;
  };
  const toggle = (i: number) => {
    const n = new Set(picked); n.has(i) ? n.delete(i) : n.add(i); setPicked(n);
    if (scan) onSpaces([...n].sort((a, b) => a - b).map((k) => scan.spaces[k].label));
  };
  const all = () => { if (!scan) return; const n = new Set(scan.spaces.map((_, i) => i)); setPicked(n); onSpaces(scan.spaces.map((s) => s.label)); };

  // Drag on the original (unrotated) image to add an extra blur box.
  const pt = (e: React.MouseEvent) => { const r = imgRef.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 1000 }; };

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-foreground flex-1">Deed, spaces &amp; the blurred copy the buyer will see</p>
        {editable && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => read()}>{busy === "scan" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ScanText className="w-4 h-4 mr-1.5" />}{scan ? "Read deed again" : "Read deed with AI"}</Button>}
      </div>
      {scan && scan.files.length > 1 && (
        <p className="text-[11px] text-muted-foreground">Using {scan.file.name}. Other photos: {scan.files.filter((f) => f.id !== scan.file.id).map((f) => <button key={f.id} type="button" className="underline mr-2" onClick={() => read(f.id)}>{f.name}</button>)}</p>
      )}
      {scan && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground flex-1">Spaces on this deed — tick the ones being sold</p>{scan.spaces.length > 1 && <Button size="sm" variant="ghost" onClick={all}>Select all</Button>}</div>
          {scan.spaces.map((s, i) => (
            <label key={i} className="flex items-center gap-2 text-sm"><Checkbox checked={picked.has(i)} onCheckedChange={() => toggle(i)} disabled={!editable} />{s.label}</label>
          ))}
          {picked.size > 0 && <p className="text-xs text-muted-foreground">{picked.size} space{picked.size > 1 ? "s" : ""} selected — the description, number of spaces and price below have been updated. Click Save details to keep them.</p>}
          {scan.notes && <p className="text-[11px] text-muted-foreground">AI note: {scan.notes}</p>}
        </div>
      )}
      {scan && editable && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">Original (only you see this). Red boxes get blurred — click a box to remove it. {drawMode ? "Drag over anything else that should be blurred." : ""}</p>
          <div className="relative inline-block max-w-full">
            <img ref={imgRef} src={scan.image} alt="Original deed" className={`max-h-72 rounded border border-border ${drawMode ? "cursor-crosshair" : ""}`} draggable={false}
              onMouseDown={(e) => { if (drawMode) drag.current = pt(e); }}
              onMouseUp={async (e) => {
                if (!drawMode || !drag.current) return; const a = drag.current, b = pt(e); drag.current = null;
                if (Math.abs(a.x - b.x) < 5 || Math.abs(a.y - b.y) < 5) return;
                const nb = [...boxes, { what: "manual", box_2d: [Math.min(a.y, b.y), Math.min(a.x, b.x), Math.max(a.y, b.y), Math.max(a.x, b.x)] as [number, number, number, number] }];
                setBoxes(nb); await rebuild(scan.image, nb, rotation);
              }} />
            {boxes.map((b, i) => <button type="button" key={i} title="Click to remove this blur" aria-label={`Remove blur ${i + 1}`} className="absolute border-2 border-destructive bg-destructive/10 hover:bg-destructive/30" onClick={async () => { if (drawMode) return; const nb = boxes.filter((_, k) => k !== i); setBoxes(nb); await rebuild(scan.image, nb, rotation); }} style={{ top: `${b.box_2d[0] / 10}%`, left: `${b.box_2d[1] / 10}%`, height: `${(b.box_2d[2] - b.box_2d[0]) / 10}%`, width: `${(b.box_2d[3] - b.box_2d[1]) / 10}%` }} />)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={drawMode ? "default" : "outline"} onClick={() => setDrawMode((d) => !d)}><Eraser className="w-4 h-4 mr-1.5" />{drawMode ? "Done adding blur" : "Blur another area"}</Button>
            <Button size="sm" variant="outline" onClick={async () => { const r = (rotation + 90) % 360; setRotation(r); await rebuild(scan.image, boxes, r); }}>Rotate</Button>
            <Button size="sm" variant="ghost" onClick={async () => { setBoxes([]); await rebuild(scan.image, [], rotation); }}>Clear blur</Button>
            <Button size="sm" disabled={!!busy || !preview} onClick={async () => { setBusy("save"); try { await rebuild(scan.image, boxes, rotation, true); toast.success("Blurred deed saved — it will be included in the buyer's email"); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); } }}>{busy === "save" && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Use this blurred deed in the email</Button>
          </div>
        </div>
      )}
      {preview && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">What the buyer will see</p>
          <img src={preview} alt="Deed copy with owner details blurred" className="max-h-80 rounded border border-border" />
        </div>
      )}
      {!scan && !preview && <p className="text-xs text-muted-foreground">Click "Read deed with AI" to list the spaces on the seller's deed and prepare a blurred copy.</p>}
    </div>
  );
}
