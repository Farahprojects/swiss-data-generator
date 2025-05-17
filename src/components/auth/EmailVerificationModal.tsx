import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  isOpen: boolean;
  newEmail: string;
  onVerified: () => void;
  onCancel: () => void;
}

/**
 * Handles:
 * - Triggering Supabase email verification
 * - Polling + real-time auth listening
 * - UX feedback with resend / cancel / manual verify
 */
export function EmailVerificationModal({ isOpen, newEmail, onVerified, onCancel }: Props) {
  const { toast } = useToast();

  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [checking, setChecking] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startPolling = () => {
    clearPolling();
    intervalRef.current = window.setInterval(checkVerified, 3000);
  };

  const checkVerified = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email === newEmail && data.user.email_confirmed_at) {
        clearPolling();
        onVerified();
      }
    } finally {
      setChecking(false);
    }
  };

  const sendVerification = async () => {
    setStatus("sending");
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setStatus("success");
      toast({
        title: "Verification email sent",
        description: `Please check your inbox for ${newEmail}`,
      });
      startPolling();
    } catch (err: any) {
      setStatus("error");
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message ?? "Could not send verification email.",
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      clearPolling();
      return;
    }

    // Trigger email on open
    sendVerification();

    // Listen for live auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "USER_UPDATED" &&
        session?.user?.email === newEmail &&
        session.user.email_confirmed_at
      ) {
        clearPolling();
        onVerified();
      }
    });

    return () => {
      subscription.unsubscribe();
      clearPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, newEmail]);

  const renderNotif = () => {
    if (status === "success")
      return (
        <div className="mt-4 flex items-center rounded-md bg-green-50 p-2 text-green-700">
          <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Verification sent to <strong>{newEmail}</strong></p>
        </div>
      );
    if (status === "error")
      return (
        <div className="mt-4 flex items-center rounded-md bg-red-50 p-2 text-red-700">
          <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Failed to send email. Please try again.</p>
        </div>
      );
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Verify Your Email Address</DialogTitle>
          <DialogDescription>
            We've sent a verification link to <strong>{newEmail}</strong>. Please confirm to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4 text-sm text-gray-600">
          You won't be able to use the app until you verify your email.
          {renderNotif()}
          <Button
            variant="outline"
            onClick={sendVerification}
            disabled={status === "sending"}
            className="w-full"
          >
            {status === "sending" ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={checkVerified} disabled={checking}>
            {checking ? (
              <span className="flex items-center">
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Checking…
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
