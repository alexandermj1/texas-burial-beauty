import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Result {
  ok?: boolean;
  alreadyActive?: boolean;
  recipientName?: string | null;
  recipientEmail?: string | null;
  cemetery?: string | null;
  error?: string;
}

export default function SelectStarter() {
  const [params] = useSearchParams();
  const tx = params.get("tx");
  const [state, setState] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Confirm Starter listing — Texas Cemetery Brokers"; }, []);

  const activate = async () => {
    if (!tx) { setState({ error: "Missing selection reference." }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate-starter-listing", {
        body: { transactionId: tx },
      });
      if (error) setState({ error: String(error.message || error) });
      else setState(data as Result);
    } catch (e: any) {
      setState({ error: String(e?.message ?? e) });
    } finally {
      setLoading(false);
    }
  };

  const firstName = (state?.recipientName || "").trim().split(/\s+/)[0] || "";
  const done = !!state?.ok;
  const isErr = !loading && state?.error;

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-lg w-full bg-card border border-border/60 rounded-2xl shadow-sm p-10 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isErr ? "bg-red-50" : "bg-emerald-50"}`}>
          {loading ? (
            <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
          ) : isErr ? (
            <AlertCircle className="w-9 h-9 text-red-600" />
          ) : (
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          )}
        </div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-semibold mb-2">
          {isErr ? "Selection error" : done ? "Starter listing activated" : "Confirm your selection"}
        </p>
        <h1 className="font-display text-3xl text-foreground mb-4">
          {loading ? "Activating…" : isErr ? "We couldn't activate this link" : done ? (firstName ? `Thank you, ${firstName}` : "Thank you") : "Select the Starter listing"}
        </h1>

        {isErr ? (
          <p className="text-muted-foreground mb-6">{state?.error}</p>
        ) : done ? (
          <div className="mb-6 space-y-3">
            <p className="text-muted-foreground">
              Your <strong className="text-foreground">Starter listing</strong>
              {state?.cemetery ? <> for your property at <strong className="text-foreground">{state.cemetery}</strong></> : null} is now active.
              {state?.alreadyActive ? " (Already recorded — no changes made.)" : ""}
            </p>
            <p className="text-muted-foreground">
              Our next step is to send your Exclusive Sales Agreement to sign. Watch your inbox — it will arrive shortly.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground mb-6">
            Click below to confirm you would like to move forward with the <strong className="text-foreground">Starter listing</strong> option ($0 upfront). We'll then send your Exclusive Sales Agreement to sign.
          </p>
        )}

        {done || isErr ? (
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Return home
          </Link>
        ) : (
          <button
            onClick={activate}
            disabled={loading}
            className="inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Activating…" : "Confirm Starter listing"}
          </button>
        )}
      </div>
    </main>
  );
}
