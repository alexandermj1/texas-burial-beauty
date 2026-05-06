import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, X, ChevronLeft, ChevronRight, Inbox, Search, Bell, UserPlus,
  Megaphone, Mail, FileSignature, Send, MessageCircleX, CheckCircle, Layers,
  Users, MessageSquare, AtSign, Sparkles, ListChecks, Eye, Phone,
  ClipboardList, Building2, MapPin, Trophy, RefreshCw, ArrowRight,
} from "lucide-react";

interface Step {
  title: string;
  subtitle?: string;
  Icon: any;
  body: React.ReactNode;
  tag?: string;
}

const steps: Step[] = [
  {
    title: "Welcome to your dashboard",
    subtitle: "A quick tour — about 3 minutes",
    Icon: Sparkles,
    tag: "Getting started",
    body: (
      <>
        <p>
          This walkthrough explains every part of the admin dashboard, with a focus on the <strong>Submissions</strong> section
          — the heart of your day-to-day work. You can leave at any time using <em>Skip</em>, or replay the tour later from the
          <strong> "Take the tour"</strong> button at the bottom of the screen.
        </p>
        <p className="text-muted-foreground">
          Use the <ChevronRight className="inline w-4 h-4 -mt-0.5" /> arrow or press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono">→</kbd> to move forward.
        </p>
      </>
    ),
  },
  {
    title: "The top bar — your home base",
    Icon: Compass,
    tag: "Layout",
    body: (
      <>
        <p>
          At the top you'll always see four things: the <strong>Menu</strong> button (opens the section switcher), the
          <strong> Search</strong> bar in the middle, your <strong>name & avatar</strong> on the right, and the
          <strong> notifications bell</strong> 🔔.
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2"><Search className="w-4 h-4 mt-0.5 text-primary shrink-0" /> Search filters whatever section you're in (submissions, listings, cemeteries…).</li>
          <li className="flex gap-2"><Bell className="w-4 h-4 mt-0.5 text-primary shrink-0" /> The bell shows a red dot when you've been mentioned or have replies waiting.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Switching between sections",
    Icon: Layers,
    tag: "Navigation",
    body: (
      <>
        <p>Click the <strong>Menu</strong> button (top-left) to reveal every section of the dashboard:</p>
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
        <p className="text-muted-foreground text-sm">A small number next to each tab tells you how many items need attention.</p>
      </>
    ),
  },
  {
    title: "Submissions — the basics",
    subtitle: "Where every customer lands",
    Icon: Inbox,
    tag: "Submissions",
    body: (
      <>
        <p>
          Every enquiry — whether from a website form, an email, or a phone call you typed in — appears as a
          <strong> card on the left</strong>. Click any card and the customer's full record opens on the right.
        </p>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Anatomy of a card</div>
          <ul className="space-y-1.5 text-sm">
            <li>• <strong>Name & contact</strong> — who they are</li>
            <li>• <strong>Cemetery / property</strong> — what they're asking about</li>
            <li>• A coloured <strong>"New" badge</strong> if they came in today</li>
            <li>• A small <strong>avatar bubble</strong> if a teammate is currently viewing them</li>
            <li>• A "Manually added by …" badge if it came from a phone call</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    title: "Filtering the list",
    Icon: ListChecks,
    tag: "Submissions",
    body: (
      <>
        <p>Just above the list you have two filter chips:</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200">
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-medium">New today</span>
            <span className="text-sm">Only shows enquiries that arrived after midnight today.</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-medium">All</span>
            <span className="text-sm">Every submission you've ever received.</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Combine the filter with the search bar at the top to find anyone instantly.</p>
      </>
    ),
  },
  {
    title: "Adding a customer from a phone call",
    Icon: UserPlus,
    tag: "Submissions",
    body: (
      <>
        <p>
          When someone calls you, click <strong className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"><UserPlus className="w-3 h-3" /> Add submission</strong> at the top of the panel.
        </p>
        <p>Fill in their name, phone, email, and what they're after. Hit save and they appear at the top of the list with a <em>"Manually added by [your name]"</em> badge so the team knows it came from a call rather than the website.</p>
      </>
    ),
  },
  {
    title: "Messaging the whole team",
    Icon: Megaphone,
    tag: "Submissions",
    body: (
      <>
        <p>
          Click <strong className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"><Megaphone className="w-3 h-3" /> Message team</strong> to send an announcement
          to <strong>every team member</strong> at once.
        </p>
        <p className="text-sm text-muted-foreground">Use this for general updates that aren't tied to a specific customer (e.g. "I'll be off this afternoon"). The note appears in everyone's notification bell.</p>
      </>
    ),
  },
  {
    title: "Real-time presence",
    Icon: Eye,
    tag: "Submissions",
    body: (
      <>
        <p>
          When a teammate opens a customer's record, you'll see their <strong>name appear next to the row</strong> with a soft
          accent highlight. The moment they switch to a different customer, the highlight moves with them — live.
        </p>
        <p className="text-sm text-muted-foreground">This stops two of you accidentally calling the same lead at the same time.</p>
      </>
    ),
  },
  {
    title: "Opening a customer record",
    Icon: ChevronRight,
    tag: "Submissions",
    body: (
      <>
        <p>Click any card. The right-hand panel fills with everything you need:</p>
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
    tag: "Submissions",
    body: (
      <>
        <p>
          Scroll to the <strong>Notes</strong> section on a customer's record. Type your message and press send.
          To get a teammate's attention, type <strong className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs"><AtSign className="inline w-3 h-3" />name</strong> and pick them
          from the list — they'll get a notification.
        </p>
        <p className="text-sm">Choose <strong>@everyone</strong> to ping the whole team. Click <strong>Reply</strong> on any note to start a thread; the original author is auto-notified.</p>
      </>
    ),
  },
  {
    title: "Sending quotes & responses",
    Icon: Send,
    tag: "Submissions",
    body: (
      <>
        <p>From inside a customer's record you have three big action buttons:</p>
        <div className="space-y-2">
          <div className="flex gap-3 p-2.5 rounded-lg border border-border bg-card">
            <Send className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
            <div><div className="text-sm font-medium">Send quote</div><div className="text-xs text-muted-foreground">Send the customer your price + transfer fee. Auto-emailed and logged.</div></div>
          </div>
          <div className="flex gap-3 p-2.5 rounded-lg border border-border bg-card">
            <FileSignature className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div><div className="text-sm font-medium">Send DocuSign</div><div className="text-xs text-muted-foreground">Kick off the signing flow once the customer accepts.</div></div>
          </div>
          <div className="flex gap-3 p-2.5 rounded-lg border border-border bg-card">
            <MessageCircleX className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
            <div><div className="text-sm font-medium">Send decline</div><div className="text-xs text-muted-foreground">Politely turn down a request you can't help with — the message is pre-written.</div></div>
          </div>
        </div>
      </>
    ),
  },
  {
    title: "Marking work done",
    Icon: CheckCircle,
    tag: "Submissions",
    body: (
      <>
        <p>
          When a customer is fully dealt with — sold, declined, or no longer interested — click
          <strong className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs ml-1"><CheckCircle className="w-3 h-3" /> Mark handled</strong>.
        </p>
        <p className="text-sm text-muted-foreground">They drop out of the open count at the top of the tab so the team knows they no longer need attention.</p>
      </>
    ),
  },
  {
    title: "Notifications — the bell",
    Icon: Bell,
    tag: "Notifications",
    body: (
      <>
        <p>The 🔔 in the top-right shows a red dot when something needs you:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• Someone <strong>@mentioned</strong> you in a note</li>
          <li>• Someone <strong>replied</strong> to one of your notes</li>
          <li>• A <strong>team-wide</strong> message was sent</li>
        </ul>
        <p className="text-sm">Click a notification and you're taken straight to the customer record and exact note it's about — no hunting around.</p>
      </>
    ),
  },
  {
    title: "Gmail Inbox",
    Icon: Mail,
    tag: "Beyond submissions",
    body: (
      <>
        <p>
          The <strong>Gmail Inbox</strong> tab pulls in emails sent to your shared inbox. If an email is from someone who isn't
          a customer yet, click <strong>"Open customer"</strong> and we'll create a submission for them and jump straight into it.
        </p>
        <p className="text-sm text-muted-foreground">Use the <RefreshCw className="inline w-3 h-3" /> refresh button at the top to pull the very latest mail.</p>
      </>
    ),
  },
  {
    title: "If something goes wrong",
    Icon: ArrowRight,
    tag: "Help",
    body: (
      <>
        <p>First try refreshing the page. If the problem persists:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• Open any customer record</li>
          <li>• Leave a note that <strong>@mentions</strong> an admin</li>
          <li>• They'll get notified instantly and can investigate</li>
        </ul>
        <p>You can also press the <strong>Help</strong> button (bottom-right) any time for quick FAQ-style answers, or
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

const GuidedTour = () => {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

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
  const close = () => { setOpen(false); try { localStorage.setItem(TOUR_KEY, "1"); } catch {} };

  const step = steps[i];
  const Icon = step?.Icon;
  const pct = ((i + 1) / steps.length) * 100;

  return (
    <>
      <button
        onClick={start}
        aria-label="Take the guided tour"
        className="fixed bottom-6 right-32 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-soft hover:opacity-90 transition-all hover:shadow-md text-sm font-medium"
      >
        <Compass className="w-4 h-4" />
        Take the tour
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-2xl bg-background rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
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
                <div className="flex items-start justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      {step.tag && (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{step.tag} · Step {i + 1} of {steps.length}</div>
                      )}
                      <h2 className="font-display text-xl text-foreground leading-tight">{step.title}</h2>
                      {step.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>}
                    </div>
                  </div>
                  <button onClick={close} aria-label="Close tour" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 text-sm text-foreground leading-relaxed"
                    >
                      {step.body}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    {steps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setI(idx)}
                        aria-label={`Go to step ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : idx < i ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={close}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => setI(p => Math.max(0, p - 1))}
                      disabled={i === 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    {i < steps.length - 1 ? (
                      <button
                        onClick={() => setI(p => Math.min(steps.length - 1, p + 1))}
                        className="inline-flex items-center gap-1 px-4 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={close}
                        className="inline-flex items-center gap-1 px-4 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
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
