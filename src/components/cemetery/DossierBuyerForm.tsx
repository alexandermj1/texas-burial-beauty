import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Phone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import singlePlotImg from "@/assets/property-types/single-plot.png";
import nicheImg from "@/assets/property-types/cremation-niche.png";
import cryptImg from "@/assets/property-types/mausoleum.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";

const TYPES = [
  { id: "plot", label: "Burial plot", desc: "Traditional in-ground burial", image: singlePlotImg },
  { id: "niche", label: "Niche", desc: "Cremated remains in a columbarium", image: nicheImg },
  { id: "crypt", label: "Crypt", desc: "Above-ground entombment", image: cryptImg },
  { id: "unsure", label: "Not sure yet", desc: "We'll help you decide", image: familyEstateImg },
];

const TIMELINES = [
  { id: "immediate", label: "Right away" },
  { id: "soon", label: "Within 6 months" },
  { id: "preneed", label: "Planning ahead" },
];

interface Props {
  cemeteryName: string;
  region: string;
}

/**
 * Compact buyer enquiry form, styled for the dossier pages. Writes to the same
 * contact_submissions pipeline as the full /buy concierge.
 */
const DossierBuyerForm = ({ cemeteryName, region }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyType: "plot",
    timeline: "soon",
    quantity: "1",
    name: "",
    phone: "",
    email: "",
    note: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const canSubmit = form.name.trim() && (form.phone.trim() || form.email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const typeLabel = TYPES.find((t) => t.id === form.propertyType)?.label ?? form.propertyType;
    const timelineLabel = TIMELINES.find((t) => t.id === form.timeline)?.label ?? form.timeline;
    const details = [
      `Cemetery: ${cemeteryName}`,
      `Property type: ${typeLabel}`,
      `Timeline: ${timelineLabel}`,
      `Spaces wanted: ${form.quantity || "1"}`,
      form.note.trim() ? `\nMessage from buyer:\n${form.note.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const submissionId = crypto.randomUUID();
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: submissionId,
      source: "cemetery_page_buyer",
      inquiry_channel: "texas_cemetery_page",
      state: "TX",
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      property_type: typeLabel,
      timeline: timelineLabel,
      region,
      cemetery: cemeteryName,
      details,
      message: details,
      created_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (error) {
      toast({
        title: "Something went wrong",
        description: "Please call us on (214) 230-4740.",
        variant: "destructive",
      });
      return;
    }

    const { error: emailError } = await supabase.functions.invoke("inquiry-notification-email", {
      body: { submission_id: submissionId },
    });
    if (emailError) console.warn("inquiry email failed", emailError);
    toast({ title: "Request sent", description: "We'll be in touch within one business day." });
    navigate("/thank-you");
  };

  const eyebrow = "text-[11px] tracking-[0.3em] uppercase text-[hsl(var(--gold))]";
  const inputCls =
    "w-full rounded-[10px] border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--ink))] px-4 py-3 text-[hsl(var(--parchment))] placeholder:text-[hsl(var(--parchment)/0.4)] focus:outline-none focus:border-[hsl(var(--gold))]";

  return (
    <div className="rounded-[20px] border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--ink-deep)/0.72)] p-7 md:p-10">
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 items-start">
        <div>
          <p className={eyebrow}>Looking to buy here</p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,2.8vw,2.5rem)] leading-tight text-[hsl(var(--parchment))]">
            Tell us what you need at {cemeteryName}.
          </h2>
          <p className="mt-4 text-[hsl(var(--parchment)/0.78)] leading-relaxed font-light">
            We hold private resale inventory and hear about spaces before they are advertised. Tell us the type of
            space and when you need it, and we'll come back with what is available — usually the same day.
          </p>
          <a
            href="tel:+12142304740"
            className="mt-6 inline-flex items-center gap-2.5 rounded-[10px] border border-[hsl(var(--gold)/0.55)] px-5 py-3 text-[15px] text-[hsl(var(--parchment))] hover:bg-[hsl(var(--gold)/0.14)] transition-colors"
          >
            <Phone className="w-4 h-4 text-[hsl(var(--gold))]" />
            (214) 230-4740
          </a>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <fieldset>
            <legend className={`${eyebrow} mb-3`}>Type of space</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TYPES.map((t) => {
                const active = form.propertyType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set("propertyType", t.id)}
                    aria-pressed={active}
                    className={`rounded-[12px] border overflow-hidden text-left transition-colors ${
                      active
                        ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.12)]"
                        : "border-[hsl(var(--gold)/0.25)] hover:border-[hsl(var(--gold)/0.6)]"
                    }`}
                  >
                    <img src={t.image} alt={t.label} loading="lazy" className="w-full h-20 object-contain p-2" />
                    <span className="block px-3 pb-3">
                      <span className="block text-sm text-[hsl(var(--parchment))]">{t.label}</span>
                      <span className="block text-[11px] leading-snug text-[hsl(var(--parchment)/0.55)]">{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid sm:grid-cols-[minmax(0,1fr)_110px] gap-3">
            <fieldset>
              <legend className={`${eyebrow} mb-3`}>When</legend>
              <div className="flex flex-wrap gap-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set("timeline", t.id)}
                    aria-pressed={form.timeline === t.id}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      form.timeline === t.id
                        ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.14)] text-[hsl(var(--parchment))]"
                        : "border-[hsl(var(--gold)/0.25)] text-[hsl(var(--parchment)/0.75)] hover:border-[hsl(var(--gold)/0.6)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="buyer-qty" className={`${eyebrow} block mb-3`}>
                Spaces
              </label>
              <input
                id="buyer-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <input
              aria-label="Your name"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              required
            />
            <input
              aria-label="Phone"
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputCls}
            />
            <input
              aria-label="Email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls}
            />
          </div>

          <textarea
            aria-label="Anything else"
            placeholder={`Anything specific — a garden or section at ${cemeteryName}?`}
            rows={2}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            className={inputCls}
          />

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--gold))] px-7 py-4 font-medium text-[hsl(var(--ink))] hover:bg-[hsl(var(--parchment))] transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Show me what's available
          </button>
          <p className="text-xs text-[hsl(var(--parchment)/0.5)]">
            No obligation. We never share your details with the cemetery or anyone else.
          </p>
        </form>
      </div>
    </div>
  );
};

export default DossierBuyerForm;
