import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => { document.title = "Payment received — Texas Cemetery Brokers"; }, []);

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-lg w-full bg-card border border-border/60 rounded-2xl shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-semibold mb-2">Payment received</p>
        <h1 className="font-display text-3xl text-foreground mb-4">Thank you</h1>
        <p className="text-muted-foreground mb-6">
          Your payment has been processed securely. A receipt has been emailed to you, and our team will be in
          touch within one business day with next steps.
        </p>
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
