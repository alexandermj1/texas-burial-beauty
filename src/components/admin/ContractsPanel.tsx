import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileSignature, Loader2, ExternalLink, Copy, CheckCircle2, Upload,
  ScrollText, Shield, Mail, PenLine, Send,
} from "lucide-react";


type Contract = {
  id: string;
  kind: "listing_agreement" | "poa";
  status: string;
  sign_token: string | null;
  filled_pdf_path: string | null;
  signed_pdf_path: string | null;
  notarized_pdf_path: string | null;
  countersigned_pdf_path: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  countersigned_at: string | null;
  countersigner_name: string | null;
  notarized_at: string | null;
  signed_copy_emailed_at: string | null;
  bluenotary_session_url: string | null;
  bluenotary_sent_at: string | null;
};


type Props = {
  submissionId: string;
  sellerEmail?: string | null;
  sellerName?: string | null;
};

const KIND_LABEL: Record<Contract["kind"], string> = {
  listing_agreement: "Listing Agreement",
  poa: "Power of Attorney",
};

const KIND_ICON = {
  listing_agreement: ScrollText,
  poa: Shield,
};

export default function ContractsPanel({ submissionId, sellerEmail, sellerName }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [countersignFor, setCountersignFor] = useState<Contract | null>(null);
  const [csName, setCsName] = useState("");
  const [csSig, setCsSig] = useState<string | null>(null);

  type EditFields = {
    seller_name: string; address: string; city_state_zip: string;
    phone: string; email: string; cemetery: string; county_state: string;
    plot_description: string; plot_count: string;
    listing_option: string; authorized_min_total: string;
  };
  const [editKind, setEditKind] = useState<Contract["kind"] | null>(null);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const [editLoading, setEditLoading] = useState(false);



  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contracts").select("*").eq("submission_id", submissionId);
    setContracts((data ?? []) as Contract[]);
    const map: Record<string, string> = {};
    for (const c of data ?? []) {
      const path = (c as Contract).countersigned_pdf_path
        ?? (c as Contract).signed_pdf_path
        ?? (c as Contract).notarized_pdf_path
        ?? (c as Contract).filled_pdf_path;
      if (path) {
        const { data: s } = await supabase.storage
          .from("contracts").createSignedUrl(path, 60 * 60);
        if (s?.signedUrl) map[c.id] = s.signedUrl;
      }
    }
    setUrls(map);
    setLoading(false);
  };


  useEffect(() => { void load(); }, [submissionId]);

  const la = contracts.find((c) => c.kind === "listing_agreement");
  const poa = contracts.find((c) => c.kind === "poa");

  const openGenerate = async (kind: Contract["kind"]) => {
    setEditKind(kind);
    setEditLoading(true);
    setEditFields(null);
    try {
      const { data: sub } = await supabase
        .from("contact_submissions").select("*").eq("id", submissionId).maybeSingle();
      if (!sub) throw new Error("Submission not found");
      const authTotal = (sub as any).list_price ?? (sub as any).cemetery_retail ?? "";
      setEditFields({
        seller_name: (sub as any).name ?? "",
        address: "",
        city_state_zip: "",
        phone: (sub as any).phone ?? "",
        email: (sub as any).email ?? "",
        cemetery: (sub as any).cemetery ?? "",
        county_state: (sub as any).cemetery_city ? `${(sub as any).cemetery_city}, TX` : "",
        plot_description: [
          (sub as any).section && `Section ${(sub as any).section}`,
          (sub as any).spaces && `Spaces ${(sub as any).spaces}`,
          (sub as any).space_numbers,
        ].filter(Boolean).join(" • "),
        plot_count: String((sub as any).plot_count ?? ""),
        listing_option: (sub as any).listing_tier ?? (sub as any).listing_option ?? "Starter",
        authorized_min_total: authTotal ? String(authTotal) : "",
      });
    } catch (e) {
      toast.error((e as Error).message);
      setEditKind(null);
    } finally {
      setEditLoading(false);
    }
  };

  const submitGenerate = async () => {
    if (!editKind || !editFields) return;
    setBusy(editKind);
    try {
      const overrides = {
        ...editFields,
        plot_count: editFields.plot_count ? Number(editFields.plot_count) : undefined,
        authorized_min_total: editFields.authorized_min_total
          ? Number(editFields.authorized_min_total) : undefined,
      };
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { submission_id: submissionId, kind: editKind, overrides },
      });
      if (error) throw error;
      toast.success(`${KIND_LABEL[editKind]} generated with your edits`);
      if (editKind === "listing_agreement" && data?.sign_token) {
        const link = `${window.location.origin}/sign/${data.sign_token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.message("Signing link copied to clipboard", { description: link });
      }
      setEditKind(null);
      setEditFields(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copySignLink = async (c: Contract) => {
    if (!c.sign_token) return;
    const link = `${window.location.origin}/sign/${c.sign_token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Signing link copied");
  };

  const emailSignLink = async (c: Contract) => {
    if (!c.sign_token) return;
    setBusy(c.id);
    try {
      const link = `${window.location.origin}/sign/${c.sign_token}`;
      const { data, error } = await supabase.functions.invoke("send-contract-link", {
        body: { contract_id: c.id, sign_url: link },
      });
      if (error) throw error;
      toast.success("Signing link emailed", { description: `Sent to ${data?.to ?? sellerEmail ?? "seller"}` });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };


  const emailSignedCopy = async (c: Contract) => {
    setBusy(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("email-signed-contract", {
        body: { contract_id: c.id },
      });
      if (error) throw error;
      toast.success("Signed copy emailed", { description: `Sent to ${data?.to ?? sellerEmail ?? "seller"}` });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submitCountersign = async () => {
    if (!countersignFor) return;
    if (!csName.trim()) return toast.error("Type your name");
    if (!csSig) return toast.error("Draw your signature");
    setBusy(countersignFor.id);
    try {
      const { error } = await supabase.functions.invoke("sign-contract", {
        body: {
          action: "countersign",
          contract_id: countersignFor.id,
          countersigner_name: csName.trim(),
          countersigner_signature: csSig,
        },
      });
      if (error) throw error;
      toast.success("Countersigned — fully executed copy emailed to seller");
      setCountersignFor(null);
      setCsName(""); setCsSig(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };





  const uploadNotarized = async (c: Contract, file: File) => {
    setBusy(c.id);
    try {
      const path = `${submissionId}/poa-notarized-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("contracts")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (error) throw error;
      const now = new Date().toISOString();
      await supabase.from("contracts").update({
        notarized_pdf_path: path,
        notarized_at: now,
        status: "notarized",
      }).eq("id", c.id);
      await supabase.from("contact_submissions").update({
        poa_notarized_at: now,
      }).eq("id", submissionId);
      // Completion check
      const laDone = !!la?.signed_at;
      if (laDone) {
        await supabase.from("contact_submissions").update({
          contracts_completed_at: now,
          texas_pipeline_stage: "completed",
        }).eq("id", submissionId);
        toast.success("Contracts complete — submission tagged as completed", {
          description: "Both documents are on file.",
        });
      } else {
        toast.success("Notarized POA saved");
      }
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ contract, kind }: { contract?: Contract; kind: Contract["kind"] }) => {
    const Icon = KIND_ICON[kind];
    const pending = busy === kind || busy === contract?.id;
    return (
      <div className="border rounded-lg p-3 bg-background/60 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{KIND_LABEL[kind]}</span>
            {contract?.notarized_at ? (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Notarized</span>
            ) : contract?.signed_at ? (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Signed</span>
            ) : contract?.viewed_at ? (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Viewed</span>
            ) : contract?.sent_at ? (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Sent</span>
            ) : contract?.filled_pdf_path ? (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Draft — not sent</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Not generated</span>
            )}

          </div>
          <div className="flex items-center gap-1">
            {contract && urls[contract.id] && (
              <Button size="sm" variant="ghost" onClick={() => window.open(urls[contract.id], "_blank")}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                {contract.signed_at ? "Signed PDF" : "PDF"}
              </Button>
            )}
            {contract?.signed_at && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => emailSignedCopy(contract)}
                disabled={pending}
                title={contract.signed_copy_emailed_at
                  ? `Last emailed ${new Date(contract.signed_copy_emailed_at).toLocaleString()}`
                  : "Email signed copy to seller"}
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                {contract.signed_copy_emailed_at ? "Re-email" : "Email copy"}
              </Button>
            )}
            {contract?.signed_at && kind === "listing_agreement" && !contract.countersigned_at && (
              <Button
                size="sm"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setCountersignFor(contract); setCsName(""); setCsSig(null); }}
                disabled={pending}
              >
                <PenLine className="w-3.5 h-3.5 mr-1" />Countersign
              </Button>
            )}
            {contract?.countersigned_at && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                Fully executed
              </span>
            )}
            <Button
              size="sm"
              variant={contract ? "outline" : "default"}
              onClick={() => openGenerate(kind)}
              disabled={pending}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSignature className="w-3.5 h-3.5 mr-1" />}
              {contract ? "Re-generate" : "Generate & fill"}
            </Button>
          </div>
        </div>

        {contract?.signed_at && (
          <div className="text-[11px] text-muted-foreground">
            Signed {new Date(contract.signed_at).toLocaleString()}
            {contract.signed_copy_emailed_at && ` · Copy emailed ${new Date(contract.signed_copy_emailed_at).toLocaleDateString()}`}
          </div>
        )}

        {contract && kind === "listing_agreement" && contract.sign_token && !contract.signed_at && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="bg-[#1f2a37] hover:bg-[#111827] text-white"
              onClick={() => emailSignLink(contract)}
              disabled={busy === contract.id}
            >
              {busy === contract.id
                ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                : <Send className="w-3.5 h-3.5 mr-1" />}
              {contract.sent_at ? "Re-send signing link" : "Email signing link to seller"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => copySignLink(contract)}>
              <Copy className="w-3.5 h-3.5 mr-1" />Copy link
            </Button>
            <a
              href={`/sign/${contract.sign_token}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline"
            >
              Open signing page
            </a>
            {contract.sent_at && (
              <span className="text-[11px] text-muted-foreground">
                Sent {new Date(contract.sent_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}


        {contract && kind === "poa" && (
          <div className="space-y-2">
            {contract.sign_token && !contract.notarized_at && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                  onClick={() => emailSignLink(contract)}
                  disabled={busy === contract.id}
                >
                  {busy === contract.id
                    ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    : <Send className="w-3.5 h-3.5 mr-1" />}
                  {contract.bluenotary_sent_at
                    ? "Re-send notary packet email"
                    : contract.sent_at
                      ? "Re-send address & notary email"
                      : "Email seller to confirm address & get notary packet"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => copySignLink(contract)}>
                  <Copy className="w-3.5 h-3.5 mr-1" />Copy link
                </Button>
                {contract.bluenotary_sent_at && (
                  <span className="text-[11px] text-emerald-700">
                    Notary packet emailed {new Date(contract.bluenotary_sent_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {!contract.notarized_at && (
              <div className="flex items-center gap-2 pt-1">
                <Label className="text-xs cursor-pointer inline-flex items-center gap-1 border rounded-md px-2 py-1 hover:bg-muted">
                  <Upload className="w-3.5 h-3.5" /> Upload notarized PDF once returned
                  <Input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadNotarized(contract, f);
                    }}
                  />
                </Label>
                {busy === contract.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const bothDone = !!la?.signed_at && !!(poa?.notarized_at);

  return (
    <div className="border-t border-border/40 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <FileSignature className="w-3 h-3" /> Contracts
        </p>
        {bothDone && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed — both on file
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading contracts…
        </div>
      ) : (
        <div className="space-y-2">
          <Row contract={la} kind="listing_agreement" />
          <Row contract={poa} kind="poa" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Listing Agreement is signed in-app via the copied signing link (legally valid e-signature).
            The Power of Attorney must be notarized: click <span className="font-medium">Send to BlueNotary</span> to open a session
            with the seller's contact info prefilled and the filled PDF opened alongside it — upload the PDF into BlueNotary and invite the seller. When the notarized copy comes back, upload it here to complete the file.
          </p>
        </div>
      )}

      <Dialog open={!!countersignFor} onOpenChange={(o) => !o && setCountersignFor(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Countersign Listing Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the seller's signed contract below, then add your broker signature to fully execute it.
              A branded email with the fully-executed PDF attached will be sent to {sellerEmail ?? "the seller"} automatically.
            </p>
            {countersignFor && urls[countersignFor.id] && (
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seller-signed copy</span>
                  <a
                    href={urls[countersignFor.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in new tab
                  </a>
                </div>
                <iframe
                  src={urls[countersignFor.id]}
                  className="w-full h-[420px] bg-white"
                  title="Signed contract preview"
                />
              </div>
            )}
            <div>
              <Label>Your name</Label>
              <Input value={csName} onChange={(e) => setCsName(e.target.value)} placeholder="e.g. John Smith, Broker" />
            </div>
            <CountersignPad onChange={setCsSig} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCountersignFor(null)}>Cancel</Button>
              <Button onClick={submitCountersign} disabled={busy === countersignFor?.id}>
                {busy === countersignFor?.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Countersign & send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editKind} onOpenChange={(o) => { if (!o) { setEditKind(null); setEditFields(null); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review contract details before generating</DialogTitle>
            <DialogDescription>
              These fields will be filled into the {editKind ? KIND_LABEL[editKind] : "contract"}. Edit anything
              that needs correcting — the seller can still adjust their own info when they sign.
            </DialogDescription>
          </DialogHeader>
          {editLoading || !editFields ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading submission…
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Seller full legal name</Label>
                <Input value={editFields.seller_name}
                  onChange={(e) => setEditFields({ ...editFields, seller_name: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Mailing address</Label>
                <Input value={editFields.address}
                  onChange={(e) => setEditFields({ ...editFields, address: e.target.value })} />
              </div>
              <div>
                <Label>City, State, ZIP</Label>
                <Input value={editFields.city_state_zip}
                  onChange={(e) => setEditFields({ ...editFields, city_state_zip: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editFields.phone}
                  onChange={(e) => setEditFields({ ...editFields, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={editFields.email}
                  onChange={(e) => setEditFields({ ...editFields, email: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Cemetery</Label>
                <Input value={editFields.cemetery}
                  onChange={(e) => setEditFields({ ...editFields, cemetery: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Cemetery county / state <span className="text-muted-foreground text-[11px]">(POA only)</span></Label>
                <Input value={editFields.county_state}
                  placeholder="e.g. Harris County, TX"
                  onChange={(e) => setEditFields({ ...editFields, county_state: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Plot description (section / block / spaces)</Label>
                <Textarea rows={2} value={editFields.plot_description}
                  onChange={(e) => setEditFields({ ...editFields, plot_description: e.target.value })} />
              </div>
              <div>
                <Label>Plot count</Label>
                <Input type="number" value={editFields.plot_count}
                  onChange={(e) => setEditFields({ ...editFields, plot_count: e.target.value })} />
              </div>
              <div>
                <Label>Listing option</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editFields.listing_option}
                  onChange={(e) => setEditFields({ ...editFields, listing_option: e.target.value })}
                >
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Featured">Featured</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Authorized minimum total sales price ($)</Label>
                <Input type="number" value={editFields.authorized_min_total}
                  onChange={(e) => setEditFields({ ...editFields, authorized_min_total: e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">
                  The minimum total price you're authorized to accept. Leave blank to use the quote/retail on file.
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setEditKind(null); setEditFields(null); }}>Cancel</Button>
            <Button onClick={submitGenerate} disabled={!editFields || busy === editKind}>
              {busy === editKind && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountersignPad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const has = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (c.width / r.width),
        y: (e.clientY - r.top) * (c.height / r.height),
      };
    };

    const down = (e: PointerEvent) => {
      drawing.current = true; has.current = true;
      const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    };
    const up = () => { drawing.current = false; onChange(has.current ? c.toDataURL("image/png") : null); };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onChange]);

  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    has.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>Draw your signature</Label>
      <canvas ref={ref} width={460} height={140} className="w-full h-36 border-2 border-dashed rounded-md bg-background touch-none" />
      <button type="button" onClick={clear} className="text-xs text-muted-foreground underline">Clear</button>
    </div>
  );
}

