import { useState } from "react";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import docCover from "@/assets/documents/tcb-documents-walkthrough-first-item-cover.jpg.asset.json";
import sparkmanFavourite from "@/assets/sparkman/sparkman-fountain-garden.jpg.asset.json";
import hibiscus from "@/assets/flowers/hibiscus-coral.png.asset.json";
import bayerNavy from "@/assets/bayer-logo-navy.png.asset.json";
import bayerWhite from "@/assets/bayer-logo-white-v2.png.asset.json";
import bayerTransparent from "@/assets/partners/bayer-cemetery-brokers-logo-transparent.png";

type Pointer = { url: string; original_filename?: string };
const glob = (m: Record<string, unknown>) => Object.entries(m).map(([path, mod]) => {
  const p = ((mod as { default?: Pointer }).default ?? mod) as Pointer;
  return { url: p.url, name: path.split("/").pop()!.replace(".asset.json", "") };
});

const CEMETERIES = [
  { name: "Sparkman-Hillcrest Memorial Park", city: "Dallas", photos: glob(import.meta.glob("@/assets/sparkman/*.jpg.asset.json", { eager: true })) },
  { name: "Restland Funeral Home & Cemetery", city: "Dallas", photos: glob(import.meta.glob("@/assets/restland/*.{jpg,png}.asset.json", { eager: true })) },
  { name: "Bluebonnet Hills Memorial Park", city: "Colleyville", photos: glob(import.meta.glob("@/assets/bluebonnet/*.jpg.asset.json", { eager: true })) },
  { name: "Rest Haven Memorial Park", city: "Rockwall", photos: glob(import.meta.glob("@/assets/resthaven/*.jpg.asset.json", { eager: true })) },
  { name: "Laurel Land Memorial Park", city: "Dallas", photos: glob(import.meta.glob("@/assets/laurelland/*.jpg.asset.json", { eager: true })) },
].filter(c => c.photos.length);

const FAVOURITES = [
  { url: docCover.url, name: "favourite-document-request-page.jpg", label: "Document request page photo" },
  { url: sparkmanFavourite.url, name: "favourite-sparkman-hillcrest.jpg", label: "Sparkman-Hillcrest" },
];
const LOGOS = [
  { url: hibiscus.url, name: "texas-cemetery-brokers-hibiscus-mark.png", label: "Texas Cemetery Brokers mark" },
  { url: bayerTransparent, name: "bayer-cemetery-brokers-logo-transparent.png", label: "Bayer logo (transparent)" },
  { url: bayerNavy.url, name: "bayer-logo-navy.png", label: "Bayer logo (navy)" },
  { url: bayerWhite.url, name: "bayer-logo-white.png", label: "Bayer logo (white)", dark: true },
];
const COLOURS = [
  { name: "Sage (primary)", hex: "#456F55", hsl: "145 25% 36%", token: "bg-primary" },
  { name: "Terracotta (accent)", hex: "#CF7B5E", hsl: "16 50% 58%", token: "bg-accent" },
  { name: "Warm sand", hex: "#E6DACA", hsl: "35 30% 85%", token: "bg-secondary" },
  { name: "Ivory (background)", hex: "#FAF8F4", hsl: "40 30% 97%", token: "bg-background" },
  { name: "Ink (text)", hex: "#2E2620", hsl: "25 20% 15%", token: "bg-foreground" },
];
const INFO: [string, string][] = [
  ["Company", "Texas Cemetery Brokers"],
  ["Partner", "Bayer Cemetery Brokers (est. 1996), licensed California brokerage CEB 1512"],
  ["Headquarters", "Dallas, Texas"],
  ["Phone", "(214) 230-4740"],
  ["Email", "info@texascemeterybrokers.com"],
  ["Website", "texascemeterybrokers.com"],
  ["Service", "Resale of privately owned cemetery property across Texas — Dallas–Fort Worth, Houston, Austin, San Antonio and more"],
  ["Contact for buyers", "Simon James · 310 804 9586"],
  ["Style", "Modern, minimalist, light earthy tones — sage, terracotta and warm sand"],
  ["Fonts", "DM Serif Display (headings) · DM Sans (body text)"],
];

function brandText() {
  return [
    "TEXAS CEMETERY BROKERS — BRAND KIT", "",
    ...INFO.map(([k, v]) => `${k}: ${v}`), "", "COLOURS",
    ...COLOURS.map(c => `${c.name}: ${c.hex} (HSL ${c.hsl})`), "",
    "Fonts are free from Google Fonts: https://fonts.google.com/specimen/DM+Serif+Display and https://fonts.google.com/specimen/DM+Sans", "",
    "Photo rules: use real photographs labelled with their cemetery names. Never show asking prices or exact plot locations.",
  ].join("\n");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function BrandKitPanel() {
  const [ready, setReady] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      zip.file("brand-info.txt", brandText());
      const add = async (folder: string, url: string, name: string) => {
        const r = await fetch(url); if (!r.ok || (r.headers.get("content-type") ?? "").includes("text/html")) throw new Error(name);
        zip.file(`${folder}/${name}`, await r.blob());
      };
      await Promise.all([
        ...FAVOURITES.map(f => add("01-favourites", f.url, f.name)),
        ...LOGOS.map(l => add("02-logos", l.url, l.name)),
        ...CEMETERIES.flatMap(c => c.photos.map(p => add(`03-cemetery-photos/${c.name}`, p.url, p.name))),
      ]);
      setReady(await zip.generateAsync({ type: "blob", compression: "STORE" }));
      toast.success("Brand kit ready — click Download");
    } catch (e) {
      toast.error(`Couldn't bundle a file: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Brand kit</h2>
          <p className="text-sm text-muted-foreground">Our details, colours, logos and the photos we use — all in one download.</p>
        </div>
        {ready
          ? <Button onClick={() => saveBlob(ready, "texas-cemetery-brokers-brand-kit.zip")}><Download className="h-4 w-4 mr-2" />Download brand kit</Button>
          : <Button onClick={build} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}{busy ? "Preparing…" : "Prepare brand kit download"}</Button>}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-display text-lg mb-3">Our information</h3>
          <dl className="space-y-2 text-sm">
            {INFO.map(([k, v]) => <div key={k} className="grid grid-cols-[130px_1fr] gap-2"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-display text-lg mb-3">Colours</h3>
          <div className="space-y-2">
            {COLOURS.map(c => <div key={c.hex} className="flex items-center gap-3 text-sm"><span className={`h-9 w-9 rounded-md border ${c.token}`} /><span className="flex-1">{c.name}</span><code className="text-xs text-muted-foreground">{c.hex}</code></div>)}
          </div>
          <h3 className="font-display text-lg mt-5 mb-1">Fonts</h3>
          <p className="font-display text-2xl">DM Serif Display</p>
          <p className="font-body">DM Sans — used for all body text</p>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-3">Logos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LOGOS.map(l => <a key={l.name} href={l.url} download={l.name} className={`rounded-xl border p-4 flex flex-col items-center gap-2 text-xs ${l.dark ? "bg-foreground text-background" : "bg-card"}`}><img src={l.url} alt={l.label} className="h-16 object-contain" />{l.label}</a>)}
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-3">Favourite photos</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {FAVOURITES.map(f => <a key={f.name} href={f.url} download={f.name} className="group rounded-xl overflow-hidden border bg-card"><img src={f.url} alt={f.label} className="w-full aspect-[16/10] object-cover group-hover:opacity-90" /><p className="p-3 text-sm">{f.label}</p></a>)}
        </div>
      </section>

      {CEMETERIES.map(c => (
        <section key={c.name}>
          <h3 className="font-display text-lg">{c.name}</h3>
          <p className="text-xs text-muted-foreground mb-3">{c.city} · {c.photos.length} photos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {c.photos.map(p => <a key={p.url} href={p.url} download={p.name} title={p.name}><img src={p.url} alt={`${c.name} — ${p.name}`} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-lg border hover:opacity-90" /></a>)}
          </div>
        </section>
      ))}
    </div>
  );
}
