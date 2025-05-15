
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [checkCount, setCheckCount] = useState(0);
  const [intervalId, setIntervalId] = useState<number | null>(null);

  // Set up auth state listener for email change events
  useEffect(() => {
    if (!isOpen) return;
    
    console.log("Setting up auth state listener for email verification");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'EMAIL_CHANGE_CONFIRMED' || event === 'USER_UPDATED') {
        console.log("Email change confirmed or user updated:", session?.user);
        
        // Check if the user's email matches the new email and is confirmed
        if (session?.user?.email === newEmail && session?.user?.email_confirmed_at) {
          console.log("Email verified successfully:", newEmail);
          onVerified();
        }
      }
    });
    
    return () => {
      console.log("Cleaning up auth state listener");
      subscription.unsubscribe();
    };
  }, [isOpen, newEmail, onVerified]);

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
            
            onVerified();
          } else {
            console.log("Email not verified yet, poll count:", checkCount + 1);
            setCheckCount(prev => prev + 1);
          }
        } catch (error) {
          console.error("Error checking verification status:", error);
        } finally {
          setIsChecking(false);
        }
      }
    };

    // Run immediately when the modal opens
    checkEmailVerificationStatus();

    // Then set interval for polling with a shorter interval (2 seconds)
    const id = window.setInterval(checkEmailVerificationStatus, 2000);
    setIntervalId(id);
    
    // Cleanup function to clear interval when component unmounts or isOpen changes
    return () => {
      if (id) clearInterval(id);
    };
  }, [isOpen, newEmail, onVerified, checkCount, isChecking]);

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
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
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
    setIsChecking(true);
    try {
      // Try to update the email again to trigger a new verification email
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail 
      });
      
      if (error) {
        console.error("Error resending verification email:", error);
      } else {
        console.log("Verification email resent to:", newEmail);
        setCheckCount(0); // Reset the check count
      }
    } catch (error) {
      console.error("Error resending verification:", error);
    } finally {
      setIsChecking(false);
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
            {checkCount > 3 && (
              <p className="mt-2 text-amber-600">
                Still haven't received the email? Check your spam folder or try again.
              </p>
            )}
          </div>
          
          {checkCount > 5 && (
            <Button 
              variant="outline" 
              onClick={handleResendVerification}
              disabled={isChecking}
              className="w-full"
            >
              Resend Verification Email
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2 justify-between items-center">
          <Button 
            variant="outline" 
            onClick={handleCancel}
          >
            Cancel Change
          </Button>
          
          <Button 
            onClick={handleManualVerifyClick} 
            disabled={isChecking}
            className="flex items-center space-x-2"
          >
            {isChecking ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
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
