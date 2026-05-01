// Admin view of inventory requests submitted by agents — items they want to sell
// that aren't currently in stock. Admin can mark sourcing/in_progress/fulfilled/declined
// and leave a response message visible to the agent.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Req {
  id: string;
  agent_id: string;
  agent_name: string | null;
  cemetery: string;
  property_type: string | null;
  spaces: number | null;
  section: string | null;
  target_price: number | null;
  buyer_context: string | null;
  notes: string | null;
  priority: string;
  status: string;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["open", "sourcing", "fulfilled", "declined"];

const InventoryRequestsPanel = () => {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [responseDraft, setResponseDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setReqs((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "fulfilled" || status === "declined") {
      patch.resolved_at = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) patch.resolved_by_user_id = user.id;
    }
    if (responseDraft[id]?.trim()) patch.admin_response = responseDraft[id].trim();
    const { error } = await supabase.from("inventory_requests" as any).update(patch).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Updated" });
    setResponseDraft(d => ({ ...d, [id]: "" }));
    load();
  };

  const filtered = filter === "all" ? reqs : reqs.filter(r => r.status === filter);

  if (loading) return <div className="text-center py-12 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Loading requests…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
            {s} {s !== "all" && `(${reqs.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No inventory requests in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-base text-foreground">{r.cemetery}</h3>
                    <StatusBadge status={r.status} />
                    {r.priority === "high" && <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">HIGH</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.property_type || "Any type"} · {r.spaces ?? 1} space{(r.spaces ?? 1) > 1 ? "s" : ""}
                    {r.section && ` · ${r.section}`}
                    {r.target_price && ` · target $${Number(r.target_price).toLocaleString()}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Requested by <span className="font-medium text-foreground">{r.agent_name || "Agent"}</span> · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {r.buyer_context && (
                    <div className="mt-3 text-sm text-foreground bg-muted/40 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Buyer context</p>
                      {r.buyer_context}
                    </div>
                  )}
                  {r.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Notes: {r.notes}</p>
                  )}
                  {r.admin_response && (
                    <div className="mt-3 text-sm text-foreground border-l-2 border-primary pl-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Admin response</p>
                      {r.admin_response}
                    </div>
                  )}
                </div>
              </div>

              {r.status !== "fulfilled" && r.status !== "declined" && (
                <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
                  <textarea
                    value={responseDraft[r.id] ?? ""}
                    onChange={e => setResponseDraft(d => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Optional reply to the agent…"
                    className="w-full min-h-[60px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.filter(s => s !== r.status).map(s => (
                      <button key={s} onClick={() => updateStatus(r.id, s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:bg-muted ${s === "fulfilled" ? "text-emerald-700" : s === "declined" ? "text-destructive" : "text-foreground"}`}>
                        Mark {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: any = {
    open: "bg-amber-100 text-amber-700",
    sourcing: "bg-blue-100 text-blue-700",
    fulfilled: "bg-emerald-100 text-emerald-700",
    declined: "bg-muted text-muted-foreground",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || "bg-muted"}`}>{status}</span>;
};

export default InventoryRequestsPanel;
