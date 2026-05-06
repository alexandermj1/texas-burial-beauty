import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, Inbox, Mail, Sparkles } from "lucide-react";

interface Stat {
  label: string;
  value: number;
  Icon: any;
}

interface WelcomeOverlayProps {
  name: string;
  newSubmissions?: number;
  unreadInbox?: number;
  unreadNotifications?: number;
  totalOpenSubmissions?: number;
  storageKey: string;
}

const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const WelcomeOverlay = ({
  name,
  newSubmissions = 0,
  unreadInbox = 0,
  unreadNotifications = 0,
  totalOpenSubmissions = 0,
  storageKey,
}: WelcomeOverlayProps) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const last = sessionStorage.getItem(storageKey);
      if (!last) {
        setVisible(true);
        sessionStorage.setItem(storageKey, String(Date.now()));
      }
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;
    // Lock background scroll (both html + body) while overlay is up so users can't scroll past the footer
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const t = window.setTimeout(() => setVisible(false), reduce ? 1200 : 4200);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [visible, reduce]);

  const greeting = useMemo(() => greetingFor(new Date()), []);
  const firstName = (name || "there").split(/\s+/)[0];

  const stats: Stat[] = [];
  if (newSubmissions > 0) stats.push({ label: newSubmissions === 1 ? "new submission" : "new submissions", value: newSubmissions, Icon: Sparkles });
  if (totalOpenSubmissions > 0) stats.push({ label: "open", value: totalOpenSubmissions, Icon: Inbox });
  if (unreadInbox > 0) stats.push({ label: "unread emails", value: unreadInbox, Icon: Mail });

  const subtitle = newSubmissions > 0
    ? `While you were away, ${newSubmissions} new ${newSubmissions === 1 ? "submission came" : "submissions came"} in.`
    : "Everything's quiet — nothing new since your last visit.";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="welcome"
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          onClick={() => setVisible(false)}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />

          {/* Soft sage glow */}
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 50% 40% at 50% 45%, hsl(var(--sage) / 0.18), transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.0 }}
            />
          )}

          <motion.div
            className="relative text-center max-w-xl"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <motion.div
              className="mx-auto mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/70 border border-border text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Sparkles className="w-3 h-3 text-sage" />
              Admin Dashboard
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-tight">
              {greeting.split("").map((c, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  style={{ whiteSpace: "pre" }}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.025, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {c}
                </motion.span>
              ))}
              <motion.span
                className="inline-block ml-2 text-sage"
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {firstName}.
              </motion.span>
            </h1>

            <motion.p
              className="mt-4 text-muted-foreground text-base"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              {subtitle}
            </motion.p>

            {stats.length > 0 && (
              <motion.div
                className="mt-7 flex flex-wrap justify-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.25, duration: 0.4 }}
              >
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft"
                    initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1.3 + i * 0.1, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <s.Icon className="w-4 h-4 text-sage" />
                    <span className="text-foreground font-semibold tabular-nums">{s.value}</span>
                    <span className="text-muted-foreground text-sm">{s.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            <motion.div
              className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7, duration: 0.5 }}
            >
              <motion.span
                className="block w-1.5 h-1.5 rounded-full bg-sage"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              Entering the system…
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeOverlay;
