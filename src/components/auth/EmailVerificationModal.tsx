
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

  // Poll for email verification status
  useEffect(() => {
    if (!isOpen) return;

    // Clear any existing intervals when component mounts or isOpen changes
    if (intervalId) {
      clearInterval(intervalId);
    }

    const checkEmailVerificationStatus = async () => {
      setIsChecking(true);
      try {
        const { data } = await supabase.auth.getUser();
        
        if (data?.user?.email_confirmed_at) {
          console.log("Email verified at:", data.user.email_confirmed_at);
          
          // Clear the interval if email is verified
          if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
          }
          
          onVerified();
        } else {
          setCheckCount(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    // Run immediately when the modal opens
    checkEmailVerificationStatus();

    // Then set interval for polling
    const id = window.setInterval(checkEmailVerificationStatus, 5000); // Poll every 5 seconds
    setIntervalId(id);
    
    // Cleanup function to clear interval when component unmounts or isOpen changes
    return () => {
      if (id) clearInterval(id);
    };
  }, [isOpen, onVerified, intervalId]);

  const handleRefreshClick = async () => {
    setIsChecking(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email_confirmed_at) {
        onVerified();
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCancel = async () => {
    // The user wants to cancel the email change
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    onCancel();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={() => {}}
      // This next line ensures the modal cannot be dismissed by clicking outside
      onEscapeKeyDown={(e) => e.preventDefault()}
    >
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
        </div>
        
        <div className="flex space-x-2 justify-between items-center">
          <Button 
            variant="outline" 
            onClick={handleCancel}
          >
            Cancel Change
          </Button>
          
          <Button 
            onClick={handleRefreshClick} 
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
