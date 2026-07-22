import { useEffect } from "react";
import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentCancelled() {
  useEffect(() => { document.title = "Payment cancelled — Texas Cemetery Brokers"; }, []);

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-lg w-full bg-card border border-border/60 rounded-2xl shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-9 h-9 text-amber-600" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-semibold mb-2">Payment cancelled</p>
        <h1 className="font-display text-3xl text-foreground mb-4">No charge made</h1>
        <p className="text-muted-foreground mb-6">
          You closed checkout before completing payment. No card was charged. If this was unexpected, you can
          reopen your original payment link from the email we sent — it stays active for 30 days.
        </p>
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
