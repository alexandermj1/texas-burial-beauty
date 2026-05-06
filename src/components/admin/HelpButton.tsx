import { useState } from "react";
import { HelpCircle, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HelpItem {
  q: string;
  a: string;
}

const helpSections: { title: string; items: HelpItem[] }[] = [
  {
    title: "Submissions — the basics",
    items: [
      {
        q: "What is the Submissions section?",
        a: "It's where every customer enquiry lands — whether they came in through the website forms, by email, or were entered manually after a phone call. Each card on the left is one customer. Click a card to see all of their details on the right.",
      },
      {
        q: "How do I open a customer's record?",
        a: "Click their card in the list on the left. The right-hand panel will show their contact details, the cemetery they're interested in, notes from the team, and the full journey of what's happened so far.",
      },
      {
        q: "How do I search for someone?",
        a: "Use the search bar at the top of the Submissions section. You can type a name, phone number, email, or cemetery and matching customers will appear instantly.",
      },
    ],
  },
  {
    title: "Adding & messaging",
    items: [
      {
        q: "A customer just called — how do I add them?",
        a: "Click the 'Add submission' button at the top of the Submissions panel. Fill in their details and save. The new entry will appear in the list with a 'Manually added by [your name]' badge so the team knows it came from a call.",
      },
      {
        q: "How do I leave a note for the team about a customer?",
        a: "Open the customer's record and scroll to the Notes section. Type your note and press send. To get someone's attention, type @ and pick their name — they'll get a notification.",
      },
      {
        q: "How do I tag everyone at once?",
        a: "In a note, type @ and choose 'everyone' from the picker. Every team member will be notified.",
      },
      {
        q: "How do I send a message to the whole team (not about a customer)?",
        a: "Click 'Message team' at the top of the Submissions panel. Whatever you write goes to everyone's notification bell as a team announcement.",
      },
      {
        q: "How do replies work?",
        a: "Click 'Reply' under any note to respond in a thread. The original author is automatically notified, and anyone you @mention is too.",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        q: "Where do I see my notifications?",
        a: "The bell icon in the top right shows a red dot when you have unread notifications. Click it to see who mentioned you, who replied to your notes, and any team announcements.",
      },
      {
        q: "What happens when I click a notification?",
        a: "It takes you straight to the customer record and note that the notification is about, so you can reply or take action immediately.",
      },
    ],
  },
  {
    title: "Pipelines",
    items: [
      {
        q: "What's the Seller Pipeline?",
        a: "It's the overview of every seller customer and what stage they're at — new enquiry, quoted, in escrow, completed, etc. Use it to see at a glance where your team's attention is needed.",
      },
      {
        q: "What's the Buyer Pipeline?",
        a: "Same idea, but for buyers — tracking them from initial interest through to a finalised purchase.",
      },
    ],
  },
  {
    title: "General tips",
    items: [
      {
        q: "How do I know which account I'm logged in as?",
        a: "Your name is shown in the header at the top of the dashboard. If you're ever unsure, check there.",
      },
      {
        q: "Something isn't working — what should I do?",
        a: "First try refreshing the page. If the issue continues, leave a note tagging an admin so it gets logged and looked at.",
      },
    ],
  },
];

const HelpButton = () => {
  const [open, setOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help"
        className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-card border border-border shadow-soft text-foreground hover:bg-card transition-all hover:shadow-md text-sm font-medium"
      >
        <HelpCircle className="w-4 h-4 text-primary" />
        Help
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md bg-background border-l border-border shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div>
                  <h2 className="font-display text-xl text-foreground">Help & Guide</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quick answers for getting around the dashboard
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close help"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {helpSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      {section.title}
                    </h3>
                    <div className="space-y-2">
                      {section.items.map((item, i) => {
                        const key = `${section.title}-${i}`;
                        const isOpen = openIndex === key;
                        return (
                          <div
                            key={key}
                            className="rounded-lg border border-border bg-card overflow-hidden"
                          >
                            <button
                              onClick={() => setOpenIndex(isOpen ? null : key)}
                              className="w-full flex items-center justify-between text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                            >
                              <span className="text-sm font-medium text-foreground pr-3">
                                {item.q}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                                    {item.a}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="rounded-lg bg-sage-light/40 border border-border p-4 text-sm text-foreground/80">
                  <p className="font-medium text-foreground mb-1">Still stuck?</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Leave a note on any customer record and tag an admin with @ — they'll get a notification and can help right away.
                  </p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpButton;
