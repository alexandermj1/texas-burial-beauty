// Admin → Email Marketing tab.
// Brand switcher (Texas / Bayer) with three sub-tabs: Audience, Compose, Campaigns.
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Send, Loader2, Trash2, Search, Mail, Users, History, FileText, CheckCircle2, AlertCircle, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BRAND_UI, MARKETING_TEMPLATES, type MarketingBrand } from "@/lib/marketingBrands";
import BayerPurchaseOfferPanel from "./BayerPurchaseOfferPanel";

interface Contact {
  id: string;
  brand: MarketingBrand;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  last_sent_at: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  brand: MarketingBrand;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_opened: number;
  total_bounced: number;
  total_unsubscribed: number;
  sent_at: string | null;
  created_at: string;
}

type SubTab = "audience" | "compose" | "campaigns" | "offer";

const EmailMarketingPanel = () => {
  const { toast } = useToast();
  const [brand, setBrand] = useState<MarketingBrand>("texas");
  const [subTab, setSubTab] = useState<SubTab>("audience");
  const brandCfg = BRAND_UI[brand];

  return (
    <div className="space-y-6">
      {/* Brand switcher */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">Email Marketing</p>
            <h2 className="text-2xl font-serif mt-1">Brand campaigns</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload contacts, compose branded emails, and send from {brandCfg.name}.
            </p>
          </div>
          <div className="flex items-center gap-2 p-1 rounded-full bg-muted">
            {(["texas", "bayer"] as MarketingBrand[]).map((b) => {
              const cfg = BRAND_UI[b];
              const active = brand === b;
              return (
                <button
                  key={b}
                  onClick={() => setBrand(b)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    active ? "text-white shadow-md" : "text-foreground hover:bg-background"
                  }`}
                  style={active ? { background: cfg.primary } : {}}
                >
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex gap-1 border-b border-border flex-wrap">
          {([
            { key: "audience", label: "Audience", Icon: Users },
            { key: "compose", label: "Compose", Icon: Mail },
            { key: "campaigns", label: "Campaigns", Icon: History },
            ...(brand === "bayer" ? [{ key: "offer" as SubTab, label: "Purchase Offer", Icon: FileSignature }] : []),
          ] as { key: SubTab; label: string; Icon: any }[]).map(({ key, label, Icon }) => {
            const active = subTab === key;
            return (
              <button
                key={key}
                onClick={() => setSubTab(key)}
                className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  active
                    ? "border-current text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={active ? { borderColor: brandCfg.primary, color: brandCfg.primary } : {}}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {subTab === "audience" && <AudiencePanel brand={brand} />}
      {subTab === "compose" && <ComposePanel brand={brand} />}
      {subTab === "campaigns" && <CampaignsPanel brand={brand} />}
      {subTab === "offer" && brand === "bayer" && <BayerPurchaseOfferPanel />}

      {/* DNS setup reminder */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">One-time DNS setup for {brandCfg.name}</p>
            <p>
              Marketing sends require verifying <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono text-xs">{brandCfg.senderDomain}</code> in
              Resend. Add the SPF/DKIM records Resend gives you at your DNS registrar, then verify.
              Until verified, sends will fail with a "domain not verified" error.
            </p>
            <p className="mt-2">
              After you deploy, paste your <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono text-xs">resend-webhook</code> function URL into Resend → Webhooks
              so bounces / opens / unsubscribes flow back into these dashboards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- Audience ----------------
const AudiencePanel = ({ brand }: { brand: MarketingBrand }) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketing_contacts" as any)
      .select("*")
      .eq("brand", brand)
      .order("created_at", { ascending: false })
      .limit(2000);
    setContacts((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [brand]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) =>
      [c.email, c.first_name, c.last_name, c.company, c.city]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(s)),
    );
  }, [contacts, q]);

  const active = contacts.filter((c) => !c.unsubscribed_at && !c.bounced_at && !c.complained_at).length;
  const unsub = contacts.filter((c) => c.unsubscribed_at).length;

  const onFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        toast({ title: "No rows found in CSV", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("marketing-import-contacts", {
        body: { brand, rows },
      });
      if (error || (data as any)?.error) {
        toast({ title: "Import failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
        return;
      }
      toast({ title: "Imported", description: `${(data as any).imported} added / updated, ${(data as any).skipped} skipped.` });
      load();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    await supabase.from("marketing_contacts" as any).delete().eq("id", id);
    setContacts((p) => p.filter((c) => c.id !== id));
  };

  const toggleUnsub = async (c: Contact) => {
    const patch = c.unsubscribed_at ? { unsubscribed_at: null } : { unsubscribed_at: new Date().toISOString() };
    await supabase.from("marketing_contacts" as any).update(patch).eq("id", c.id);
    setContacts((p) => p.map((x) => (x.id === c.id ? { ...x, ...patch } as any : x)));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Stat label="Total" value={contacts.length} />
          <Stat label="Active" value={active} />
          <Stat label="Unsubscribed" value={unsub} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email, name, company…"
              className="pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background w-72"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? "Importing…" : "Upload CSV"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        CSV must have an <code className="px-1 py-0.5 bg-muted rounded">email</code> column. Optional: first_name, last_name, company, city, state, phone. Extra columns are stored as JSON metadata.
      </p>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Company</th>
              <th className="text-left px-3 py-2">City</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No contacts yet. Upload a CSV to get started.</td></tr>
            ) : filtered.slice(0, 500).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{c.email}</td>
                <td className="px-3 py-2">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-3 py-2">{c.company || "—"}</td>
                <td className="px-3 py-2">{c.city || "—"}</td>
                <td className="px-3 py-2">
                  {c.unsubscribed_at ? <Pill color="amber">Unsubscribed</Pill>
                    : c.bounced_at ? <Pill color="red">Bounced</Pill>
                    : c.complained_at ? <Pill color="red">Complained</Pill>
                    : <Pill color="green">Active</Pill>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => toggleUnsub(c)} className="text-xs text-muted-foreground hover:text-foreground mr-3">
                    {c.unsubscribed_at ? "Resubscribe" : "Unsubscribe"}
                  </button>
                  <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <p className="text-xs text-muted-foreground text-center">Showing first 500 of {filtered.length} matches — narrow with search.</p>
      )}
    </div>
  );
};

// ---------------- Compose ----------------
const ComposePanel = ({ brand }: { brand: MarketingBrand }) => {
  const { toast } = useToast();
  const brandCfg = BRAND_UI[brand];
  const templates = MARKETING_TEMPLATES.filter((t) => t.brand === brand);
  const [templateKey, setTemplateKey] = useState(templates[0]?.key || "");
  const tpl = templates.find((t) => t.key === templateKey) || templates[0];
  const [subject, setSubject] = useState(tpl?.defaultSubject || "");
  const [preheader, setPreheader] = useState(tpl?.defaultPreheader || "");
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [activeCount, setActiveCount] = useState<number>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // When the brand switches, snap the selected template back to that brand's first template
  useEffect(() => {
    const first = MARKETING_TEMPLATES.find((t) => t.brand === brand);
    if (first && first.key !== templateKey) {
      setTemplateKey(first.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  useEffect(() => {
    const t = MARKETING_TEMPLATES.find((x) => x.key === templateKey);
    if (t) { setSubject(t.defaultSubject); setPreheader(t.defaultPreheader); }
  }, [templateKey]);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("marketing_contacts" as any)
        .select("id", { count: "exact", head: true })
        .eq("brand", brand)
        .is("unsubscribed_at", null)
        .is("bounced_at", null)
        .is("complained_at", null);
      setActiveCount(count || 0);
    })();
  }, [brand]);

  const refreshPreview = async () => {
    if (!templateKey) return;
    setPreviewLoading(true);
    const { data, error } = await supabase.functions.invoke("marketing-preview", {
      body: { templateKey, subject, preheader },
    });
    setPreviewLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Preview failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setPreview({ html: (data as any).html, subject: (data as any).subject });
  };
  useEffect(() => { refreshPreview(); /* eslint-disable-next-line */ }, [templateKey, brand]);

  const sendTest = async () => {
    if (!testEmail.trim()) { toast({ title: "Enter an email to send the test to", variant: "destructive" }); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("marketing-send-test", {
      body: { templateKey, subject, preheader, toEmail: testEmail.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Test send failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Test sent", description: `Delivered to ${(data as any).sentTo}` });
  };

  const sendCampaign = async () => {
    setSending(true);
    setConfirmOpen(false);
    const { data, error } = await supabase.functions.invoke("marketing-send-campaign", {
      body: { brand, templateKey, subject, preheader },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Campaign queued", description: `Sending to ${(data as any).queued} contacts. Check Campaigns tab for progress.` });
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Template</label>
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-border bg-background"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={refreshPreview}
            className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-border bg-background" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Preheader</label>
          <textarea value={preheader} onChange={(e) => setPreheader(e.target.value)} onBlur={refreshPreview} rows={2}
            className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-border bg-background" />
          <p className="text-[10px] text-muted-foreground mt-1">Hidden preview text shown next to the subject in the inbox.</p>
        </div>
        <div className="rounded-lg p-3 text-xs" style={{ background: brandCfg.bgAccent, color: brandCfg.primary }}>
          <p className="font-semibold">Sends from</p>
          <p className="mt-0.5">{brandCfg.fromEmail}</p>
        </div>
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex gap-2">
            <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Your email for a test send"
              className="flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background" />
            <button onClick={sendTest} disabled={sending}
              className="px-3 py-2 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send test"}
            </button>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={sending || activeCount === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background: brandCfg.primary, color: brandCfg.primaryFg }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to {activeCount} active contacts
          </button>
          {activeCount === 0 && <p className="text-xs text-muted-foreground text-center">Upload contacts first.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>Live preview · Subject: <strong className="text-foreground">{preview?.subject || subject}</strong></span>
          </div>
          <button onClick={refreshPreview} className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
        </div>
        <div className="border border-border rounded-md overflow-hidden bg-white" style={{ height: 720 }}>
          {previewLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Rendering…
            </div>
          ) : preview ? (
            <iframe title="Email preview" srcDoc={preview.html} className="w-full h-full border-0" />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No preview yet.</div>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Send campaign?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will send the <strong>{tpl?.label}</strong> email from <strong>{brandCfg.fromEmail}</strong> to <strong>{activeCount}</strong> active contacts.
              Sends can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-sm rounded-md border border-border">Cancel</button>
              <button onClick={sendCampaign}
                className="px-4 py-2 text-sm rounded-md font-semibold"
                style={{ background: brandCfg.primary, color: brandCfg.primaryFg }}>
                Send to {activeCount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- Campaigns ----------------
const CampaignsPanel = ({ brand }: { brand: MarketingBrand }) => {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("marketing_campaigns" as any)
        .select("*")
        .eq("brand", brand)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [brand]);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Sent</th>
                <th className="text-left px-3 py-2">Subject</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Recipients</th>
                <th className="text-right px-3 py-2">Sent</th>
                <th className="text-right px-3 py-2">Opened</th>
                <th className="text-right px-3 py-2">Bounced</th>
                <th className="text-right px-3 py-2">Unsub</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{c.sent_at ? new Date(c.sent_at).toLocaleString() : new Date(c.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{c.subject}</td>
                  <td className="px-3 py-2">
                    {c.status === "sent" ? <Pill color="green">Sent</Pill>
                      : c.status === "sending" ? <Pill color="blue">Sending</Pill>
                      : c.status === "failed" ? <Pill color="red">Failed</Pill>
                      : <Pill color="gray">{c.status}</Pill>}
                  </td>
                  <td className="px-3 py-2 text-right">{c.total_recipients}</td>
                  <td className="px-3 py-2 text-right">{c.total_sent}</td>
                  <td className="px-3 py-2 text-right">{c.total_opened}</td>
                  <td className="px-3 py-2 text-right">{c.total_bounced}</td>
                  <td className="px-3 py-2 text-right">{c.total_unsubscribed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------- helpers ----------------
const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
    <p className="text-2xl font-serif">{value.toLocaleString()}</p>
  </div>
);

const Pill = ({ color, children }: { color: "green" | "amber" | "red" | "gray" | "blue"; children: React.ReactNode }) => {
  const map: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-muted text-muted-foreground",
    blue: "bg-blue-100 text-blue-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${map[color]}`}>{children}</span>;
};

// Minimal RFC-4180-ish CSV parser (handles quoted fields, commas in quotes).
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else { field += ch; }
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const known = new Set(["email", "first_name", "firstname", "fname", "last_name", "lastname", "lname", "company", "mortuary", "funeral_home", "organization", "city", "state", "phone", "telephone"]);
  return rows.slice(1).filter((r) => r.some((v) => v.trim())).map((r) => {
    const obj: Record<string, any> = { _extra: {} };
    header.forEach((h, idx) => {
      const val = (r[idx] || "").trim();
      if (!val) return;
      if (known.has(h)) obj[h] = val;
      else obj._extra[h] = val;
    });
    return obj;
  });
}

export default EmailMarketingPanel;
