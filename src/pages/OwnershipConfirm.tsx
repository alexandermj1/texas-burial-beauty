import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Paperclip, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { buildLogic, initialState, nameKey } from "@/lib/familyConfirmV2";

/**
 * The seller's own copy of the ownership questionnaire — "Family Confirmation v2".
 *
 * The deed names are typed by us off the certificate before the link goes out,
 * and the seller's own paperwork sits beside the questions so they can check a
 * name or a space number without leaving the page. Everything else — who has
 * died, who inherits, who has to sign — is worked out live as they answer.
 */

type Attachment = { name: string; url: string; mime: string | null };

type Packet = {
  seller_name: string | null;
  cemetery: string | null;
  lawn?: string | null;
  space_numbers?: string | null;
  deed_owner_names?: string | null;
  relationship_to_owner?: string | null;
  attachments?: Attachment[];
  answers?: Record<string, unknown>;
  /** The roster the office typed off the deed, including who has died. */
  deed_owners?: { name: string; deceased?: boolean }[];
};

const DocsRail = ({ files }: { files: Attachment[] }) => {
  const [open, setOpen] = useState<Attachment | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  if (!files.length) return null;

  const isImage = (f: Attachment) => (f.mime ?? "").startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(f.name);
  const isPdf = (f: Attachment) => (f.mime ?? "").includes("pdf") || /\.pdf$/i.test(f.name);


  return (
    <>
      <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur p-5">
        <div className="flex items-center gap-2 mb-1">
          <Paperclip className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] tracking-[0.28em] uppercase text-primary">Your documents</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
          What you've already sent us. Tap any one to read it while you answer.
        </p>

        <div className="grid grid-cols-3 lg:grid-cols-2 gap-2.5">
          {files.map((f) => (
            <button
              key={f.url}
              onClick={() => setOpen(f)}
              className="group text-left rounded-2xl overflow-hidden border border-border/60 bg-background hover:border-primary/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.6)]"
            >
              <div className="aspect-[4/5] bg-muted/50 flex items-center justify-center overflow-hidden">
                {isImage(f) && !broken[f.url] ? (
                  <img
                    src={f.url}
                    alt={f.name}
                    loading="lazy"
                    onError={() => setBroken((b) => ({ ...b, [f.url]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>

              <div className="px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground truncate">{f.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-background rounded-3xl overflow-hidden w-full max-w-3xl max-h-[88vh] flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60">
              <p className="text-xs text-foreground truncate">{open.name}</p>
              <div className="flex items-center gap-3 shrink-0">
                <a href={open.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">
                  Open
                </a>
                <button onClick={() => setOpen(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-muted/30">
              {isPdf(open) ? (
                <iframe src={open.url} title={open.name} className="w-full h-[75vh]" />
              ) : broken[open.url] ? (
                <div className="p-10 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">
                    This file can't be shown in the browser.{" "}
                    <a href={open.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                      Download it instead
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <img
                  src={open.url}
                  alt={open.name}
                  onError={() => setBroken((b) => ({ ...b, [open.url]: true }))}
                  className="w-full h-auto"
                />
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};


/** Split "John Smith & Mary Smith" / "John and Mary Smith" into separate names. */
const splitNames = (raw?: string | null): string[] => {
  const source = String(raw ?? "").replace(/\s+/g, " ").trim();
  const shared = source.match(/^([A-Za-z.'-]+)\s+(?:and|&)\s+([A-Za-z.'-]+)\s+([A-Za-z.'-]+)$/i);
  const normalized = shared ? `${shared[1]} ${shared[3]}, ${shared[2]} ${shared[3]}` : source;
  return normalized
    .split(/\s*(?:,|;|\/|&|\band\b)\s*/i)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && !/^(unknown|n\/?a|none)$/i.test(s));
};

/** "3, 4" or "12A/12B" becomes the space labels the questionnaire asks about. */
const splitSpaces = (raw?: string | null): string[] => {
  const parts = String(raw ?? "")
    .split(/[,;/&]|\band\b/i)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!parts.length) return ["The spaces on the deed"];
  return parts.map((p) => (/space/i.test(p) ? p : `Space ${p}`));
};

const ACCENT = "#4a6b54";

const HOVER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display:ital@0;1&display=swap');
.fcv2 { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; color: #1d1d1f; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
.fcv2 h1, .fcv2 h2 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400 !important; letter-spacing: -0.012em !important; }
.fcv2 * { box-sizing: border-box; }
.fcv2 input, .fcv2 textarea, .fcv2 button { font-family: inherit; }
.fcv2 input::placeholder, .fcv2 textarea::placeholder { color: #b7b7bf; }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: none; } }
@keyframes draw { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
.dcx2:hover { background: #f5f5f7; }
.dcx2:focus { background: #ffffff; border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx3:hover { background: #f0f0f3; color: #1d1d1f; }
.dcx4:hover { border-color: #b8b8c0; background: #fafafc; }
.dcx5:focus { background: #ffffff; border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx6:focus { background: #ffffff; border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx7:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx8:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx9:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx10:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx11:hover { background: #e6e6eb; }
.dcx13:hover { background: #f5f5f7; }
.dcx13:focus { background: #ffffff; border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx14:hover { background: #f0f0f3; color: #1d1d1f; }
.dcx16:hover { background: #f5f5f7; }
.dcx16:focus { background: #ffffff; border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx17:hover { background: #f0f0f3; color: #1d1d1f; }
.dcx18:hover { background: #ececf0; }
.dcx19:hover { border-color: #b8b8c0; background: #fafafc; }
.dcx20:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx21:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx22:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx23:focus { border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx24:focus { background: #ffffff; border-color: #c9c9cf; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
.dcx26:hover { transform: scale(1.02); }
.dcx26:active { transform: scale(0.98); }
.dcx28:hover { transform: scale(1.02); }
.dcx28:active { transform: scale(0.98); }
.dcx29:hover { background: #e6e6eb; }
.dcx30:hover { color: #1d1d1f; }
`;

const OwnershipConfirm = () => {
  const [params] = useSearchParams();
  const submissionId = params.get("s") ?? "";
  const [packet, setPacket] = useState<Packet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState<any>(null);

  /** Mirrors the model's setState: an object, or a function of the old state. */
  const setS = useCallback((update: any) => {
    setState((s: any) => ({ ...s, ...(typeof update === "function" ? update(s) : update) }));
  }, []);

  useEffect(() => {
    if (!submissionId) { setError("This link is missing its reference."); setLoading(false); return; }
    (async () => {
      const { data, error: err } = await supabase.functions.invoke("ownership-questions", {
        body: { action: "get", submission_id: submissionId },
      });
      if (err || (data as any)?.error) {
        setError((data as any)?.error ?? "We could not open this link.");
        setLoading(false);
        return;
      }
      const p = data as Packet;
      setPacket(p);
      const crm = {
        deed: splitNames(p.deed_owner_names),
        spaces: splitSpaces(p.space_numbers),
      };
      // The office already ticked who has died when they typed the deed names,
      // so the seller should never be asked to tell us again.
      const dead = new Set(
        (p.deed_owners ?? []).filter((o) => o.deceased).map((o) => nameKey(o.name)),
      );
      const seedDeaths = (st: any) => ({
        ...st,
        deed: (st.deed ?? []).map((d: any) => (dead.has(nameKey(d.n)) ? { ...d, st: "deceased" } : d)),
      });
      const saved = (p.answers as any)?.v2;
      setState(
        saved && Array.isArray(saved.deed) && saved.deed.length
          ? saved
          : seedDeaths(initialState(crm)),
      );

      setLoading(false);
    })();
  }, [submissionId]);

  const CRM = useMemo(() => {
    const deed = splitNames(packet?.deed_owner_names);
    const surname = (deed[0] ?? packet?.seller_name ?? "").trim().split(/\s+/).pop() ?? "";
    return {
      family: surname || "your",
      cemetery: packet?.cemetery ?? "Your cemetery",
      location: [packet?.lawn, packet?.space_numbers ? `Spaces ${packet.space_numbers}` : ""].filter(Boolean).join(", ") || "The spaces on your deed",
      deedNote: deed.length ? `Deed names as we read them: ${deed.join(", ")}` : "Deed on file",
      deed,
      spaces: splitSpaces(packet?.space_numbers),
    };
  }, [packet]);

  // Autosave, quietly, so nothing is lost if they close the page.
  const first = useRef(true);
  useEffect(() => {
    if (!state || !submissionId) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      supabase.functions.invoke("ownership-questions", {
        body: { action: "save", submission_id: submissionId, answers: { v2: state } },
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [state, submissionId]);

  // The model scrolls between the form and the result.
  const wasSubmitted = useRef(false);
  useEffect(() => {
    if (!state) return;
    if (wasSubmitted.current === state.submitted) return;
    wasSubmitted.current = state.submitted;
    const id = state.submitted ? "result-top" : "form-top";
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
    });
  }, [state?.submitted]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fbfbfd", display: "grid", placeItems: "center", color: "#86868b" }}>
        Opening your questions…
      </div>
    );
  }

  if (error || !state) {
    return (
      <div style={{ minHeight: "100vh", background: "#fbfbfd", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "#4c4c54" }}>
        {error || "We could not open this link."}
      </div>
    );
  }

  const files = packet?.attachments ?? [];
  const L = buildLogic(state, setS, ACCENT, CRM);
  const V: any = L.renderVals();

  // Sending is the one thing the model leaves to us: it writes the answers and
  // the roster of signers back to the file, and tells the office.
  const modelSend = V.send;
  V.send = () => {
    modelSend();
    const people = (L.people() as any[])
      .filter((p) => (p.name || "").trim())
      .map((p, i) => ({
        id: `v2-${i}`,
        name: p.name,
        role: p.dead ? "decedent" : p.roles.some((r: string) => /power of attorney/i.test(r)) ? "agent"
          : p.roles.some((r: string) => /spouse/i.test(r)) ? "spouse"
          : p.roles.some((r: string) => /deed/i.test(r)) ? "owner"
          : p.roles.some((r: string) => /inherit|steps into|by a will/i.test(r)) ? "heir"
          : "owner",
        relationship: p.roles.join(" · "),
        deceased: !!p.dead,
        address: (state.contacts[p.key] || {}).addr || "",
        email: (state.contacts[p.key] || {}).email || "",
        phone: (state.contacts[p.key] || {}).phone || "",
      }));
    supabase.functions.invoke("ownership-questions", {
      body: {
        action: "save",
        submission_id: submissionId,
        finished: true,
        answers: { v2: { ...state, sent: true }, people, sellerNotes: state.note },
      },
    });
  };

  return (
    <div className="fcv2">
      <style>{HOVER_CSS}</style>
      <div style={{"minHeight": "100vh", "background": "#fbfbfd"}}>
        <div style={{"position": "sticky", "top": "0", "zIndex": "50", "background": "rgba(251,251,253,0.86)", "backdropFilter": "saturate(180%) blur(20px)", "WebkitBackdropFilter": "saturate(180%) blur(20px)", "borderBottom": "1px solid rgba(0,0,0,0.06)"}}>
          <div style={{"maxWidth": "1180px", "margin": "0 auto", "padding": "0 clamp(16px,4vw,28px)", "height": "62px", "display": "flex", "alignItems": "center", "gap": "clamp(8px,2.5vw,14px)"}}>
            <img
              src={hibiscusLogo.url}
              alt="Texas Cemetery Brokers"
              width={30}
              height={30}
              style={{ flex: "none", width: "30px", height: "30px", objectFit: "contain" }}
            />
            <span style={{"flex": "0 1 auto", "minWidth": "0", "display": "flex", "flexDirection": "column", "lineHeight": "1.15"}}>
              <span style={{"overflow": "hidden", "textOverflow": "ellipsis", "whiteSpace": "nowrap", "fontFamily": "'DM Serif Display', Georgia, serif", "fontSize": "clamp(15px,4vw,18px)", "color": "#1d1d1f"}}>
                Texas Cemetery Brokers
              </span>
              <span style={{"fontSize": "10px", "fontWeight": "500", "letterSpacing": "0.16em", "textTransform": "uppercase", "color": "#9a9aa2", "whiteSpace": "nowrap"}}>
                Ownership confirmation
              </span>
            </span>
            <span style={{"flex": "1 1 6px", "minWidth": "0"}}>
            </span>
            <span style={{"flex": "none", "whiteSpace": "nowrap", "fontSize": "clamp(11px,3vw,12.5px)", "color": "#86868b"}}>
              {V.progressLabel}
            </span>
            <div style={{"flex": "none", "width": "clamp(44px,15vw,96px)", "height": "4px", "borderRadius": "2px", "background": "rgba(0,0,0,0.08)", "overflow": "hidden"}}>
              <div style={{"height": "100%", "borderRadius": "2px", "background": `${V.accent}`, "width": `${V.progressPct}`, "transition": "width .5s cubic-bezier(.4,0,.2,1)"}}>
              </div>
            </div>
          </div>
        </div>
        <div style={{"maxWidth": "1180px", "margin": "0 auto", "padding": "0 clamp(16px,4vw,28px) 120px clamp(16px,4vw,28px)"}}>
          <div style={{"padding": "clamp(48px,8vw,76px) 0 clamp(30px,5vw,42px) 0", "textAlign": "center"}}>
            <div style={{"fontSize": "11.5px", "fontWeight": "500", "letterSpacing": "0.18em", "textTransform": "uppercase", "color": `${V.accent}`}}>
              For the {V.family} family
            </div>
            <h1 style={{"margin": "18px 0 0 0", "fontSize": "clamp(34px,7.4vw,54px)", "lineHeight": "1.08", "color": "#1d1d1f", "textWrap": "balance"}}>
              Six questions about the deed.
            </h1>
            <p style={{"margin": "20px auto 0 auto", "maxWidth": "33em", "fontSize": "clamp(16.5px,3.6vw,18.5px)", "lineHeight": "1.55", "fontWeight": "300", "color": "#4c4c54", "textWrap": "pretty"}}>
              Cemetery plots pass differently to houses or money. These six answers tell us who legally has a say, and who we need to post a power of attorney to. The family tree draws itself alongside as you go.
            </p>
            <div style={{"display": "inline-flex", "flexWrap": "wrap", "justifyContent": "center", "alignItems": "center", "gap": "8px 18px", "marginTop": "26px", "padding": "12px 22px", "borderRadius": "100px", "background": "rgba(74,107,84,0.07)", "border": "1px solid rgba(74,107,84,0.14)"}}>
              <span style={{"fontSize": "13.5px", "fontWeight": "400", "color": "#4a5a4e"}}>
                {V.cemetery}
              </span>
              <span style={{"width": "3px", "height": "3px", "borderRadius": "50%", "background": "#b9c3bb"}}></span>
              <span style={{"fontSize": "13.5px", "fontWeight": "300", "color": "#6e7a70"}}>
                {V.location}
              </span>
              <span style={{"width": "3px", "height": "3px", "borderRadius": "50%", "background": "#b9c3bb"}}></span>
              <span style={{"fontSize": "13.5px", "fontWeight": "300", "color": "#6e7a70"}}>
                {V.deedNote}
              </span>
            </div>
          </div>
          {V.showForm ? (<React.Fragment>
            <div id="form-top" style={{"display": "flex", "flexWrap": "wrap", "gap": "22px"}}>
              <div style={{"flex": "4 1 520px", "minWidth": "0"}}>
                <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": "0 2px 14px 2px"}}>
                  <span style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.09em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                    Stage one · Your six questions
                  </span>
                  <span style={{"flex": "1", "height": "1px", "background": "#ececf0"}}>
                  </span>
                </div>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
                  <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)"}}>
                    <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                      <div style={{"flex": "none", "minWidth": "24px", "height": "24px", "padding": "0 9px", "borderRadius": "100px", "background": `${V.n1bg}`, "color": `${V.n1fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "whiteSpace": "nowrap", "transition": "background .3s ease"}}>
                        1 & 3
                      </div>
                      <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                        The deed, and who has died
                      </div>
                    </div>
                    <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                      Who is named on the most current deed?
                    </h3>
                    <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                      Everyone printed on the certificate of ownership, exactly as it is written. Include anyone who has since died, and mark them so.
                    </p>
                    <div style={{"display": "flex", "flexDirection": "column", "gap": "8px", "marginTop": "20px"}}>
                      {(V.deedRows || []).map((d: any, i0: number) => (
                        <React.Fragment key={i0}>
                          <div style={{"display": "flex", "flexDirection": "column", "gap": "10px", "padding": "11px 13px", "borderRadius": "15px", "background": `${d.cardBg}`, "border": `1px solid ${d.cardBd}`, "transition": "background .25s ease, border-color .25s ease"}}>
                           <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "center"}}>
                            <div style={{"flex": "none", "width": "38px", "height": "38px", "borderRadius": "50%", "background": `${d.avBg}`, "color": `${d.avFg}`, "display": "grid", "placeItems": "center", "fontSize": "14px", "fontWeight": "600", "transition": "background .25s ease"}}>
                              {d.initials}
                            </div>
                            <input value={d.name ?? ""} onChange={d.setName} placeholder="Full name as printed on the deed" style={{"flex": "1", "minWidth": "150px", "padding": "8px 10px", "fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f", "background": "transparent", "border": "1px solid transparent", "borderRadius": "10px", "outline": "none"}} className="dcx2" />
                            <div style={{"display": "flex", "background": "#f2f2f5", "borderRadius": "10px", "padding": "3px"}}>
                              {(d.seg || []).map((o: any, i1: number) => (
                                <React.Fragment key={i1}>
                                  <div onClick={o.pick} style={{"padding": "7px 12px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`, "transition": "background .2s ease, color .2s ease"}}>
                                    {o.label}
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                            <div onClick={d.remove} style={{"flex": "none", "width": "32px", "height": "32px", "display": "grid", "placeItems": "center", "borderRadius": "50%", "color": "#b7b7bf", "fontSize": "18px", "cursor": "pointer", "userSelect": "none"}} className="dcx3">
                              ×
                            </div>
                           </div>
                           {d.marriedAsk ? (
                            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "center", "paddingLeft": "48px"}}>
                              <span style={{"fontSize": "13.5px", "fontWeight": "400", "color": "#6e6e73"}}>{d.marriedLabel}</span>
                              <div style={{"display": "flex", "background": "#f2f2f5", "borderRadius": "10px", "padding": "3px"}}>
                                {(d.marriedSeg || []).map((o: any, im: number) => (
                                  <div key={im} onClick={o.pick} style={{"padding": "6px 11px", "borderRadius": "8px", "fontSize": "13px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`, "transition": "background .2s ease, color .2s ease"}}>
                                    {o.label}
                                  </div>
                                ))}
                              </div>
                              {d.marriedYes ? (
                                <input value={d.spouseName ?? ""} onChange={d.setSpouseName} placeholder="Husband or wife's full name" style={{"flex": "1", "minWidth": "180px", "padding": "8px 12px", "fontSize": "15px", "color": "#1d1d1f", "background": "#fafafc", "border": "1px solid #ececf0", "borderRadius": "10px", "outline": "none"}} className="dcx5" />
                              ) : null}
                            </div>
                           ) : null}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                    {V.coupleAsk ? (
                      <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "center", "marginTop": "14px", "padding": "12px 14px", "borderRadius": "15px", "background": "#f7f8f6", "border": "1px solid #ececf0"}}>
                        <span style={{"fontSize": "14px", "fontWeight": "400", "color": "#3a3a3f"}}>
                          Are {V.coupleNames} married to each other?
                        </span>
                        <div style={{"display": "flex", "background": "#ffffff", "borderRadius": "10px", "padding": "3px", "border": "1px solid #ececf0"}}>
                          {(V.coupleSeg || []).map((o: any, ic: number) => (
                            <div key={ic} onClick={o.pick} style={{"padding": "6px 11px", "borderRadius": "8px", "fontSize": "13px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`, "transition": "background .2s ease, color .2s ease"}}>
                              {o.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div onClick={V.addDeed} style={{"display": "inline-block", "marginTop": "11px", "padding": "10px 17px", "borderRadius": "100px", "border": "1.5px dashed #dcdce1", "fontSize": "14.5px", "fontWeight": "500", "color": `${V.accent}`, "cursor": "pointer", "userSelect": "none"}} className="dcx4">
                      + Add another name
                    </div>
                  </div>
                  {V.show2 ? (<React.Fragment>
                    <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)", "animation": "rise .45s cubic-bezier(.2,.7,.3,1) both"}}>
                      <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                        <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n2bg}`, "color": `${V.n2fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                          2
                        </div>
                        <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                          About you
                        </div>
                      </div>
                      <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                        What is your relationship to the people named on the deed?
                      </h3>
                      <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73"}}>
                        It decides whether you can sign, or whether you are helping someone who can.
                      </p>
                      <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px", "marginTop": "20px"}}>
                        {(V.relOpts || []).map((r: any, i2: number) => (
                          <React.Fragment key={i2}>
                            <div onClick={r.pick} style={{"padding": "10px 16px", "borderRadius": "100px", "fontSize": "15px", "fontWeight": "500", "cursor": "pointer", "userSelect": "none", "background": `${r.bg}`, "color": `${r.fg}`, "border": `1.5px solid ${r.bd}`, "transition": "background .2s ease, border-color .2s ease, color .2s ease"}}>
                              {r.label}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      {V.relIsSelf ? (<React.Fragment>
                        <div style={{"marginTop": "20px", "padding": "17px 19px", "borderRadius": "15px", "background": "#f5f5f7", "animation": "fade .3s both"}}>
                          <div style={{"fontSize": "15px", "fontWeight": "500", "color": "#1d1d1f"}}>
                            Which name on the deed is you?
                          </div>
                          <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px", "marginTop": "11px"}}>
                            {(V.selfOpts || []).map((s: any, i3: number) => (
                              <React.Fragment key={i3}>
                                <div onClick={s.pick} style={{"padding": "9px 15px", "borderRadius": "100px", "fontSize": "14.5px", "fontWeight": "500", "cursor": "pointer", "userSelect": "none", "background": `${s.bg}`, "color": `${s.fg}`, "border": `1.5px solid ${s.bd}`}}>
                                  {s.label}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </React.Fragment>) : null}
                      {V.relIsOther ? (<React.Fragment>
                        <input value={V.relOther ?? ""} onChange={V.setRelOther} placeholder="How are you connected to them?" style={{"width": "100%", "marginTop": "16px", "padding": "12px 14px", "fontSize": "16px", "fontWeight": "400", "color": "#1d1d1f", "background": "#f5f5f7", "border": "1px solid transparent", "borderRadius": "12px", "outline": "none", "animation": "fade .3s both"}} className="dcx5" />
                      </React.Fragment>) : null}
                      {V.needYourName ? (<React.Fragment>
                        <div style={{"marginTop": "16px", "animation": "fade .3s both"}}>
                          <div style={{"fontSize": "15px", "fontWeight": "500", "color": "#1d1d1f"}}>
                            Your full name
                          </div>
                          <input value={V.youName ?? ""} onChange={V.setYouName} placeholder="As it appears on your ID" style={{"width": "100%", "marginTop": "9px", "padding": "12px 14px", "fontSize": "16px", "fontWeight": "400", "color": "#1d1d1f", "background": "#f5f5f7", "border": "1px solid transparent", "borderRadius": "12px", "outline": "none"}} className="dcx6" />
                          <div style={{"marginTop": "6px", "fontSize": "13px", "fontWeight": "300", "lineHeight": "1.5", "color": "#9a9aa2", "textWrap": "pretty"}}>
                            Use the same spelling wherever your name comes up again. We match people by name, so one spelling keeps you as one person rather than two.
                          </div>
                        </div>
                      </React.Fragment>) : null}
                    </div>
                  </React.Fragment>) : null}
                  {V.show3 ? (<React.Fragment>
                    <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)", "animation": "rise .45s cubic-bezier(.2,.7,.3,1) both"}}>
                      <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                        <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n3bg}`, "color": `${V.n3fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                          4
                        </div>
                        <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                          Power of attorney
                        </div>
                      </div>
                      <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                        Does anyone hold a power of attorney for someone living on the deed?
                      </h3>
                      <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                        If so they sign in that person's name, not their own, and we post the paperwork to them instead.
                      </p>
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "9px", "marginTop": "20px"}}>
                        {(V.poaRows || []).map((p: any, i4: number) => (
                          <React.Fragment key={i4}>
                            <div style={{"padding": "13px 15px", "borderRadius": "15px", "background": "#fafafc", "border": "1px solid #ececf0"}}>
                              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "11px", "alignItems": "center"}}>
                                <div style={{"flex": "1", "minWidth": "140px", "fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                                  {p.name}
                                </div>
                                <div style={{"display": "flex", "background": "#f0f0f3", "borderRadius": "10px", "padding": "3px"}}>
                                  {(p.seg || []).map((o: any, i5: number) => (
                                    <React.Fragment key={i5}>
                                      <div onClick={o.pick} style={{"padding": "7px 13px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`}}>
                                        {o.label}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                              {p.yes ? (<React.Fragment>
                                <div style={{"marginTop": "11px", "animation": "fade .3s both"}}>
                                  <input value={p.agent ?? ""} onChange={p.setAgent} placeholder="Who holds it? Full name" style={{"width": "100%", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none"}} className="dcx7" />
                                  <div style={{"marginTop": "6px", "fontSize": "13px", "fontWeight": "300", "lineHeight": "1.5", "color": "#9a9aa2", "textWrap": "pretty"}}>
                                    We ask for their address at the end. We also need to see the document itself, because a power of attorney only works here if it covers property and allows the authority to be passed on to us.
                                  </div>
                                </div>
                              </React.Fragment>) : null}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      {V.noLiving ? (<React.Fragment>
                        <div style={{"marginTop": "18px", "padding": "15px 17px", "borderRadius": "13px", "background": "#f5f5f7", "fontSize": "14.5px", "fontWeight": "300", "color": "#4c4c54"}}>
                          Everyone on the deed has died, so there is no power of attorney to record. A power of attorney ends at death in any case.
                        </div>
                      </React.Fragment>) : null}
                    </div>
                  </React.Fragment>) : null}
                  {V.show4 ? (<React.Fragment>
                    <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)", "animation": "rise .45s cubic-bezier(.2,.7,.3,1) both"}}>
                      <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                        <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n4bg}`, "color": `${V.n4fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                          5
                        </div>
                        <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                          The spaces
                        </div>
                      </div>
                      <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                        Have any of the spaces on the deed ever been used?
                      </h3>
                      <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                        Once someone is interred, the family holds reserved rights over the remaining spaces and some cemeteries restrict resale altogether. We check their rules before going further.
                      </p>
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "9px", "marginTop": "20px"}}>
                        {(V.spaceRows || []).map((sp: any, i6: number) => (
                          <React.Fragment key={i6}>
                            <div style={{"padding": "13px 15px", "borderRadius": "15px", "background": "#fafafc", "border": "1px solid #ececf0"}}>
                              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "11px", "alignItems": "center"}}>
                                <div style={{"flex": "1", "minWidth": "110px", "fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                                  {sp.label}
                                </div>
                                <div style={{"display": "flex", "background": "#f0f0f3", "borderRadius": "10px", "padding": "3px"}}>
                                  {(sp.seg || []).map((o: any, i7: number) => (
                                    <React.Fragment key={i7}>
                                      <div onClick={o.pick} style={{"padding": "7px 12px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`}}>
                                        {o.label}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                              {sp.used ? (<React.Fragment>
                                <input value={sp.who ?? ""} onChange={sp.setWho} placeholder="Who is interred there? Full name" style={{"width": "100%", "marginTop": "11px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none", "animation": "fade .3s both"}} className="dcx8" />
                              </React.Fragment>) : null}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>) : null}
                  {V.show5 ? (<React.Fragment>
                    <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)", "animation": "rise .45s cubic-bezier(.2,.7,.3,1) both"}}>
                      <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                        <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n5bg}`, "color": `${V.n5fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                          6
                        </div>
                        <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                          Spouses
                        </div>
                      </div>
                      <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                        Does anyone on the deed have a legal spouse who is not named on it?
                      </h3>
                      <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                        Living or deceased, and not divorced. A husband or wife holds a right to be buried in the plot even when their name never appears on the deed, so a sale needs their consent. "Don't know" is a perfectly good answer.
                      </p>
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "9px", "marginTop": "20px"}}>
                        {(V.spouseRows || []).map((s: any, i8: number) => (
                          <React.Fragment key={i8}>
                            <div style={{"padding": "13px 15px", "borderRadius": "15px", "background": "#fafafc", "border": "1px solid #ececf0"}}>
                              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "11px", "alignItems": "center"}}>
                                <div style={{"flex": "1", "minWidth": "140px"}}>
                                  <div style={{"fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                                    {s.name}
                                  </div>
                                  <div style={{"marginTop": "1px", "fontSize": "12.5px", "fontWeight": "300", "color": "#9a9aa2"}}>
                                    {s.status}
                                  </div>
                                </div>
                                <div style={{"display": "flex", "background": "#f0f0f3", "borderRadius": "10px", "padding": "3px"}}>
                                  {(s.seg || []).map((o: any, i9: number) => (
                                    <React.Fragment key={i9}>
                                      <div onClick={o.pick} style={{"padding": "7px 11px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`}}>
                                        {o.label}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                              {s.yes ? (<React.Fragment>
                                <input value={s.spouseName ?? ""} onChange={s.setSpouse} placeholder="Their spouse's full name" style={{"width": "100%", "marginTop": "11px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none", "animation": "fade .3s both"}} className="dcx9" />
                              </React.Fragment>) : null}
                              {s.unknown ? (<React.Fragment>
                                <div style={{"marginTop": "11px", "fontSize": "13.5px", "fontWeight": "300", "lineHeight": "1.5", "color": "#9a9aa2", "animation": "fade .3s both"}}>
                                  That is fine. We will search the marriage records ourselves before anything is signed.
                                </div>
                              </React.Fragment>) : null}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>) : null}
                </div>
                {V.showStage2 ? (<React.Fragment>
                  <div style={{"animation": "rise .5s cubic-bezier(.2,.7,.3,1) both"}}>
                    <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": "40px 2px 14px 2px"}}>
                      <span style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.09em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                        Stage two · Follow-ups
                      </span>
                      <span style={{"flex": "1", "height": "1px", "background": "#ececf0"}}>
                      </span>
                    </div>
                    <p style={{"margin": "0 2px 16px 2px", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                      {V.stage2Intro}
                    </p>
                    <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
                      <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)"}}>
                        <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                          <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n6bg}`, "color": `${V.n6fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                            1
                          </div>
                          <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                            Follow-up one · Wills
                          </div>
                        </div>
                        <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                          Did the will specifically identify the plot?
                        </h3>
                        <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                          A will that names the plot sends it to one person, and the rest of the family drops out of the picture. A will that says nothing about it, or no will at all, sends it down the family line instead.
                        </p>
                        <div style={{"display": "flex", "flexDirection": "column", "gap": "9px", "marginTop": "20px"}}>
                          {(V.willRows || []).map((w: any, i10: number) => (
                            <React.Fragment key={i10}>
                              <div style={{"padding": "13px 15px", "borderRadius": "15px", "background": "#fafafc", "border": "1px solid #ececf0"}}>
                                <div style={{"display": "flex", "flexWrap": "wrap", "gap": "11px", "alignItems": "center"}}>
                                  <div style={{"flex": "1", "minWidth": "140px", "fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                                    {w.name}
                                  </div>
                                  <div style={{"display": "flex", "background": "#f0f0f3", "borderRadius": "10px", "padding": "3px"}}>
                                    {(w.seg || []).map((o: any, i11: number) => (
                                      <React.Fragment key={i11}>
                                        <div onClick={o.pick} style={{"padding": "7px 11px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`}}>
                                          {o.label}
                                        </div>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                                {w.yes ? (<React.Fragment>
                                  <div style={{"animation": "fade .3s both"}}>
                                    <input value={w.taker ?? ""} onChange={w.setTaker} placeholder="Who does the will leave the plot to?" style={{"width": "100%", "marginTop": "11px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none"}} className="dcx10" />
                                    <div style={{"marginTop": "6px", "fontSize": "13px", "fontWeight": "300", "lineHeight": "1.5", "color": "#9a9aa2", "textWrap": "pretty"}}>
                                      That person takes the share on their own, so we will not need the rest of the family for it. The will still has to have been through court.
                                    </div>
                                  </div>
                                </React.Fragment>) : null}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      {V.show7 ? (<React.Fragment>
                        <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)", "animation": "rise .45s cubic-bezier(.2,.7,.3,1) both"}}>
                          <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                            <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n7bg}`, "color": `${V.n7fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                              2
                            </div>
                            <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                              Follow-up two · The family tree
                            </div>
                          </div>
                          <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                            Who are the surviving descendants?
                          </h3>
                          <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                            Every biological child, including from an earlier marriage, and any legally adopted child. Not step-children. First generation only, unless one of those children has died and their own children survive, in which case add the grandchildren underneath.
                          </p>
                          <div style={{"display": "flex", "flexDirection": "column", "gap": "8px", "marginTop": "20px"}}>
                            {(V.estates || []).map((e: any, i12: number) => (
                              <React.Fragment key={i12}>
                                <div style={{"display": "flex", "flexWrap": "wrap", "gap": "12px", "alignItems": "center", "padding": "14px 16px", "borderRadius": "16px", "background": "#f5f5f7"}}>
                                  <div style={{"flex": "none", "width": "40px", "height": "40px", "borderRadius": "50%", "background": "#e6e6ea", "color": "#6e6e73", "display": "grid", "placeItems": "center", "fontSize": "14.5px", "fontWeight": "600"}}>
                                    {e.initials}
                                  </div>
                                  <div style={{"flex": "1", "minWidth": "130px"}}>
                                    <div style={{"fontSize": "17px", "fontWeight": "600", "letterSpacing": "-0.014em", "color": "#1d1d1f"}}>
                                      {e.name}
                                    </div>
                                    <div style={{"marginTop": "1px", "fontSize": "13px", "fontWeight": "300", "color": "#9a9aa2"}}>
                                      {e.sub}
                                    </div>
                                  </div>
                                  <div onClick={e.toggleNone} style={{"padding": "9px 15px", "borderRadius": "100px", "fontSize": "14px", "fontWeight": "500", "cursor": "pointer", "userSelect": "none", "whiteSpace": "nowrap", "background": `${e.noneBg}`, "color": `${e.noneFg}`, "border": `1.5px solid ${e.noneBd}`}}>
                                    {e.noneLabel}
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                          <div style={{"margin": "2px 0 0 20px", "padding": "12px 0 0 20px", "borderLeft": "2px solid #ececf0"}}>
                            {V.showAddMe ? (<React.Fragment>
                              <div onClick={V.addMe} style={{"display": "inline-block", "marginBottom": "11px", "padding": "9px 15px", "borderRadius": "100px", "background": "#f0f0f3", "fontSize": "14px", "fontWeight": "500", "color": "#4c4c54", "cursor": "pointer", "userSelect": "none"}} className="dcx11">
                                {V.addMeLabel}
                              </div>
                            </React.Fragment>) : null}
                            {(V.kidRows || []).map((k: any, i13: number) => (
                              <React.Fragment key={i13}>
                                <div style={{"padding": "5px 0"}}>
                                  <div style={{"padding": "12px 14px", "borderRadius": "15px", "background": `${k.cardBg}`, "border": `1px solid ${k.cardBd}`}}>
                                    <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "center"}}>
                                      <div style={{"flex": "none", "width": "36px", "height": "36px", "borderRadius": "50%", "background": `${k.avBg}`, "color": `${k.avFg}`, "display": "grid", "placeItems": "center", "fontSize": "13.5px", "fontWeight": "600"}}>
                                        {k.initials}
                                      </div>
                                      <div style={{"flex": "1", "minWidth": "130px"}}>
                                        <input value={k.name ?? ""} onChange={k.setName} placeholder="Child's full name" style={{"width": "100%", "padding": "6px 8px", "fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f", "background": "transparent", "border": "1px solid transparent", "borderRadius": "9px", "outline": "none"}} className="dcx13" />
                                        <div style={{"marginTop": "1px", "paddingLeft": "8px", "fontSize": "12.5px", "fontWeight": "300", "color": "#9a9aa2"}}>
                                          {k.rel}
                                        </div>
                                      </div>
                                      {k.isYou ? (<React.Fragment>
                                        <div style={{"padding": "5px 11px", "borderRadius": "100px", "background": `${V.accent}`, "color": "#ffffff", "fontSize": "12px", "fontWeight": "500", "whiteSpace": "nowrap"}}>
                                          This is you
                                        </div>
                                      </React.Fragment>) : null}
                                      <div style={{"display": "flex", "background": "#f2f2f5", "borderRadius": "10px", "padding": "3px"}}>
                                        {(k.seg || []).map((o: any, i14: number) => (
                                          <React.Fragment key={i14}>
                                            <div onClick={o.pick} style={{"padding": "7px 12px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`}}>
                                              {o.label}
                                            </div>
                                          </React.Fragment>
                                        ))}
                                      </div>
                                      <div onClick={k.remove} style={{"flex": "none", "width": "32px", "height": "32px", "display": "grid", "placeItems": "center", "borderRadius": "50%", "color": "#b7b7bf", "fontSize": "18px", "cursor": "pointer", "userSelect": "none"}} className="dcx14">
                                        ×
                                      </div>
                                    </div>
                                    {k.showParents ? (<React.Fragment>
                                      <div style={{"display": "flex", "flexWrap": "wrap", "gap": "7px", "alignItems": "center", "marginTop": "11px", "paddingTop": "11px", "borderTop": "1px solid #ececf0"}}>
                                        <span style={{"fontSize": "13px", "fontWeight": "300", "color": "#9a9aa2"}}>
                                          Child of
                                        </span>
                                        {(k.parents || []).map((pa: any, i15: number) => (
                                          <React.Fragment key={i15}>
                                            <div onClick={pa.toggle} style={{"padding": "6px 12px", "borderRadius": "100px", "fontSize": "13px", "fontWeight": "500", "cursor": "pointer", "userSelect": "none", "background": `${pa.bg}`, "color": `${pa.fg}`, "border": `1.5px solid ${pa.bd}`}}>
                                              {pa.label}
                                            </div>
                                          </React.Fragment>
                                        ))}
                                        <span style={{"fontSize": "12.5px", "fontWeight": "300", "color": "#b7b7bf"}}>
                                          Pick both if they are a child of both.
                                        </span>
                                      </div>
                                    </React.Fragment>) : null}
                                  </div>
                                  {k.dead ? (<React.Fragment>
                                    <div style={{"margin": "2px 0 2px 16px", "padding": "4px 0 6px 16px", "borderLeft": "2px solid #ececf0", "animation": "fade .3s both"}}>
                                      <div style={{"padding": "5px 0 3px 0", "fontSize": "13px", "fontWeight": "300", "lineHeight": "1.5", "color": "#9a9aa2", "textWrap": "pretty"}}>
                                        {k.passLabel}
                                      </div>
                                      {(k.kids || []).map((g: any, i16: number) => (
                                        <React.Fragment key={i16}>
                                          <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px", "alignItems": "center", "padding": "9px 11px", "margin": "4px 0", "borderRadius": "12px", "background": "#ffffff", "border": "1px solid #ececf0"}}>
                                            <div style={{"flex": "none", "width": "28px", "height": "28px", "borderRadius": "50%", "background": `${g.avBg}`, "color": `${g.avFg}`, "display": "grid", "placeItems": "center", "fontSize": "11.5px", "fontWeight": "600"}}>
                                              {g.initials}
                                            </div>
                                            <input value={g.name ?? ""} onChange={g.setName} placeholder="Grandchild's full name" style={{"flex": "1", "minWidth": "120px", "padding": "6px 8px", "fontSize": "15px", "fontWeight": "500", "color": "#1d1d1f", "background": "transparent", "border": "1px solid transparent", "borderRadius": "9px", "outline": "none"}} className="dcx16" />
                                            <div onClick={g.remove} style={{"flex": "none", "width": "28px", "height": "28px", "display": "grid", "placeItems": "center", "borderRadius": "50%", "color": "#b7b7bf", "fontSize": "17px", "cursor": "pointer", "userSelect": "none"}} className="dcx17">
                                              ×
                                            </div>
                                          </div>
                                        </React.Fragment>
                                      ))}
                                      <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px", "alignItems": "center", "marginTop": "4px"}}>
                                        <div onClick={k.addKid} style={{"display": "inline-block", "padding": "8px 13px", "borderRadius": "100px", "background": "#f5f5f7", "fontSize": "13.5px", "fontWeight": "500", "color": "#4c4c54", "cursor": "pointer", "userSelect": "none"}} className="dcx18">
                                          + Add a grandchild
                                        </div>
                                        <div onClick={k.toggleNoneKids} style={{"display": "inline-block", "padding": "8px 13px", "borderRadius": "100px", "background": k.noneKids ? V.accent : "#ffffff", "color": k.noneKids ? "#ffffff" : "#4c4c54", "border": `1.5px solid ${k.noneKids ? V.accent : "#e3e3e8"}`, "fontSize": "13.5px", "fontWeight": "500", "cursor": "pointer", "userSelect": "none"}}>
                                          {k.noneKidsLabel}
                                        </div>
                                      </div>
                                    </div>
                                  </React.Fragment>) : null}
                                </div>
                              </React.Fragment>
                            ))}
                            <div onClick={V.addKid} style={{"display": "inline-block", "marginTop": "11px", "padding": "10px 17px", "borderRadius": "100px", "border": "1.5px dashed #dcdce1", "fontSize": "14.5px", "fontWeight": "500", "color": `${V.accent}`, "cursor": "pointer", "userSelect": "none"}} className="dcx19">
                              + Add a child
                            </div>
                          </div>
                        </div>
                      </React.Fragment>) : null}
                      {V.show8 ? (<React.Fragment>
                        <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)", "animation": "rise .45s cubic-bezier(.2,.7,.3,1) both"}}>
                          <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                            <div style={{"flex": "none", "width": "24px", "height": "24px", "borderRadius": "50%", "background": `${V.n8bg}`, "color": `${V.n8fg}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600", "transition": "background .3s ease"}}>
                              3
                            </div>
                            <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                              Follow-up three · Their spouses
                            </div>
                          </div>
                          <h3 style={{"margin": "13px 0 0 0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                            Are the people who inherit married?
                          </h3>
                          <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                            The moment someone inherits a share of the plot, their husband or wife gains a right to be buried in it, exactly as with the original owners. So each of their spouses signs a consent too, and gets their own document in the post.
                          </p>
                          <div style={{"display": "flex", "flexDirection": "column", "gap": "9px", "marginTop": "20px"}}>
                            {(V.heirSpouseRows || []).map((h: any, i17: number) => (
                              <React.Fragment key={i17}>
                                <div style={{"padding": "13px 15px", "borderRadius": "15px", "background": "#fafafc", "border": "1px solid #ececf0"}}>
                                  <div style={{"display": "flex", "flexWrap": "wrap", "gap": "11px", "alignItems": "center"}}>
                                    <div style={{"flex": "1", "minWidth": "140px"}}>
                                      <div style={{"fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                                        {h.name}
                                      </div>
                                      <div style={{"marginTop": "1px", "fontSize": "12.5px", "fontWeight": "300", "color": "#9a9aa2"}}>
                                        {h.rel}
                                      </div>
                                    </div>
                                    <div style={{"display": "flex", "background": "#f0f0f3", "borderRadius": "10px", "padding": "3px"}}>
                                      {(h.seg || []).map((o: any, i18: number) => (
                                        <React.Fragment key={i18}>
                                          <div onClick={o.pick} style={{"padding": "7px 11px", "borderRadius": "8px", "fontSize": "13.5px", "fontWeight": "500", "whiteSpace": "nowrap", "cursor": "pointer", "userSelect": "none", "background": `${o.bg}`, "color": `${o.fg}`, "boxShadow": `${o.sh}`}}>
                                            {o.label}
                                          </div>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                  {h.yes ? (<React.Fragment>
                                    <input value={h.spouseName ?? ""} onChange={h.setSpouse} placeholder="Their husband or wife's full name" style={{"width": "100%", "marginTop": "11px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none", "animation": "fade .3s both"}} className="dcx20" />
                                  </React.Fragment>) : null}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </React.Fragment>) : null}
                    </div>
                  </div>
                </React.Fragment>) : null}
                {V.showContacts ? (<React.Fragment>
                  <div style={{"animation": "rise .5s cubic-bezier(.2,.7,.3,1) both"}}>
                    <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": "40px 2px 14px 2px"}}>
                      <span style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.09em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                        Last step · Where we post the paperwork
                      </span>
                      <span style={{"flex": "1", "height": "1px", "background": "#ececf0"}}>
                      </span>
                    </div>
                    <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,30px) clamp(18px,3.6vw,30px)"}}>
                      <h3 style={{"margin": "0", "fontSize": "clamp(20px,3.6vw,24px)", "lineHeight": "1.24", "fontWeight": "600", "letterSpacing": "-0.021em", "color": "#1d1d1f", "textWrap": "pretty"}}>
                        {V.contactsTitle}
                      </h3>
                      <p style={{"margin": "8px 0 0 0", "fontSize": "15.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                        Your answers say these are the people with a say in the sale. Anyone who came up more than once appears here once, with every hat they wear. An address is what we really need; email and phone just make it faster.
                      </p>
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "10px", "marginTop": "22px"}}>
                        {(V.contacts || []).map((c: any, i19: number) => (
                          <React.Fragment key={i19}>
                            <div style={{"padding": "17px 19px", "borderRadius": "16px", "background": "#fafafc", "border": `1px solid ${c.bd}`}}>
                              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "baseline"}}>
                                <div style={{"fontSize": "17.5px", "fontWeight": "600", "letterSpacing": "-0.014em", "color": `${c.nameFg}`}}>
                                  {c.name}
                                </div>
                                <div style={{"flex": "1", "minWidth": "0"}}>
                                </div>
                                <div style={{"padding": "5px 11px", "borderRadius": "100px", "fontSize": "11.5px", "fontWeight": "500", "whiteSpace": "nowrap", "background": `${c.tagBg}`, "color": `${c.tagFg}`}}>
                                  {c.tag}
                                </div>
                              </div>
                              <div style={{"display": "flex", "flexDirection": "column", "gap": "3px", "marginTop": "6px"}}>
                                {(c.roles || []).map((r: any, i20: number) => (
                                  <React.Fragment key={i20}>
                                    <div style={{"fontSize": "13.5px", "fontWeight": "300", "lineHeight": "1.5", "color": "#6e6e73", "textWrap": "pretty"}}>
                                      {r}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                              <textarea value={c.addr ?? ""} onChange={c.setAddr} placeholder="Postal address" style={{"width": "100%", "marginTop": "13px", "minHeight": "72px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "lineHeight": "1.5", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none", "resize": "vertical"}} className="dcx21" />
                              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "9px", "marginTop": "9px"}}>
                                <input value={c.email ?? ""} onChange={c.setEmail} placeholder="Email, if you have it" style={{"flex": "1", "minWidth": "170px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none"}} className="dcx22" />
                                <input value={c.phone ?? ""} onChange={c.setPhone} placeholder="Phone" style={{"flex": "1", "minWidth": "140px", "padding": "11px 13px", "fontSize": "15.5px", "fontWeight": "400", "color": "#1d1d1f", "background": "#ffffff", "border": "1px solid #e3e3e8", "borderRadius": "11px", "outline": "none"}} className="dcx23" />
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={{"marginTop": "24px"}}>
                        <div style={{"fontSize": "16.5px", "fontWeight": "500", "letterSpacing": "-0.012em", "color": "#1d1d1f"}}>
                          Anything else we should know?
                        </div>
                        <div style={{"marginTop": "3px", "fontSize": "14px", "fontWeight": "300", "color": "#9a9aa2"}}>
                          Optional. Estrangements, missing relatives, anything unusual, or a question for us.
                        </div>
                        <textarea value={V.note ?? ""} onChange={V.setNote} placeholder="Type here…" style={{"width": "100%", "marginTop": "12px", "minHeight": "92px", "padding": "13px 15px", "fontSize": "16px", "fontWeight": "400", "lineHeight": "1.5", "color": "#1d1d1f", "background": "#f5f5f7", "border": "1px solid transparent", "borderRadius": "13px", "outline": "none", "resize": "vertical"}} className="dcx24" />
                      </div>
                      <div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "14px", "marginTop": "24px"}}>
                        <div onClick={V.submit} style={{"padding": "14px 28px", "borderRadius": "100px", "background": `${V.accent}`, "color": "#ffffff", "fontSize": "16.5px", "fontWeight": "500", "letterSpacing": "-0.012em", "cursor": "pointer", "userSelect": "none", "transition": "transform .18s ease"}} className="dcx26">
                          Show me who has to sign
                        </div>
                        <span style={{"fontSize": "14px", "fontWeight": "300", "color": "#9a9aa2"}}>
                          You will see the whole list before anything is sent.
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>) : null}
              </div>
              <div style={{"flex": "1 1 296px", "minWidth": "268px"}}>
                <DocsRail files={files} />
                <div style={{"position": "sticky", "top": "74px", "maxHeight": "calc(100vh - 96px)", "overflowY": "auto", "overscrollBehavior": "contain", "background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "20px 18px 18px 18px"}}>
                  <div style={{"display": "flex", "alignItems": "baseline", "gap": "8px"}}>
                    <div style={{"fontSize": "12px", "fontWeight": "500", "letterSpacing": "0.09em", "textTransform": "uppercase", "color": "#9a9aa2"}}>
                      The picture so far
                    </div>
                    <span style={{"flex": "1"}}>
                    </span>
                    <div style={{"fontSize": "12.5px", "fontWeight": "500", "color": `${V.accent}`, "whiteSpace": "nowrap"}}>
                      {V.panelCount}
                    </div>
                  </div>
                  {V.panelEmpty ? (<React.Fragment>
                    <div style={{"marginTop": "16px", "padding": "30px 14px", "borderRadius": "15px", "border": "1.5px dashed #e6e6eb", "textAlign": "center"}}>
                      <div style={{"fontSize": "13.5px", "fontWeight": "400", "color": "#86868b"}}>
                        The tree draws itself
                      </div>
                      <div style={{"marginTop": "4px", "fontSize": "13px", "fontWeight": "300", "lineHeight": "1.5", "color": "#b7b7bf"}}>
                        Every name you add appears here, so you can see who the sale depends on.
                      </div>
                    </div>
                  </React.Fragment>) : null}
                  {V.panelShow ? (<React.Fragment>
                    <div style={{"marginTop": "18px"}}>
                      <div style={{"textAlign": "center", "margin": "0 0 10px 0", "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": "0.16em", "textTransform": "uppercase", "color": "#b7b7bf"}}>
                        On the deed
                      </div>
                      <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "center", "gap": "10px"}}>
                        {(V.pDeed || []).map((col: any, i21: number) => (
                          <React.Fragment key={i21}>
                            <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "width": "104px"}}>
                              {(col.stack || []).map((c: any, i22: number) => (
                                <React.Fragment key={i22}>
                                  <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "width": "100%", "animation": "pop .3s cubic-bezier(.2,.7,.3,1) both"}}>
                                    {c.linked ? (<React.Fragment>
                                      <div style={{"width": "2px", "height": "11px", "background": "#e3e3e8", "marginTop": "5px"}}>
                                      </div>
                                      <div style={{"fontSize": "9.5px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#b7b7bf", "margin": "3px 0 4px 0"}}>
                                        {c.link}
                                      </div>
                                    </React.Fragment>) : null}
                                    <div style={{"width": "42px", "height": "42px", "borderRadius": "50%", "background": `${c.avBg}`, "color": `${c.avFg}`, "border": `2px solid ${c.ring}`, "display": "grid", "placeItems": "center", "fontSize": "13.5px", "fontWeight": "600"}}>
                                      {c.initials}
                                    </div>
                                    <div style={{"marginTop": "5px", "fontSize": "12.5px", "fontWeight": "500", "lineHeight": "1.25", "textAlign": "center", "wordBreak": "break-word", "color": `${c.nameFg}`}}>
                                      {c.short}
                                    </div>
                                    <div style={{"marginTop": "3px", "padding": "2px 7px", "borderRadius": "100px", "background": "#f5f5f7", "fontSize": "9px", "fontWeight": "600", "letterSpacing": "0.06em", "textTransform": "uppercase", "textAlign": "center", "lineHeight": "1.3", "color": `${c.tagFg}`}}>
                                      {c.tag}
                                    </div>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      {V.pHasKids ? (<React.Fragment>
                        <div style={{"animation": "fade .35s both"}}>
                          <div style={{"width": "2px", "height": "16px", "background": "#e3e3e8", "margin": "10px auto 0 auto"}}>
                          </div>
                          <div style={{"height": "2px", "background": "#e3e3e8", "margin": "0 auto", "width": "72%", "borderRadius": "2px"}}>
                          </div>
                          <div style={{"textAlign": "center", "margin": "10px 0 6px 0", "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": "0.16em", "textTransform": "uppercase", "color": "#b7b7bf"}}>
                            Their children
                          </div>
                          <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "center", "gap": "10px"}}>
                            {(V.pKids || []).map((k: any, i23: number) => (
                              <React.Fragment key={i23}>
                                <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "width": "104px"}}>
                                  <div style={{"width": "2px", "height": "14px", "background": "#e3e3e8"}}>
                                  </div>
                                  {(k.stack || []).map((c: any, i24: number) => (
                                    <React.Fragment key={i24}>
                                      <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "width": "100%", "animation": "pop .3s cubic-bezier(.2,.7,.3,1) both"}}>
                                        {c.linked ? (<React.Fragment>
                                          <div style={{"width": "2px", "height": "11px", "background": "#e3e3e8", "marginTop": "5px"}}>
                                          </div>
                                          <div style={{"fontSize": "9.5px", "fontWeight": "500", "letterSpacing": "0.07em", "textTransform": "uppercase", "color": "#b7b7bf", "margin": "3px 0 4px 0"}}>
                                            {c.link}
                                          </div>
                                        </React.Fragment>) : null}
                                        <div style={{"width": "40px", "height": "40px", "borderRadius": "50%", "background": `${c.avBg}`, "color": `${c.avFg}`, "border": `2px solid ${c.ring}`, "display": "grid", "placeItems": "center", "fontSize": "13px", "fontWeight": "600"}}>
                                          {c.initials}
                                        </div>
                                        <div style={{"marginTop": "5px", "fontSize": "12.5px", "fontWeight": "500", "lineHeight": "1.25", "textAlign": "center", "wordBreak": "break-word", "color": `${c.nameFg}`}}>
                                          {c.short}
                                        </div>
                                        <div style={{"marginTop": "3px", "padding": "2px 7px", "borderRadius": "100px", "background": "#f5f5f7", "fontSize": "9px", "fontWeight": "600", "letterSpacing": "0.06em", "textTransform": "uppercase", "textAlign": "center", "lineHeight": "1.3", "color": `${c.tagFg}`}}>
                                          {c.tag}
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  ))}
                                  {k.hasKids ? (<React.Fragment>
                                    <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "width": "100%", "animation": "fade .35s both"}}>
                                      <div style={{"width": "2px", "height": "14px", "background": "#e3e3e8", "marginTop": "8px"}}>
                                      </div>
                                      <div style={{"fontSize": "9px", "fontWeight": "600", "letterSpacing": "0.12em", "textTransform": "uppercase", "color": "#b7b7bf", "margin": "2px 0 2px 0"}}>
                                        Step into this share
                                      </div>
                                      {(k.kids || []).map((g: any, i25: number) => (
                                        <React.Fragment key={i25}>
                                          <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "width": "100%", "paddingTop": "4px", "animation": "pop .3s cubic-bezier(.2,.7,.3,1) both"}}>
                                            <div style={{"width": "34px", "height": "34px", "borderRadius": "50%", "background": `${g.avBg}`, "color": `${g.avFg}`, "border": `2px solid ${g.ring}`, "display": "grid", "placeItems": "center", "fontSize": "12px", "fontWeight": "600"}}>
                                              {g.initials}
                                            </div>
                                            <div style={{"marginTop": "4px", "fontSize": "12px", "fontWeight": "500", "lineHeight": "1.25", "textAlign": "center", "wordBreak": "break-word", "color": `${g.nameFg}`}}>
                                              {g.short}
                                            </div>
                                            <div style={{"marginTop": "3px", "padding": "2px 7px", "borderRadius": "100px", "background": "#f5f5f7", "fontSize": "9px", "fontWeight": "600", "letterSpacing": "0.06em", "textTransform": "uppercase", "textAlign": "center", "lineHeight": "1.3", "color": `${g.tagFg}`}}>
                                              {g.tag}
                                            </div>
                                          </div>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </React.Fragment>) : null}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </React.Fragment>) : null}
                    </div>
                    <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px 14px", "marginTop": "22px", "paddingTop": "14px", "borderTop": "1px solid #f0f0f3"}}>
                      {(V.legend || []).map((l: any, i26: number) => (
                        <React.Fragment key={i26}>
                          <div style={{"display": "flex", "alignItems": "center", "gap": "6px"}}>
                            <div style={{"width": "11px", "height": "11px", "borderRadius": "50%", "background": `${l.bg}`, "border": `2px solid ${l.ring}`}}>
                            </div>
                            <span style={{"fontSize": "12px", "fontWeight": "300", "color": "#86868b"}}>
                              {l.label}
                            </span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                    {V.panelNote ? (<React.Fragment>
                      <div style={{"marginTop": "12px", "padding": "12px 13px", "borderRadius": "12px", "background": "#f5f5f7", "fontSize": "12.5px", "fontWeight": "300", "lineHeight": "1.5", "color": "#6e6e73", "textWrap": "pretty"}}>
                        {V.panelNote}
                      </div>
                    </React.Fragment>) : null}
                  </React.Fragment>) : null}
                </div>
              </div>
            </div>
          </React.Fragment>) : null}
          {V.submitted ? (<React.Fragment>
            <div id="result-top" style={{"maxWidth": "800px", "margin": "0 auto", "animation": "rise .5s cubic-bezier(.2,.7,.3,1) both"}}>
              <div style={{"padding": "clamp(30px,6vw,52px) 0 8px 0", "textAlign": "center"}}>
                <div style={{"display": "inline-grid", "placeItems": "center", "width": "54px", "height": "54px", "borderRadius": "50%", "background": `${V.accent}`, "marginBottom": "20px"}}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <path d="M6 13.4 10.8 18.2 20 8.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{"strokeDasharray": "20", "animation": "draw .5s .15s cubic-bezier(.4,0,.2,1) both"}}>
                    </path>
                  </svg>
                </div>
                <h2 style={{"margin": "0", "fontSize": "clamp(27px,5.6vw,36px)", "lineHeight": "1.1", "fontWeight": "600", "letterSpacing": "-0.028em"}}>
                  {V.signerHeadline}
                </h2>
                <p style={{"margin": "13px auto 0 auto", "maxWidth": "33em", "fontSize": "16.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                  Everyone below holds an ownership share or a right of interment in the plot. The decision has to be unanimous, so each of them receives a limited power of attorney and signs before a notary.
                </p>
              </div>
              <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,32px) clamp(18px,3.6vw,32px)", "marginTop": "28px"}}>
                <h3 style={{"margin": "0 0 3px 0", "fontSize": "21px", "fontWeight": "600", "letterSpacing": "-0.019em"}}>
                  The power of attorney goes to
                </h3>
                <p style={{"margin": "0 0 20px 0", "fontSize": "15px", "fontWeight": "300", "color": "#6e6e73"}}>
                  One document each, in the post, already prepared.
                </p>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                  {(V.signers || []).map((p: any, i27: number) => (
                    <React.Fragment key={i27}>
                      <div style={{"padding": "18px 20px", "borderRadius": "15px", "background": `${p.bg}`, "border": `1px solid ${p.bd}`}}>
                        <div style={{"display": "flex", "alignItems": "baseline", "flexWrap": "wrap", "gap": "10px"}}>
                          <span style={{"fontSize": "18px", "fontWeight": "600", "letterSpacing": "-0.016em", "color": `${p.nameFg}`}}>
                            {p.name}
                          </span>
                          <span style={{"flex": "1", "minWidth": "0"}}>
                          </span>
                          <span style={{"padding": "5px 11px", "borderRadius": "100px", "fontSize": "11.5px", "fontWeight": "500", "whiteSpace": "nowrap", "background": `${p.tagBg}`, "color": `${p.tagFg}`}}>
                            {p.tag}
                          </span>
                        </div>
                        <div style={{"display": "flex", "flexDirection": "column", "gap": "3px", "marginTop": "7px"}}>
                          {(p.roles || []).map((r: any, i28: number) => (
                            <React.Fragment key={i28}>
                              <div style={{"fontSize": "14px", "fontWeight": "400", "lineHeight": "1.5", "color": `${p.roleFg}`, "textWrap": "pretty"}}>
                                {r}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                        <div style={{"marginTop": "12px", "paddingTop": "12px", "borderTop": `1px solid ${p.rule}`, "fontSize": "14.5px", "fontWeight": "300", "lineHeight": "1.55", "color": `${p.addrFg}`, "whiteSpace": "pre-line"}}>
                          {p.addr}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,32px) clamp(18px,3.6vw,32px)", "marginTop": "12px"}}>
                <h3 style={{"margin": "0 0 3px 0", "fontSize": "21px", "fontWeight": "600", "letterSpacing": "-0.019em"}}>
                  Documents to send us
                </h3>
                <p style={{"margin": "0 0 6px 0", "fontSize": "15px", "fontWeight": "300", "color": "#6e6e73"}}>
                  Photos from a phone are fine. Reply to our email with whatever you have.
                </p>
                {(V.docs || []).map((d: any, i29: number) => (
                  <React.Fragment key={i29}>
                    <div style={{"display": "flex", "gap": "15px", "padding": "16px 0", "borderTop": "1px solid #ececf0"}}>
                      <div style={{"flex": "none", "width": "21px", "height": "21px", "marginTop": "1px", "borderRadius": "6px", "border": `1.5px solid ${d.boxBd}`, "background": `${d.boxBg}`}}>
                      </div>
                      <div style={{"flex": "1", "minWidth": "0"}}>
                        <div style={{"fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                          {d.name}
                        </div>
                        <div style={{"marginTop": "3px", "fontSize": "14.5px", "fontWeight": "300", "lineHeight": "1.5", "color": "#6e6e73", "textWrap": "pretty"}}>
                          {d.why}
                        </div>
                        {d.have ? (<React.Fragment>
                          <div style={{"marginTop": "5px", "fontSize": "13px", "fontWeight": "500", "color": `${V.accent}`}}>
                            Already on file
                          </div>
                        </React.Fragment>) : null}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              {V.hasFlags ? (<React.Fragment>
                <div style={{"background": "#fdf6f3", "borderRadius": "20px", "border": "1px solid #f2ddd5", "padding": "clamp(22px,4vw,32px) clamp(18px,3.6vw,32px)", "marginTop": "12px"}}>
                  <h3 style={{"margin": "0 0 3px 0", "fontSize": "21px", "fontWeight": "600", "letterSpacing": "-0.019em", "color": "#7d3a28"}}>
                    We will work through these with you
                  </h3>
                  <p style={{"margin": "0 0 16px 0", "fontSize": "15px", "fontWeight": "300", "color": "#96543f"}}>
                    None of it stops a sale. It just means a phone call first.
                  </p>
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "14px"}}>
                    {(V.flags || []).map((fl: any, i30: number) => (
                      <React.Fragment key={i30}>
                        <div>
                          <div style={{"fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#7d3a28"}}>
                            {fl.name}
                          </div>
                          <div style={{"marginTop": "3px", "fontSize": "14.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#96543f", "textWrap": "pretty"}}>
                            {fl.why}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </React.Fragment>) : null}
              <div style={{"background": "#ffffff", "borderRadius": "20px", "boxShadow": "0 1px 2px rgba(0,0,0,0.03), 0 6px 22px rgba(0,0,0,0.045)", "padding": "clamp(22px,4vw,32px) clamp(18px,3.6vw,32px)", "marginTop": "12px"}}>
                <h3 style={{"margin": "0 0 20px 0", "fontSize": "21px", "fontWeight": "600", "letterSpacing": "-0.019em"}}>
                  What happens next
                </h3>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "18px"}}>
                  {(V.steps || []).map((st: any, i31: number) => (
                    <React.Fragment key={i31}>
                      <div style={{"display": "flex", "gap": "15px", "alignItems": "flex-start"}}>
                        <div style={{"flex": "none", "width": "27px", "height": "27px", "borderRadius": "50%", "background": "#f2f2f5", "display": "grid", "placeItems": "center", "fontSize": "13.5px", "fontWeight": "500", "color": "#4c4c54"}}>
                          {st.n}
                        </div>
                        <div style={{"flex": "1", "minWidth": "0", "paddingTop": "2px"}}>
                          <div style={{"fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em", "color": "#1d1d1f"}}>
                            {st.t}
                          </div>
                          <div style={{"marginTop": "3px", "fontSize": "14.5px", "fontWeight": "300", "lineHeight": "1.55", "color": "#6e6e73", "textWrap": "pretty"}}>
                            {st.d}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "12px", "marginTop": "26px"}}>
                <div onClick={V.send} style={{"padding": "14px 28px", "borderRadius": "100px", "background": `${V.sendBg}`, "color": `${V.sendFg}`, "fontSize": "16.5px", "fontWeight": "500", "letterSpacing": "-0.012em", "cursor": "pointer", "userSelect": "none", "transition": "transform .18s ease"}} className="dcx28">
                  {V.sendLabel}
                </div>
                <div onClick={V.reopen} style={{"padding": "14px 24px", "borderRadius": "100px", "background": "#f0f0f3", "color": "#1d1d1f", "fontSize": "16.5px", "fontWeight": "400", "cursor": "pointer", "userSelect": "none"}} className="dcx29">
                  Change an answer
                </div>
                <div onClick={V.print} style={{"padding": "14px 18px", "fontSize": "15.5px", "fontWeight": "400", "color": "#9a9aa2", "cursor": "pointer", "userSelect": "none"}} className="dcx30">
                  Save a copy
                </div>
              </div>
            </div>
          </React.Fragment>) : null}
          <div style={{"maxWidth": "800px", "margin": "64px auto 0 auto", "paddingTop": "30px", "borderTop": "1px solid #ececf0", "display": "flex", "flexWrap": "wrap", "gap": "26px", "alignItems": "flex-start"}}>
            <div style={{"flex": "1", "minWidth": "230px"}}>
              <div style={{"fontSize": "16px", "fontWeight": "500", "letterSpacing": "-0.011em"}}>
                Would you rather talk it through?
              </div>
              <div style={{"marginTop": "4px", "fontSize": "15px", "fontWeight": "300", "lineHeight": "1.6", "color": "#6e6e73"}}>
                Call us at
                <a href="tel:+18175550140">
                  (817) 555-0140
                </a>
                , Monday to Friday, 9 to 5 Central. We can fill this in with you over the phone.
              </div>
            </div>
            <div style={{"flex": "1", "minWidth": "230px"}}>
              <div style={{"fontSize": "12.5px", "fontWeight": "300", "lineHeight": "1.6", "color": "#9a9aa2", "textWrap": "pretty"}}>
                This page works out which documents to request and who to write to. It is not legal advice. Texas inheritance has wrinkles this simplifies, and every cemetery sets its own rules, so anything unusual we confirm with you before a single document is signed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnershipConfirm;
