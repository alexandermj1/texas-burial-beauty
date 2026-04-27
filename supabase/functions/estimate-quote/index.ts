// Quote estimator for California cemetery plots.
//
// Strategy: comparables are pulled STRICTLY from the same cemetery (canonical key),
// then ranked by lawn (area) match and property-type match. We never blend across
// cemeteries — pricing is location-driven.
//
// The math (price + confidence) is fully deterministic so admins can audit it.
// The AI is only used for the natural-language explanation — keeping cost minimal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EstimateRequest {
  cemetery: string;        // raw display name OR canonical key
  cemetery_key?: string;   // preferred — already canonical
  lawn?: string | null;    // area / lawn (e.g. "Hollywood Hills")
  property_type?: string | null;
  spaces?: number | null;
  request_details?: string | null;
  submission_id?: string | null;
  customer_profile_id?: string | null;
  generated_by_user_id?: string | null;
  generated_by_name?: string | null;
}

// Local copies of the SQL canonicalizers — kept in sync with the migration
function canonCem(name: string | null | undefined): string {
  if (!name) return "";
  let s = name.toLowerCase();
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\s+g[-\s]?\d+/g, " ");
  s = s.replace(/\bm\.?\s*p\.?\b/gi, " ");
  s = s.replace(/memorial\s+park/g, " ");
  s = s.replace(/mortuary\s+and\s+cemetery/g, " ");
  s = s.replace(/(mausoleum|mortuary|cemetery|association|assoc\.?)/g, " ");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
function canonPT(pt: string | null | undefined): string {
  if (!pt) return "";
  let s = pt.toLowerCase();
  s = s.replace(/(package|deluxe)/g, " ");
  s = s.replace(/t\.?\s*c\.?/g, "tc");
  s = s.replace(/gr\/sps/g, "gr/sp");
  s = s.replace(/gr\/sp/g, "grsp");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  s = s.replace(/(crypt|niche|space|grave|plot)s/g, "$1");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function summarize(prices: number[]) {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return { median, low: q1, high: q3, n: sorted.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as EstimateRequest;
    if (!body.cemetery && !body.cemetery_key) {
      return new Response(JSON.stringify({ error: "cemetery is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cemKey = (body.cemetery_key || canonCem(body.cemetery)).trim();
    const lawnLower = (body.lawn || "").trim().toLowerCase();
    const ptNorm = canonPT(body.property_type);
    const spaces = Math.max(1, Number(body.spaces ?? 1));

    if (!cemKey) {
      return new Response(JSON.stringify({ error: "could not canonicalize cemetery" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Pull EVERYTHING for this cemetery (we'll filter/rank in JS)
    const [soldRes, invRes, quoteRes] = await Promise.all([
      supabase
        .from("ca_sold_history")
        .select("cemetery,area,property_type,property_type_norm,resale_price,retail_price,location_details,poa_date,lawn_key")
        .eq("cemetery_key", cemKey)
        .limit(1000),
      supabase
        .from("ca_inventory")
        .select("id,cemetery,area,property_type,property_type_norm,resale_price,retail_price,location_details,poa_date,lawn_key,status")
        .eq("cemetery_key", cemKey)
        .limit(1000),
      supabase
        .from("quote_estimates")
        .select("cemetery,lawn,property_type,property_type_norm,outcome,outcome_amount,estimated_mid,created_at,lawn_key")
        .eq("cemetery_key", cemKey)
        .in("outcome", ["accepted", "declined"])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (soldRes.error) console.error("sold lookup error", soldRes.error);
    if (invRes.error) console.error("inventory lookup error", invRes.error);
    if (quoteRes.error) console.error("quote lookup error", quoteRes.error);

    const soldAll = soldRes.data ?? [];
    const invAll = (invRes.data ?? []).filter((r: any) => r.status !== "sold");
    const quotesAll = quoteRes.data ?? [];

    // 2) Rank rows: same lawn AND same property type > same lawn > same property type > cemetery
    const lawnKey = `${cemKey}|${lawnLower}`;
    const score = (row: any, ptField = "property_type_norm") => {
      let s = 0;
      if (lawnLower && row.lawn_key === lawnKey) s += 10;
      if (ptNorm && row[ptField] === ptNorm) s += 6;
      // partial property type token overlap as fallback
      if (ptNorm && row[ptField] && row[ptField] !== ptNorm) {
        const a = new Set(ptNorm.split(" "));
        const b = new Set(row[ptField].split(" "));
        for (const t of a) if (b.has(t)) s += 1;
      }
      return s;
    };

    const rankedSold = [...soldAll].sort((a: any, b: any) => score(b) - score(a));
    const rankedInv = [...invAll].sort((a: any, b: any) => score(b) - score(a));
    const rankedQuotes = [...quotesAll].sort((a: any, b: any) => score(b) - score(a));

    // The "best comp tier": same lawn + same property type
    const tierSold = rankedSold.filter((r: any) => score(r) >= 16);
    const tierInv = rankedInv.filter((r: any) => score(r) >= 16);
    const tierQuotes = rankedQuotes.filter((r: any) => score(r) >= 16);

    // Fallback tiers: same lawn (any pt), then same pt at this cemetery (any lawn)
    const lawnOnlySold = rankedSold.filter((r: any) => lawnLower && r.lawn_key === lawnKey);
    const ptOnlySold = rankedSold.filter((r: any) => ptNorm && r.property_type_norm === ptNorm);

    // Choose comp pool: prefer tightest tier with at least 3 comps
    let pool: any[] = tierSold;
    let poolDesc = "same lawn + same property type";
    if (pool.length < 3 && lawnOnlySold.length >= 3) {
      pool = lawnOnlySold;
      poolDesc = "same lawn (any property type)";
    }
    if (pool.length < 3 && ptOnlySold.length >= 3) {
      pool = ptOnlySold;
      poolDesc = "same property type (other lawns at this cemetery)";
    }
    if (pool.length === 0) {
      pool = rankedSold; // anything at this cemetery
      poolDesc = "this cemetery (any lawn / type)";
    }

    // Build price array, weighting accepted past quotes 3x, sold 2x
    const acceptedQuotePrices = tierQuotes
      .filter((q: any) => q.outcome === "accepted" && Number(q.outcome_amount) > 0)
      .map((q: any) => Number(q.outcome_amount));

    const soldPrices = pool.map((r: any) => Number(r.resale_price)).filter((n) => n > 0);
    const invPrices = (tierInv.length ? tierInv : rankedInv)
      .map((r: any) => Number(r.resale_price))
      .filter((n) => n > 0);

    const blended = [
      ...acceptedQuotePrices.flatMap((p) => [p, p, p]),
      ...soldPrices.flatMap((p) => [p, p]),
      ...invPrices,
    ];

    const summary = summarize(blended);

    // Confidence: comp count + IQR tightness + lawn-match bonus
    let confidence = 0;
    let confidence_label = "Insufficient data";
    let estimated_low: number | null = null;
    let estimated_mid: number | null = null;
    let estimated_high: number | null = null;
    const comp_count = soldPrices.length + acceptedQuotePrices.length;
    let closestComp: any = null;

    if (summary) {
      const compPts = Math.min(50, comp_count * 2);
      const spread = summary.high - summary.low;
      const tightness = summary.median > 0 ? 1 - Math.min(1, spread / summary.median) : 0;
      const tightPts = tightness * 30;
      const tierBonus = poolDesc.startsWith("same lawn + same") ? 20 : poolDesc.startsWith("same lawn") ? 10 : 0;
      confidence = Math.round(compPts + tightPts + tierBonus);
      confidence = Math.min(100, confidence);
      confidence_label =
        confidence >= 80 ? "Very high" : confidence >= 60 ? "High" : confidence >= 40 ? "Moderate" : confidence >= 20 ? "Low" : "Very low";

      estimated_low = Math.round(summary.low * spaces);
      estimated_mid = Math.round(summary.median * spaces);
      estimated_high = Math.round(summary.high * spaces);

      const pickClosest = (rows: any[], priceField: string, source: string) => {
        const filt = rows.filter((r: any) => Number(r[priceField]) > 0);
        if (filt.length === 0) return null;
        const ranked = [...filt].sort(
          (a: any, b: any) =>
            Math.abs(Number(a[priceField]) - summary.median) -
            Math.abs(Number(b[priceField]) - summary.median),
        );
        return {
          source,
          cemetery: ranked[0].cemetery,
          area: ranked[0].area,
          property_type: ranked[0].property_type,
          location: ranked[0].location_details,
          price: Number(ranked[0][priceField]),
          poa_date: ranked[0].poa_date ?? null,
        };
      };

      closestComp =
        pickClosest(tierQuotes.filter((q: any) => q.outcome === "accepted"), "outcome_amount", "accepted_quote") ??
        pickClosest(pool, "resale_price", "sold_history") ??
        pickClosest(tierInv.length ? tierInv : rankedInv, "resale_price", "active_inventory");
    }

    // Build the inventory + quote snapshot we return for the UI
    const invSnapshot = (tierInv.length ? tierInv : rankedInv).slice(0, 25).map((r: any) => ({
      id: r.id,
      cemetery: r.cemetery,
      area: r.area,
      property_type: r.property_type,
      location_details: r.location_details,
      retail_price: r.retail_price,
      resale_price: r.resale_price,
      lawn_match: lawnLower ? r.lawn_key === lawnKey : false,
      pt_match: ptNorm ? r.property_type_norm === ptNorm : false,
    }));
    const acceptedSnapshot = rankedQuotes
      .filter((q: any) => q.outcome === "accepted")
      .slice(0, 10);
    const declinedSnapshot = rankedQuotes
      .filter((q: any) => q.outcome === "declined")
      .slice(0, 10);

    // 3) AI explanation (only when we have an estimate)
    let ai_explanation = "";
    let ai_model_used = "google/gemini-2.5-flash-lite";
    let ai_cost_estimate_usd = 0;

    if (LOVABLE_API_KEY && summary) {
      try {
        const sysPrompt =
          "You are a senior cemetery property broker writing for an internal admin. In 3-4 short sentences, justify the recommended quote price using ONLY the comp data shown. Reference the closest comp by lawn + property type. Be concrete with numbers. Plain prose, no markdown.";
        const userPrompt = `Cemetery: ${body.cemetery} (canonical: ${cemKey})
Lawn / area requested: ${body.lawn || "not specified"}
Property type requested: ${body.property_type || "not specified"} (normalized: ${ptNorm || "—"})
Spaces: ${spaces}
Customer notes: ${body.request_details || "none"}

Comp pool used: ${poolDesc} (${pool.length} sold rows)
Accepted past quotes at same lawn+type: ${tierQuotes.filter((q: any) => q.outcome === "accepted").length}
Active inventory matching: ${tierInv.length}
Computed range: $${estimated_low?.toLocaleString()} – $${estimated_high?.toLocaleString()} (mid $${estimated_mid?.toLocaleString()})
Closest comp: ${closestComp ? `${closestComp.area ?? ""} · ${closestComp.location ?? closestComp.cemetery} · ${closestComp.property_type} · $${closestComp.price.toLocaleString()} (${closestComp.source})` : "none"}
Confidence: ${confidence_label} (${confidence}/100)

Write a brief justification.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ai_model_used,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (aiRes.ok) {
          const j = await aiRes.json();
          ai_explanation = j.choices?.[0]?.message?.content?.trim() ?? "";
          ai_cost_estimate_usd = 0.0002;
        } else if (aiRes.status === 429) {
          ai_explanation = "(AI explanation skipped — rate limited.)";
        } else if (aiRes.status === 402) {
          ai_explanation = "(AI explanation skipped — workspace credits exhausted.)";
        } else {
          ai_explanation = "(AI explanation unavailable — see comparables below.)";
        }
      } catch (err) {
        console.error("AI call failed", err);
        ai_explanation = "(AI explanation unavailable — see comparables below.)";
      }
    }

    // 4) Persist
    const { data: inserted, error: insertErr } = await supabase
      .from("quote_estimates")
      .insert({
        submission_id: body.submission_id ?? null,
        customer_profile_id: body.customer_profile_id ?? null,
        cemetery: body.cemetery,
        lawn: body.lawn ?? null,
        property_type: body.property_type ?? null,
        spaces,
        request_details: body.request_details ?? null,
        estimated_low,
        estimated_mid,
        estimated_high,
        confidence_score: confidence,
        confidence_label,
        comp_count,
        closest_comp: closestComp,
        ai_explanation,
        ai_model_used,
        ai_cost_estimate_usd,
        outcome: "pending",
        generated_by_user_id: body.generated_by_user_id ?? null,
        generated_by_name: body.generated_by_name ?? null,
      })
      .select()
      .single();

    if (insertErr) console.error("insert failed", insertErr);

    return new Response(
      JSON.stringify({
        estimate: inserted,
        pool_description: poolDesc,
        inventory: invSnapshot,
        accepted_quotes: acceptedSnapshot,
        declined_quotes: declinedSnapshot,
        debug: {
          canonical_cemetery: cemKey,
          canonical_property_type: ptNorm,
          lawn_key: lawnKey,
          sold_comp_count: soldPrices.length,
          accepted_quote_count: acceptedQuotePrices.length,
          inventory_count: invSnapshot.length,
          tier_sold: tierSold.length,
          tier_inv: tierInv.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("estimate-quote error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
