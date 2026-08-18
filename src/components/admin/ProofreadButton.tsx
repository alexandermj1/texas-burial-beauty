// Small "Fix my writing" button: sends a free-text note to the proofread-email
// edge function and swaps in the tidied version.
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  value: string;
  onFixed: (next: string) => void;
  subject?: string;
};

const ProofreadButton = ({ value, onFixed, subject }: Props) => {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!value.trim()) {
      toast.message("Write something first and I'll tidy it up");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("proofread-email", {
        body: { body: value, subject: subject ?? "" },
      });
      if (error) throw error;
      const corrected = (data as { corrected?: string; error?: string } | null)?.corrected;
      if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
      if (!corrected) throw new Error("Nothing came back");
      onFixed(corrected);
      toast.success(corrected.trim() === value.trim() ? "Looks good already" : "Tidied up");
    } catch (e) {
      toast.error((e as Error).message || "Could not check that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
      {busy ? "Checking…" : "Fix my writing"}
    </button>
  );
};

export default ProofreadButton;
