import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** Visual style for the trigger. "icon" is a subtle icon-only button. "link" is a small text link. */
  variant?: "icon" | "link";
  className?: string;
}

const ChangePasswordDialog = ({ variant = "icon", className = "" }: Props) => {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (pw !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated" });
    setPw("");
    setConfirm("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            aria-label="Change password"
            title="Change password"
            className={`shrink-0 inline-flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors ${className}`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button className={`text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors ${className}`}>
            Change password
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Pick something strong and unique. Minimum 8 characters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={pw}
              onChange={e => setPw(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Confirm</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
