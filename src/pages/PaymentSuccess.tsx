import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Summary {
  found: boolean;
  recipientName?: string | null;
  recipientEmail?: string | null;
  description?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  productName?: string | null;
}

const fmt = (cents?: number | null, currency = "usd") =>
  cents == null
    ? ""
    : (cents / 100).toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });

const firstName = (n?: string | null) => (n?.trim().split(/\s+/)[0] || "");

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Payment received — Texas Cemetery Brokers"; }, []);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase.functions.invoke("get-payment-summary", {
          method: "GET" as any,
          body: undefined,
          headers: {},
          // supabase-js doesn't support GET query params directly; fetch manually.
        } as any);
        if (!cancelled && data) setSummary(data as Summary);
      } catch { /* fall through */ }
      // Fallback direct fetch (query param based)
      try {
        const url = `${(supabase as any).functionsUrl || `https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1`}/get-payment-summary?session_id=${encodeURIComponent(sessionId)}`;
        const res = await fetch(url, {
          headers: { apikey: (supabase as any).supabaseKey || "", Authorization: `Bearer ${(supabase as any).supabaseKey || ""}` },
        });
        const json = await res.json();
        if (!cancelled) setSummary(json);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const greetingName = firstName(summary?.recipientName);

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-lg w-full bg-card border border-border/60 rounded-2xl shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-semibold mb-2">Payment received</p>
        <h1 className="font-display text-3xl text-foreground mb-4">
          {greetingName ? `Thank you, ${greetingName}` : "Thank you"}
        </h1>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your confirmation…
          </div>
        ) : summary?.found ? (
          <div className="mb-6 space-y-3">
            <p className="text-muted-foreground">
              Your payment has been processed securely. A receipt has been emailed to
              {summary.recipientEmail ? <> <strong className="text-foreground">{summary.recipientEmail}</strong></> : " you"},
              and our team will be in touch within one business day with next steps.
            </p>
            <div className="mx-auto max-w-sm rounded-xl border border-border/60 bg-muted/30 p-4 text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Order</p>
              <p className="text-sm font-medium text-foreground">
                {summary.productName || summary.description || "Cemetery plot payment"}
              </p>
              {summary.amountCents != null && (
                <p className="text-lg font-semibold text-foreground mt-1">
                  {fmt(summary.amountCents, summary.currency || "usd")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mb-6">
            Your payment has been processed securely. A receipt has been emailed to you.
          </p>
        )}

        {sessionId && (
          <p className="text-[11px] text-muted-foreground/70 mb-6">Confirmation ID: {sessionId.slice(-12)}</p>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
