import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Upload, Lock, X, FileText, User, MapPin, FileSignature, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import plumeriaCluster from "@/assets/flowers/plumeria-cluster.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import pinkBranch from "@/assets/flowers/pink-branch.png.asset.json";
import singlePlotImg from "@/assets/property-types/single-plot.png";
import nicheImg from "@/assets/property-types/cremation-niche.png";
import cryptImg from "@/assets/property-types/mausoleum.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";


interface UploadedFile {
  path: string;
  name: string;
  size: number;
  type: string;
}

const MAX_FILE_MB = 20;
const ALLOWED = /\.(pdf|png|jpe?g|webp|heic|tiff?|gif|docx?|txt)$/i;

const propertyTypeOptions = [
  { value: "Burial Plot(s)", label: "Burial Plot", desc: "Traditional in-ground burial", image: singlePlotImg },
  { value: "Niche(s)", label: "Niche", desc: "Cremated remains in a columbarium", image: nicheImg },
  { value: "Crypt / Mausoleum", label: "Crypt / Mausoleum", desc: "Above-ground entombment", image: cryptImg },
  { value: "Family Estate", label: "Family Estate", desc: "Larger multi-space property", image: familyEstateImg },
  { value: "Other", label: "Other", desc: "Tell us what you have", image: null as string | null },
];

const guarantees = [
  "100% free, no obligation",
  "Response within 24 hours",
  "You stay in control",
];

const steps = [
  { id: 0, label: "About you", icon: User },
  { id: 1, label: "Property", icon: MapPin },
  { id: 2, label: "Ownership", icon: FileSignature },
  { id: 3, label: "Documents", icon: Paperclip },
] as const;

const SellerQuoteForm = ({ defaultCemetery = "", compact = false, editorial = false }: { defaultCemetery?: string; compact?: boolean; editorial?: boolean } = {}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable id so all uploads land under one submission folder even before save.
  const [intakeId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cemetery: defaultCemetery,
    propertyType: "",
    propertyTypeOther: "",
    spaces: "",
    section: "",
    details: "",
    deedOwnerNames: "",
    deedOwnersStatus: "",
    relationshipToOwner: "",
    purchaseInfo: "",
    prepaidEndowmentInfo: "",
  });

  const handleFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setUploading(true);
    const next: UploadedFile[] = [];
    for (const f of Array.from(picked)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: `${f.name} is too large`, description: `Max ${MAX_FILE_MB}MB per file.`, variant: "destructive" });
        continue;
      }
      if (!ALLOWED.test(f.name)) {
        toast({ title: `${f.name} type not allowed`, description: "PDF, image, or document files only.", variant: "destructive" });
        continue;
      }
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `public-intake/${intakeId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("customer-files").upload(path, f, { contentType: f.type || undefined, upsert: false });
      if (upErr) {
        toast({ title: `Couldn't upload ${f.name}`, description: upErr.message, variant: "destructive" });
        continue;
      }
      next.push({ path, name: f.name, size: f.size, type: f.type });
    }
    setFiles(prev => [...prev, ...next]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from("customer-files").remove([path]);
    setFiles(prev => prev.filter(f => f.path !== path));
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.name.trim()) return "Please enter your name.";
      if (!form.email.trim()) return "Please enter your email.";
    }
    if (s === 1) {
      if (!form.cemetery.trim()) return "Please enter the cemetery name.";
      if (!form.propertyType) return "Please choose a property type.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    setStep(s => Math.min(s + 1, steps.length - 1));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-validate the gated steps before final send.
    for (const s of [0, 1]) {
      const err = validateStep(s);
      if (err) { setStep(s); toast({ title: err, variant: "destructive" }); return; }
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: intakeId,
      source: "seller_quote",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      cemetery: form.cemetery.trim(),
      property_type: form.propertyType === "Other" && form.propertyTypeOther.trim() ? form.propertyTypeOther.trim() : form.propertyType,
      spaces: form.spaces || null,
      section: form.section.trim() || null,
      details: form.details.trim() || null,
      deed_owner_names: form.deedOwnerNames.trim() || null,
      deed_owners_status: form.deedOwnersStatus || null,
      relationship_to_owner: form.relationshipToOwner.trim() || null,
      purchase_info: form.purchaseInfo.trim() || null,
      prepaid_endowment_info: form.prepaidEndowmentInfo.trim() || null,
      seller_attachments: files,
      created_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Something went wrong", description: "Please call or email us directly.", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error: emailError } = await supabase.functions.invoke("inquiry-notification-email", { body: { submission_id: intakeId } });
    if (emailError) console.warn("inquiry email failed", emailError);
    setForm({ name: "", email: "", phone: "", cemetery: "", propertyType: "", propertyTypeOther: "", spaces: "", section: "", details: "", deedOwnerNames: "", deedOwnersStatus: "", relationshipToOwner: "", purchaseInfo: "", prepaidEndowmentInfo: "" });
    setFiles([]);
    setLoading(false);
    navigate("/thank-you");
  };

  const inputCls =
    "w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
    "placeholder:text-muted-foreground transition-all " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

  const textareaCls =
    "w-full px-4 py-3 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
    "placeholder:text-muted-foreground transition-all resize-none " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

  const labelCls = "block text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2";

  const progress = ((step + 1) / steps.length) * 100;
  const isLast = step === steps.length - 1;

  // ============================================================
  // EDITORIAL MODE — one chapter at a time, magazine-style.
  // Reuses all state/handlers above; just a different presentation.
  // ============================================================
  if (editorial) {
    const sections: { chapter: string; title: React.ReactNode; helper: string; body: React.ReactNode; validate?: () => string | null }[] = [
      {
        chapter: "About you",
        title: <>First — what should we <span className="italic font-medium text-primary">call you?</span></>,
        helper: "Just your name for now. We'll ask about the plot in a moment.",
        validate: () => (!form.name.trim() ? "Please enter your name." : null),
        body: (
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jane Doe"
            maxLength={100}
            className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-3xl md:text-5xl text-foreground placeholder:text-foreground/25 placeholder:italic py-3"
          />
        ),
      },
      {
        chapter: "About you",
        title: <>Where should we send your <span className="italic font-medium text-primary">valuation?</span></>,
        helper: "Email is required. A phone number helps but isn't.",
        validate: () => (!form.email.trim() ? "Please enter your email." : null),
        body: (
          <div className="space-y-8">
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Email</label>
              <input
                autoFocus type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" maxLength={255}
                className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl md:text-3xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Phone <span className="normal-case tracking-normal italic text-foreground/45">— optional</span></label>
              <input
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567" maxLength={20}
                className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl md:text-3xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2"
              />
            </div>
          </div>
        ),
      },
      {
        chapter: "The property",
        title: <>Which <span className="italic font-medium text-primary">cemetery</span> is it in?</>,
        helper: "Just the cemetery name and city — we'll match it to our records.",
        validate: () => (!form.cemetery.trim() ? "Please enter the cemetery name." : null),
        body: (
          <input
            autoFocus value={form.cemetery} onChange={(e) => setForm({ ...form, cemetery: e.target.value })}
            placeholder="e.g. Restland Memorial Park, Dallas" maxLength={200}
            className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl md:text-4xl text-foreground placeholder:text-foreground/25 placeholder:italic py-3"
          />
        ),
      },
      {
        chapter: "The property",
        title: <>And what <span className="italic font-medium text-primary">kind</span> of property?</>,
        helper: "Pick a type, tell us how many spaces, and the section if you know it.",
        validate: () => {
          if (!form.propertyType) return "Please choose a property type.";
          if (form.propertyType === "Other" && !form.propertyTypeOther.trim()) return "Please tell us what kind of property.";
          return null;
        },
        body: (
          <div className="space-y-7">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {propertyTypeOptions.map((t) => {
                const active = form.propertyType === t.value;
                return (
                  <button type="button" key={t.value} onClick={() => setForm({ ...form, propertyType: t.value })}
                    className={`group relative text-left rounded-2xl border overflow-hidden transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                        : "border-border/60 bg-background hover:border-primary/50 hover:bg-primary/[0.03]"
                    }`}>
                    <div className="aspect-[4/3] w-full flex items-center justify-center bg-[hsl(var(--sand-light))]/60 overflow-hidden">
                      {t.image ? (
                        <img src={t.image} alt="" className="w-full h-full object-contain p-3 mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <span className="font-display italic text-4xl text-foreground/40">?</span>
                      )}
                    </div>
                    <div className="px-3 py-2.5 border-t border-border/40">
                      <div className={`text-sm font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}>{t.label}</div>
                      <div className="text-[11px] text-foreground/55 leading-snug mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {form.propertyType === "Other" && (
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Tell us what you have</label>
                <input autoFocus value={form.propertyTypeOther} onChange={(e) => setForm({ ...form, propertyTypeOther: e.target.value })}
                  placeholder="e.g. Lawn crypt, veterans niche, scattering garden…" maxLength={150}
                  className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2" />
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3"># of spaces</label>
                <input type="number" min={1} max={20} value={form.spaces} onChange={(e) => setForm({ ...form, spaces: e.target.value })}
                  placeholder="2"
                  className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Section / Lot <span className="normal-case tracking-normal italic text-foreground/45">— optional</span></label>
                <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="Garden of Peace, Lot 14" maxLength={100}
                  className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2" />
              </div>
            </div>
          </div>
        ),
      },
      {
        chapter: "Ownership",
        title: <>Who is on the <span className="italic font-medium text-primary">deed?</span></>,
        helper: "These help us confirm ownership. Leave blank if you're not sure — we'll follow up.",
        body: (
          <div className="space-y-7">
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Names on the deed</label>
              <input value={form.deedOwnerNames} onChange={(e) => setForm({ ...form, deedOwnerNames: e.target.value })}
                placeholder="e.g. John A. Smith and Mary B. Smith" maxLength={300}
                className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-xl md:text-2xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2" />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Are owners living?</label>
                <select value={form.deedOwnersStatus} onChange={(e) => setForm({ ...form, deedOwnersStatus: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-xl text-foreground py-2 cursor-pointer">
                  <option value="">Select…</option>
                  <option value="All living">All living</option>
                  <option value="Some living, some deceased">Some living, some deceased</option>
                  <option value="All deceased">All deceased</option>
                  <option value="Unsure">Unsure</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Your relationship</label>
                <input value={form.relationshipToOwner} onChange={(e) => setForm({ ...form, relationshipToOwner: e.target.value })}
                  placeholder="Daughter, Spouse, Executor" maxLength={150}
                  className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-xl text-foreground placeholder:text-foreground/25 placeholder:italic py-2" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Deed records <span className="normal-case tracking-normal italic text-foreground/45">— optional</span></label>
              <textarea value={form.purchaseInfo} onChange={(e) => setForm({ ...form, purchaseInfo: e.target.value })}
                placeholder="When was it purchased, for what amount, and what records do you have?" rows={2} maxLength={1000}
                className="w-full bg-transparent border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none text-base text-foreground placeholder:text-foreground/40 italic resize-none py-2" />
            </div>
          </div>
        ),
      },
      {
        chapter: "Anything else",
        title: <>Last thing — anything <span className="italic font-medium text-primary">helpful?</span></>,
        helper: "Tell us anything else and (optionally) attach a deed or photo. Then we're done.",
        body: (
          <div className="space-y-7">
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Prepaid endowment / service charges <span className="normal-case tracking-normal italic text-foreground/45">— can increase valuation</span></label>
              <textarea value={form.prepaidEndowmentInfo} onChange={(e) => setForm({ ...form, prepaidEndowmentInfo: e.target.value })}
                placeholder="Endowment care, opening/closing fees, vaults, markers…" rows={2} maxLength={1000}
                className="w-full bg-transparent border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none text-base text-foreground placeholder:text-foreground/40 italic resize-none py-2" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-foreground/55 font-bold mb-3">Anything else we should know</label>
              <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder="Reason for selling, preferred timeline, questions…" rows={3} maxLength={1000}
                className="w-full bg-transparent border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none text-base text-foreground placeholder:text-foreground/40 italic resize-none py-2" />
            </div>
            <div>
              <label htmlFor="seller-attachments-ed"
                className="flex items-center gap-3 w-full px-4 py-4 rounded-xl border border-dashed border-foreground/25 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  {uploading ? "Uploading…" : "Attach a deed, receipt or photo "}
                  <span className="italic text-foreground/55">— optional</span>
                </span>
                <input ref={fileInputRef} id="seller-attachments-ed" type="file" multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.tif,.tiff,.gif,.doc,.docx,.txt,image/*,application/pdf"
                  className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
              </label>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f) => (
                    <li key={f.path} className="flex items-center gap-2 text-xs text-foreground/70">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <button type="button" onClick={() => removeFile(f.path)} className="hover:text-destructive" aria-label={`Remove ${f.name}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-start gap-2 text-[11px] text-foreground/55 leading-relaxed pt-1">
              <Lock className="w-3 h-3 mt-0.5 text-primary shrink-0" />
              <span>Confidential — files upload to our private broker portal. Never shared or indexed.</span>
            </div>
          </div>
        ),
      },
    ];

    const totalEd = sections.length;
    const current = sections[step] ?? sections[0];
    const isLastEd = step === totalEd - 1;

    const goNext = () => {
      const err = current.validate?.();
      if (err) { toast({ title: err, variant: "destructive" }); return; }
      setStep((s) => Math.min(s + 1, totalEd - 1));
    };
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      if (e.key === "Enter" && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        if (isLastEd) {
          // submit
          (e.currentTarget.closest("form") as HTMLFormElement | null)?.requestSubmit();
        } else {
          goNext();
        }
      }
    };

    return (
      <form id="quote-form" onSubmit={handleSubmit} onKeyDown={onKeyDown} className="relative">
        {/* Chapter tag */}
        <div className="flex items-center gap-3 mb-7">
          <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-display italic text-base flex items-center justify-center shadow-sm">
            {step + 1}
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent">{current.chapter}</span>
          <span className="ml-auto text-[10px] tracking-[0.25em] uppercase font-bold text-foreground/40">
            {String(step + 1).padStart(2, "0")} <span className="italic font-normal">of</span> {String(totalEd).padStart(2, "0")}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-tight mb-4">
              {current.title}
            </h2>
            <p className="text-sm md:text-base text-foreground/65 leading-relaxed mb-10 max-w-xl">{current.helper}</p>

            <div className="mb-10">{current.body}</div>
          </motion.div>
        </AnimatePresence>

        {/* Footer: OK button + thin progress */}
        <div className="flex items-center gap-5 flex-wrap">
          {isLastEd ? (
            <button type="submit" disabled={loading}
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-medium text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-primary/30">
              {loading ? "Submitting…" : "Send my valuation request"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button type="button" onClick={goNext}
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-medium text-sm tracking-wide hover:opacity-90 transition-all shadow-md shadow-primary/20">
              OK <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
          <span className="text-xs text-foreground/55">
            press <kbd className="font-mono font-bold text-foreground/80">Enter</kbd> ↵
          </span>
          {step > 0 && (
            <button type="button" onClick={goBack}
              className="ml-auto text-xs text-foreground/55 hover:text-foreground transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          )}
        </div>

        {/* Thin progress line */}
        <div className="mt-8 h-px w-full bg-foreground/10 relative overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-primary"
            initial={false}
            animate={{ width: `${((step + 1) / totalEd) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </form>
    );
  }


  return (
    <section
      className={
        compact
          ? ""
          : "relative py-20 md:py-28 overflow-hidden bg-[hsl(var(--sand-light))]"
      }
      id="quote-form"
    >
      {!compact && (
        <>
          {/* Layered botanical background */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--terracotta) / 0.4) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[hsl(var(--sage-light))]/70 to-transparent pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[hsl(var(--terracotta-light))]/30 to-transparent pointer-events-none"
          />

          {/* Botanical illustrations */}
          <motion.img
            src={bananaLeaf.url}
            alt=""
            aria-hidden
            initial={{ opacity: 0, x: -40, rotate: -20 }}
            whileInView={{ opacity: 0.45, x: 0, rotate: -14 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="hidden md:block absolute -left-44 top-20 w-[28rem] pointer-events-none select-none"
          />
          <motion.img
            src={palmFan.url}
            alt=""
            aria-hidden
            initial={{ opacity: 0, x: 40, rotate: 12 }}
            whileInView={{ opacity: 0.35, x: 0, rotate: 8 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="hidden lg:block absolute -right-32 bottom-16 w-[24rem] pointer-events-none select-none"
          />
          <motion.img
            src={hibiscusCoral.url}
            alt=""
            aria-hidden
            initial={{ opacity: 0, y: -20, rotate: 18 }}
            whileInView={{ opacity: 0.9, y: 0, rotate: 12 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="hidden md:block absolute right-6 lg:right-24 top-8 w-44 lg:w-56 pointer-events-none select-none"
          />
          <motion.img
            src={pinkBranch.url}
            alt=""
            aria-hidden
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.65, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="hidden md:block absolute left-8 bottom-8 w-40 lg:w-52 pointer-events-none select-none -rotate-6"
          />
          <motion.img
            src={plumeriaCluster.url}
            alt=""
            aria-hidden
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 0.7, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="md:hidden absolute -right-10 top-4 w-36 pointer-events-none select-none"
          />
        </>
      )}

      <div className={compact ? "" : "relative container mx-auto px-6"}>
        {/* Centered intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-primary/40" />
            <p className="text-primary font-semibold text-[10px] tracking-[0.3em] uppercase">
              Free Valuation
            </p>
            <span className="h-px w-8 bg-primary/40" />
          </div>
          <h2 className="font-display text-4xl md:text-6xl text-foreground leading-[1.05] mb-5 tracking-tight">
            Get your{" "}
            <span className="italic text-primary">free valuation.</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-light leading-relaxed">
            Four quick steps. Takes about two minutes — we'll respond within 24 hours.
          </p>

          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
            {guarantees.map((g) => (
              <li key={g} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                {g}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Card wrapper with offset decorative layer for stand-out */}
        <div className="max-w-4xl mx-auto relative">
          {/* Decorative offset glows */}
          <div aria-hidden className="hidden md:block absolute -inset-4 rounded-[2.25rem] bg-gradient-to-br from-primary/20 via-accent/10 to-terracotta/15 blur-2xl opacity-80 -z-10" />
          <div aria-hidden className="hidden md:block absolute -bottom-6 -right-6 w-40 h-40 rounded-full bg-accent/15 blur-3xl -z-10" />
          <div aria-hidden className="hidden md:block absolute -top-6 -left-6 w-40 h-40 rounded-full bg-primary/15 blur-3xl -z-10" />

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative bg-background/95 backdrop-blur-md rounded-[2rem] border border-border/70 shadow-2xl shadow-foreground/10 overflow-hidden ring-1 ring-foreground/5"
          >


            {/* Stepper header */}
            <div className="px-6 md:px-10 pt-7 pb-5 border-b border-border/40">
              <div className="flex items-center justify-between mb-4">
                <ol className="flex items-center gap-2 sm:gap-4 flex-1">
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const active = i === step;
                    const done = i < step;
                    return (
                      <li key={s.id} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => i < step && setStep(i)}
                          disabled={i > step}
                          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all border ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30 scale-110"
                              : done
                              ? "bg-primary/15 text-primary border-primary/30 cursor-pointer hover:bg-primary/25"
                              : "bg-muted text-muted-foreground border-border/60"
                          }`}
                          aria-label={`Step ${i + 1}: ${s.label}`}
                        >
                          {done ? <Check className="w-4 h-4" strokeWidth={3} /> : <Icon className="w-4 h-4" />}
                        </button>
                        <div className="hidden sm:flex flex-col min-w-0">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Step {i + 1}</span>
                          <span className={`text-xs font-medium truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                          <div className="hidden sm:block flex-1 h-px bg-border/60 mx-1" />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
              {/* Progress bar (mobile + universal) */}
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Step body */}
            <div className="px-6 md:px-10 py-8 md:py-10 min-h-[360px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  {step === 0 && (
                    <div>
                      <h3 className="font-display text-2xl text-foreground mb-1">A bit about you</h3>
                      <p className="text-sm text-muted-foreground mb-6">So we know who to reach out to with your valuation.</p>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Full name</label>
                          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" maxLength={100} />
                        </div>
                        <div>
                          <label className={labelCls}>Email</label>
                          <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" maxLength={255} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Phone <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— optional</span></label>
                          <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" maxLength={20} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div>
                      <h3 className="font-display text-2xl text-foreground mb-1">Your property</h3>
                      <p className="text-sm text-muted-foreground mb-6">Where is it and what kind of property is it?</p>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Cemetery name</label>
                          <input className={inputCls} value={form.cemetery} onChange={(e) => setForm({ ...form, cemetery: e.target.value })} placeholder="e.g. Restland Memorial Park, Dallas" maxLength={200} />
                        </div>
                        <div>
                          <label className={labelCls}>Property type</label>
                          <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className={inputCls + " cursor-pointer"}>
                            <option value="">Select...</option>
                            {propertyTypeOptions.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Number of spaces</label>
                          <input type="number" min={1} max={20} className={inputCls} value={form.spaces} onChange={(e) => setForm({ ...form, spaces: e.target.value })} placeholder="e.g. 2" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Section / Lot # <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— if known</span></label>
                          <input className={inputCls} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. Garden of Peace, Lot 14" maxLength={100} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h3 className="font-display text-2xl text-foreground mb-1">Ownership &amp; deed</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        These help us confirm ownership and prepare an accurate valuation. Leave blank if you're not sure — we'll follow up.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Names of all owners listed on the deed</label>
                          <input className={inputCls} value={form.deedOwnerNames} onChange={(e) => setForm({ ...form, deedOwnerNames: e.target.value })} placeholder="e.g. John A. Smith and Mary B. Smith" maxLength={300} />
                        </div>
                        <div>
                          <label className={labelCls}>Are the plot owners currently living?</label>
                          <select value={form.deedOwnersStatus} onChange={(e) => setForm({ ...form, deedOwnersStatus: e.target.value })} className={inputCls + " cursor-pointer"}>
                            <option value="">Select...</option>
                            <option value="All living">All living</option>
                            <option value="Some living, some deceased">Some living, some deceased</option>
                            <option value="All deceased">All deceased</option>
                            <option value="Unsure">Unsure</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Your relationship to the owner(s)</label>
                          <input className={inputCls} value={form.relationshipToOwner} onChange={(e) => setForm({ ...form, relationshipToOwner: e.target.value })} placeholder="e.g. Daughter, Spouse, Executor" maxLength={150} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Deed / ownership records<span className="text-muted-foreground normal-case tracking-normal text-[10px]"> — describe what you have</span></label>
                          <textarea value={form.purchaseInfo} onChange={(e) => setForm({ ...form, purchaseInfo: e.target.value })} placeholder="When was it purchased, for what amount, and what records do you have?" rows={3} maxLength={1000} className={textareaCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Prepaid endowment care or service charges<span className="text-muted-foreground normal-case tracking-normal text-[10px]"> — optional, can increase valuation</span></label>
                          <textarea value={form.prepaidEndowmentInfo} onChange={(e) => setForm({ ...form, prepaidEndowmentInfo: e.target.value })} placeholder="List any prepaid items such as endowment care, opening/closing fees, vaults, markers or service charges." rows={3} maxLength={1000} className={textareaCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Additional details</label>
                          <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Reason for selling, preferred timeline, anything else we should know…" rows={3} maxLength={1000} className={textareaCls} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h3 className="font-display text-2xl text-foreground mb-1">Attach documents</h3>
                      <p className="text-sm text-muted-foreground mb-5">Optional — helpful but not required. You can always send them later.</p>

                      <div className="flex items-start gap-2 mb-4 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl p-3">
                        <Lock className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                        <p className="leading-relaxed">
                          <span className="font-medium text-foreground">Confidential &amp; secure.</span>{" "}
                          Files upload directly to our private broker portal. Only our team can see them — never shared, indexed, or sent over email. PDF, JPG, PNG, HEIC, or DOC up to {MAX_FILE_MB}MB each.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Helpful to attach: the deed or certificate of ownership, original purchase records, endowment care receipts, or photos of the plot.
                      </p>

                      <label
                        htmlFor="seller-attachments"
                        className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer text-center"
                      >
                        <Upload className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {uploading ? "Uploading…" : "Click to choose files or drop here"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">You can add multiple files</span>
                        <input
                          ref={fileInputRef}
                          id="seller-attachments"
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.tif,.tiff,.gif,.doc,.docx,.txt,image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFiles(e.target.files)}
                          disabled={uploading}
                        />
                      </label>

                      {files.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {files.map((f) => (
                            <li key={f.path} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground truncate">{f.name}</p>
                                <p className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(0)} KB · uploaded</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(f.path)}
                                className="text-muted-foreground hover:text-destructive p-1"
                                aria-label={`Remove ${f.name}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Mini review */}
                      <div className="mt-6 rounded-xl bg-muted/30 border border-border/50 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Quick review</p>
                        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="text-foreground truncate">{form.name || "—"}</dd></div>
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="text-foreground truncate">{form.email || "—"}</dd></div>
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cemetery</dt><dd className="text-foreground truncate">{form.cemetery || "—"}</dd></div>
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Type</dt><dd className="text-foreground truncate">{form.propertyType || "—"}</dd></div>
                        </dl>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            <div className="px-6 md:px-10 py-5 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <span className="text-[11px] text-muted-foreground hidden sm:block">
                Step {step + 1} of {steps.length}
              </span>

              {isLast ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-primary/30"
                >
                  {loading ? "Submitting…" : "Request my free valuation"}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm tracking-wide hover:opacity-90 transition-all shadow-md shadow-primary/20"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </motion.form>

          <p className="text-[11px] text-muted-foreground/70 text-center mt-4">
            No spam. No pressure. We respond within 24 hours.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SellerQuoteForm;
