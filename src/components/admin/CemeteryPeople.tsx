// Counselors & people attached to a cemetery profile.
// Each person can be emailed directly from the cemetery panel — the composer
// sends through the same gmail-action edge function used everywhere else, and
// past messages to/from that address are shown as a thread underneath.
import { useEffect, useMemo, useState } from "react";
import { Users, Plus, Pencil, Trash2, Mail, Phone, Save, X, MessagesSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { softDelete } from "@/lib/softDelete";
import { isOutgoing } from "@/lib/emailReply";
import InlineEmailComposer from "./InlineEmailComposer";

interface Person {
  id: string;
  cemetery_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

interface EmailRow {
  id: string;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  received_at: string;
  snippet: string | null;
  body_text: string | null;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
}

const blankDraft = { name: "", role: "", email: "", phone: "", notes: "" };

export default function CemeteryPeople({
  cemeteryId,
  cemeteryName,
}: {
  cemeteryId: string;
  cemeteryName: string;
}) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...blankDraft });
  const [saving, setSaving] = useState(false);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [threadFor, setThreadFor] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cemetery_people" as any)
      .select("*")
      .eq("cemetery_id", cemeteryId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setPeople(((data as any[]) || []) as Person[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cemeteryId]);

  const startAdd = () => { setDraft({ ...blankDraft }); setEditingId(null); setAdding(true); };
  const startEdit = (p: Person) => {
    setDraft({ name: p.name, role: p.role ?? "", email: p.email ?? "", phone: p.phone ?? "", notes: p.notes ?? "" });
    setEditingId(p.id);
    setAdding(false);
  };
  const cancel = () => { setAdding(false); setEditingId(null); setDraft({ ...blankDraft }); };

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      cemetery_id: cemeteryId,
      name: draft.name.trim(),
      role: draft.role.trim() || null,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("cemetery_people" as any).update(payload).eq("id", editingId)
      : await supabase.from("cemetery_people" as any).insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    cancel();
    load();
  };

  const remove = async (p: Person) => {
    if (!window.confirm(`Remove ${p.name} from ${cemeteryName}?`)) return;
    const { error } = await softDelete("cemetery_people", p.id);
    if (error) {
      toast({ title: "Couldn't remove", description: (error as any).message, variant: "destructive" });
      return;
    }
    setPeople((cur) => cur.filter((x) => x.id !== p.id));
  };

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
          Counselors & people
        </span>
        <span className="text-[10px] text-muted-foreground/70 tabular-nums">{people.length}</span>
        <button
          onClick={adding ? cancel : startAdd}
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
        >
          {adding ? <><X className="w-3 h-3" /> Cancel</> : <><Plus className="w-3 h-3" /> Add person</>}
        </button>
      </div>

      {(adding || editingId) && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Name" value={draft.name} onChange={(v) => setDraft(d => ({ ...d, name: v }))} />
          <Field label="Role / title" value={draft.role} onChange={(v) => setDraft(d => ({ ...d, role: v }))} placeholder="Family service counselor" />
          <Field label="Email" value={draft.email} onChange={(v) => setDraft(d => ({ ...d, email: v }))} type="email" />
          <Field label="Phone" value={draft.phone} onChange={(v) => setDraft(d => ({ ...d, phone: v }))} />
          <div className="sm:col-span-2">
            <Field label="Notes" value={draft.notes} onChange={(v) => setDraft(d => ({ ...d, notes: v }))} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button onClick={cancel} className="px-3 py-1.5 rounded-full text-xs border border-border hover:bg-muted/50">Cancel</button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading people…</p>
      ) : people.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">
          No counselors saved yet — add the people you deal with at {cemeteryName} so you can email them straight from here.
        </p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id} className="rounded-lg border border-border/60 bg-background p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {p.name}
                    {p.role && <span className="text-muted-foreground font-normal"> · {p.role}</span>}
                  </p>
                  <div className="mt-0.5 space-y-0.5 text-[11px] text-muted-foreground">
                    {p.email && (
                      <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {p.email}</div>
                    )}
                    {p.phone && (
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {p.phone}</div>
                    )}
                    {p.notes && <div className="italic">{p.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.email && (
                    <>
                      <button
                        onClick={() => { setComposeFor(composeFor === p.id ? null : p.id); setThreadFor(null); }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary text-primary-foreground hover:opacity-90"
                        title={`Email ${p.name}`}
                      >
                        <Mail className="w-3 h-3" /> {composeFor === p.id ? "Close" : "Email"}
                      </button>
                      <button
                        onClick={() => { setThreadFor(threadFor === p.id ? null : p.id); setComposeFor(null); }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-border hover:bg-muted/50"
                        title="Show past emails with this person"
                      >
                        <MessagesSquare className="w-3 h-3" /> Thread
                      </button>
                    </>
                  )}
                  <button onClick={() => startEdit(p)} className="p-1 rounded hover:bg-muted/60" title="Edit">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => remove(p)} className="p-1 rounded hover:bg-destructive/10" title="Remove">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>

              {composeFor === p.id && p.email && (
                <div className="mt-2">
                  <InlineEmailComposer
                    to={p.email}
                    recipientName={p.name}
                    defaultSubject={`${cemeteryName} — Texas Cemetery Brokers`}
                    sendLabel="Send email"
                    onSent={() => { setComposeFor(null); setThreadFor(p.id); }}
                    onCancel={() => setComposeFor(null)}
                  />
                </div>
              )}

              {threadFor === p.id && p.email && <PersonThread email={p.email} name={p.name} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PersonThread({ email, name }: { email: string; name: string }) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<EmailRow | null>(null);

  const load = async () => {
    const addr = email.trim().toLowerCase();
    const { data } = await supabase
      .from("email_messages" as any)
      .select("id, subject, from_email, from_name, to_email, received_at, snippet, body_text, gmail_thread_id, gmail_message_id")
      .or(`from_email.ilike.%${addr}%,to_email.ilike.%${addr}%`)
      .order("received_at", { ascending: false })
      .limit(30);
    setRows(((data as any[]) || []) as EmailRow[]);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [email]);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  return (
    <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-2 space-y-1.5">
      {loading && <p className="text-[11px] text-muted-foreground">Loading messages…</p>}
      {empty && <p className="text-[11px] text-muted-foreground">No emails with {name} yet.</p>}
      {rows.map((e) => {
        const out = isOutgoing(e.from_email);
        const body = (e.body_text && e.body_text.trim()) || e.snippet || "";
        return (
          <div key={e.id} className={`rounded-md border px-2.5 py-1.5 text-[11px] ${out ? "bg-primary/5 border-primary/20" : "bg-card border-border/50"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full ${out ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"}`}>
                {out ? "Sent" : "Received"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(e.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <button
                onClick={() => setReplyTo(replyTo?.id === e.id ? null : e)}
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground text-background hover:opacity-90"
              >
                {replyTo?.id === e.id ? "Close" : "Reply"}
              </button>
            </div>
            <p className="mt-1 font-medium text-foreground/90 truncate">{e.subject || "(no subject)"}</p>
            {body && <p className="mt-0.5 text-muted-foreground line-clamp-2 whitespace-pre-wrap">{body}</p>}
            {replyTo?.id === e.id && (
              <div className="mt-2">
                <InlineEmailComposer
                  to={out ? (e.to_email || email) : (e.from_email || email)}
                  recipientName={name}
                  defaultSubject={e.subject ? (e.subject.toLowerCase().startsWith("re:") ? e.subject : `Re: ${e.subject}`) : ""}
                  threadId={e.gmail_thread_id}
                  inReplyToGmailId={e.gmail_message_id}
                  sendLabel="Send reply"
                  onSent={() => { setReplyTo(null); load(); }}
                  onCancel={() => setReplyTo(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}
