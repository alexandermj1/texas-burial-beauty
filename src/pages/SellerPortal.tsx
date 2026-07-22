import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Leaf,
} from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Seo
        title="Seller Portal (Beta) | Texas Cemetery Brokers"
        description="Guided, self-serve seller onboarding for cemetery property owners."
        path="/seller-portal"
        noindex
      />
      <PortalHeader account={state.account} onStartOver={startOver} />

      <div className="container mx-auto px-6 max-w-6xl pb-24 pt-10">
        <div className="grid lg:grid-cols-[260px_1fr] gap-10">
          <Stepper steps={STEPS} current={stepIdx} onJump={setStepIdx} state={state} />

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-card/80 backdrop-blur border border-border/60 rounded-3xl p-8 md:p-12 shadow-soft"
              >
                <StepBody stepId={currentStep.id} state={state} update={update} />
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
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canGoNext}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Submit for review <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      <Seo
        title="Seller Portal Sign In | Texas Cemetery Brokers"
        description="Sign in to your guided seller portal."
        path="/seller-portal"
        noindex
      />
      <div className="container mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-display text-lg text-foreground">Texas Cemetery</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Seller Portal · Beta
          </span>
        </div>
        <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to site
        </a>
      </div>

      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between px-16 py-20 bg-primary/5 border-r border-border/40">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-primary">
              <Sparkles className="w-3 h-3" /> Guided by our AI concierge
            </span>
            <h1 className="font-display text-5xl md:text-6xl text-foreground leading-[1.05] mt-8">
              A calmer way to list <em className="italic">your family's property.</em>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mt-6 max-w-md">
              Answer a few questions at your own pace. We'll assemble your documents, verify your
              ownership, and take your listing live — all from one page.
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {[
              "Bank-grade encrypted uploads",
              "Reviewed by a licensed broker in 24 hours",
              "You sign the POA and listing agreement in-app",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary" /> {t}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-16">
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md bg-card/80 backdrop-blur border border-border/60 rounded-3xl p-10 shadow-soft"
          >
            <h2 className="font-display text-3xl text-foreground mb-2">
              {mode === "signup" ? "Create your seller account" : "Welcome back"}
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

            <button
              type="submit"
              className="w-full mt-8 py-3.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {mode === "signup" ? "Create account & begin" : "Sign in"}
            </button>

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
    </div>
  );
};

// -----------------------------------------------------------------------------
// Header + Stepper
// -----------------------------------------------------------------------------

const PortalHeader = ({
  account,
  onStartOver,
}: {
  account: PortalState["account"];
  onStartOver: () => void;
}) => (
  <header className="border-b border-border/50 bg-background/70 backdrop-blur sticky top-0 z-30">
    <div className="container mx-auto px-6 max-w-6xl py-4 flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <Leaf className="w-4 h-4 text-primary self-center" />
        <span className="font-display text-lg text-foreground">Seller Portal</span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Beta</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-sm text-foreground">{account.fullName || account.email}</div>
        </div>
        <button
          onClick={onStartOver}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  </header>
);

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
