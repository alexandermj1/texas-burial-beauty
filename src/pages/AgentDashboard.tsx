import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Calendar, Clock, TrendingUp, MapPin, X, CalendarDays, AlertCircle, Search, CheckCircle, DollarSign, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAgent } from "@/hooks/useAgent";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { toast } from "@/hooks/use-toast";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isAfter } from "date-fns";

interface Listing {
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
}

interface Reservation {
  id: string;
  listing_id: string;
  agent_id: string;
  showing_date: string;
  showing_time: string;
  reserved_at: string;
  expires_at: string;
  status: string;
  notes: string | null;
  sold_price: number | null;
  commission_amount: number | null;
  commission_status: string | null;
}

const AgentDashboard = () => {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { isAgent, loading: agentLoading } = useAgent();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"properties" | "my-holds" | "my-sales">("properties");
  const [searchQuery, setSearchQuery] = useState("");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Reserve modal
  const [reserveModal, setReserveModal] = useState<Listing | null>(null);
  const [showingDate, setShowingDate] = useState<Date | undefined>();
  const [showingTime, setShowingTime] = useState("10:00 AM");
  const [reserveNotes, setReserveNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sold modal
  const [soldModal, setSoldModal] = useState<{ listing: Listing; reservation?: Reservation } | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !agentLoading && user && isAgent) {
      fetchData();
    }
  }, [user, isAgent, authLoading, agentLoading]);

  const fetchData = async () => {
    const [listingsRes, reservationsRes] = await Promise.all([
      supabase.from("listings").select("*").order("cemetery"),
      supabase.from("plot_reservations" as any).select("*"),
    ]);
    if (listingsRes.data) setListings(listingsRes.data as any);
    if (reservationsRes.data) setReservations(reservationsRes.data as any);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    setLoginLoading(false);
  };

  const getActiveReservation = (listingId: string) => {
    return reservations.find(
      r => r.listing_id === listingId && r.status === "active" && isAfter(new Date(r.expires_at), new Date())
    );
  };

  const handleReserve = async () => {
    if (!reserveModal || !showingDate || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("plot_reservations" as any).insert({
      listing_id: reserveModal.id,
      agent_id: user.id,
      showing_date: format(showingDate, "yyyy-MM-dd"),
      showing_time: showingTime,
      notes: reserveNotes || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plot Reserved", description: `Hold placed for 3 days. Showing on ${format(showingDate, "MMM d, yyyy")} at ${showingTime}` });
      setReserveModal(null);
      setShowingDate(undefined);
      setShowingTime("10:00 AM");
      setReserveNotes("");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm("Cancel this reservation?")) return;
    const { error } = await supabase
      .from("plot_reservations" as any)
      .update({ status: "cancelled" })
      .eq("id", id);

    if (!error) {
      toast({ title: "Reservation cancelled" });
      fetchData();
    }
  };

  const handleMarkSold = async () => {
    if (!soldModal || !user) return;
    setSubmitting(true);
    const price = parseFloat(soldPrice) || soldModal.listing.asking_price || 0;
    const commission = parseFloat(commissionAmount) || 0;
    const cost = soldModal.listing.cost_price || 0;

    // Create the sale record
    const { error: saleError } = await supabase.from("sales" as any).insert({
      listing_id: soldModal.listing.id,
      agent_id: user.id,
      reservation_id: soldModal.reservation?.id || null,
      sold_price: price,
      cost_price: cost,
      profit: price - cost,
      commission_amount: commission,
      commission_status: "pending",
    });

    if (saleError) {
      toast({ title: "Error", description: saleError.message, variant: "destructive" });
    } else {
      // Update listing status to sold
      await supabase.from("listings").update({ status: "sold" } as any).eq("id", soldModal.listing.id);

      // If there was a reservation, update it
      if (soldModal.reservation) {
        await supabase.from("plot_reservations" as any).update({
          status: "sold",
          sold_price: price,
          commission_amount: commission,
          commission_status: "pending",
        }).eq("id", soldModal.reservation.id);
      }

      toast({ title: "Plot marked as sold!", description: `Sale of $${price.toLocaleString()} recorded.` });
      setSoldModal(null);
      setSoldPrice("");
      setCommissionAmount("");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleRequestCommission = async (reservationId: string) => {
    const { error } = await supabase.from("plot_reservations" as any)
      .update({ commission_status: "requested" })
      .eq("id", reservationId);

    if (!error) {
      // Also update the sales record
      await supabase.from("sales" as any)
        .update({ commission_status: "requested" })
        .eq("reservation_id", reservationId);
      toast({ title: "Commission request sent", description: "Admin will review your commission request." });
      fetchData();
    }
  };

  const filteredListings = listings.filter(l => {
    if (l.status !== "active") return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return l.cemetery.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.plot_type.toLowerCase().includes(q) ||
      l.section.toLowerCase().includes(q);
  });

  const inputClass = "px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (authLoading || agentLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (!user || !isAgent) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar forceScrolled />
        <section className="pt-28 pb-16 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-8 shadow-soft w-full max-w-sm">
            <h1 className="font-display text-2xl text-foreground mb-1">Agent Sign In</h1>
            <p className="text-muted-foreground text-sm mb-6">Sales agents portal</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={inputClass + " w-full"} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inputClass + " w-full"} />
              <button type="submit" disabled={loginLoading} className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {loginLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            {user && !isAgent && (
              <p className="text-destructive text-xs mt-4 text-center">This account does not have agent access.</p>
            )}
          </motion.div>
        </section>
        <Footer />
      </div>
    );
  }

  const myReservations = reservations.filter(r => r.agent_id === user.id && r.status === "active" && isAfter(new Date(r.expires_at), new Date()));
  const mySoldReservations = reservations.filter(r => r.agent_id === user.id && r.status === "sold");

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Agent Dashboard | Texas Cemetery Brokers" description="Sales agent portal." path="/agent" noindex />
      <Navbar forceScrolled />
      <section className="pt-28 pb-16">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl text-foreground">Agent Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
            </div>
            <button onClick={async () => { await signOut(); navigate("/"); }} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setTab("properties")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "properties" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              All Properties ({filteredListings.length})
            </button>
            <button onClick={() => setTab("my-holds")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "my-holds" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <CalendarDays className="w-4 h-4 inline mr-1" /> My Holds ({myReservations.length})
            </button>
            <button onClick={() => setTab("my-sales")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "my-sales" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <DollarSign className="w-4 h-4 inline mr-1" /> My Sales ({mySoldReservations.length})
            </button>
          </div>

          {/* Search bar for properties */}
          {tab === "properties" && (
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by cemetery, city, plot type..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {tab === "properties" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                  <p className="text-2xl font-display text-foreground">{filteredListings.length}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-display text-amber-600">{reservations.filter(r => r.status === "active" && isAfter(new Date(r.expires_at), new Date())).length}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">My Active Holds</p>
                  <p className="text-2xl font-display text-primary">{myReservations.length}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">Total Inventory Value</p>
                  <p className="text-2xl font-display text-emerald-600">${filteredListings.reduce((s, l) => s + (l.asking_price || 0), 0).toLocaleString()}</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {filteredListings.map((listing, i) => {
                    const hold = getActiveReservation(listing.id);
                    const isMyHold = hold && hold.agent_id === user.id;
                    return (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className={`bg-card rounded-xl border overflow-hidden ${hold ? "border-amber-300/50" : "border-border/50"}`}
                      >
                        <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-display text-base text-foreground">{listing.cemetery}</h3>
                              {hold && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {isMyHold ? "Your Hold" : "On Hold"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-1" />{listing.city} · {listing.plot_type} · {listing.section} · {listing.spaces} space{listing.spaces > 1 ? "s" : ""}
                            </p>
                            {hold && (
                              <p className="text-xs text-amber-600 mt-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Showing: {format(new Date(hold.showing_date), "MMM d, yyyy")} at {hold.showing_time}
                                {" · "}Hold expires {format(new Date(hold.expires_at), "MMM d, h:mm a")}
                              </p>
                            )}
                          </div>

                          {/* Financial */}
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p>
                              <p className="text-sm font-medium text-foreground">{listing.asking_price ? `$${listing.asking_price.toLocaleString()}` : "—"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Profit</p>
                              <p className="text-sm font-semibold text-emerald-600 inline-flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {listing.profit ? `$${listing.profit.toLocaleString()}` : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 flex items-center gap-2">
                            {/* Mark as sold button - always available */}
                            <button
                              onClick={() => setSoldModal({ listing, reservation: isMyHold ? hold : undefined })}
                              className="px-4 py-2 text-sm text-emerald-700 hover:text-emerald-900 border border-emerald-300 rounded-full transition-colors inline-flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Sold
                            </button>
                            {hold ? (
                              isMyHold ? (
                                <button onClick={() => handleCancelReservation(hold.id)} className="px-4 py-2 text-sm text-amber-700 hover:text-amber-900 border border-amber-300 rounded-full transition-colors">
                                  Release Hold
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Reserved</span>
                              )
                            ) : (
                              <button onClick={() => setReserveModal(listing)} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Reserve
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === "my-holds" && (
            <div className="space-y-3">
              {myReservations.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No active holds</p>
                  <p className="text-sm mt-1">Reserve a plot from the properties tab to book a showing.</p>
                </div>
              ) : (
                myReservations.map((res) => {
                  const listing = listings.find(l => l.id === res.listing_id);
                  if (!listing) return null;
                  return (
                    <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-amber-300/50 p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-display text-base text-foreground">{listing.cemetery}</h3>
                          <p className="text-sm text-muted-foreground">{listing.city} · {listing.plot_type} · {listing.section}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(res.showing_date), "MMMM d, yyyy")}
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {res.showing_time}
                            </span>
                          </div>
                          <p className="text-xs text-amber-600 mt-1 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Hold expires {format(new Date(res.expires_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {res.notes && <p className="text-xs text-muted-foreground mt-1">Notes: {res.notes}</p>}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-lg font-display text-foreground">{listing.asking_price ? `$${listing.asking_price.toLocaleString()}` : "—"}</p>
                          <p className="text-sm font-semibold text-emerald-600 inline-flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Profit: {listing.profit ? `$${listing.profit.toLocaleString()}` : "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => setSoldModal({ listing, reservation: res })}
                            className="px-4 py-2 text-sm text-emerald-700 border border-emerald-300 rounded-full transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Sold
                          </button>
                          <button onClick={() => handleCancelReservation(res.id)} className="px-4 py-2 text-sm text-destructive hover:text-destructive border border-destructive/30 rounded-full transition-colors shrink-0">
                            Cancel Hold
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {tab === "my-sales" && (
            <div className="space-y-3">
              {mySoldReservations.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No sales yet</p>
                  <p className="text-sm mt-1">Mark a plot as sold to track your sales here.</p>
                </div>
              ) : (
                mySoldReservations.map((res) => {
                  const listing = listings.find(l => l.id === res.listing_id);
                  if (!listing) return null;
                  return (
                    <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-emerald-300/50 p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-display text-base text-foreground">{listing.cemetery}</h3>
                          <p className="text-sm text-muted-foreground">{listing.city} · {listing.plot_type} · {listing.section}</p>
                          <p className="text-xs text-emerald-600 mt-1 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Sold for ${(res.sold_price || listing.asking_price || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-sm text-muted-foreground">Commission</p>
                          <p className="text-lg font-display text-foreground">${(res.commission_amount || 0).toLocaleString()}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            res.commission_status === "paid" ? "bg-emerald-100 text-emerald-700" :
                            res.commission_status === "requested" ? "bg-amber-100 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {res.commission_status === "paid" ? "Paid" : res.commission_status === "requested" ? "Requested" : "Pending"}
                          </span>
                        </div>
                        {res.commission_status !== "requested" && res.commission_status !== "paid" && (
                          <button
                            onClick={() => handleRequestCommission(res.id)}
                            className="px-4 py-2 text-sm text-primary border border-primary/30 rounded-full transition-colors inline-flex items-center gap-1.5 shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" /> Request Commission
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* Reserve Modal */}
      <AnimatePresence>
        {reserveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setReserveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-foreground">Reserve Plot</h2>
                <button onClick={() => setReserveModal(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <p className="font-medium text-foreground text-sm">{reserveModal.cemetery}</p>
                <p className="text-xs text-muted-foreground">{reserveModal.city} · {reserveModal.plot_type} · {reserveModal.section}</p>
                <p className="text-sm mt-1">
                  Price: <span className="font-medium">{reserveModal.asking_price ? `$${reserveModal.asking_price.toLocaleString()}` : "—"}</span>
                  {reserveModal.profit && (
                    <span className="text-emerald-600 ml-2 text-xs font-semibold">+${reserveModal.profit.toLocaleString()} profit</span>
                  )}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Showing Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={inputClass + " w-full text-left inline-flex items-center gap-2"}>
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        {showingDate ? format(showingDate, "MMMM d, yyyy") : "Select a date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarUI
                        mode="single"
                        selected={showingDate}
                        onSelect={setShowingDate}
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Showing Time</label>
                  <select value={showingTime} onChange={e => setShowingTime(e.target.value)} className={inputClass + " w-full"}>
                    {["8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Notes (optional)</label>
                  <textarea value={reserveNotes} onChange={e => setReserveNotes(e.target.value)} className={inputClass + " w-full h-20 resize-none"} placeholder="Client name, special requests..." />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  This hold will last <strong>3 days</strong> from now. Other agents will see this plot as reserved during that time.
                </div>

                <button
                  onClick={handleReserve}
                  disabled={!showingDate || submitting}
                  className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Reserving..." : "Confirm Reservation"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sold Modal */}
      <AnimatePresence>
        {soldModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setSoldModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-foreground">Mark as Sold</h2>
                <button onClick={() => setSoldModal(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-emerald-50 rounded-lg p-3 mb-4 border border-emerald-200">
                <p className="font-medium text-foreground text-sm">{soldModal.listing.cemetery}</p>
                <p className="text-xs text-muted-foreground">{soldModal.listing.city} · {soldModal.listing.plot_type}</p>
                <p className="text-sm mt-1">
                  Asking: <span className="font-medium">{soldModal.listing.asking_price ? `$${soldModal.listing.asking_price.toLocaleString()}` : "—"}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Sold Price ($)</label>
                  <input
                    type="number"
                    value={soldPrice}
                    onChange={e => setSoldPrice(e.target.value)}
                    placeholder={soldModal.listing.asking_price?.toString() || "0"}
                    className={inputClass + " w-full"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Your Commission ($)</label>
                  <input
                    type="number"
                    value={commissionAmount}
                    onChange={e => setCommissionAmount(e.target.value)}
                    placeholder="0"
                    className={inputClass + " w-full"}
                  />
                </div>

                <button
                  onClick={handleMarkSold}
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-600 text-white font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? "Processing..." : "Confirm Sale"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default AgentDashboard;
