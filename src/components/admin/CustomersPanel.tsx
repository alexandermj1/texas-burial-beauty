// Unified customer profiles tab — every interaction with a person in one place.
// Profiles are clustered server-side (email > phone > fuzzy name) by the
// customer-rebuild edge function. Click "Refresh" after a new submission lands.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail, Phone, RefreshCw, Search, Activity, FileText, Inbox as InboxIcon, MessageSquare, User, Paperclip, Upload, Trash2, Download } from "lucide-react";
import CustomerFiles from "./CustomerFiles";
import CustomerKindBadge, { resolveKind } from "./CustomerKindBadge";
import CustomerNotes from "./CustomerNotes";
import { useAuth } from "@/hooks/useAuth";

interface CustomerProfile {
  id: string;
  primary_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  alt_emails: string[] | null;
  alt_phones: string[] | null;
  customer_kind: string | null;
  pinned_notes: string | null;
  last_interaction_at: string | null;
  created_at: string;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const CustomersPanel = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, sRes, eRes, aRes, qRes] = await Promise.all([
      supabase.from("customer_profiles" as any).select("*").order("last_interaction_at", { ascending: false, nullsFirst: false }),
      supabase.from("contact_submissions" as any).select("id,name,email,phone,source,customer_kind,cemetery,message,details,created_at,handled,handled_by_name,handled_at,customer_profile_id"),
      supabase.from("email_messages" as any).select("id,from_name,from_email,subject,snippet,received_at,customer_profile_id"),
      supabase.from("customer_activity_log" as any).select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("quote_estimates" as any).select("id,cemetery,property_type,estimated_mid,confidence_label,outcome,created_at,customer_profile_id").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setProfiles(pRes.data as any);
    if (sRes.data) setSubmissions(sRes.data as any);
    if (eRes.data) setEmails(eRes.data as any);
    if (aRes.data) setActivity(aRes.data as any);
    if (qRes.data) setQuotes(qRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-rebuild", { body: {} });
      if (error) throw error;
      toast({ title: "Profiles rebuilt", description: `${data?.profiles_created ?? 0} customers · ${data?.submissions_linked ?? 0} submissions linked` });
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Rebuild failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setRebuilding(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p =>
      [p.primary_name, p.primary_email, p.primary_phone, ...(p.alt_emails ?? []), ...(p.alt_phones ?? [])]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    );
  }, [profiles, search]);

  const selected = filtered.find(p => p.id === selectedId) || filtered[0] || null;

  const customerSubs = useMemo(() => submissions.filter(s => s.customer_profile_id === selected?.id), [submissions, selected]);
  const customerEmails = useMemo(() => emails.filter(e => e.customer_profile_id === selected?.id), [emails, selected]);
  const customerActivity = useMemo(() => activity.filter(a => a.customer_profile_id === selected?.id), [activity, selected]);
  const customerQuotes = useMemo(() => quotes.filter(q => q.customer_profile_id === selected?.id), [quotes, selected]);

  useEffect(() => {
    setNotesDraft(selected?.pinned_notes ?? "");
  }, [selected?.id]);

  const saveNotes = async () => {
    if (!selected) return;
    if (notesDraft === (selected.pinned_notes ?? "")) return;
    const { error } = await supabase.from("customer_profiles" as any).update({ pinned_notes: notesDraft }).eq("id", selected.id);
    if (error) {
      toast({ title: "Could not save notes", description: error.message, variant: "destructive" });
      return;
    }
    setProfiles(prev => prev.map(p => p.id === selected.id ? { ...p, pinned_notes: notesDraft } : p));
    // Audit
    await supabase.from("customer_activity_log" as any).insert({
      customer_profile_id: selected.id,
      actor_user_id: user?.id ?? null,
      actor_name: user?.email ?? "admin",
      action_type: "note_added",
      action_summary: "Updated pinned notes",
      details: { length: notesDraft.length },
    });
    fetchAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or phone…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={async () => {
            const name = window.prompt("Customer name?");
            if (!name) return;
            const kind = window.prompt("Customer kind? Type: seller, buyer, or general", "general");
            const normKind = kind === "seller" || kind === "buyer" ? kind : "contact";
            const email = window.prompt("Email (optional)") || null;
            const phone = window.prompt("Phone (optional)") || null;
            const { error } = await supabase.from("customer_profiles" as any).insert({
              primary_name: name, primary_email: email, primary_phone: phone, customer_kind: normKind,
            });
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Customer added" });
            fetchAll();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
        >
          + Add customer
        </button>
        <button
          onClick={handleRebuild}
          disabled={rebuilding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? "animate-spin" : ""}`} />
          {rebuilding ? "Rebuilding…" : "Rebuild profiles"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* List */}
        <div className="lg:col-span-4 bg-card rounded-xl border border-border/50 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <User className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No customer profiles yet.</p>
              <button onClick={handleRebuild} className="text-xs text-primary hover:underline">Build profiles from existing submissions</button>
            </div>
          ) : (
            filtered.map((p, i) => {
              const isActive = selected?.id === p.id;
              const kind = resolveKind(p.customer_kind, null);
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors flex items-start gap-3 ${
                    isActive ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <CustomerKindBadge kind={kind} variant="dot" className="mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{p.primary_name || "Unknown"}</p>
                      <CustomerKindBadge kind={kind} size="xs" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.primary_email || p.primary_phone || "No contact info"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      Last interaction · {formatDate(p.last_interaction_at)}
                    </p>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-8">
          {!selected ? (
            <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-sm text-muted-foreground">
              Select a customer to view their full history.
            </div>
          ) : (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border/50 p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <CustomerKindBadge kind={resolveKind(selected.customer_kind, null)} />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Customer</span>
                  </div>
                  <h3 className="font-display text-2xl text-foreground">{selected.primary_name || "Unknown"}</h3>
                  <p className="text-xs text-muted-foreground mt-1">First seen {formatDate(selected.created_at)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{customerSubs.length} submission{customerSubs.length === 1 ? "" : "s"}</p>
                  <p>{customerEmails.length} email{customerEmails.length === 1 ? "" : "s"}</p>
                  <p>{customerQuotes.length} quote{customerQuotes.length === 1 ? "" : "s"}</p>
                </div>
              </div>

              {/* Contacts */}
              <div className="flex flex-wrap gap-2">
                {selected.primary_email && (
                  <a href={`mailto:${selected.primary_email}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90">
                    <Mail className="w-3.5 h-3.5" /> {selected.primary_email}
                  </a>
                )}
                {selected.primary_phone && (
                  <a href={`tel:${selected.primary_phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-foreground text-background rounded-full text-xs font-medium hover:opacity-90">
                    <Phone className="w-3.5 h-3.5" /> {selected.primary_phone}
                  </a>
                )}
                {(selected.alt_emails ?? []).map(e => (
                  <span key={e} className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs">
                    <Mail className="w-3.5 h-3.5" /> {e} <span className="text-[10px] uppercase">alt</span>
                  </span>
                ))}
                {(selected.alt_phones ?? []).map(p => (
                  <span key={p} className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs">
                    <Phone className="w-3.5 h-3.5" /> {p} <span className="text-[10px] uppercase">alt</span>
                  </span>
                ))}
              </div>

              {/* Realtime collaborative notes */}
              <CustomerNotes customerId={selected.id} customerName={selected.primary_name} />

              {/* Files & documents */}
              <CustomerFiles customerId={selected.id} customerName={selected.primary_name} />

              {/* Activity timeline */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Activity log
                </p>
                {customerActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tracked actions yet. Actions taken on this customer (notes, status changes, quotes sent) will appear here.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {customerActivity.map((a: any) => (
                      <li key={a.id} className="text-xs flex items-start gap-2 border-l-2 border-primary/30 pl-3">
                        <div className="flex-1">
                          <p className="text-foreground">{a.action_summary}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {a.actor_name || "system"} · {formatDate(a.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Submissions */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Form submissions ({customerSubs.length})
                </p>
                {customerSubs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None.</p>
                ) : (
                  <ul className="space-y-2">
                    {customerSubs.map(s => (
                      <li key={s.id} className="bg-muted/40 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-medium text-foreground">{s.source} · {s.cemetery || "—"}</p>
                          <span className="text-[10px] text-muted-foreground">{formatDate(s.created_at)}</span>
                        </div>
                        {(s.message || s.details) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.message || s.details}</p>
                        )}
                        {s.handled_by_name && (
                          <p className="text-[10px] text-emerald-700 mt-1">Handled by {s.handled_by_name} · {formatDate(s.handled_at)}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Emails */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <InboxIcon className="w-3 h-3" /> Linked emails ({customerEmails.length})
                </p>
                {customerEmails.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No matched emails.</p>
                ) : (
                  <ul className="space-y-2">
                    {customerEmails.slice(0, 10).map(e => (
                      <li key={e.id} className="bg-muted/40 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-medium text-foreground truncate">{e.subject || "(no subject)"}</p>
                          <span className="text-[10px] text-muted-foreground">{formatDate(e.received_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{e.snippet}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quotes */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Quote estimates ({customerQuotes.length})
                </p>
                {customerQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No quotes generated yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {customerQuotes.map(q => (
                      <li key={q.id} className="bg-muted/40 rounded-lg p-3 border border-border/50 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">{q.cemetery} · {q.property_type || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Confidence: {q.confidence_label} · Status: {q.outcome}</p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600">${(q.estimated_mid ?? 0).toLocaleString()}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersPanel;
