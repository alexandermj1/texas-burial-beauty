import { motion } from "framer-motion";
import { ArrowRight, Check, Upload, Lock, X, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  path: string;
  name: string;
  size: number;
  type: string;
}

const MAX_FILE_MB = 20;
const ALLOWED = /\.(pdf|png|jpe?g|webp|heic|tiff?|gif|docx?|txt)$/i;

const propertyTypes = ["Burial Plot(s)", "Niche(s)", "Crypt / Mausoleum", "Family Estate", "Other"];

const guarantees = [
  "100% free, no obligation",
  "Response within 24 hours",
  "You stay in control",
];

const SellerQuoteForm = ({ defaultCemetery = "", compact = false }: { defaultCemetery?: string; compact?: boolean } = {}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable id so all uploads land under one submission folder even before save.
  const [intakeId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cemetery: defaultCemetery,
    propertyType: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.cemetery.trim() || !form.propertyType) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: intakeId,
      source: "seller_quote",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      cemetery: form.cemetery.trim(),
      property_type: form.propertyType,
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
    setForm({ name: "", email: "", phone: "", cemetery: "", propertyType: "", spaces: "", section: "", details: "", deedOwnerNames: "", deedOwnersStatus: "", relationshipToOwner: "", purchaseInfo: "", prepaidEndowmentInfo: "" });
    setFiles([]);
    setLoading(false);
    navigate("/thank-you");
  };

  const inputCls =
    "w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
    "placeholder:text-muted-foreground transition-all " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

  const labelCls = "block text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2";

  return (
    <section className={compact ? "" : "pt-8 pb-20 md:pt-12 md:pb-24 bg-gradient-warm"} id="quote-form">
      <div className={compact ? "" : "container mx-auto px-6"}>
        {/* Centered intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">
            Free Valuation
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground leading-tight mb-5">
            Get your
            <br />
            <span className="italic text-foreground/70">free valuation.</span>
          </h2>
          <p className="text-muted-foreground text-lg font-light leading-relaxed">
            Tell us about your property and we'll respond within 24 hours with a
            quote showing your net proceeds if we list it for you.
          </p>

          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
            {guarantees.map((g) => (
              <li key={g} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                {g}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Form card */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-3xl mx-auto bg-background rounded-3xl border border-border shadow-xl p-8 md:p-12 relative overflow-hidden"
        >
          {/* Accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary/60" />
          {/* Section: You */}
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">
              About you
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Full name</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Doe"
                  maxLength={100}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  maxLength={255}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Phone <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— optional</span></label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  maxLength={20}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40 my-10" />

          {/* Section: Property */}
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">
              Your property
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className={labelCls}>Cemetery name</label>
                <input
                  className={inputCls}
                  value={form.cemetery}
                  onChange={(e) => setForm({ ...form, cemetery: e.target.value })}
                  placeholder="e.g. Restland Memorial Park, Dallas"
                  maxLength={200}
                />
              </div>
              <div>
                <label className={labelCls}>Property type</label>
                <select
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  className={inputCls + " cursor-pointer"}
                >
                  <option value="">Select...</option>
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Number of spaces</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputCls}
                  value={form.spaces}
                  onChange={(e) => setForm({ ...form, spaces: e.target.value })}
                  placeholder="e.g. 2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Section / Lot # <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— if known</span></label>
                <input
                  className={inputCls}
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. Garden of Peace, Lot 14"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40 my-10" />

          {/* Section: Ownership & deed */}
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">
              Ownership &amp; deed
            </p>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              These details help us confirm ownership and prepare an accurate valuation.
              If you don't have an answer right now, leave it blank — we can follow up.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className={labelCls}>Names of all owners listed on the deed</label>
                <input
                  className={inputCls}
                  value={form.deedOwnerNames}
                  onChange={(e) => setForm({ ...form, deedOwnerNames: e.target.value })}
                  placeholder="e.g. John A. Smith and Mary B. Smith"
                  maxLength={300}
                />
              </div>
              <div>
                <label className={labelCls}>Are the plot owners currently living?</label>
                <select
                  value={form.deedOwnersStatus}
                  onChange={(e) => setForm({ ...form, deedOwnersStatus: e.target.value })}
                  className={inputCls + " cursor-pointer"}
                >
                  <option value="">Select...</option>
                  <option value="All living">All living</option>
                  <option value="Some living, some deceased">Some living, some deceased</option>
                  <option value="All deceased">All deceased</option>
                  <option value="Unsure">Unsure</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Your relationship to the owner(s)</label>
                <input
                  className={inputCls}
                  value={form.relationshipToOwner}
                  onChange={(e) => setForm({ ...form, relationshipToOwner: e.target.value })}
                  placeholder="e.g. Daughter, Spouse, Executor"
                  maxLength={150}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Deed / ownership records
                  <span className="text-muted-foreground normal-case tracking-normal text-[10px]"> — describe what you have</span>
                </label>
                <textarea
                  value={form.purchaseInfo}
                  onChange={(e) => setForm({ ...form, purchaseInfo: e.target.value })}
                  placeholder="When was it purchased, for what amount, and what records do you have? You can attach the deed/certificate of ownership and any purchase records securely below."
                  rows={3}
                  maxLength={1000}
                  className={
                    "w-full px-4 py-3 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
                    "placeholder:text-muted-foreground transition-all resize-none " +
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Prepaid endowment care or service charges
                  <span className="text-muted-foreground normal-case tracking-normal text-[10px]"> — optional, can increase valuation</span>
                </label>
                <textarea
                  value={form.prepaidEndowmentInfo}
                  onChange={(e) => setForm({ ...form, prepaidEndowmentInfo: e.target.value })}
                  placeholder="List any prepaid items such as endowment care, opening/closing fees, vaults, markers or service charges. Evidence of prepaid items often increases the valuation to a higher tier."
                  rows={3}
                  maxLength={1000}
                  className={
                    "w-full px-4 py-3 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
                    "placeholder:text-muted-foreground transition-all resize-none " +
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Additional details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="Reason for selling, preferred timeline, anything else we should know…"
                  rows={4}
                  maxLength={1000}
                  className={
                    "w-full px-4 py-3 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
                    "placeholder:text-muted-foreground transition-all resize-none " +
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  }
                />
              </div>
            </div>
          </div>


          {/* Submit */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50 shadow-soft"
            >
              {loading ? "Submitting…" : "Request my free valuation"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-[11px] text-muted-foreground/70">
              No spam. No pressure. We respond within 24 hours.
            </p>
          </div>
        </motion.form>
      </div>
    </section>
  );
};

export default SellerQuoteForm;
