// Public plot resale value estimator.
// Uses our private section price sheets (texas_cemeteries.sections) and the
// retail figures saved on quotes we've sent (contact_submissions.cemetery_retail).
// Only derived estimates leave this function — never raw prices, sources,
// section names or sample counts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const BROKER_PCT = 0.6;
const PRIVATE_PCT = 0.42;
const STOP = new Set(["lot", "lots", "space", "spaces", "sp", "section", "sec", "of", "the", "and", "garden", "gardens", "lawn", "plot", "plots", "block", "row", "i", "dont", "know", "all", "&", "a"]);

const normCem = (s: string) =>
  (s || "").toLowerCase().replace(/&/g, " and ").replace(/\b(memorial|park|cemetery|cemeteries|funeral|home|gardens?|tx|texas)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
const tokens = (s: string) =>
  new Set((s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t)));
const sim = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let i = 0;
  a.forEach((t) => b.has(t) && i++);
  return i / Math.min(a.size, b.size);
};
const cat = (t: string) => {
  const s = (t || "").toLowerCase();
  if (/niche|columbar|urn/.test(s)) return "niche";
  if (/crypt|mausol|maus/.test(s) && !/lawn crypt/.test(s)) return "crypt";
  return "plot";
};
const yearsAgo = (d?: string | null) => {
  const t = d ? Date.parse(d) : NaN;
  return isNaN(t) ? 2 : Math.max(0, (Date.now() - t) / (365.25 * 864e5));
};
const r50 = (n: number) => Math.round(n / 50) * 50;

interface Pt { cem: string; section: Set<string>; cat: string; retail: number; age: number; src: number }

let cache: { at: number; pts: Pt[]; cems: { name: string; city: string | null; key: string }[] } | null = null;

async function load() {
  if (cache && Date.now() - cache.at < 10 * 60e3) return cache;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: tc }, { data: subs }] = await Promise.all([
    db.from("texas_cemeteries").select("name, city, sections").is("deleted_at", null),
    db.from("contact_submissions").select("cemetery, section, lawn, property_type, cemetery_retail, quote_sent_at, plot_count, spaces")
      .gt("cemetery_retail", 0).is("deleted_at", null).limit(5000),
  ]);
  const pts: Pt[] = [];
  const cemMap = new Map<string, { name: string; city: string | null; key: string }>();
  for (const c of tc ?? []) {
    const key = normCem(c.name);
    const secs = Array.isArray(c.sections) ? c.sections : [];
    for (const s of secs) {
      const p = Number(s?.price);
      if (!(p > 200 && p < 500000)) continue;
      pts.push({ cem: key, section: tokens(`${s.name ?? ""} ${s.notes ?? ""}`.slice(0, 120)), cat: cat(s.property_type ?? s.name), retail: p, age: yearsAgo(s.date), src: 1.25 });
    }
    if (secs.length) cemMap.set(key, { name: c.name, city: c.city, key });
  }
  const names = new Map((tc ?? []).map((c) => [normCem(c.name), c] as const));
  for (const s of subs ?? []) {
    const key = normCem(s.cemetery ?? "");
    const p = Number(s.cemetery_retail);
    if (!key || !(p > 200 && p < 500000)) continue;
    pts.push({ cem: key, section: tokens(`${s.section ?? ""} ${s.lawn ?? ""}`), cat: cat(s.property_type ?? ""), retail: p, age: yearsAgo(s.quote_sent_at), src: 1 });
    if (!cemMap.has(key)) {
      const t = names.get(key);
      cemMap.set(key, { name: t?.name ?? s.cemetery, city: t?.city ?? null, key });
    }
  }
  cache = { at: Date.now(), pts, cems: [...cemMap.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  return cache;
}

function wMedian(xs: { v: number; w: number }[]) {
  const s = [...xs].sort((a, b) => a.v - b.v);
  const tot = s.reduce((a, x) => a + x.w, 0);
  let acc = 0;
  for (const x of s) { acc += x.w; if (acc >= tot / 2) return x.v; }
  return s[s.length - 1].v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { pts, cems } = await load();

    if (body.action === "cemeteries") {
      return json({ cemeteries: cems.map((c) => ({ name: c.name, city: c.city })) });
    }

    const cemName = String(body.cemetery ?? "").slice(0, 160);
    const section = String(body.section ?? "").slice(0, 160);
    const type = String(body.property_type ?? "plot").slice(0, 40);
    const spaces = Math.min(12, Math.max(1, Math.round(Number(body.spaces) || 1)));
    const key = normCem(cemName);
    const want = cat(type);
    const secT = tokens(section);

    let pool = pts.filter((p) => p.cem === key);
    let tier: "section" | "type" | "cemetery" | "regional" = "cemetery";
    if (!pool.length) {
      pool = pts.filter((p) => p.cat === want);
      tier = "regional";
    }
    if (!pool.length) return json({ ok: false, reason: "not_enough_data" });

    const scored = pool.map((p) => {
      const s = sim(secT, p.section);
      const typeW = p.cat === want ? 1 : 0.25;
      const secW = tier === "regional" ? 1 : s >= 0.6 ? 4 : 1 + s * 1.5;
      const rec = Math.pow(0.5, p.age / 2.5);
      return { p, s, w: typeW * secW * rec * p.src };
    });

    const secHits = scored.filter((x) => x.s >= 0.6 && x.p.cat === want);
    const typeHits = scored.filter((x) => x.p.cat === want);
    let use = scored;
    if (tier !== "regional") {
      if (secHits.length) { tier = "section"; use = secHits; }
      else if (typeHits.length) { tier = "type"; use = typeHits; }
    }

    const retail = wMedian(use.map((x) => ({ v: x.p.retail, w: x.w })));
    const totW = use.reduce((a, x) => a + x.w, 0);
    const mean = use.reduce((a, x) => a + x.w * x.p.retail, 0) / totW;
    const sd = Math.sqrt(use.reduce((a, x) => a + x.w * (x.p.retail - mean) ** 2, 0) / totW);
    const cv = use.length > 1 ? sd / mean : 0.25;
    const effN = totW ** 2 / use.reduce((a, x) => a + x.w * x.w, 0);
    const avgAge = use.reduce((a, x) => a + x.w * x.p.age, 0) / totW;

    const base = { section: 84, type: 68, cemetery: 52, regional: 28 }[tier];
    const depth = Math.min(10, effN * 2);
    const disp = Math.min(25, cv * 45);
    const fresh = avgAge < 1 ? 4 : avgAge < 2 ? 0 : -6;
    const score = Math.round(Math.max(18, Math.min(96, base + depth - disp + fresh)));
    const band = Math.max(0.08, Math.min(0.4, (100 - score) / 100 * 0.6 + cv * 0.3));

    const est = (pct: number) => {
      const mid = retail * pct;
      return { per_space: { low: r50(mid * (1 - band)), mid: r50(mid), high: r50(mid * (1 + band)) },
        total: { low: r50(mid * (1 - band) * spaces), mid: r50(mid * spaces), high: r50(mid * (1 + band) * spaces) } };
    };
    const label = score >= 80 ? "High" : score >= 62 ? "Good" : score >= 42 ? "Moderate" : "Indicative";
    const matched = cems.find((c) => c.key === key);

    return json({
      ok: true,
      cemetery: matched?.name ?? cemName,
      spaces,
      confidence: { score, label, accuracy_pct: Math.round(band * 100) },
      factors: {
        location_match: tier === "section" ? "Strong" : tier === "type" ? "Good" : tier === "cemetery" ? "General" : "Regional",
        market_data: effN >= 4 ? "Deep" : effN >= 2 ? "Solid" : "Limited",
        recency: avgAge < 1 ? "Current" : avgAge < 2 ? "Recent" : "Older",
        consistency: cv < 0.15 ? "Tight" : cv < 0.3 ? "Mixed" : "Wide",
      },
      broker: { ...est(BROKER_PCT), timeline: "1 month – 2 years" },
      private: { ...est(PRIVATE_PCT), timeline: "5 – 7 years" },
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, reason: "error" }, 500);
  }
});
