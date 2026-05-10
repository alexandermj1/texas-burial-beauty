import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { toast } from "@/hooks/use-toast";

const plotTypes = ["Single Plot", "Double Plot", "Niche", "Crypt"];

const CreateListing = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    cemetery: "",
    city: "",
    plot_type: "Single Plot",
    section: "",
    spaces: 1,
    asking_price: "",
    description: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    photos: [] as string[],
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isEdit && user) loadListing();
  }, [isEdit, user]);

  const loadListing = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id!)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      toast({ title: "Listing not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    setForm({
      cemetery: data.cemetery,
      city: data.city,
      plot_type: data.plot_type,
      section: data.section,
      spaces: data.spaces,
      asking_price: data.asking_price?.toString() || "",
      description: data.description || "",
      contact_name: data.contact_name || "",
      contact_phone: data.contact_phone || "",
      contact_email: data.contact_email || "",
      photos: data.photos || [],
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);

    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("listing-photos").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
        newPhotos.push(urlData.publicUrl);
      }
    }

    setForm(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
    setUploading(false);
  };

  const removePhoto = (url: string) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter(p => p !== url) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      cemetery: form.cemetery,
      city: form.city,
      plot_type: form.plot_type,
      section: form.section,
      spaces: form.spaces,
      asking_price: form.asking_price ? parseFloat(form.asking_price) : null,
      description: form.description || null,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      photos: form.photos,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("listings").update(payload).eq("id", id!).eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("listings").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Listing updated!" : "Listing created!" });
      navigate("/dashboard");
    }
    setLoading(false);
  };

  if (authLoading || !user) return null;

  const inputClass = "w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo title="Create Listing | Texas Cemetery Brokers" description="Create or edit a cemetery property listing." path="/create-listing" noindex />
      <Navbar />
      <section className="pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-8 shadow-soft"
          >
            <h1 className="font-display text-3xl text-foreground mb-1">
              {isEdit ? "Edit Listing" : "Create Listing"}
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              {isEdit ? "Update your property details" : "Fill in the details about your cemetery property"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Details */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 uppercase tracking-wide">Property Details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Cemetery Name *</label>
                    <input required value={form.cemetery} onChange={e => setForm(p => ({ ...p, cemetery: e.target.value }))} className={inputClass} placeholder="e.g. Rose Hills Memorial Park" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">City *</label>
                    <input required value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className={inputClass} placeholder="e.g. Whittier" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Plot Type *</label>
                    <select value={form.plot_type} onChange={e => setForm(p => ({ ...p, plot_type: e.target.value }))} className={inputClass}>
                      {plotTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Section *</label>
                    <input required value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} className={inputClass} placeholder="e.g. Garden of Serenity" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Number of Spaces *</label>
                    <input type="number" required min={1} value={form.spaces} onChange={e => setForm(p => ({ ...p, spaces: parseInt(e.target.value) || 1 }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Asking Price ($)</label>
                    <input type="number" step="0.01" value={form.asking_price} onChange={e => setForm(p => ({ ...p, asking_price: e.target.value }))} className={inputClass} placeholder="e.g. 5000" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className={inputClass + " resize-none"}
                  placeholder="Describe the property, its condition, surroundings, etc."
                />
              </div>

              {/* Photos */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 uppercase tracking-wide">Photos</h3>
                <div className="flex flex-wrap gap-3 mb-3">
                  {form.photos.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute top-1 right-1 bg-foreground/70 text-primary-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Photos"}
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                </label>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 uppercase tracking-wide">Contact Information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Contact Name</label>
                    <input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} className={inputClass} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Phone</label>
                    <input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className={inputClass} placeholder="(555) 123-4567" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-muted-foreground mb-1">Email</label>
                    <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className={inputClass} placeholder="you@email.com" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Saving..." : isEdit ? "Update Listing" : "Publish Listing"}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default CreateListing;
