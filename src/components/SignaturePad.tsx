import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";

/** Draw-to-sign pad. Emits a PNG data URL, or null when cleared. */
export default function SignaturePad({ onChange, label }: { onChange: (dataUrl: string | null) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const has = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = getComputedStyle(c).color || "#1f2937";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    };
    const down = (e: PointerEvent) => { drawing.current = true; has.current = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: PointerEvent) => { if (!drawing.current) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const up = () => { if (!drawing.current) return; drawing.current = false; onChange(has.current ? c.toDataURL("image/png") : null); };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [onChange]);

  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); has.current = false; onChange(null); };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative rounded-lg border border-border bg-card shadow-inner">
        <canvas ref={ref} width={720} height={160} aria-label={label} className="w-full h-40 touch-none rounded-lg text-foreground" />
        <div className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-dashed border-muted-foreground/40" />
        <span className="pointer-events-none absolute left-6 bottom-2 text-[10px] uppercase tracking-widest text-muted-foreground">Sign above the line</span>
      </div>
      <button type="button" onClick={clear} className="text-xs text-muted-foreground underline hover:text-foreground">Clear signature</button>
    </div>
  );
}
