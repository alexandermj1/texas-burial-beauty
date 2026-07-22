import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Upload,
  Sparkles,
  Lock,
  ShieldCheck,
  User,
  Home,
  Users,
  ScrollText,
  Send,
  Phone,
  Mail,
  HelpCircle,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import palmFan from "@/assets/flowers/palm-fan-clean.png.asset.json";
import monstera from "@/assets/flowers/monstera.png.asset.json";
import plumeria from "@/assets/flowers/plumeria-cluster.png.asset.json";
import bananaLeaf from "@/assets/flowers/banana-leaf-clean.png.asset.json";
import Seo from "@/components/Seo";
import { toast } from "@/hooks/use-toast";

// -----------------------------------------------------------------------------
// Experimental self-serve seller portal. Front-end only, persisted to
// localStorage so we can iterate on the flow without any backend wiring.
// Hidden behind a subtle link in the site footer during testing.
// -----------------------------------------------------------------------------

type OwnershipKind = "sole" | "joint" | "inherited" | "estate" | "unknown";
type ContractStatus = "with_seller" | "with_cemetery" | "lost" | "unknown";
type DeathCert = "yes" | "no" | "na";

interface PortalState {
  account: {
    email: string;
    fullName: string;
    phone: string;
    signedIn: boolean;
  };
  property: {
    cemeteryName: string;
    city: string;
    section: string;
    lot: string;
    space: string;
    plotCount: string;
    propertyType: string;
    hasDeed: "yes" | "no" | "unknown" | "";
  };
  ownership: {
    kind: OwnershipKind | "";
    ownerNameOnDeed: string;
    isCurrentOwner: "yes" | "no" | "";
    coOwners: string;
    relationshipToDeceased: string;
    deathCertificate: DeathCert | "";
    probateComplete: "yes" | "no" | "in_progress" | "";
    contractStatus: ContractStatus | "";
  };
  reason: {
    reasonForSelling: string;
    askingPrice: string;
    timeframe: string;
    notes: string;
  };
  docs: Record<string, { name: string; size: number } | null>;
  agreements: {
    truthfulness: boolean;
    authority: boolean;
    listingConsent: boolean;
  };
  submittedAt: string | null;
}

const STORAGE_KEY = "seller-portal-draft-v1";

const emptyState = (): PortalState => ({
  account: { email: "", fullName: "", phone: "", signedIn: false },
  property: {
    cemeteryName: "",
    city: "",
    section: "",
    lot: "",
    space: "",
    plotCount: "1",
    propertyType: "",
    hasDeed: "",
  },
  ownership: {
    kind: "",
    ownerNameOnDeed: "",
    isCurrentOwner: "",
    coOwners: "",
    relationshipToDeceased: "",
    deathCertificate: "",
    probateComplete: "",
    contractStatus: "",
  },
  reason: { reasonForSelling: "", askingPrice: "", timeframe: "", notes: "" },
  docs: {},
  agreements: { truthfulness: false, authority: false, listingConsent: false },
  submittedAt: null,
});

// ---- AI-driven required document list ---------------------------------------
// Given the seller's ownership answers, decide which documents they must
// upload. This mirrors what a broker would ask for in a phone intake.
function requiredDocuments(state: PortalState): { key: string; label: string; hint: string }[] {
  const docs: { key: string; label: string; hint: string }[] = [];
  const { ownership, property } = state;

  docs.push({
    key: "photo_id",
    label: "Government-issued photo ID",
    hint: "Driver's license or passport of the person listing the property.",
  });

  if (property.hasDeed === "yes") {
    docs.push({
      key: "deed",
      label: "Cemetery deed / certificate of ownership",
      hint: "The original deed issued by the cemetery.",
    });
  } else {
    docs.push({
      key: "deed_alt",
      label: "Proof of purchase or cemetery statement",
      hint: "A receipt, cemetery letter, or statement referencing your ownership.",
    });
  }

  if (ownership.kind === "joint") {
    docs.push({
      key: "co_owner_consent",
      label: "Written consent from co-owner(s)",
      hint: "Signed note from each additional owner authorizing the sale.",
    });
  }

  if (ownership.kind === "inherited" || ownership.kind === "estate") {
    docs.push({
      key: "death_certificate",
      label: "Death certificate of original owner",
      hint: "Certified copy for the cemetery's transfer records.",
    });
    if (ownership.probateComplete === "yes") {
      docs.push({
        key: "probate_order",
        label: "Probate / small-estate affidavit",
        hint: "Court document showing you have authority to sell.",
      });
    } else {
      docs.push({
        key: "heirship_affidavit",
        label: "Affidavit of heirship",
        hint: "We'll help you complete this if probate wasn't opened.",
      });
    }
  }

  if (ownership.contractStatus === "lost") {
    docs.push({
      key: "lost_deed_affidavit",
      label: "Lost deed affidavit",
      hint: "Standard affidavit — we provide a template on the next step.",
    });
  }

  return docs;
}

// ---- AI recommendations ------------------------------------------------------
function aiRecommendations(state: PortalState): string[] {
  const notes: string[] = [];
  const { ownership, property } = state;

  if (ownership.kind === "inherited" && !ownership.probateComplete) {
    notes.push(
      "Because you inherited this property, most cemeteries require either a completed probate order or an affidavit of heirship before they will process a transfer.",
    );
  }
  if (ownership.kind === "joint" && ownership.isCurrentOwner === "yes") {
    notes.push(
      "Joint ownership requires written consent from every listed co-owner — even spouses. We've added this to your document checklist.",
    );
  }
  if (property.hasDeed === "no") {
    notes.push(
      "No deed on hand? We can pull your ownership record directly from the cemetery. You'll still want any receipts or statements you have.",
    );
  }
  if (ownership.contractStatus === "with_cemetery") {
    notes.push(
      "The cemetery holds your original — good. We'll request a certified copy when we submit your listing packet.",
    );
  }
  if (property.plotCount && Number(property.plotCount) > 2) {
    notes.push(
      "Multi-plot packages tend to move faster when priced as a family estate. We'll suggest a bundled valuation on your listing.",
    );
  }
  if (!notes.length) {
    notes.push(
      "Your file looks straightforward. Once your documents are uploaded and verified, we can typically have your listing live in 48–72 hours.",
    );
  }
  return notes;
}

// -----------------------------------------------------------------------------
// UI atoms
// -----------------------------------------------------------------------------

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
      {label}
    </span>
    {children}
    {hint && <span className="mt-1.5 block text-xs text-muted-foreground/80">{hint}</span>}
  </label>
);

const inputCls =
  "w-full px-4 py-3 rounded-lg bg-background/60 border border-border/70 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all";

const RadioTile = ({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left p-4 rounded-xl border transition-all ${
      active
        ? "border-primary bg-primary/5 shadow-soft"
        : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"
    }`}
  >
    <div className="flex items-start gap-3">
      {active ? (
        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
      )}
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
    </div>
  </button>
);

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

const STEPS = [
  { id: "account", label: "Account", icon: User },
  { id: "property", label: "Property", icon: Home },
  { id: "ownership", label: "Ownership", icon: Users },
  { id: "reason", label: "Sale details", icon: ScrollText },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "review", label: "Review & submit", icon: Send },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------

export default function SellerPortal() {
  const [state, setState] = useState<PortalState>(emptyState);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...emptyState(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const currentStep = STEPS[stepIdx];
  const canGoNext = useMemo(() => validateStep(currentStep.id, state), [currentStep.id, state]);

  const update = <K extends keyof PortalState>(key: K, patch: Partial<PortalState[K]>) =>
    setState((s) => ({ ...s, [key]: { ...(s[key] as object), ...patch } }));

  const goNext = () => {
    if (!canGoNext) {
      toast({
        title: "A few things left",
        description: "Please complete the required fields to continue.",
      });
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  const handleSubmit = () => {
    setState((s) => ({ ...s, submittedAt: new Date().toISOString() }));
    toast({ title: "Submitted for review", description: "Our team will audit your file within one business day." });
  };

  const startOver = () => {
    if (!confirm("Start a new application? Your current draft will be cleared.")) return;
    setState(emptyState());
    setStepIdx(0);
  };

  // Auth gate — the whole flow lives inside a "signed-in" shell.
  if (!state.account.signedIn) {
    return (
      <SignInShell
        onSignIn={(payload) =>
          setState((s) => ({ ...s, account: { ...s.account, ...payload, signedIn: true } }))
        }
      />
    );
  }

  if (state.submittedAt) {
    return <SubmittedScreen state={state} onStartOver={startOver} />;
  }

  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Seo
        title="Seller Portal (Beta) | Texas Cemetery Brokers"
        description="Guided, self-serve seller onboarding for cemetery property owners."
        path="/seller-portal"
        noindex
      />
      <Navbar forceScrolled />
      <BotanicalBackdrop />

      <main className="flex-1 pt-24 pb-20 relative z-10">
        <PortalHero
          account={state.account}
          onStartOver={startOver}
          stepIdx={stepIdx}
          totalSteps={STEPS.length}
          currentLabel={currentStep.label}
        />

        <div className="container mx-auto px-6 max-w-6xl mt-10">
          {/* Progress rail */}
          <div className="mb-10">
            <div className="flex items-center justify-between text-[10px] tracking-[0.24em] uppercase text-muted-foreground mb-3">
              <span>Chapter {String(stepIdx + 1).padStart(2, "0")} of {String(STEPS.length).padStart(2, "0")}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="h-[3px] w-full bg-border/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-accent to-primary"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-12">
            <Stepper steps={STEPS} current={stepIdx} onJump={setStepIdx} state={state} />

            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="relative bg-card/85 backdrop-blur-xl border border-border/60 rounded-[28px] p-8 md:p-14 shadow-soft overflow-hidden"
                >
                  <div
                    className="absolute -top-24 -right-20 w-64 h-64 opacity-[0.06] rotate-12 pointer-events-none"
                    style={{
                      backgroundImage: `url(${palmFan.url})`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <div className="relative">
                    <StepBody stepId={currentStep.id} state={state} update={update} />
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={goBack}
                  disabled={stepIdx === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {stepIdx < STEPS.length - 1 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={goNext}
                    className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-soft hover:shadow-hover transition-shadow overflow-hidden"
                  >
                    <span className="relative z-10">Continue</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!canGoNext}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-soft hover:shadow-hover transition-shadow disabled:opacity-40"
                  >
                    Submit for review <Send className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <HelpPill />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sign-in shell (mock — front-end only)
// -----------------------------------------------------------------------------

const SignInShell = ({
  onSignIn,
}: {
  onSignIn: (p: { email: string; fullName: string; phone: string }) => void;
}) => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onSignIn({ email, fullName: fullName || email.split("@")[0], phone });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Seo
        title="Seller Portal Sign In | Texas Cemetery Brokers"
        description="Sign in to your guided seller portal."
        path="/seller-portal"
        noindex
      />
      <Navbar forceScrolled />
      <BotanicalBackdrop />

      <main className="flex-1 pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-14rem)]">
            {/* Editorial left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-primary mb-8">
                <Sparkles className="w-3 h-3" /> Seller Portal · Beta
              </span>
              <h1 className="font-display text-[3.25rem] md:text-[4.75rem] leading-[0.98] text-foreground">
                A calmer <em className="italic text-primary">way</em>
                <br />
                to list your
                <br />
                family's <em className="italic text-primary">property.</em>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed mt-8 max-w-md">
                Sign in and let our concierge walk you through everything — one thoughtful question
                at a time. We assemble the paperwork, verify the ownership, and take your listing
                live from a single, quiet page.
              </p>
              <div className="mt-10 space-y-3">
                {[
                  "Bank-grade encrypted uploads",
                  "Reviewed by a licensed broker within 24 hours",
                  "Sign your POA and listing agreement in-app",
                ].map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-foreground/80"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {t}
                  </motion.div>
                ))}
              </div>
              <div
                className="absolute -bottom-16 -left-20 w-56 h-56 opacity-25 pointer-events-none hidden lg:block"
                style={{
                  backgroundImage: `url(${monstera.url})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </motion.div>

            {/* Form right */}
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative w-full max-w-md justify-self-center lg:justify-self-end bg-card/90 backdrop-blur-xl border border-border/60 rounded-[28px] p-10 shadow-soft"
            >
              <div
                className="absolute -top-12 -right-8 w-32 h-32 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: `url(${hibiscusCoral.url})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div className="text-[10px] tracking-[0.24em] uppercase text-primary mb-3">
                {mode === "signup" ? "Begin" : "Return"}
              </div>
              <h2 className="font-display text-3xl text-foreground mb-2">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                {mode === "signup"
                  ? "Save your progress and pick up where you left off."
                  : "Sign in to continue your application."}
              </p>

              <div className="space-y-4">
                {mode === "signup" && (
                  <>
                    <Field label="Full name">
                      <input
                        className={inputCls}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Whitmore"
                      />
                    </Field>
                    <Field label="Phone">
                      <input
                        className={inputCls}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(214) 555-0134"
                      />
                    </Field>
                  </>
                )}
                <Field label="Email">
                  <input
                    required
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label="Password">
                  <input
                    required
                    type="password"
                    minLength={6}
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                className="w-full mt-8 py-3.5 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-soft hover:shadow-hover transition-shadow"
              >
                {mode === "signup" ? "Create account & begin" : "Sign in"}
              </motion.button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "signup" ? "Sign in" : "Create one"}
                </button>
              </p>

              <div className="mt-8 pt-6 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" /> Beta preview — no data leaves your browser yet.
              </div>
            </motion.form>
          </div>
        </div>
      </main>

      <Footer />
      <HelpPill />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Botanical backdrop — floating decorative flora, parallax
// -----------------------------------------------------------------------------

const BotanicalBackdrop = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 800], [0, -120]);
  const y2 = useTransform(scrollY, [0, 800], [0, -60]);
  const y3 = useTransform(scrollY, [0, 800], [0, -200]);

  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* soft wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="absolute top-0 left-0 w-[45rem] h-[45rem] bg-primary/[0.06] rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[38rem] h-[38rem] bg-accent/[0.07] rounded-full blur-[120px] translate-x-1/4 translate-y-1/4" />

      <motion.img
        src={palmFan.url}
        alt=""
        style={{ y: y1 }}
        className="absolute top-40 -left-24 w-96 opacity-[0.08] rotate-[-15deg] hidden md:block"
      />
      <motion.img
        src={bananaLeaf.url}
        alt=""
        style={{ y: y2 }}
        className="absolute top-[60%] -right-32 w-[28rem] opacity-[0.09] rotate-[20deg] hidden md:block"
      />
      <motion.img
        src={plumeria.url}
        alt=""
        style={{ y: y3 }}
        className="absolute top-[110%] left-1/4 w-72 opacity-[0.10] hidden md:block"
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Editorial hero shown inside the wizard
// -----------------------------------------------------------------------------

const PortalHero = ({
  account,
  onStartOver,
  stepIdx,
  totalSteps,
  currentLabel,
}: {
  account: PortalState["account"];
  onStartOver: () => void;
  stepIdx: number;
  totalSteps: number;
  currentLabel: string;
}) => {
  const firstName = (account.fullName || account.email || "friend").split(/[\s@]/)[0];
  return (
    <div className="container mx-auto px-6 max-w-6xl">
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-3 text-[10px] tracking-[0.28em] uppercase text-primary mb-4">
              <span>Seller Portal</span>
              <span className="w-8 h-px bg-primary/40" />
              <span className="text-muted-foreground">Chapter {String(stepIdx + 1).padStart(2, "0")} — {currentLabel}</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl text-foreground leading-[1.02]">
              Welcome, <em className="italic text-primary">{firstName}</em>.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg leading-relaxed">
              Move at your own pace. Everything you enter is saved automatically — close the tab
              and pick up right where you left it.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground">Signed in as</div>
            <div className="text-sm text-foreground font-medium">{account.fullName || account.email}</div>
            <button
              onClick={onStartOver}
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30"
            >
              Start a new application
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Floating help pill — Call / Email
// -----------------------------------------------------------------------------

const HelpPill = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 w-80 bg-card border border-border rounded-3xl shadow-hover p-6 relative overflow-hidden"
          >
            <div
              className="absolute -top-8 -right-8 w-28 h-28 opacity-30 pointer-events-none"
              style={{
                backgroundImage: `url(${hibiscusCoral.url})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              aria-label="Close help"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="text-[10px] tracking-[0.24em] uppercase text-primary mb-2">
              We're right here
            </div>
            <h4 className="font-display text-xl text-foreground mb-2">Need a hand?</h4>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Our Texas team can walk you through anything — a phone call, a quick email, or both.
            </p>
            <div className="space-y-2">
              <a
                href="tel:+12142304740"
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/[0.04] transition-all group"
              >
                <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">Call our team</span>
                  <span className="block text-xs text-muted-foreground">(214) 230-4740</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
              </a>
              <a
                href="mailto:info@texascemeterybrokers.com?subject=Seller%20Portal%20help"
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/[0.04] transition-all group"
              >
                <span className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">Email us</span>
                  <span className="block text-xs text-muted-foreground truncate">info@texascemeterybrokers.com</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-primary text-primary-foreground shadow-hover hover:shadow-soft transition-shadow"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Call our team for help</span>
      </motion.button>
    </div>
  );
};

const Stepper = ({
  steps,
  current,
  onJump,
  state,
}: {
  steps: typeof STEPS;
  current: number;
  onJump: (i: number) => void;
  state: PortalState;
}) => (
  <aside className="lg:sticky lg:top-24 h-fit">
    <div className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-5">
      Your application
    </div>
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const done = i < current || (i === current && validateStep(s.id, state));
        const active = i === current;
        const Icon = s.icon;
        return (
          <li key={s.id}>
            <button
              onClick={() => onJump(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                active
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.04]"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </span>
              <span className="text-sm">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
    <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
      <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-primary mb-2">
        <ShieldCheck className="w-3 h-3" /> Auto-saved
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Everything you enter is saved to this browser. You can close the tab and pick up right
        where you left off.
      </p>
    </div>
  </aside>
);

// -----------------------------------------------------------------------------
// Step bodies
// -----------------------------------------------------------------------------

function StepBody({
  stepId,
  state,
  update,
}: {
  stepId: StepId;
  state: PortalState;
  update: <K extends keyof PortalState>(key: K, patch: Partial<PortalState[K]>) => void;
}) {
  switch (stepId) {
    case "account":
      return <AccountStep state={state} update={update} />;
    case "property":
      return <PropertyStep state={state} update={update} />;
    case "ownership":
      return <OwnershipStep state={state} update={update} />;
    case "reason":
      return <ReasonStep state={state} update={update} />;
    case "documents":
      return <DocumentsStep state={state} update={update} />;
    case "review":
      return <ReviewStep state={state} update={update} />;
  }
}

const StepIntro = ({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) => (
  <div className="mb-10">
    <div className="text-[11px] tracking-[0.22em] uppercase text-primary mb-3">{eyebrow}</div>
    <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05] mb-4">
      {title}
    </h2>
    <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">{body}</p>
  </div>
);

const AccountStep = ({
  state,
  update,
}: {
  state: PortalState;
  update: (k: "account", p: Partial<PortalState["account"]>) => void;
}) => (
  <div>
    <StepIntro
      eyebrow="01 · Your details"
      title="Let's confirm who we're working with."
      body="These are the primary contact details we'll use for updates, verification calls, and the eventual sale."
    />
    <div className="grid md:grid-cols-2 gap-6">
      <Field label="Full legal name">
        <input
          className={inputCls}
          value={state.account.fullName}
          onChange={(e) => update("account", { fullName: e.target.value })}
        />
      </Field>
      <Field label="Best contact phone">
        <input
          className={inputCls}
          value={state.account.phone}
          onChange={(e) => update("account", { phone: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          className={inputCls}
          value={state.account.email}
          onChange={(e) => update("account", { email: e.target.value })}
        />
      </Field>
    </div>
  </div>
);

const PropertyStep = ({
  state,
  update,
}: {
  state: PortalState;
  update: (k: "property", p: Partial<PortalState["property"]>) => void;
}) => (
  <div>
    <StepIntro
      eyebrow="02 · The property"
      title="Tell us about the plot."
      body="The more precise you can be here, the faster the cemetery can verify your ownership."
    />
    <div className="grid md:grid-cols-2 gap-6">
      <Field label="Cemetery name">
        <input
          className={inputCls}
          placeholder="e.g. Restland Memorial Park"
          value={state.property.cemeteryName}
          onChange={(e) => update("property", { cemeteryName: e.target.value })}
        />
      </Field>
      <Field label="City / county">
        <input
          className={inputCls}
          placeholder="Dallas, TX"
          value={state.property.city}
          onChange={(e) => update("property", { city: e.target.value })}
        />
      </Field>
      <Field label="Property type">
        <select
          className={inputCls}
          value={state.property.propertyType}
          onChange={(e) => update("property", { propertyType: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="single">Single plot</option>
          <option value="companion">Companion / double</option>
          <option value="family_estate">Family estate</option>
          <option value="mausoleum">Mausoleum crypt</option>
          <option value="niche">Cremation niche</option>
        </select>
      </Field>
      <Field label="Number of plots / spaces">
        <input
          type="number"
          min={1}
          className={inputCls}
          value={state.property.plotCount}
          onChange={(e) => update("property", { plotCount: e.target.value })}
        />
      </Field>
      <Field label="Section">
        <input
          className={inputCls}
          value={state.property.section}
          onChange={(e) => update("property", { section: e.target.value })}
        />
      </Field>
      <Field label="Lot">
        <input
          className={inputCls}
          value={state.property.lot}
          onChange={(e) => update("property", { lot: e.target.value })}
        />
      </Field>
      <Field label="Space(s)">
        <input
          className={inputCls}
          value={state.property.space}
          onChange={(e) => update("property", { space: e.target.value })}
        />
      </Field>
    </div>

    <div className="mt-8">
      <span className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-3">
        Do you have the original deed?
      </span>
      <div className="grid sm:grid-cols-3 gap-3">
        {(
          [
            ["yes", "Yes, I have it", "Original certificate on hand"],
            ["no", "No, it's lost", "We'll help you file a lost deed affidavit"],
            ["unknown", "I'm not sure", "That's okay — we can check with the cemetery"],
          ] as const
        ).map(([v, t, d]) => (
          <RadioTile
            key={v}
            title={t}
            desc={d}
            active={state.property.hasDeed === v}
            onClick={() => update("property", { hasDeed: v })}
          />
        ))}
      </div>
    </div>
  </div>
);

const OwnershipStep = ({
  state,
  update,
}: {
  state: PortalState;
  update: (k: "ownership", p: Partial<PortalState["ownership"]>) => void;
}) => {
  const o = state.ownership;
  return (
    <div>
      <StepIntro
        eyebrow="03 · Ownership"
        title="How did this property come to you?"
        body="Your answers here decide which forms we'll need. We'll only ask the follow-ups that apply."
      />

      <div className="mb-8">
        <span className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-3">
          Ownership type
        </span>
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["sole", "Sole owner", "The deed is in my name only"],
              ["joint", "Joint / co-owned", "Deed lists me and one or more others"],
              ["inherited", "Inherited", "I received this from a family member who has passed"],
              ["estate", "Executor of estate", "I'm handling this on behalf of an estate"],
              ["unknown", "Not sure", "We'll help figure this out together"],
            ] as const
          ).map(([v, t, d]) => (
            <RadioTile
              key={v}
              title={t}
              desc={d}
              active={o.kind === v}
              onClick={() => update("ownership", { kind: v })}
            />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Field label="Name(s) exactly as shown on the deed">
          <input
            className={inputCls}
            value={o.ownerNameOnDeed}
            onChange={(e) => update("ownership", { ownerNameOnDeed: e.target.value })}
          />
        </Field>
        <Field label="Are you the current legal owner?">
          <select
            className={inputCls}
            value={o.isCurrentOwner}
            onChange={(e) =>
              update("ownership", { isCurrentOwner: e.target.value as "yes" | "no" | "" })
            }
          >
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No — I'm acting on someone's behalf</option>
          </select>
        </Field>

        {o.kind === "joint" && (
          <Field label="Names of any co-owners" hint="We'll need their written consent to sell.">
            <input
              className={inputCls}
              value={o.coOwners}
              onChange={(e) => update("ownership", { coOwners: e.target.value })}
            />
          </Field>
        )}

        {(o.kind === "inherited" || o.kind === "estate") && (
          <>
            <Field label="Your relationship to the original owner">
              <input
                className={inputCls}
                placeholder="e.g. Daughter, Executor"
                value={o.relationshipToDeceased}
                onChange={(e) =>
                  update("ownership", { relationshipToDeceased: e.target.value })
                }
              />
            </Field>
            <Field label="Do you have a certified death certificate?">
              <select
                className={inputCls}
                value={o.deathCertificate}
                onChange={(e) =>
                  update("ownership", { deathCertificate: e.target.value as DeathCert | "" })
                }
              >
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">Not yet</option>
                <option value="na">Not applicable</option>
              </select>
            </Field>
            <Field label="Has probate been completed?">
              <select
                className={inputCls}
                value={o.probateComplete}
                onChange={(e) =>
                  update("ownership", {
                    probateComplete: e.target.value as "yes" | "no" | "in_progress" | "",
                  })
                }
              >
                <option value="">Select…</option>
                <option value="yes">Yes, probate is complete</option>
                <option value="in_progress">In progress</option>
                <option value="no">No probate was opened</option>
              </select>
            </Field>
          </>
        )}

        <Field label="Where is the original deed / contract?">
          <select
            className={inputCls}
            value={o.contractStatus}
            onChange={(e) =>
              update("ownership", { contractStatus: e.target.value as ContractStatus | "" })
            }
          >
            <option value="">Select…</option>
            <option value="with_seller">I have it</option>
            <option value="with_cemetery">On file with the cemetery</option>
            <option value="lost">Lost or missing</option>
            <option value="unknown">Not sure</option>
          </select>
        </Field>
      </div>

      <AICallout notes={aiRecommendations(state)} />
    </div>
  );
};

const ReasonStep = ({
  state,
  update,
}: {
  state: PortalState;
  update: (k: "reason", p: Partial<PortalState["reason"]>) => void;
}) => (
  <div>
    <StepIntro
      eyebrow="04 · Sale details"
      title="What are you hoping the sale will achieve?"
      body="This helps us position and price your listing. All questions are optional but the more you share, the better we can advise."
    />
    <div className="space-y-6">
      <Field label="Reason for selling">
        <textarea
          rows={3}
          className={inputCls}
          value={state.reason.reasonForSelling}
          onChange={(e) => update("reason", { reasonForSelling: e.target.value })}
          placeholder="Moved out of state, changed family plans, etc."
        />
      </Field>
      <div className="grid md:grid-cols-2 gap-6">
        <Field label="Target asking price (optional)" hint="Ranges are fine.">
          <input
            className={inputCls}
            placeholder="$8,000 – $10,000"
            value={state.reason.askingPrice}
            onChange={(e) => update("reason", { askingPrice: e.target.value })}
          />
        </Field>
        <Field label="Preferred timeframe">
          <select
            className={inputCls}
            value={state.reason.timeframe}
            onChange={(e) => update("reason", { timeframe: e.target.value })}
          >
            <option value="">Select…</option>
            <option>As soon as possible</option>
            <option>Within 30 days</option>
            <option>Within 90 days</option>
            <option>No rush — best price wins</option>
          </select>
        </Field>
      </div>
      <Field label="Anything else our team should know?">
        <textarea
          rows={4}
          className={inputCls}
          value={state.reason.notes}
          onChange={(e) => update("reason", { notes: e.target.value })}
        />
      </Field>
    </div>
  </div>
);

const DocumentsStep = ({
  state,
  update,
}: {
  state: PortalState;
  update: (k: "docs", p: Partial<PortalState["docs"]>) => void;
}) => {
  const required = requiredDocuments(state);
  return (
    <div>
      <StepIntro
        eyebrow="05 · Documents"
        title="Upload what we'll need to verify you."
        body="Based on your answers, we've generated the exact list below. Drag files in or use the picker — you can replace any file at any time."
      />

      <AICallout notes={aiRecommendations(state)} />

      <div className="mt-8 space-y-3">
        {required.map((d) => {
          const file = state.docs[d.key] ?? null;
          return (
            <div
              key={d.key}
              className="flex items-center gap-4 p-5 rounded-2xl border border-border/60 bg-background/40 hover:border-primary/30 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  file ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                {file ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground font-medium">{d.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : d.hint}
                </div>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/70 text-xs text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all">
                <Upload className="w-3.5 h-3.5" />
                {file ? "Replace" : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    update("docs", { [d.key]: { name: f.name, size: f.size } });
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReviewStep = ({
  state,
  update,
}: {
  state: PortalState;
  update: (k: "agreements", p: Partial<PortalState["agreements"]>) => void;
}) => {
  const required = requiredDocuments(state);
  const missing = required.filter((d) => !state.docs[d.key]);
  return (
    <div>
      <StepIntro
        eyebrow="06 · Review"
        title="Take one last look."
        body="If everything looks right, submit your file. A broker will personally review it within one business day and then issue your Power of Attorney and Listing Agreement to sign, right here in your portal."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <SummaryCard title="Contact" rows={[
          ["Name", state.account.fullName],
          ["Email", state.account.email],
          ["Phone", state.account.phone],
        ]} />
        <SummaryCard title="Property" rows={[
          ["Cemetery", state.property.cemeteryName],
          ["Location", state.property.city],
          ["Type", state.property.propertyType],
          ["Plots", state.property.plotCount],
          ["Section / Lot / Space", `${state.property.section} / ${state.property.lot} / ${state.property.space}`],
        ]} />
        <SummaryCard title="Ownership" rows={[
          ["Type", state.ownership.kind],
          ["Named on deed", state.ownership.ownerNameOnDeed],
          ["Deed location", state.ownership.contractStatus],
          ["Probate", state.ownership.probateComplete],
        ]} />
        <SummaryCard title="Sale intent" rows={[
          ["Asking", state.reason.askingPrice],
          ["Timeframe", state.reason.timeframe],
          ["Reason", state.reason.reasonForSelling],
        ]} />
      </div>

      {missing.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-accent/10 border border-accent/30 text-sm text-foreground">
          You still need to upload:{" "}
          <span className="text-accent-foreground/90">
            {missing.map((m) => m.label).join(", ")}
          </span>
          . You can submit without them, but review will pause until they arrive.
        </div>
      )}

      <div className="mt-8 space-y-3">
        {(
          [
            [
              "truthfulness",
              "Everything I've entered above is true and accurate to the best of my knowledge.",
            ],
            [
              "authority",
              "I have the legal authority to sell this cemetery property, or I am acting on behalf of someone who does.",
            ],
            [
              "listingConsent",
              "I authorize Texas Cemetery Brokers to review my file and prepare a listing agreement and Power of Attorney for my signature.",
            ],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-start gap-3 p-4 rounded-xl border border-border/60 hover:border-primary/30 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={state.agreements[key]}
              onChange={(e) => update("agreements", { [key]: e.target.checked })}
              className="mt-1 accent-primary w-4 h-4"
            />
            <span className="text-sm text-foreground leading-relaxed">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Bits
// -----------------------------------------------------------------------------

const SummaryCard = ({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) => (
  <div className="p-5 rounded-2xl border border-border/60 bg-background/40">
    <div className="text-[11px] tracking-[0.18em] uppercase text-primary mb-3">{title}</div>
    <dl className="space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-foreground text-right truncate max-w-[65%]">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const AICallout = ({ notes }: { notes: string[] }) => (
  <div className="mt-8 p-5 rounded-2xl bg-primary/5 border border-primary/15">
    <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-primary mb-3">
      <Sparkles className="w-3 h-3" /> Concierge notes
    </div>
    <ul className="space-y-2.5">
      {notes.map((n, i) => (
        <li key={i} className="text-sm text-foreground/80 leading-relaxed flex gap-2.5">
          <span className="text-primary mt-1.5 shrink-0 w-1 h-1 rounded-full bg-primary" />
          {n}
        </li>
      ))}
    </ul>
  </div>
);

const SubmittedScreen = ({
  state,
  onStartOver,
}: {
  state: PortalState;
  onStartOver: () => void;
}) => (
  <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-6">
    <Seo title="Application submitted" description="" path="/seller-portal" noindex />
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl w-full text-center bg-card/80 backdrop-blur border border-border/60 rounded-3xl p-12 shadow-soft"
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <div className="text-[11px] tracking-[0.22em] uppercase text-primary mb-3">
        Application received
      </div>
      <h1 className="font-display text-4xl text-foreground leading-tight mb-4">
        Thank you, {state.account.fullName.split(" ")[0] || "friend"}.
      </h1>
      <p className="text-muted-foreground leading-relaxed mb-8">
        A licensed broker will audit your file within one business day. When you're approved, we'll
        release your Power of Attorney and Listing Agreement directly into this portal for you to
        sign — and your listing will go live the moment they're returned.
      </p>
      <button
        onClick={onStartOver}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Start a new application
      </button>
    </motion.div>
  </div>
);

// -----------------------------------------------------------------------------
// Validation — keep light so the wizard feels forgiving during testing.
// -----------------------------------------------------------------------------
function validateStep(step: StepId, s: PortalState): boolean {
  switch (step) {
    case "account":
      return !!(s.account.fullName && s.account.email && s.account.phone);
    case "property":
      return !!(s.property.cemeteryName && s.property.city && s.property.hasDeed);
    case "ownership":
      return !!(s.ownership.kind && s.ownership.ownerNameOnDeed && s.ownership.isCurrentOwner);
    case "reason":
      return true;
    case "documents":
      return true; // uploads are strongly encouraged but not blocking during beta
    case "review":
      return s.agreements.truthfulness && s.agreements.authority && s.agreements.listingConsent;
  }
}
