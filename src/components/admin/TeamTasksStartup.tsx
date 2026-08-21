// Shown once a day when the CRM is opened: your outstanding items from the
// shared team list, in a classic to-do layout. Ticking an item asks for
// confirmation, then stamps it complete and drops it off the list.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ListTodo, Check, ArrowRight, X, CalendarDays, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cleanDisplayName } from "@/lib/displayName";

interface Task {
  id: string;
  title: string;
  detail: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  created_by_name: string | null;
  due_date: string | null;
  priority: string;
}

const seenKey = (uid: string) => `tcb_tasks_seen_${uid}_${new Date().toISOString().slice(0, 10)}`;

const TeamTasksStartup = ({ onOpenList }: { onOpenList: () => void }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const myName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Someone";

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && localStorage.getItem(seenKey(user.id))) return;
    (async () => {
      const { data } = await supabase
        .from("team_tasks" as any)
        .select("id, title, detail, assigned_to, assigned_name, created_by_name, due_date, priority")
        .eq("done", false)
        .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
        .order("due_date", { ascending: true, nullsFirst: false });
      const list = ((data as any[]) || []) as Task[];
      if (list.length > 0) { setTasks(list); setOpen(true); }
    })();
  }, [user]);

  const dismiss = () => {
    if (user) try { localStorage.setItem(seenKey(user.id), "1"); } catch {}
    setOpen(false);
  };

  const complete = async (t: Task) => {
    await supabase
      .from("team_tasks" as any)
      .update({ done: true, done_at: new Date().toISOString(), done_by_name: myName })
      .eq("id", t.id);
    setConfirmId(null);
    setTasks((prev) => {
      const next = prev.filter((x) => x.id !== t.id);
      if (next.length === 0) dismiss();
      return next;
    });
  };

  if (!open || typeof document === "undefined") return null;

  const today = new Date().toISOString().slice(0, 10);

  return createPortal(
    <div className="fixed inset-0 z-[9997] bg-foreground/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />
        <div className="px-6 pt-5 pb-3 flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ListTodo className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Team list</p>
            <h2 className="text-xl font-serif text-foreground leading-snug">Good to see you, {myName}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.length} item{tasks.length === 1 ? "" : "s"} outstanding. Tick one off once it's actually done.
            </p>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <ul className="px-6 pb-2 max-h-[50vh] overflow-y-auto divide-y divide-border/50">
          {tasks.map((t) => {
            const overdue = !!t.due_date && t.due_date < today;
            const confirming = confirmId === t.id;
            return (
              <li key={t.id} className="py-3 flex items-start gap-3">
                <button
                  onClick={() => setConfirmId(confirming ? null : t.id)}
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                    confirming ? "border-emerald-500 text-emerald-600" : "border-border hover:border-primary"
                  }`}
                  title="Mark as done"
                >
                  {confirming && <Check className="w-3 h-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  {t.detail && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{t.detail}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {t.due_date && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        overdue ? "bg-rose-500/10 text-rose-600 border-rose-500/30" : "bg-background text-muted-foreground border-border"
                      }`}>
                        <CalendarDays className="w-2.5 h-2.5" /> {overdue ? "Overdue · " : "Due "}{t.due_date}
                      </span>
                    )}
                    {t.priority === "high" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40">Priority</span>
                    )}
                    {t.assigned_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <User className="w-2.5 h-2.5" /> {t.assigned_name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">Added by {t.created_by_name || "team"}</span>
                  </div>
                  {confirming && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => complete(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white"
                      >
                        <Check className="w-3 h-3" /> Confirm complete
                      </button>
                      <button onClick={() => setConfirmId(null)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-6 py-4 border-t border-border/60 bg-muted/30 flex items-center justify-end gap-2">
          <button onClick={dismiss} className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground">Later today</button>
          <button
            onClick={() => { dismiss(); onOpenList(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
          >
            Open full list <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TeamTasksStartup;
