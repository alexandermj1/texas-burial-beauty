import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, ExternalLink, FileText, X } from "lucide-react";

type Mark = { x: number; y: number; w: number; h: number; label: string };
type Person = { name: string; relation: string; parent: string | null; deceased: boolean; signs: boolean; note: string | null };
export type AiVisual =
  | { kind: "scan"; caption: string; marks: Mark[]; file_path: string; file_name: string; mime_type: string | null; document_type: string | null }
  | { kind: "family_tree"; people: Person[] }
  | { kind: "compare"; title: string; rows: { label: string; record: string; evidence: string; match: boolean }[] };

function ScanVisual({ v }: { v: Extract<AiVisual, { kind: "scan" }> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("customer-files").createSignedUrl(v.file_path, 60 * 30).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [v.file_path]);
  const isPdf = /pdf/.test(v.mime_type ?? "") || /\.pdf$/i.test(v.file_name);
  return (
    <figure className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b border-border">
        <span className="flex items-center gap-1.5 min-w-0 text-foreground"><FileText className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{v.document_type ? `${v.document_type} · ` : ""}{v.file_name}</span></span>
        {url && <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline shrink-0">Open <ExternalLink className="w-3 h-3" /></a>}
      </div>
      {!url ? <div className="h-40 animate-pulse bg-muted" /> : isPdf ? (
        <iframe src={url} title={v.file_name} className="w-full h-80 bg-background" />
      ) : (
        <div className="relative">
          <img src={url} alt={v.file_name} className="w-full h-auto block" />
          {v.marks.map((m, i) => (
            <div key={i} className="absolute rounded border-2 border-primary bg-primary/10 shadow-[0_0_0_2px_hsl(var(--background))]"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.w * 100}%`, height: `${m.h * 100}%` }}>
              <span className={`absolute left-0 ${m.y > 0.12 ? "-top-6" : "top-full mt-1"} whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground shadow`}>
                {i + 1}. {m.label}
              </span>
            </div>
          ))}
        </div>
      )}
      {v.caption && <figcaption className="px-3 py-2 text-xs text-muted-foreground">{v.caption}</figcaption>}
    </figure>
  );
}

function TreeNode({ p, all, depth }: { p: Person; all: Person[]; depth: number }) {
  const kids = all.filter((c) => c.parent && c.parent.toLowerCase() === p.name.toLowerCase());
  return (
    <li className="relative">
      <div className={`inline-flex flex-col rounded-lg border px-2.5 py-1.5 text-xs ${p.signs ? "border-primary bg-primary/10" : "border-border bg-card"} ${p.deceased ? "opacity-70" : ""}`}>
        <span className="font-medium text-foreground">{p.name}{p.deceased ? " †" : ""}</span>
        <span className="text-muted-foreground">{p.relation}{p.signs ? " · signs" : ""}</span>
        {p.note && <span className="text-muted-foreground italic">{p.note}</span>}
      </div>
      {kids.length > 0 && depth < 6 && (
        <ul className="ml-4 mt-1.5 space-y-1.5 border-l border-border pl-4">
          {kids.map((k) => <TreeNode key={k.name} p={k} all={all} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

function TreeVisual({ people }: { people: Person[] }) {
  const names = new Set(people.map((p) => p.name.toLowerCase()));
  const roots = people.filter((p) => !p.parent || !names.has(p.parent.toLowerCase()));
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs font-medium text-foreground mb-2">Family tree as the AI reads it</div>
      <ul className="space-y-1.5">{roots.map((r) => <TreeNode key={r.name} p={r} all={people} depth={0} />)}</ul>
      <div className="mt-2 text-[11px] text-muted-foreground">† deceased · highlighted = needs to sign</div>
    </div>
  );
}

function CompareVisual({ v }: { v: Extract<AiVisual, { kind: "compare" }> }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {v.title && <div className="px-3 py-1.5 text-xs font-medium bg-muted/40 border-b border-border">{v.title}</div>}
      <table className="w-full text-xs">
        <thead><tr className="text-muted-foreground"><th className="text-left p-2 font-normal"></th><th className="text-left p-2 font-normal">Our record</th><th className="text-left p-2 font-normal">Evidence</th><th className="w-6" /></tr></thead>
        <tbody>
          {v.rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-2 font-medium text-foreground">{r.label}</td>
              <td className="p-2">{r.record || "—"}</td>
              <td className="p-2">{r.evidence || "—"}</td>
              <td className="p-2">{r.match ? <Check className="w-3.5 h-3.5 text-primary" /> : <X className="w-3.5 h-3.5 text-destructive" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AiVisuals({ visuals }: { visuals?: AiVisual[] | null }) {
  if (!visuals?.length) return null;
  return (
    <div className="space-y-2">
      {visuals.map((v, i) => v.kind === "scan" ? <ScanVisual key={i} v={v} /> : v.kind === "family_tree" ? <TreeVisual key={i} people={v.people} /> : v.kind === "compare" ? <CompareVisual key={i} v={v} /> : null)}
    </div>
  );
}
