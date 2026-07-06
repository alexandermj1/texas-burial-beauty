import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BRAND_UI, type MarketingBrand } from "@/lib/marketingBrands";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-unsubscribe`;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const brandParam = (params.get("brand") || "texas") as MarketingBrand;
  const brand = BRAND_UI[brandParam] || BRAND_UI.texas;

  const [state, setState] = useState<"loading" | "confirm" | "already" | "done" | "invalid">(
    "loading",
  );
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || token === "PREVIEW" || token === "TEST") {
      setState("invalid");
      return;
    }
    fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setState("invalid"); return; }
        setEmail(d.email || "");
        setState(d.alreadyUnsubscribed ? "already" : "confirm");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    const resp = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setSubmitting(false);
    if (resp.ok) setState("done");
  };

  const isBayer = brand.key === "bayer";
  const fontStack = isBayer
    ? "'Helvetica Neue', Helvetica, Arial, sans-serif"
    : "Georgia, serif";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isBayer ? "#f4f6fb" : "#f5efe6",
        fontFamily: fontStack,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          borderRadius: isBayer ? 8 : 0,
          boxShadow: isBayer
            ? "0 10px 30px rgba(30,58,138,0.1)"
            : "0 6px 20px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: brand.primary,
            padding: "36px 32px",
            textAlign: "center",
          }}
        >
          <img
            src={brand.logoUrl}
            alt={brand.name}
            style={{ width: 64, height: 64, objectFit: "contain", display: "inline-block" }}
          />
          <p
            style={{
              margin: "14px 0 0",
              color: isBayer ? "#c7d2fe" : "#f5efe6",
              fontSize: 11,
              letterSpacing: ".32em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {brand.name}
          </p>
        </div>
        <div style={{ padding: "36px 32px", color: "#0f172a" }}>
          {state === "loading" && <p>Checking your unsubscribe link…</p>}
          {state === "invalid" && (
            <>
              <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Link not valid</h1>
              <p style={{ color: "#475569", lineHeight: 1.6 }}>
                This unsubscribe link is invalid or has expired. If you'd still like to be
                removed from our list, please reply to any of our emails and we'll take care
                of it manually.
              </p>
            </>
          )}
          {state === "already" && (
            <>
              <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>You're already unsubscribed</h1>
              <p style={{ color: "#475569", lineHeight: 1.6 }}>
                {email} will no longer receive marketing emails from {brand.name}.
              </p>
            </>
          )}
          {state === "confirm" && (
            <>
              <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Unsubscribe from {brand.name}?</h1>
              <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 24px" }}>
                We'll stop sending marketing emails to <strong>{email}</strong>.
                Transactional messages (like replies to your inquiries) will still come through.
              </p>
              <button
                onClick={confirm}
                disabled={submitting}
                style={{
                  background: brand.primary,
                  color: brand.primaryFg,
                  border: "none",
                  padding: "14px 28px",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  borderRadius: isBayer ? 4 : 0,
                  cursor: submitting ? "wait" : "pointer",
                  textTransform: "uppercase",
                  fontFamily: fontStack,
                }}
              >
                {submitting ? "Unsubscribing…" : "Confirm unsubscribe"}
              </button>
            </>
          )}
          {state === "done" && (
            <>
              <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>You're unsubscribed</h1>
              <p style={{ color: "#475569", lineHeight: 1.6 }}>
                {email} will no longer receive marketing emails from {brand.name}. Sorry to see
                you go.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;
