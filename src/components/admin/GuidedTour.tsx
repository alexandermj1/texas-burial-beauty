import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, X, ChevronLeft, ChevronRight, Inbox, Search, Bell, UserPlus,
  Megaphone, Mail, FileSignature, Send, MessageCircleX, CheckCircle, Layers,
  Users, MessageSquare, AtSign, Sparkles, ListChecks, Eye, Phone,
  ClipboardList, Building2, MapPin, Trophy, RefreshCw, ArrowRight, Zap,
  Target, Globe,
} from "lucide-react";

interface Step {
  title: string;
  subtitle?: string;
  Icon: any;
  body: React.ReactNode;
  tag?: string;
  /** CSS selector of the element to spotlight on the live page. */
  target?: string;
  /** Where to position the popover relative to the spotlighted element. */
  side?: "top" | "bottom" | "left" | "right" | "center";
  /** Run this just before showing the step (e.g. open the menu, switch tabs). */
  before?: (ctx: TourContext) => void | Promise<void>;
}

interface TourContext {
  goToSubmissions: () => void;
  openMenu: (open: boolean) => void;
  selectFirstSubmission: () => void;
}

const steps: Step[] = [
  {
    title: "Welcome to your dashboard",
    subtitle: "A quick guided tour — about 4 minutes",
    Icon: Sparkles,
    tag: "Getting started",
    side: "center",
    body: (
      <>
        <p>
          This software is built around <strong>collaboration</strong> — the whole team can see what's happening in real time
          and pick up where anyone else left off, from anywhere. We use it to track every customer and every listing through the
          <strong> entire process</strong>: first contact → quote → DocuSign → transfer → sale.
        </p>
        <p>
          The tour will physically <strong>highlight each part of the screen</strong> as it explains it, with extra focus on the
          <strong> Submissions</strong> page (where most of your work lives). You can leave any time using <em>Skip</em>, or replay
          this from the <strong>"Take the tour"</strong> button at the bottom-right.
        </p>
        <p className="text-muted-foreground text-sm">
          Use <ChevronRight className="inline w-4 h-4 -mt-0.5" /> or press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono">→</kbd> to move forward.
        </p>
      </>
    ),
  },
  {
    title: "Why this software exists",
    Icon: Zap,
    tag: "The big picture",
    side: "center",
    body: (
      <>
        <p>The dashboard solves three problems we used to have:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• <strong>Nothing falls through the cracks</strong> — every email, form, and phone call lands in one place.</li>
          <li>• <strong>No double-handling</strong> — you can see live who's working on whom.</li>
          <li>• <strong>Track listings end-to-end</strong> — from the first enquiry through quote, DocuSign, transfer, and final sale, all from anywhere with internet.</li>
        </ul>
        <p className="text-sm text-muted-foreground">It's all about working together more efficiently — fewer phone calls between us, faster responses to the customer.</p>
      </>
    ),
  },
  {
    title: "The Menu button",
    subtitle: "Switch between every section of the dashboard",
    Icon: Layers,
    tag: "Navigation",
    target: '[data-tour="menu-button"]',
    side: "bottom",
    before: (ctx) => { ctx.goToSubmissions(); },
    body: (
      <>
        <p>The <strong>Menu</strong> button (top-left) is your section switcher. Open it to jump between Submissions, Gmail Inbox, Listings, Performance, Customers, Cemeteries, and more.</p>
        <p className="text-sm text-muted-foreground">A small number on each tab tells you how many items in that section need attention.</p>
      </>
    ),
  },
  {
    title: "All sections at a glance",
    Icon: Compass,
    tag: "Navigation",
    target: '[data-tour="menu-panel"]',
    side: "bottom",
    before: (ctx) => { ctx.openMenu(true); },
    body: (
      <>
        <p>Here's everything available. The most-used:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [Inbox, "Submissions", "Customer enquiries"],
            [Mail, "Gmail Inbox", "Synced emails"],
            [Building2, "Listings", "Active inventory"],
            [Trophy, "Performance", "Agent stats"],
            [Users, "Customers", "Master CRM"],
            [ClipboardList, "Inv. Requests", "Buyer needs"],
            [MapPin, "Cemeteries", "Registry"],
            [Building2, "CA Inventory", "Statewide stock"],
          ].map(([Ic, label, desc]: any) => (
            <div key={label} className="flex gap-2 items-start p-2 rounded-lg bg-muted/40 border border-border">
              <Ic className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div><div className="font-medium text-foreground text-xs">{label}</div><div className="text-[11px] text-muted-foreground">{desc}</div></div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: "The global search bar",
    Icon: Search,
    tag: "Navigation",
    target: '[data-tour="search-bar"]',
    side: "bottom",
    before: (ctx) => { ctx.openMenu(false); },
    body: (
      <>
        <p>The search bar at the top filters whatever section you're in. On Submissions it searches names, emails, cemeteries, and message contents. On Listings it searches by cemetery, plot type, status, etc.</p>
        <p className="text-sm text-muted-foreground">Use it to instantly find a customer or listing — no scrolling required.</p>
      </>
    ),
  },
  {
    title: "Notifications bell",
    Icon: Bell,
    tag: "Notifications",
    target: '[data-tour="notifications-bell"]',
    side: "bottom",
    body: (
      <>
        <p>The 🔔 lights up with a red dot when something needs you:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• You were <strong>@mentioned</strong> in a note</li>
          <li>• Someone <strong>replied</strong> to your note</li>
          <li>• A <strong>team-wide message</strong> was sent</li>
        </ul>
        <p className="text-sm">Click any notification and you'll be taken straight to the customer record and exact note it's about.</p>
      </>
    ),
  },
  {
    title: "Submissions — the heart of the system",
    Icon: Inbox,
    tag: "Submissions",
    side: "center",
    body: (
      <>
        <p>
          <strong>Submissions</strong> is where every customer lands — whether they came from the website, a phone call,
          or your shared inbox. We're now going to walk through this page in detail.
        </p>
        <div className="rounded-lg p-3 bg-primary/5 border border-primary/20 text-sm">
          <strong className="flex items-center gap-1.5 text-primary"><Mail className="w-3.5 h-3.5" /> Important:</strong>
          <p className="mt-1">Emails sent to our shared inbox are <strong>automatically pulled in and turned into submissions</strong> — usually within a minute or two of arrival. You don't need to copy-paste anything.</p>
        </div>
      </>
    ),
  },
  {
    title: "Filtering the list",
    Icon: ListChecks,
    tag: "Submissions",
    target: '[data-tour="filters"]',
    side: "bottom",
    body: (
      <>
        <p>These filter chips control what appears in the list:</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200">
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-medium">New today</span>
            <span className="text-sm">Only enquiries that arrived today.</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-medium">All</span>
            <span className="text-sm">Everything we've ever received.</span>
          </div>
          <div className="text-sm">Plus customer-type chips: <strong>Sellers</strong>, <strong>Buyers</strong>, <strong>General</strong>.</div>
        </div>
      </>
    ),
  },
  {
    title: "Add submission (phone calls)",
    Icon: UserPlus,
    tag: "Submissions",
    target: '[data-tour="add-submission"]',
    side: "bottom",
    body: (
      <>
        <p>When someone calls, click here. Type their name, phone, email, and what they want. They'll appear at the top of the list with a yellow <em>"Added by [your name]"</em> badge so the team knows it came from a call rather than the website.</p>
        <p className="text-sm text-muted-foreground">Do this for every call — it keeps the whole team in the loop.</p>
      </>
    ),
  },
  {
    title: "Message the whole team",
    Icon: Megaphone,
    tag: "Submissions",
    target: '[data-tour="message-team"]',
    side: "bottom",
    body: (
      <>
        <p>Use this to send a one-off broadcast to <strong>every team member</strong> — for things not tied to a specific customer.</p>
        <p className="text-sm text-muted-foreground">Examples: "I'll be off this afternoon", "Heads-up: pricing changed on Skylawn", etc. The note pops into everyone's notification bell.</p>
      </>
    ),
  },
  {
    title: "The submissions list",
    Icon: Inbox,
    tag: "Submissions",
    target: '[data-tour="submissions-list"]',
    side: "right",
    body: (
      <>
        <p>Every enquiry shows up here as a card. Each card shows:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• <strong>Name & contact</strong></li>
          <li>• <strong>Cemetery / property</strong> they're asking about</li>
          <li>• A blue <strong>"New" badge</strong> if it came in today</li>
          <li>• A small <strong>avatar bubble</strong> if a teammate is currently viewing them</li>
          <li>• A <em>"Manually added by …"</em> badge for phone calls</li>
        </ul>
        <p className="text-sm">Click any card to open the full record on the right.</p>
      </>
    ),
  },
  {
    title: "Real-time presence",
    Icon: Eye,
    tag: "Submissions",
    target: '[data-tour="submissions-list"]',
    side: "right",
    body: (
      <>
        <p>
          When a teammate clicks a customer, the row gets a soft <strong>terracotta highlight</strong> with their name on it — visible instantly to the rest of the team.
          The moment they switch to a different customer, the highlight moves with them. Live, no refresh.
        </p>
        <p className="text-sm text-muted-foreground">This stops two of you from accidentally calling the same lead at the same time.</p>
      </>
    ),
  },
  {
    title: "The customer record",
    Icon: ChevronRight,
    tag: "Submissions",
    target: '[data-tour="detail-panel"]',
    side: "left",
    before: (ctx) => { ctx.goToSubmissions(); ctx.openMenu(false); ctx.selectFirstSubmission(); },
    body: (
      <>
        <p>Click a card and the right-hand panel fills with everything you need:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• <strong>Contact details</strong> — phone, email, source</li>
          <li>• <strong>What they want</strong> — cemetery, plot type, spaces, budget, timeline</li>
          <li>• <strong>Customer Journey</strong> — every step that has happened so far</li>
          <li>• <strong>Cemetery Match</strong> — inventory we hold matching their request, with retail / resale / payout numbers</li>
          <li>• <strong>Notes</strong> — the team's running conversation about this customer</li>
        </ul>
      </>
    ),
  },
  {
    title: "Notes & @mentions",
    Icon: MessageSquare,
    tag: "Collaboration",
    target: '[data-tour="notes-section"]',
    side: "left",
    before: (ctx) => { ctx.selectFirstSubmission(); },
    body: (
      <>
        <p>
          Inside any customer record, scroll to <strong>Notes</strong>. Type your message and send.
          To get a teammate's attention, type <strong className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs"><AtSign className="inline w-3 h-3" />name</strong> and pick from the list — they'll get a notification.
        </p>
        <p className="text-sm">Use <strong>@everyone</strong> to ping the whole team. Click <strong>Reply</strong> on any note to start a thread; the original author is auto-notified.</p>
        <p className="text-sm text-muted-foreground">The notes section is the team's running history of <em>why</em> we did what we did. Be liberal with notes — your future self will thank you.</p>
      </>
    ),
  },
  {
    title: "Send quote / DocuSign / decline",
    Icon: Send,
    tag: "Actions",
    target: '[data-tour="actions-bar"]',
    side: "top",
    before: (ctx) => { ctx.selectFirstSubmission(); },
    body: (
      <>
        <p>From inside a customer's record you have three big action buttons:</p>
        <div className="space-y-2">
          <div className="flex gap-3 p-2.5 rounded-lg border border-border bg-card">
            <Send className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
            <div><div className="text-sm font-medium">Send quote</div><div className="text-xs text-muted-foreground">Sends the customer a price + transfer fee. Auto-emailed and logged in the journey.</div></div>
          </div>
          <div className="flex gap-3 p-2.5 rounded-lg border border-border bg-card">
            <FileSignature className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div><div className="text-sm font-medium">Send DocuSign</div><div className="text-xs text-muted-foreground">Kicks off the signing flow once the customer accepts the quote.</div></div>
          </div>
          <div className="flex gap-3 p-2.5 rounded-lg border border-border bg-card">
            <MessageCircleX className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
            <div><div className="text-sm font-medium">Send decline</div><div className="text-xs text-muted-foreground">Politely turn down a request we can't help with — pre-written message.</div></div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Every action is logged automatically in the Customer Journey, so anyone who picks up the file later can see exactly what's happened.</p>
      </>
    ),
  },
  {
    title: "Inventory & comps",
    Icon: Layers,
    tag: "Pricing",
    target: '[data-tour="cemetery-box"]',
    side: "left",
    before: (ctx) => { ctx.selectFirstSubmission(); },
    body: (
      <>
        <p>Inside a customer record, click <strong>"View inventory & comps"</strong> in the Cemetery box. You'll see:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• Every plot we currently hold at that cemetery</li>
          <li>• Each one's <strong>retail</strong>, <strong>resale</strong>, <strong>pay-to-seller</strong> price, and <strong>seller margin %</strong></li>
          <li>• Recent sales (comps) at the same cemetery for benchmarking</li>
        </ul>
        <p className="text-sm text-muted-foreground">This is the page to use when sizing up a quote.</p>
      </>
    ),
  },
  {
    title: "Marking work done",
    Icon: CheckCircle,
    tag: "Submissions",
    side: "center",
    body: (
      <>
        <p>
          Once a customer is fully dealt with — sold, declined, or no longer interested — click
          <strong className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs ml-1"><CheckCircle className="w-3 h-3" /> Mark handled</strong>.
        </p>
        <p className="text-sm text-muted-foreground">They drop out of the open count at the top of the tab so the team knows they no longer need attention. They're still searchable any time.</p>
      </>
    ),
  },
  {
    title: "Gmail Inbox tab",
    Icon: Mail,
    tag: "Beyond submissions",
    side: "center",
    body: (
      <>
        <p>Most emails are auto-converted into submissions, but the raw <strong>Gmail Inbox</strong> tab gives you the full mailbox view in case something needs context.</p>
        <p className="text-sm">If an email is from someone who isn't a customer yet, click <strong>"Open customer"</strong> and a submission is created and opened for you.</p>
        <p className="text-sm text-muted-foreground">Use the <RefreshCw className="inline w-3 h-3" /> refresh button to pull the very latest mail on demand.</p>
      </>
    ),
  },
  {
    title: "Track everything, from anywhere",
    Icon: Globe,
    tag: "The takeaway",
    side: "center",
    body: (
      <>
        <p>
          Everything you've just seen runs in the browser — no installs, no syncing. You can pick up the same view of any customer or listing from a phone, a laptop at a cafe, or your desk at home.
        </p>
        <p className="text-sm">Combined with notes, @mentions, and live presence, the team can hand off work mid-conversation without dropping anything.</p>
      </>
    ),
  },
  {
    title: "If something goes wrong",
    Icon: ArrowRight,
    tag: "Help",
    side: "center",
    body: (
      <>
        <p>First try refreshing the page. If the problem persists:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• Open any customer record</li>
          <li>• Leave a note that <strong>@mentions</strong> an admin</li>
          <li>• They'll get notified instantly and can investigate</li>
        </ul>
        <p>You can also press the <strong>Help</strong> button (bottom-right) any time for FAQ-style answers, or
        re-launch this tour from <strong>"Take the tour"</strong> next to it.</p>
        <div className="rounded-lg p-3 bg-sage-light/40 border border-border">
          <div className="flex items-center gap-2 text-foreground font-medium text-sm"><Sparkles className="w-4 h-4 text-primary" /> You're all set!</div>
          <p className="text-xs text-muted-foreground mt-1">Hit "Finish" below to close the tour and start working.</p>
        </div>
      </>
    ),
  },
];

const TOUR_KEY = "admin:guided-tour:dismissed";
const POPOVER_W = 460;
const PADDING = 12;

interface Rect { top: number; left: number; width: number; height: number; }


interface GuidedTourProps {
  onGoToSubmissions?: () => void;
  onOpenMenu?: (open: boolean) => void;
  onSelectFirstSubmission?: () => void;
}

const GuidedTour = ({ onGoToSubmissions, onOpenMenu, onSelectFirstSubmission }: GuidedTourProps) => {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [taken, setTaken] = useState<boolean>(() => {
    try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return false; }
  });

  const ctx: TourContext = {
    goToSubmissions: () => onGoToSubmissions?.(),
    openMenu: (o) => onOpenMenu?.(o),
    selectFirstSubmission: () => onSelectFirstSubmission?.(),
  };

  // Run before-hook + measure target each step.
  useLayoutEffect(() => {
    if (!open) return;
    const step = steps[i];
    let cancelled = false;
    (async () => {
      try { await step.before?.(ctx); } catch {}
      // Wait for DOM to settle (panel open / tab change)
      await new Promise(r => setTimeout(r, 80));
      if (cancelled) return;
      measure();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, open]);

  const measure = () => {
    const step = steps[i];
    if (!step?.target || step.side === "center") {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // measure shortly after scroll
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 250);
  };

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!open) return;
    const onChange = () => {
      const step = steps[i];
      if (!step?.target || step.side === "center") return;
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [i, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowRight") setI(p => Math.min(steps.length - 1, p + 1));
      if (e.key === "ArrowLeft") setI(p => Math.max(0, p - 1));
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const start = () => { setI(0); setOpen(true); };
  const close = () => { setOpen(false); setTaken(true); try { localStorage.setItem(TOUR_KEY, "1"); } catch {} };

  const step = steps[i];
  const Icon = step?.Icon;
  const pct = ((i + 1) / steps.length) * 100;

  // Compute popover position
  const popoverStyle: React.CSSProperties = (() => {
    if (!rect || !step?.target || step.side === "center") {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(POPOVER_W, vw - 32);
    let top = 0, left = 0;
    const side = step.side || "bottom";
    if (side === "bottom") {
      top = rect.top + rect.height + PADDING;
      left = rect.left + rect.width / 2 - w / 2;
    } else if (side === "top") {
      top = rect.top - PADDING - 360;
      left = rect.left + rect.width / 2 - w / 2;
    } else if (side === "right") {
      top = rect.top + rect.height / 2 - 180;
      left = rect.left + rect.width + PADDING;
    } else if (side === "left") {
      top = rect.top + rect.height / 2 - 180;
      left = rect.left - PADDING - w;
    }
    // Clamp
    left = Math.max(16, Math.min(vw - w - 16, left));
    top = Math.max(16, Math.min(vh - 200, top));
    return { top, left, width: w };
  })();

  return (
    <>
      <button
        onClick={start}
        aria-label="Take the guided tour"
        className={
          taken
            ? "inline-flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-soft hover:opacity-90 transition-all hover:shadow-md text-sm font-medium"
            : "fixed bottom-6 right-32 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-soft hover:opacity-90 transition-all hover:shadow-md text-sm font-medium"
        }
      >
        <Compass className="w-4 h-4" />
        Take the tour
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Dim overlay with cutout */}
            {rect && step?.target && step.side !== "center" ? (
              <motion.svg
                key="cutout"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 pointer-events-auto"
                width="100%" height="100%"
                onClick={close}
              >
                <defs>
                  <mask id="tour-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <motion.rect
                      animate={{ x: rect.left - 6, y: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      rx="12" ry="12" fill="black"
                    />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-mask)" />
                {/* Highlight ring */}
                <motion.rect
                  animate={{ x: rect.left - 6, y: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  rx="12" ry="12"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  className="pointer-events-none"
                />
              </motion.svg>
            ) : (
              <motion.div
                key="dim"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
                onClick={close}
              />
            )}

            {/* Popover */}
            <motion.div
              key={`pop-${i}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[60] pointer-events-auto"
              style={popoverStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-[460px] bg-background rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
                {/* Progress */}
                <div className="h-1 bg-muted relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>

                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-4 pb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      {step.tag && (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{step.tag} · Step {i + 1} of {steps.length}</div>
                      )}
                      <h2 className="font-display text-lg text-foreground leading-tight">{step.title}</h2>
                      {step.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</p>}
                    </div>
                  </div>
                  <button onClick={close} aria-label="Close tour" className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 text-sm text-foreground leading-relaxed"
                    >
                      {step.body}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-1">
                    {steps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setI(idx)}
                        aria-label={`Go to step ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : idx < i ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={close}
                      className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => setI(p => Math.max(0, p - 1))}
                      disabled={i === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    {i < steps.length - 1 ? (
                      <button
                        onClick={() => setI(p => Math.min(steps.length - 1, p + 1))}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={close}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                      >
                        Finish <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default GuidedTour;
