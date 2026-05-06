import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, LogOut, Plus, MapPin, Building2, Save, CalendarDays, Clock, TrendingUp, Search, DollarSign, CheckCircle, Inbox, Mail, Trophy, Users, Package, ClipboardList, Menu, X } from "lucide-react";
import AgentPerformancePanel from "@/components/admin/AgentPerformancePanel";
import CustomersPanel from "@/components/admin/CustomersPanel";
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
import NotificationsBell from "@/components/admin/NotificationsBell";
import { cleanDisplayName } from "@/lib/displayName";
import HelpButton from "@/components/admin/HelpButton";
import WelcomeOverlay from "@/components/admin/WelcomeOverlay";

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
  const [tab, setTab] = useState<"listings" | "cemeteries" | "reservations" | "sales" | "submissions" | "inbox" | "performance" | "customers" | "ca_inventory" | "inventory_requests">("submissions");
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Honor deep links like /admin?tab=submissions&submission=<id> (e.g. notification clicks)
  useEffect(() => {
    const apply = () => {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      const sid = params.get("submission");
      const cust = params.get("customer");
      if (t && ["listings","cemeteries","reservations","sales","submissions","inbox","performance","customers","ca_inventory","inventory_requests"].includes(t)) {
        setTab(t as any);
      }
      if (sid) { setFocusSubmissionId(sid); setTab("submissions"); }
      else if (cust) { setTab("customers"); }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

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

  const focused = tab === "submissions" || tab === "inbox";

  const tabsConfig: { key: typeof tab; label: string; Icon: any; count?: number }[] = [
    { key: "submissions", label: "Submissions", Icon: Inbox, count: submissions.filter(s => !s.handled).length },
    { key: "inbox", label: "Gmail Inbox", Icon: Mail },
    { key: "listings", label: "Listings", Icon: Building2, count: listings.length },
    { key: "reservations", label: "Reservations", Icon: CalendarDays, count: reservations.filter(r => r.status === "active").length },
    { key: "sales", label: "Sales", Icon: DollarSign, count: sales.length },
    { key: "performance", label: "Performance", Icon: Trophy },
    { key: "customers", label: "Customers", Icon: Users },
    { key: "inventory_requests", label: "Inv. Requests", Icon: ClipboardList },
    { key: "ca_inventory", label: "CA Inventory", Icon: Package },
    { key: "cemeteries", label: "Cemeteries", Icon: Building2 },
  ];

  const searchPlaceholder =
    tab === "submissions" ? "Search submissions..." :
    tab === "inbox" ? "Search inbox..." :
    tab === "cemeteries" ? "Search cemeteries..." :
    tab === "listings" ? "Search listings..." :
    "Search anything...";

  const showSearch = tab !== "performance" && tab !== "customers" && tab !== "inventory_requests" && tab !== "ca_inventory";

  const userId = user.id;
  const lastVisitKey = `admin:lastVisit:${userId}`;
  const welcomeKey = `admin:welcome:${userId}`;
  let lastVisit = 0;
  try {
    lastVisit = Number(localStorage.getItem(lastVisitKey)) || 0;
    // Only stamp once per browser session so the "since last visit" count stays stable while navigating.
    if (!sessionStorage.getItem(welcomeKey + ":stamped")) {
      localStorage.setItem(lastVisitKey, String(Date.now()));
      sessionStorage.setItem(welcomeKey + ":stamped", "1");
    }
  } catch {}
  const newSinceLast = lastVisit
    ? submissions.filter((s: any) => new Date(s.created_at).getTime() > lastVisit).length
    : 0;
  const openCount = submissions.filter((s: any) => !s.handled).length;
  const welcomeName = cleanDisplayName(user.user_metadata?.full_name) || (user.email ? user.email.split("@")[0] : "");

  return (
    <div className="min-h-screen bg-background">
      <WelcomeOverlay
        name={welcomeName}
        newSubmissions={newSinceLast}
        totalOpenSubmissions={openCount}
        storageKey={welcomeKey}
      />
      <Seo title="Admin Dashboard | Texas Cemetery Brokers" description="Internal admin." path="/admin" noindex />
      <Navbar forceScrolled />
      <section className={focused ? "pt-24 pb-10" : "pt-28 pb-16"}>
        <div className={focused ? "container mx-auto px-4 max-w-[1600px]" : "container mx-auto px-6"}>
          {/* Header — full when not focused, compact when focused */}
          {focused ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle menu"
                >
                  {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  <span className="hidden sm:inline">Menu</span>
                </button>
                <h1 className="font-display text-lg text-foreground shrink-0 hidden md:block">Admin</h1>
                <div className="flex-1 flex justify-center">
                  <div className="relative w-full max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full pl-11 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-soft"
                    />
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-semibold">
                    {(cleanDisplayName(user.user_metadata?.full_name) || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-foreground font-medium truncate max-w-[140px]">{cleanDisplayName(user.user_metadata?.full_name) || user.email}</span>
                </div>
                <NotificationsBell />
                <button onClick={handleSignOut} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
              {menuOpen && (
                <div className="flex gap-1.5 mb-4 flex-wrap p-3 bg-card rounded-xl border border-border/50">
                  {tabsConfig.map(({ key, label, Icon, count }) => {
                    const active = tab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => { setTab(key); if (key !== "submissions" && key !== "inbox") setMenuOpen(false); }}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all inline-flex items-center gap-1.5 ${
                          active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground border border-border"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}{count !== undefined ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-display text-3xl text-foreground">Admin Dashboard</h1>
                  <p className="text-muted-foreground text-sm mt-1">Signed in as <span className="text-foreground font-medium">{cleanDisplayName(user.user_metadata?.full_name) || user.email}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationsBell />
                  <button onClick={handleSignOut} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 mb-6 flex-wrap">
                {tabsConfig.map(({ key, label, Icon, count }) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-6 py-3 text-sm rounded-full font-medium transition-all inline-flex items-center gap-1.5 ${
                        active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}{count !== undefined ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Search — only when NOT focused (focused mode shows it inline above) */}
          {!focused && showSearch && (
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
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
              onRefresh={async () => {
                const { data, error } = await supabase.functions.invoke("sync-inbox", { body: { maxResults: 100 } });
                if (error) { toast({ title: "Sync failed", description: error.message, variant: "destructive" }); }
                const res = await supabase.from("contact_submissions" as any).select("*").order("created_at", { ascending: false });
                if (res.data) setSubmissions(res.data as any);
                const newCount = (data as any)?.bayer_imported ?? 0;
                toast({ title: "Refreshed", description: newCount > 0 ? `${newCount} new Bayer submission${newCount === 1 ? "" : "s"} imported.` : "Up to date." });
              }}
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
          
          {tab === "inventory_requests" && <InventoryRequestsPanel />}
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
      <HelpButton />
    </div>
  );
};

export default Admin;
