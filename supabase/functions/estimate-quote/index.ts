// Quote estimator edge function for California cemetery plots.
// Strategy: rules-based comp lookup against ca_sold_history + ca_inventory,
// then a small Gemini Flash Lite call to write the customer-facing explanation.
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
  cemetery: string;
  property_type?: string | null;
  spaces?: number | null;
  request_details?: string | null;
  submission_id?: string | null;
  customer_profile_id?: string | null;
  generated_by_user_id?: string | null;
  generated_by_name?: string | null;
}

// Median + IQR helper (IQR drives confidence)
function summarize(prices: number[]) {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return { median, low: q1, high: q3, n: sorted.length };
}

// Loose token-overlap similarity for property_type matching ("GR/SP" vs "Single Plot")
function similarPropertyType(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return true; // permissive when one side missing
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean);
  const aT = new Set(tokenize(a));
  const bT = new Set(tokenize(b));
  if (aT.size === 0 || bT.size === 0) return true;
  let overlap = 0;
  for (const t of aT) if (bT.has(t)) overlap++;
  return overlap > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as EstimateRequest;
    if (!body.cemetery) {
      return new Response(JSON.stringify({ error: "cemetery is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Pull comparables from sold history + matching active inventory
    const cemeteryLike = `%${body.cemetery.replace(/[%_]/g, "")}%`;
    const [soldRes, invRes, acceptedRes] = await Promise.all([
      supabase
        .from("ca_sold_history")
        .select("cemetery,property_type,property_type_code,resale_price,retail_price,location_details,poa_date")
        .ilike("cemetery", cemeteryLike)
        .limit(500),
      supabase
        .from("ca_inventory")
        .select("cemetery,property_type,property_type_code,resale_price,retail_price,location_details,poa_date")
        .ilike("cemetery", cemeteryLike)
        .limit(500),
      // Past accepted quotes for this cemetery — strongest signal we have
      supabase
        .from("quote_estimates")
        .select("cemetery,property_type,outcome_amount,outcome,created_at")
        .ilike("cemetery", cemeteryLike)
        .eq("outcome", "accepted")
        .limit(200),
    ]);

    const soldRows = (soldRes.data ?? []).filter((r: any) =>
      similarPropertyType(r.property_type, body.property_type),
    );
    const invRows = (invRes.data ?? []).filter((r: any) =>
      similarPropertyType(r.property_type, body.property_type),
    );
    const acceptedRows = (acceptedRes.data ?? []).filter((r: any) =>
      similarPropertyType(r.property_type, body.property_type),
    );

    // 2) Build price arrays. Multiply by spaces for multi-plot requests.
    const spaces = Math.max(1, Number(body.spaces ?? 1));
    const soldPrices = soldRows.map((r: any) => Number(r.resale_price)).filter((n) => n > 0);
    const invPrices = invRows.map((r: any) => Number(r.resale_price)).filter((n) => n > 0);
    const acceptedPrices = acceptedRows
      .map((r: any) => Number(r.outcome_amount))
      .filter((n) => n > 0);

    // Weighted blend: accepted past quotes > sold history > current inventory
    const allPrices = [
      ...acceptedPrices.flatMap((p) => [p, p, p]), // 3x weight
      ...soldPrices.flatMap((p) => [p, p]), // 2x weight
      ...invPrices,
    ];

    const summary = summarize(allPrices);

    // 3) Confidence model (deterministic 0–100)
    //    - Comp count contributes up to 60 pts (saturates at ~40 comps)
    //    - Tightness of IQR contributes up to 40 pts
    let confidence = 0;
    let comp_count = soldPrices.length + acceptedPrices.length;
    let confidence_label = "Insufficient data";
    let estimated_low: number | null = null;
    let estimated_mid: number | null = null;
    let estimated_high: number | null = null;
    let closestComp: any = null;

    if (summary) {
      const compPts = Math.min(60, comp_count * 1.5);
      const spread = summary.high - summary.low;
      const tightness = summary.median > 0 ? 1 - Math.min(1, spread / summary.median) : 0;
      const tightPts = tightness * 40;
      confidence = Math.round(compPts + tightPts);
      confidence_label =
        confidence >= 80 ? "Very high" : confidence >= 60 ? "High" : confidence >= 40 ? "Moderate" : confidence >= 20 ? "Low" : "Very low";

      estimated_low = Math.round(summary.low * spaces);
      estimated_mid = Math.round(summary.median * spaces);
      estimated_high = Math.round(summary.high * spaces);

      // Pick closest comp by distance from median (prefer accepted > sold > inv)
      const pickClosest = (rows: any[], priceField: string, source: string) => {
        if (rows.length === 0) return null;
        const ranked = [...rows]
          .filter((r: any) => Number(r[priceField]) > 0)
          .sort(
            (a: any, b: any) =>
              Math.abs(Number(a[priceField]) - summary.median) -
              Math.abs(Number(b[priceField]) - summary.median),
          );
        if (!ranked[0]) return null;
        return {
          source,
          cemetery: ranked[0].cemetery,
          property_type: ranked[0].property_type,
          location: ranked[0].location_details,
          price: Number(ranked[0][priceField]),
          poa_date: ranked[0].poa_date ?? null,
        };
      };

      closestComp =
        pickClosest(acceptedRows as any[], "outcome_amount", "accepted_quote") ??
        pickClosest(soldRows as any[], "resale_price", "sold_history") ??
        pickClosest(invRows as any[], "resale_price", "active_inventory");
    }

    // 4) Generate the customer-facing explanation via Lovable AI (cheap model)
    let ai_explanation = "";
    let ai_model_used = "google/gemini-2.5-flash-lite";
    let ai_cost_estimate_usd = 0;

    if (LOVABLE_API_KEY && summary) {
      try {
        const sysPrompt =
          "You are a senior cemetery property broker. In 3-4 short sentences, explain a recommended quote price for a customer. Be warm, professional, and reference the comp data. Never invent prices. Output plain prose only — no markdown headings.";
        const userPrompt = `Cemetery: ${body.cemetery}
Property type requested: ${body.property_type || "not specified"}
Spaces: ${spaces}
Customer details: ${body.request_details || "none provided"}

Computed estimate: $${estimated_low?.toLocaleString()} – $${estimated_high?.toLocaleString()} (recommended midpoint: $${estimated_mid?.toLocaleString()})
Comp count: ${comp_count} historical sales + ${invRows.length} active inventory rows
Closest comparable: ${closestComp ? `${closestComp.location ?? closestComp.cemetery} sold for $${closestComp.price.toLocaleString()} (${closestComp.source})` : "none"}
Confidence: ${confidence_label} (${confidence}/100)

Write a brief justification of the recommended price using this data. Mention the closest comp.`;

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
          // Rough cost: gemini-2.5-flash-lite ≈ $0.0001 per quote at this prompt size
          ai_cost_estimate_usd = 0.0002;
        } else if (aiRes.status === 429) {
          ai_explanation = "(AI explanation skipped — rate limited. Please try again shortly.)";
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

    // 5) Persist the estimate
    const { data: inserted, error: insertErr } = await supabase
      .from("quote_estimates")
      .insert({
        submission_id: body.submission_id ?? null,
        customer_profile_id: body.customer_profile_id ?? null,
        cemetery: body.cemetery,
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

    if (insertErr) {
      console.error("insert failed", insertErr);
    }

    return new Response(
      JSON.stringify({
        estimate: inserted,
        debug: {
          sold_comp_count: soldPrices.length,
          inventory_count: invRows.length,
          accepted_quote_count: acceptedPrices.length,
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
