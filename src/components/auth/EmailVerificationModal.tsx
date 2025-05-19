// deno-lint-ignore-file
// EmailVerificationModal.tsx – cleaned production‑ready version
// -----------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

/* -------------------------------------------------------------------------- */
interface Props {
  isOpen: boolean;
  /** current, verified email */
  email?: string;
  /** new, pending email (if doing change‑email flow) */
  newEmail?: string;
  /** callback when verification is detected */
  onVerified: () => void;
  /** callback when user cancels */
  onCancel: () => void;
}

/* -------------------------------------------------------------------------- */
const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

const debug = (...a: unknown[]) =>
  process.env.NODE_ENV !== "production" && console.log("[EVModal]", ...a);

/* -------------------------------------------------------------------------- */
export function EmailVerificationModal({
  isOpen,
  email,
  newEmail,
  onVerified,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const targetEmail = newEmail || email || "";

  /* ───── internal state ───── */
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);

  /* ───── polling timer ───── */
  const timer = useRef<number | null>(null);
  const stopPolling = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const poll = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        stopPolling();
        onVerified();
      }
    } finally {
      setChecking(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  const handleVerificationBtn = async () => {
    setChecking(true);
    setAutoSigningIn(true);
    try {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        stopPolling();
        toast({ title: "Success", description: "Email verified." });
        return onVerified();
      }
      toast({
        title: "Not yet verified",
        description: "Please click the link in your email first.",
      });
    } catch (e) {
      console.error("Verification check failed", e);
      toast({
        title: "Verification check failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
      setAutoSigningIn(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  const sendLink = async () => {
    if (!targetEmail) {
      setStatus("error");
      setStatusMsg("No email provided");
      toast({
        title: "Error",
        description: "Unable to send verification email",
        variant: "destructive",
      });
      return;
    }

    setStatus("sending");
    setStatusMsg(null);
    debug("Resending confirmation to", targetEmail);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/resend-email-change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = (await res.json()) as { status: string };
      debug("resend response", data);

      switch (data.status) {
        case "resent":
          setStatus("success");
          setStatusMsg(`Verification email sent to ${targetEmail}`);
          toast({
            title: "Verification email sent",
            description: `Check ${targetEmail}`,
          });
          break;
        case "no_pending_change":
          setStatus("error");
          setStatusMsg("No pending email change to confirm.");
          toast({
            title: "Info",
            description: "No pending email change found for this account.",
          });
          break;
        case "no_user_found":
          setStatus("error");
          setStatusMsg("No account found with this email address.");
          toast({
            title: "Error",
            description: "No account found with this email address.",
            variant: "destructive",
          });
          break;
        default:
          setStatus("error");
          setStatusMsg("Unable to send verification email.");
          toast({
            title: "Error",
            description: "Unable to send verification email.",
            variant: "destructive",
          });
      }
    } catch (err: unknown) {
      console.error("resend exception", err);
      setStatus("error");
      setStatusMsg("Failed to send verification email.");
      toast({
        title: "Error",
        description: "Failed to send verification email.",
        variant: "destructive",
      });
    }

    stopPolling();
    timer.current = window.setInterval(poll, 3000);
  };

  /* ───── lifecycle ───── */
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      return;
    }
    sendLink();

    const { subscription } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "USER_UPDATED" && session?.user?.email_confirmed_at) {
        debug("Realtime confirmation detected");
        stopPolling();
        onVerified();
      }
    }).data;

    return () => {
      subscription.unsubscribe();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetEmail]);

  /* ───── helper component ───── */
  const Notice = () => {
    if (statusMsg) {
      const Icon = status === "success" ? CheckCircle2 : AlertCircle;
      const color = status === "success" ? "green" : "red";
      return (
        <div className={`mt-4 flex items-center rounded-md bg-${color}-50 p-2 text-${color}-700`}>
          <Icon className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{statusMsg}</p>
        </div>
      );
    }
    return null;
  };

  /* ───── UI ───── */
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Verify your email address</DialogTitle>
          <DialogDescription>
            We just sent a verification link to <strong>{targetEmail}</strong>. Please confirm to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4 text-sm text-gray-600">
          You won't be able to sign in until your email is verified.
          <Notice />
          <Button
            variant="outline"
            onClick={sendLink}
            disabled={status === "sending"}
            className="w-full"
          >
            {status === "sending" ? (
              <span className="flex items-center">
                <Loader className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </span>
            ) : (
              "Resend verification email"
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleVerificationBtn} disabled={checking || autoSigningIn}>
            {checking || autoSigningIn ? (
              <span className="flex items-center">
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                {autoSigningIn ? "Signing in…" : "Checking…"}
              </span>
            ) : (
              "I've verified my email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
