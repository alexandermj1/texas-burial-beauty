import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, LogOut, Plus, MapPin, Building2, Save, CalendarDays, Clock, TrendingUp, Search, DollarSign, CheckCircle, Inbox, Mail, Trophy, Users, Calculator, Package, ClipboardList } from "lucide-react";
import AgentPerformancePanel from "@/components/admin/AgentPerformancePanel";
import CustomersPanel from "@/components/admin/CustomersPanel";
import QuoteEstimatorPanel from "@/components/admin/QuoteEstimatorPanel";
import InventoryRequestsPanel from "@/components/admin/InventoryRequestsPanel";
import CaliforniaInventoryPanel from "@/components/admin/CaliforniaInventoryPanel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { toast } from "@/hooks/use-toast";
import { bayCemeteries } from "@/data/cemeteries";
import SubmissionsPanel from "@/components/admin/SubmissionsPanel";
import InboxPanel from "@/components/admin/InboxPanel";

interface AdminListing {
  id: string;
  cemetery: string;
  city: string;
  plot_type: string;
  section: string;
  spaces: number;
  status: string;
  asking_price: number | null;
  cost_price: number | null;
  profit: number | null;
  photos: string[] | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

const plotTypeOptions = [
  "Single Plot", "Double Plot", "Companion Plot", "Niche", "Crypt",
  "Mausoleum", "Lawn Crypt", "Family Estate", "Veteran Single Plot",
  "Veteran Double Plot", "Veteran Companion Plot", "Cremation Niche"
];

const Admin = () => {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"listings" | "cemeteries" | "reservations" | "sales" | "submissions" | "inbox" | "performance" | "customers" | "quote_estimator" | "ca_inventory" | "inventory_requests">("listings");
  const [reservations, setReservations] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [agentProfiles, setAgentProfiles] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  // When admin clicks "Open customer" inside the Gmail inbox, this id flows into the
  // Submissions panel and auto-selects the matching customer.
  const [focusSubmissionId, setFocusSubmissionId] = useState<string | null>(null);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminListing>>({});

  // New cemetery form
  const [newCemetery, setNewCemetery] = useState({ name: "", city: "", region: "Peninsula & SF", address: "" });

  useEffect(() => {
    if (!authLoading && !adminLoading && user && isAdmin) {
      fetchAllListings();
    }
  }, [user, isAdmin, authLoading, adminLoading]);

  const fetchAllListings = async () => {
    const [listingsRes, reservationsRes, salesRes, submissionsRes] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("plot_reservations" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("sales" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("contact_submissions" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (listingsRes.data) setListings(listingsRes.data as any);
    if (salesRes.data) setSales(salesRes.data as any);
    if (submissionsRes.data) setSubmissions(submissionsRes.data as any);
    if (reservationsRes.data) {
      setReservations(reservationsRes.data as any);
      const allAgentIds = [
        ...new Set([
          ...(reservationsRes.data as any[]).map((r: any) => r.agent_id),
          ...((salesRes.data as any[]) || []).map((s: any) => s.agent_id),
        ]),
      ];
      if (allAgentIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", allAgentIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: any) => { map[p.id] = p.full_name || p.email || "Unknown"; });
          setAgentProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoginLoading(false);
  };

  const startEdit = (listing: AdminListing) => {
    setEditingId(listing.id);
    setEditForm({
      cemetery: listing.cemetery, city: listing.city, plot_type: listing.plot_type,
      section: listing.section, spaces: listing.spaces, asking_price: listing.asking_price,
      cost_price: listing.cost_price, profit: listing.profit, status: listing.status,
    });
  };

  const saveEdit = async (id: string) => {
    const profit = (editForm.asking_price || 0) - (editForm.cost_price || 0);
    const payload = { ...editForm, profit, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("listings").update(payload as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing updated" });
      setEditingId(null);
      fetchAllListings();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handlePayCommission = async (saleId: string, reservationId: string | null) => {
    await supabase.from("sales" as any).update({ commission_status: "paid" }).eq("id", saleId);
    if (reservationId) {
      await supabase.from("plot_reservations" as any).update({ commission_status: "paid" }).eq("id", reservationId);
    }
    toast({ title: "Commission marked as paid" });
    fetchAllListings();
  };

  const filteredListings = listings.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return l.cemetery.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) ||
      l.plot_type.toLowerCase().includes(q) || l.section.toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q);
  });

  const filteredCemeteries = bayCemeteries.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.region.toLowerCase().includes(q);
  });

  const inputClass = "px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const totalSalesProfit = sales.reduce((s: number, sale: any) => s + (sale.profit || 0), 0);
  const totalCommissions = sales.reduce((s: number, sale: any) => s + (sale.commission_amount || 0), 0);
  const pendingCommissions = sales.filter((s: any) => s.commission_status === "requested").reduce((sum: number, s: any) => sum + (s.commission_amount || 0), 0);

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar forceScrolled />
        <section className="pt-28 pb-16 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-8 shadow-soft w-full max-w-sm">
            <h1 className="font-display text-2xl text-foreground mb-1">Admin Login</h1>
            <p className="text-muted-foreground text-sm mb-6">Authorized personnel only</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={inputClass + " w-full"} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inputClass + " w-full"} />
              <button type="submit" disabled={loginLoading} className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {loginLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            {user && !isAdmin && (
              <p className="text-destructive text-xs mt-4 text-center">This account does not have admin access.</p>
            )}
          </motion.div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Admin Dashboard | Texas Cemetery Brokers" description="Internal admin." path="/admin" noindex />
      <Navbar forceScrolled />
      <section className="pt-28 pb-16">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
            </div>
            <button onClick={handleSignOut} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setTab("listings")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "listings" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              All Listings ({listings.length})
            </button>
            <button onClick={() => setTab("reservations")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "reservations" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <CalendarDays className="w-4 h-4 inline mr-1" /> Reservations ({reservations.filter(r => r.status === "active").length})
            </button>
            <button onClick={() => setTab("sales")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "sales" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <DollarSign className="w-4 h-4 inline mr-1" /> Sales & Commissions ({sales.length})
            </button>
            <button onClick={() => setTab("submissions")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "submissions" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Inbox className="w-4 h-4 inline mr-1" /> Submissions ({submissions.filter(s => !s.handled).length})
            </button>
            <button onClick={() => setTab("inbox")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "inbox" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Mail className="w-4 h-4 inline mr-1" /> Gmail Inbox
            </button>
            <button onClick={() => setTab("performance")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "performance" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Trophy className="w-4 h-4 inline mr-1" /> Agent Performance
            </button>
            <button onClick={() => setTab("customers")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "customers" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Users className="w-4 h-4 inline mr-1" /> Customers
            </button>
            <button onClick={() => setTab("quote_estimator")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "quote_estimator" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Calculator className="w-4 h-4 inline mr-1" /> Quote Estimator
            </button>
            <button onClick={() => setTab("velocity")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "velocity" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <TrendingUp className="w-4 h-4 inline mr-1" /> Inventory Velocity
            </button>
            <button onClick={() => setTab("ca_inventory")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "ca_inventory" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Package className="w-4 h-4 inline mr-1" /> California Inventory
            </button>
            <button onClick={() => setTab("cemeteries")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "cemeteries" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Building2 className="w-4 h-4 inline mr-1" /> Cemeteries
            </button>
          </div>

          {/* Search (hidden on inbox tab) */}
          {tab !== "inbox" && tab !== "performance" && tab !== "customers" && tab !== "quote_estimator" && tab !== "velocity" && tab !== "ca_inventory" && (
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={tab === "cemeteries" ? "Search cemeteries..." : "Search listings by cemetery, city, type..."}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {tab === "listings" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Total Listings</p>
                  <p className="text-2xl font-display text-foreground">{listings.length}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-2xl font-display text-primary">{listings.filter(l => l.status === "active").length}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Total Potential Profit</p>
                  <p className="text-2xl font-display text-emerald-600">${listings.filter(l => l.status === "active").reduce((s, l) => s + (l.profit || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Realized Profit</p>
                  <p className="text-2xl font-display text-emerald-600">${totalSalesProfit.toLocaleString()}</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {filteredListings.map((listing, i) => (
                    <motion.div key={listing.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="bg-card rounded-xl border border-border/50 overflow-hidden"
                    >
                      {editingId === listing.id ? (
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div><label className="text-xs text-muted-foreground">Cemetery</label><input value={editForm.cemetery || ""} onChange={e => setEditForm(p => ({ ...p, cemetery: e.target.value }))} className={inputClass + " w-full"} /></div>
                            <div><label className="text-xs text-muted-foreground">City</label><input value={editForm.city || ""} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className={inputClass + " w-full"} /></div>
                            <div><label className="text-xs text-muted-foreground">Plot Type</label><select value={editForm.plot_type || ""} onChange={e => setEditForm(p => ({ ...p, plot_type: e.target.value }))} className={inputClass + " w-full"}>{plotTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            <div><label className="text-xs text-muted-foreground">Section</label><input value={editForm.section || ""} onChange={e => setEditForm(p => ({ ...p, section: e.target.value }))} className={inputClass + " w-full"} /></div>
                            <div><label className="text-xs text-muted-foreground">Spaces</label><input type="number" min={1} value={editForm.spaces || 1} onChange={e => setEditForm(p => ({ ...p, spaces: parseInt(e.target.value) || 1 }))} className={inputClass + " w-full"} /></div>
                            <div><label className="text-xs text-muted-foreground">Asking Price ($)</label><input type="number" value={editForm.asking_price || ""} onChange={e => setEditForm(p => ({ ...p, asking_price: parseFloat(e.target.value) || null }))} className={inputClass + " w-full"} /></div>
                            <div><label className="text-xs text-muted-foreground">Our Cost ($)</label><input type="number" value={editForm.cost_price || ""} onChange={e => setEditForm(p => ({ ...p, cost_price: parseFloat(e.target.value) || null }))} className={inputClass + " w-full"} /></div>
                            <div><label className="text-xs text-muted-foreground">Status</label><select value={editForm.status || "active"} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className={inputClass + " w-full"}><option value="active">Active</option><option value="sold">Sold</option><option value="pending">Pending</option></select></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">Profit: <span className="text-emerald-600 font-semibold">${((editForm.asking_price || 0) - (editForm.cost_price || 0)).toLocaleString()}</span></p>
                            <div className="flex-1" />
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors">Cancel</button>
                            <button onClick={() => saveEdit(listing.id)} className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity"><Save className="w-3.5 h-3.5" /> Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-display text-base text-foreground truncate">{listing.cemetery}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${listing.status === "active" ? "bg-primary/10 text-primary" : listing.status === "sold" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{listing.status}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{listing.city} · {listing.plot_type} · {listing.section} · {listing.spaces} space{listing.spaces > 1 ? "s" : ""}</p>
                          </div>
                          <div className="hidden md:flex items-center gap-6 shrink-0">
                            <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ask</p><p className="text-sm font-medium text-foreground">{listing.asking_price ? `$${listing.asking_price.toLocaleString()}` : "—"}</p></div>
                            <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cost</p><p className="text-sm font-medium text-foreground">{listing.cost_price ? `$${listing.cost_price.toLocaleString()}` : "—"}</p></div>
                            <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Profit</p><p className="text-sm font-semibold text-emerald-600">{listing.profit ? `$${listing.profit.toLocaleString()}` : "—"}</p></div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEdit(listing)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(listing.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "reservations" && (
            <div className="space-y-3">
              {reservations.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">No reservations yet</div>
              ) : (
                reservations.map((res: any) => {
                  const listing = listings.find(l => l.id === res.listing_id);
                  const isExpired = new Date(res.expires_at) < new Date();
                  const isActive = res.status === "active" && !isExpired;
                  const isSold = res.status === "sold";
                  return (
                    <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`bg-card rounded-xl border p-5 ${isSold ? "border-emerald-300/50" : isActive ? "border-amber-300/50" : "border-border/50 opacity-60"}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-display text-base text-foreground">{listing?.cemetery || "Unknown"}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSold ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-amber-100 text-amber-700" : res.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                              {isSold ? "Sold" : isActive ? "Active Hold" : res.status === "cancelled" ? "Cancelled" : "Expired"}
                            </span>
                          </div>
                          {listing && <p className="text-sm text-muted-foreground">{listing.city} · {listing.plot_type} · {listing.section}</p>}
                          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                            <span className="inline-flex items-center gap-1 text-foreground font-medium">Agent: {agentProfiles[res.agent_id] || res.agent_id.slice(0, 8)}</span>
                            <span className="inline-flex items-center gap-1 text-primary"><CalendarDays className="w-3.5 h-3.5" /> {new Date(res.showing_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {res.showing_time}</span>
                          </div>
                          {res.notes && <p className="text-xs text-muted-foreground mt-1">Notes: {res.notes}</p>}
                        </div>
                        {listing && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-foreground">{listing.asking_price ? `$${listing.asking_price.toLocaleString()}` : "—"}</p>
                            <p className="text-sm font-semibold text-emerald-600 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {listing.profit ? `+$${listing.profit.toLocaleString()}` : "—"}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {tab === "sales" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-display text-foreground">{sales.length}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-display text-emerald-600">${totalSalesProfit.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Total Commissions</p>
                  <p className="text-2xl font-display text-foreground">${totalCommissions.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Pending Commission Requests</p>
                  <p className="text-2xl font-display text-amber-600">${pendingCommissions.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                {sales.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">No sales recorded yet</div>
                ) : (
                  sales.map((sale: any) => {
                    const listing = listings.find(l => l.id === sale.listing_id);
                    return (
                      <motion.div key={sale.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-emerald-300/50 p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-display text-base text-foreground">{listing?.cemetery || "Unknown"}</h3>
                            {listing && <p className="text-sm text-muted-foreground">{listing.city} · {listing.plot_type} · {listing.section}</p>}
                            <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                              <span className="text-foreground font-medium">Agent: {agentProfiles[sale.agent_id] || sale.agent_id.slice(0, 8)}</span>
                              <span className="text-muted-foreground">{new Date(sale.sold_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sold For</p>
                              <p className="text-sm font-medium text-foreground">${(sale.sold_price || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Profit</p>
                              <p className="text-sm font-semibold text-emerald-600">${(sale.profit || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Commission</p>
                              <p className="text-sm font-medium text-foreground">${(sale.commission_amount || 0).toLocaleString()}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                sale.commission_status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                sale.commission_status === "requested" ? "bg-amber-100 text-amber-700" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {sale.commission_status === "paid" ? "Paid" : sale.commission_status === "requested" ? "Requested" : "Pending"}
                              </span>
                            </div>
                          </div>
                          {sale.commission_status === "requested" && (
                            <button
                              onClick={() => handlePayCommission(sale.id, sale.reservation_id)}
                              className="px-4 py-2 text-sm text-emerald-700 border border-emerald-300 rounded-full transition-colors inline-flex items-center gap-1.5 shrink-0"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === "submissions" && (
            <SubmissionsPanel
              submissions={submissions}
              searchQuery={searchQuery}
              focusSubmissionId={focusSubmissionId}
              onUpdate={async (id, patch) => {
                const { error } = await supabase.from("contact_submissions" as any).update(patch).eq("id", id);
                if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
              }}
              onDelete={async (id) => {
                if (!confirm("Delete this submission?")) return;
                const { error } = await supabase.from("contact_submissions" as any).delete().eq("id", id);
                if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                setSubmissions(prev => prev.filter(s => s.id !== id));
                toast({ title: "Deleted" });
              }}
            />
          )}

          {tab === "performance" && <AgentPerformancePanel />}
          {tab === "customers" && <CustomersPanel />}
          {tab === "quote_estimator" && <QuoteEstimatorPanel />}
          {tab === "velocity" && <InventoryVelocityPanel />}
          {tab === "ca_inventory" && <CaliforniaInventoryPanel />}

          {tab === "inbox" && (
            <InboxPanel
              onJumpToSubmission={(id) => {
                setFocusSubmissionId(id);
                setTab("submissions");
              }}
            />
          )}

          {tab === "cemeteries" && (
            <div>
              <div className="bg-card rounded-2xl p-6 shadow-soft mb-6">
                <h2 className="font-display text-xl text-foreground mb-4">Add New Cemetery</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><label className="text-xs text-muted-foreground">Cemetery Name</label><input value={newCemetery.name} onChange={e => setNewCemetery(p => ({ ...p, name: e.target.value }))} className={inputClass + " w-full"} placeholder="e.g. Rose Hills" /></div>
                  <div><label className="text-xs text-muted-foreground">City</label><input value={newCemetery.city} onChange={e => setNewCemetery(p => ({ ...p, city: e.target.value }))} className={inputClass + " w-full"} placeholder="e.g. San Jose" /></div>
                  <div><label className="text-xs text-muted-foreground">Region</label><select value={newCemetery.region} onChange={e => setNewCemetery(p => ({ ...p, region: e.target.value }))} className={inputClass + " w-full"}><option>Peninsula & SF</option><option>South Bay</option><option>East Bay</option><option>North Bay</option></select></div>
                  <div><label className="text-xs text-muted-foreground">Address</label><input value={newCemetery.address} onChange={e => setNewCemetery(p => ({ ...p, address: e.target.value }))} className={inputClass + " w-full"} placeholder="Full address" /></div>
                </div>
                <button
                  onClick={() => {
                    if (!newCemetery.name || !newCemetery.city) { toast({ title: "Name and city are required", variant: "destructive" }); return; }
                    toast({ title: "Cemetery added", description: `${newCemetery.name} has been added.` });
                    setNewCemetery({ name: "", city: "", region: "Peninsula & SF", address: "" });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Add Cemetery
                </button>
              </div>

              <h2 className="font-display text-xl text-foreground mb-4">Cemeteries ({filteredCemeteries.length})</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCemeteries.map((cem) => (
                  <div key={`${cem.name}-${cem.city}`} className="bg-card rounded-xl p-4 border border-border/50">
                    <h3 className="font-display text-sm text-foreground">{cem.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {cem.city} · {cem.region}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Admin;
