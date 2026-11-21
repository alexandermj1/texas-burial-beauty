import { useState } from "react";
import JSZip from "jszip";
import { Check, Copy, Download, Loader2 } from "lucide-react";
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
  return { url: p.url, name: (path.split("/").pop() ?? "photo").replace(".asset.json", "") };
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
  { url: sparkmanFavourite.url, name: "favourite-sparkman-hillcrest.jpg", label: "Sparkman-Hillcrest · fountain garden" },
];
const LOGOS = [
  { url: hibiscus.url, name: "texas-cemetery-brokers-hibiscus-mark.png", label: "Texas Cemetery Brokers mark" },
  { url: bayerTransparent, name: "bayer-cemetery-brokers-logo-transparent.png", label: "Bayer logo (transparent)" },
  { url: bayerNavy.url, name: "bayer-logo-navy.png", label: "Bayer logo (navy)" },
  { url: bayerWhite.url, name: "bayer-logo-white.png", label: "Bayer logo (white)", dark: true },
];
const COLOURS = [
  { name: "Sage", hex: "#457358", hsl: "145 25% 36%", token: "bg-primary", use: "Primary identity, buttons and botanical details", group: "Core" },
  { name: "Terracotta", hex: "#C97B5E", hsl: "16 50% 58%", token: "bg-accent", use: "Warm accents; use sparingly", group: "Core" },
  { name: "Warm sand", hex: "#E4DBCD", hsl: "35 30% 85%", token: "bg-sand", use: "Stationery and supporting backgrounds", group: "Core" },
  { name: "Ivory", hex: "#FAF8F5", hsl: "40 30% 97%", token: "bg-background", use: "Main page background", group: "Core" },
  { name: "Warm ink", hex: "#2E251F", hsl: "25 20% 15%", token: "bg-foreground", use: "Headings and body text", group: "Core" },
  { name: "Sage wash", hex: "#E7EFEA", hsl: "145 20% 92%", token: "bg-sage-light", use: "Quiet botanical backgrounds", group: "Supporting" },
  { name: "Terracotta wash", hex: "#F3E7E2", hsl: "16 40% 92%", token: "bg-terracotta-light", use: "Soft warm highlights", group: "Supporting" },
  { name: "Sand wash", hex: "#F7F3EE", hsl: "38 35% 95%", token: "bg-sand-light", use: "Light editorial surfaces", group: "Supporting" },
  { name: "Warm neutral", hex: "#F0E5DB", hsl: "28 40% 90%", token: "bg-secondary", use: "Secondary surfaces", group: "Supporting" },
  { name: "Stone", hex: "#756657", hsl: "30 15% 40%", token: "bg-stone", use: "Supporting earthy details, not a dominant background", group: "Supporting" },
  { name: "Soft gold", hex: "#D9C5A1", hsl: "39 42% 74%", token: "bg-gold", use: "Fine borders and editorial accents", group: "Supporting" },
  { name: "Valuation blue", hex: "#26537E", hsl: "209 54% 32%", token: "bg-valuation-blue", use: "Calculator graphics and strong accents", group: "Calculator & graphics" },
  { name: "Valuation teal", hex: "#39A28A", hsl: "166 48% 43%", token: "bg-valuation-teal", use: "Calculator results and contrasting graphics", group: "Calculator & graphics" },
  { name: "Valuation coral", hex: "#E1826B", hsl: "12 66% 65%", token: "bg-valuation-coral", use: "Bright supporting data accents", group: "Calculator & graphics" },
  { name: "Cool surface", hex: "#F2F5F8", hsl: "208 32% 96%", token: "bg-valuation-surface", use: "Light calculator background", group: "Calculator & graphics" },
  { name: "Deep graphic ink", hex: "#1C2E3F", hsl: "210 38% 18%", token: "bg-valuation-ink", use: "High-contrast graphic text", group: "Calculator & graphics" },
  { name: "Paper white", hex: "#FFFFFF", hsl: "0 0% 100%", token: "bg-valuation-paper", use: "Clean graphic surfaces", group: "Calculator & graphics" },
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

const CONTEXT = [
  { title: "Company & customers", points: [
    "Texas Cemetery Brokers helps people buy and sell privately owned cemetery property in Texas. It works with Bayer Cemetery Brokers, established in 1996. Bayer is a licensed California brokerage (CEB 1512); do not describe that as a Texas licence or claim Texas Cemetery Brokers itself was founded in 1996.",
    "The service covers Dallas–Fort Worth, Houston, Austin, San Antonio and other Texas areas. It is a resale brokerage, not a cemetery owner or operator.",
    "Sellers may have unused family property, have moved away or changed their plans. Buyers include families with an immediate need and people planning ahead. Keep communication calm, practical and sensitive to bereavement.",
  ] },
  { title: "What the company handles", points: [
    "For sellers: valuation, listing and marketing, direct mortuary relationships, cemetery-specific paperwork preparation, document collection, cemetery coordination and buyer interaction.",
    "Sellers still provide ownership information, sign required documents and approve offers. A listing is not a guarantee of a sale, a higher price or payment.",
    "For buyers: locating suitable privately owned spaces, checking availability, explaining the purchase and coordinating the transfer. Some privately owned spaces may be in sections the cemetery no longer sells; confirm availability before making a claim.",
    "Transactions can involve many individually prepared documents, depending on ownership and cemetery rules. Do not give a universal document count or promise a fixed completion time.",
  ] },
  { title: "Company voice", points: [
    "Use ordinary, confident company language: Texas Cemetery Brokers or the company. Be reassuring without being sentimental, pushy or sales-heavy. Prefer concrete explanations of what the company does to generic promotional claims.",
    "Simon James is the buyer contact. Preserve his supplied wording and genuine anecdotes with only light grammar edits. Do not invent quotes, personal experiences, reviews or team credentials.",
    "Explain the next step clearly. Avoid urgency that is not real, guaranteed outcomes, unsupported market statistics and language that pressures grieving families.",
  ] },
  { title: "Visual direction & photographs", points: [
    "Modern, minimalist botanical stationery with refined editorial typography: DM Serif Display headings and DM Sans body text. Use generous space, clear hierarchy, fine borders and restrained botanical details.",
    "Use the core sage, terracotta, sand and ivory palette as the identity. Supporting washes and soft gold add depth; blue, teal and coral belong primarily to calculators and graphics, not a replacement brand theme. Check text contrast; pale swatches are backgrounds, not body-text colours.",
    "Use authentic cemetery photographs labelled with the correct cemetery. The preferred images are the document-request walkthrough cover and the Sparkman-Hillcrest fountain garden. Do not invent a cemetery scene or imply a general grounds photo shows the exact property for sale.",
    "Seller illustrations must relate to the seller's journey: valuation, paperwork, keys and payment. Do not put the buyer property-type illustrations on seller pages. Do not add company branding to cemetery maps; use the caption 'Redrawn from the cemetery’s published plan'.",
  ] },
  { title: "Accuracy, privacy & promises", points: [
    "Never publish specific asking prices, private quote figures, owner details or exact lot, grave and space identifiers. Public directory figures should be broad, rounded approximate ranges. Only use approved, current pricing supplied for the particular task.",
    "Any buyer savings claim must reflect the actual property and verified comparison. Do not promise a fixed discount, investment return, sale timeline or net proceeds. Distinguish illustrative estimates from measured results.",
    "Listing fees exist and seller commission is separate; do not claim selling has no upfront fees. Verify current fees, financing terms and any offer deadline before including them. Do not rewrite historical signed terms.",
    "An uploaded photograph or scan is a copy, not proof that a physical original has arrived at Glendale. Keep upload status and physical-original receipt separate in customer-facing explanations.",
  ] },
];

function brandText() {
  return [
    "TEXAS CEMETERY BROKERS — BRAND KIT & COMPANY CONTEXT", "",
    "Reference brief for Claude or another creative collaborator. Use these facts and preferences for the requested work; do not invent missing details. Confirm time-sensitive commercial terms before publication.", "",
    ...INFO.map(([k, v]) => `${k}: ${v}`), "", "COLOURS",
    "Colour codes match the website's light-theme design tokens; dark-mode surfaces may differ.",
    ...COLOURS.map(c => `${c.group} / ${c.name}: ${c.hex} (HSL ${c.hsl}) — ${c.use}`), "",
    "Fonts are free from Google Fonts: https://fonts.google.com/specimen/DM+Serif+Display and https://fonts.google.com/specimen/DM+Sans", "",
    ...CONTEXT.flatMap(section => [section.title.toUpperCase(), ...section.points.map(point => `- ${point}`), ""]),
    "PHOTO COLLECTION", ...FAVOURITES.map(f => `Favourite: ${f.label} — 01-favourites/${f.name}`),
    ...CEMETERIES.map(c => `${c.name}, ${c.city}: ${c.photos.length} photos in 03-cemetery-photos/${c.name}`), "",
    "The hibiscus mark represents Texas Cemetery Brokers; Bayer logo files represent the partner brokerage. Keep logo proportions and transparent backgrounds intact.",
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
  const [copied, setCopied] = useState(false);

  const copyContext = async () => {
    try {
      await navigator.clipboard.writeText(brandText());
      setCopied(true);
      setTimeout(() => setCopied(false), 3_000);
      toast.success("Brand and company context copied");
    } catch {
      toast.error("Couldn't copy — download the company brief instead");
    }
  };

  const build = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      zip.file("brand-info.txt", brandText());
      zip.file("company-context-for-claude.md", brandText());
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

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copyContext}>{copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}{copied ? "Copied" : "Copy context for Claude"}</Button>
        <Button variant="outline" onClick={() => saveBlob(new Blob([brandText()], { type: "text/plain;charset=utf-8" }), "texas-cemetery-brokers-company-brief.txt")}><Download className="h-4 w-4 mr-2" />Download company brief</Button>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg mb-3">Our information</h3>
          <dl className="space-y-2 text-sm">
            {INFO.map(([k, v]) => <div key={k} className="grid grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[130px_minmax(0,1fr)] gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>)}
          </dl>
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg mb-3">Colours</h3>
          {Array.from(new Set(COLOURS.map(c => c.group))).map(group => <div key={group} className="mb-5">
            <h4 className="text-xs font-medium text-muted-foreground mb-3">{group}</h4>
            <div className="space-y-3">
              {COLOURS.filter(c => c.group === group).map(c => <div key={c.hex} className="flex items-center gap-3 text-sm"><span className={`h-9 w-9 shrink-0 rounded-md border ${c.token}`} /><div className="min-w-0 flex-1"><span>{c.name}</span><p className="text-xs text-muted-foreground">{c.use}</p></div><code className="shrink-0 text-xs text-muted-foreground">{c.hex}</code></div>)}
            </div>
          </div>)}
          <h3 className="font-display text-lg mt-5 mb-1">Fonts</h3>
          <p className="font-display text-2xl">DM Serif Display</p>
          <p className="font-body">DM Sans — used for all body text</p>
        </div>
      </section>

      <section className="border-t pt-6">
        <h3 className="font-display text-xl mb-5">Company context</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {CONTEXT.map(section => <div key={section.title} className="min-w-0">
            <h4 className="font-medium mb-2">{section.title}</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">{section.points.map(point => <li key={point}>{point}</li>)}</ul>
          </div>)}
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
