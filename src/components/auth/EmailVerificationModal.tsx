
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface EmailVerificationModalProps {
  isOpen: boolean;
  newEmail: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function EmailVerificationModal({
  isOpen,
  newEmail,
  onVerified,
  onCancel,
}: EmailVerificationModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const { toast } = useToast();

  // Set up auth state listener for email change events
  useEffect(() => {
    if (!isOpen) return;
    
    console.log("Setting up auth state listener for email verification");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        console.log("Email change confirmed or user updated:", session?.user);
        
        // Check if the user's email matches the new email and is confirmed
        if (session?.user?.email === newEmail && session?.user?.email_confirmed_at) {
          console.log("Email verified successfully:", newEmail);
          
          // Stop polling when email is verified
          if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
          }
          
          // Clear all verification-related state
          setIsChecking(false);
          setCheckCount(0);
          
          // Only then call the onVerified callback
          onVerified();
        }
      }
    });
    
    return () => {
      console.log("Cleaning up auth state listener");
      subscription.unsubscribe();
      
      // Also clear any polling intervals when component unmounts
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen, newEmail, onVerified, intervalId]);

  // Poll for email verification status
  useEffect(() => {
    if (!isOpen) return;

    // Clear any existing intervals when component mounts or isOpen changes
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    const checkEmailVerificationStatus = async () => {
      if (!isChecking) {
        setIsChecking(true);
        try {
          // Force refresh the session to get the latest user data
          await supabase.auth.refreshSession();
          const { data } = await supabase.auth.getUser();
          
          console.log("Checking email verification status:", data?.user?.email, "New email:", newEmail);
          console.log("Email confirmed at:", data?.user?.email_confirmed_at);
          
          // Check if the current email matches the new email and is confirmed
          if (data?.user?.email === newEmail && data?.user?.email_confirmed_at) {
            console.log("Email verified at:", data.user.email_confirmed_at);
            
            if (intervalId) {
              clearInterval(intervalId);
              setIntervalId(null);
            }
            
            // Don't call onVerified here, let the auth state listener handle it
            // This avoids potential race conditions or double-calling
            setIsChecking(false);
          } else {
            console.log("Email not verified yet, poll count:", checkCount + 1);
            setCheckCount(prev => prev + 1);
            setIsChecking(false);
          }
        } catch (error) {
          console.error("Error checking verification status:", error);
          setIsChecking(false);
        }
      }
    };

    // Run immediately when the modal opens
    checkEmailVerificationStatus();

    // Then set interval for polling with a shorter interval (3 seconds)
    const id = window.setInterval(checkEmailVerificationStatus, 3000);
    setIntervalId(id);
    
    // Cleanup function to clear interval when component unmounts or isOpen changes
    return () => {
      if (id) clearInterval(id);
    };
  }, [isOpen, newEmail, checkCount, isChecking]);

  const handleManualVerifyClick = async () => {
    setIsChecking(true);
    try {
      // Force refresh the session to get the latest user data
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      
      console.log("Manual verification check:", data?.user?.email, "New email:", newEmail);
      
      if (data?.user?.email === newEmail && data?.user?.email_confirmed_at) {
        console.log("Email verified during manual check");
        onVerified();
      } else {
        console.log("Email still not verified after manual check");
        toast({
          variant: "destructive", 
          title: "Email not verified",
          description: "Please check your inbox and click the verification link."
        });
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setIsChecking(false);
    }
  };

  const handleCancel = () => {
    // The user wants to cancel the email change
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    onCancel();
  };

  const handleResendVerification = async () => {
    setIsSending(true);
    try {
      // Different approach for login verification vs email change verification
      const { error } = await supabase.auth.resetPasswordForEmail(newEmail, {
        redirectTo: `${window.location.origin}/login`
      });
      
      if (error) {
        console.error("Error resending verification email:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to resend verification email. Please try again."
        });
      } else {
        console.log("Verification email resent to:", newEmail);
        toast({
          title: "Email sent",
          description: "Verification email has been resent. Please check your inbox."
        });
        setCheckCount(0); // Reset the check count
      }
    } catch (error) {
      console.error("Error resending verification:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsSending(false);
    }
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
            We've sent a verification link to <strong>{newEmail}</strong>.
            Please check your inbox and confirm to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          <div className="text-sm text-gray-500">
            You won't be able to continue using the app until you verify your email address.
            {checkCount > 0 && (
              <p className="mt-2 text-amber-600">
                Still haven't received the email? Check your spam folder or try again.
              </p>
            )}
          </div>
          
          {/* Resend button is always available, with visual feedback */}
          <Button 
            variant="outline" 
            onClick={handleResendVerification}
            disabled={isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </div>
        
        <div className="flex space-x-2 justify-between items-center">
          <Button 
            variant="outline" 
            onClick={handleCancel}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleManualVerifyClick} 
            disabled={isChecking}
            className="flex items-center space-x-2"
          >
            {isChecking ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                <span>Checking...</span>
              </>
            ) : (
              <span>I've Verified My Email</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
