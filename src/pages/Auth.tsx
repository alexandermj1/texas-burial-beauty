import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useAgent } from "@/hooks/useAgent";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { toast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";
import { OWNER_EMAILS } from "@/lib/ownerAccess";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { isAgent, loading: agentLoading } = useAgent();
  const navigate = useNavigate();

  // Redirect if already logged in with a role
  useEffect(() => {
    if (user && !adminLoading && !agentLoading) {
      if (isAdmin) navigate("/admin");
      else if (isAgent) navigate("/agent");
    }
  }, [user, isAdmin, isAgent, adminLoading, agentLoading]);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Owner accounts are Google-only — no password path, even by mistake.
    if (isLogin && OWNER_EMAILS.includes(email.trim().toLowerCase())) {
      setLoading(false);
      toast({ title: "Use Google to sign in", description: "This account is secured with Google sign-in only.", variant: "destructive" });
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!" });
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo title="Sign In | Texas Cemetery Brokers" description="Sign in to your Texas Cemetery Brokers account." path="/auth" noindex />
      <Navbar forceScrolled />
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card rounded-2xl p-8 shadow-soft"
          >
            <h1 className="font-display text-3xl text-foreground text-center mb-2">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-8">
              {isLogin ? "Sign in to manage your listings" : "Join to list your cemetery property"}
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full mb-5 py-3 flex items-center justify-center gap-2.5 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6c1.9-5.6 7.2-9.7 13.6-9.7z" />
                <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.7 7l7.3 5.7c4.3-4 6.8-9.9 6.8-17.2z" />
                <path fill="#FBBC05" d="M10.4 28.8a14.6 14.6 0 0 1 0-9.3l-7.8-6a24 24 0 0 0 0 21.4l7.8-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.7-4.1-13.6-9.7l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or email</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="John Doe"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>

            <div className="mt-4 pt-4 border-t border-border">
              <Link to="/agent" className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors">
                Sales Agent? <span className="font-medium text-primary">Agent Sign In →</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Auth;
