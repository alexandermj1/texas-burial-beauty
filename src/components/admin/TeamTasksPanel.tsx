// Shared team to-do list. Everyone on the team sees the same list; admins and
// staff can add, edit, tick off and remove items. Assigning a task drops a
// friendly notification in that person's bell (it stays in their list).
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Check, ListTodo, CalendarDays, User, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cleanDisplayName } from "@/lib/displayName";

interface Task {
  id: string;
  title: string;
  detail: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  created_by_name: string | null;
  done: boolean;
  done_at: string | null;
  done_by_name: string | null;
  due_date: string | null;
  priority: string;
  created_at: string;
}

interface Teammate { id: string; name: string; email: string }

const PRIORITIES = [
  { key: "normal", label: "Normal", cls: "bg-muted text-muted-foreground border-border" },
  { key: "high", label: "Priority", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" },
];

const TeamTasksPanel = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);

  const myName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Someone";

  const load = async () => {
    const { data } = await supabase
      .from("team_tasks" as any)
      .select("*")
      .order("done", { ascending: true })
      .order("created_at", { ascending: false });
    setTasks(((data as any[]) || []) as Task[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      setTeam(
        ((data as any[]) || [])
          .map((p) => ({
            id: p.id,
            name: cleanDisplayName(p.full_name) || (p.email ? p.email.split("@")[0] : "Teammate"),
            email: p.email || "",
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    })();
    const ch = supabase
      .channel("team_tasks_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_tasks" }, () => load())
      .subscribe();
    return () => { ch.unsubscribe(); supabase.removeChannel(ch); };
  }, []);

  const open = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.done), [tasks]);

  const addTask = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const mate = team.find((t) => t.id === assignee);
    const { error } = await supabase.from("team_tasks" as any).insert({
      title: title.trim(),
      detail: detail.trim() || null,
      assigned_to: assignee || null,
      assigned_name: mate?.name ?? null,
      created_by: user?.id ?? null,
      created_by_name: myName,
      due_date: due || null,
      priority,
    });
    if (error) {
      setSaving(false);
      toast({ title: "Couldn't add task", description: error.message, variant: "destructive" });
      return;
    }
    if (assignee && assignee !== user?.id) {
      await supabase.from("user_notifications" as any).insert({
        user_id: assignee,
        sender_id: user?.id,
        title: `${myName} added something to your list`,
        body: `${title.trim()}${due ? ` · due ${due}` : ""}${detail.trim() ? `\n\n${detail.trim()}` : ""}\n\nNo rush — it lives on the shared team list whenever you get a moment.`,
        link_url: "/admin?tab=tasks",
        source_type: "team_task",
      });
    }
    setTitle(""); setDetail(""); setDue(""); setAssignee(""); setPriority("normal");
    setSaving(false);
    load();
  };

  // Completing is a deliberate act: the checkbox asks for confirmation first,
  // then the item leaves the open list and is stamped with who/when.
  const completeTask = async (t: Task) => {
    await supabase
      .from("team_tasks" as any)
      .update({ done: true, done_at: new Date().toISOString(), done_by_name: myName })
      .eq("id", t.id);
    setConfirmTask(null);
    toast({ title: "Marked complete", description: `${t.title} · ${new Date().toLocaleString()}` });
    load();
  };

  const reopenTask = async (t: Task) => {
    await supabase
      .from("team_tasks" as any)
      .update({ done: false, done_at: null, done_by_name: null })
      .eq("id", t.id);
    load();
  };

  const toggleDone = async (t: Task) => {
    if (t.done) return reopenTask(t);
    setConfirmTask(t);
  };


  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    await supabase
      .from("team_tasks" as any)
      .update({ title: editTitle.trim(), detail: editDetail.trim() || null })
      .eq("id", id);
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("team_tasks" as any).delete().eq("id", id);
    load();
  };

  const row = (t: Task) => {
    const p = PRIORITIES.find((x) => x.key === t.priority) ?? PRIORITIES[0];
    const editing = editingId === t.id;
    return (
      <li key={t.id} className={`rounded-xl border p-3 ${t.done ? "bg-muted/30 border-border/50" : "bg-card border-border"}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleDone(t)}
            className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
              t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-primary"
            }`}
            title={t.done ? "Mark as not done" : "Mark as done"}
          >
            {t.done && <Check className="w-3 h-3" />}
          </button>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-sm"
                />
                <textarea
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  rows={2}
                  placeholder="Notes (optional)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(t.id)} className="px-3 py-1 rounded-full text-[11px] font-medium bg-primary text-primary-foreground">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded-full text-[11px] text-muted-foreground">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                {t.detail && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.detail}</p>}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {t.assigned_name && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <User className="w-2.5 h-2.5" /> {t.assigned_name}
                    </span>
                  )}
                  {t.due_date && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                      <CalendarDays className="w-2.5 h-2.5" /> {t.due_date}
                    </span>
                  )}
                  {t.priority !== "normal" && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.cls}`}>{p.label}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {t.done
                      ? `Done${t.done_by_name ? ` by ${t.done_by_name}` : ""}`
                      : `Added by ${t.created_by_name || "team"}`}
                  </span>
                </div>
              </>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setEditingId(t.id); setEditTitle(t.title); setEditDetail(t.detail || ""); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => remove(t.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center"><ListTodo className="w-4 h-4" /></span>
        <div>
          <h2 className="font-display text-xl text-foreground">Team list</h2>
          <p className="text-[11px] text-muted-foreground">One shared list — anyone on the team can add, edit or tick things off.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) addTask(); }}
          placeholder="What needs doing?"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          placeholder="Any helpful context (optional)"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs"
          >
            <option value="">For anyone</option>
            {team.map((t) => <option key={t.id} value={t.id}>For {t.name}</option>)}
          </select>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs"
          />
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPriority(p.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                priority === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={addTask}
            disabled={!title.trim() || saving}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> {saving ? "Adding…" : "Add to list"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading list…</p>
      ) : (
        <>
          {open.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nothing on the list right now.</p>
          ) : (
            groupTasks(open).map((g) => (
              <div key={g.label} className="space-y-2">
                <p className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${g.tone}`}>
                  {g.label} <span className="text-muted-foreground font-normal">({g.items.length})</span>
                </p>
                <ul className="space-y-2">{g.items.map(row)}</ul>
              </div>
            ))
          )}

          {done.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {showDone ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {showDone ? "Hide" : "Show"} completed ({done.length})
              </button>
              {showDone && <ul className="space-y-2 mt-3">{done.map(row)}</ul>}
            </div>
          )}
        </>
      )}

      {confirmTask && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={() => setConfirmTask(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-display text-lg text-foreground">Mark this as done?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                It will move off the open list and be recorded as completed by {myName} on {new Date().toLocaleDateString()}.
              </p>
            </div>
            <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">{confirmTask.title}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmTask(null)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Not yet</button>
              <button
                onClick={() => completeTask(confirmTask)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-emerald-600 text-white"
              >
                <Check className="w-3.5 h-3.5" /> Yes, it's done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default TeamTasksPanel;
