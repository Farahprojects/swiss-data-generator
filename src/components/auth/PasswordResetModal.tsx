
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface PasswordResetModalProps {
  open: boolean;
  token: string | null;
  onComplete: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ 
  open, 
  token,
  onComplete
}) => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!open || !token) return;

    const verifyToken = async () => {
      try {
        console.log("Verifying password reset token in modal");
        setVerifying(true);
        
        // Verify the token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        });

        if (error) {
          console.error("Token verification failed:", error);
          setTokenVerified(false);
          toast({ 
            title: "Invalid reset link", 
            description: "Password reset link is invalid or expired.",
            variant: "destructive"
          });
        } else {
          console.log("Token verified successfully in modal");
          setTokenVerified(true);
        }
      } catch (error: any) {
        console.error("Token verification error:", error);
        setTokenVerified(false);
        toast({ 
          title: "Verification error", 
          description: error?.message || "Failed to verify reset token",
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [open, token, toast]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ 
        title: "Passwords don't match", 
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({ 
        title: "Password too short", 
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Updating password from modal");
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("Password update failed:", error);
        toast({ 
          title: "Password reset failed", 
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log("Password updated successfully from modal");
        setSuccess(true);
        // Clear the reset flag from localStorage
        localStorage.removeItem('password_reset_required');
        toast({ 
          title: "Password updated", 
          description: "Your password has been successfully reset."
        });
      }
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reset password.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (success) {
      return (
        <div className="text-center space-y-4 p-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-semibold">Password Updated!</h2>
          <p>Your password has been successfully reset.</p>
          <Button 
            onClick={onComplete} 
            className="mt-4 w-full"
          >
            Continue to Dashboard
          </Button>
        </div>
      );
    }

    if (verifying) {
      return (
        <div className="text-center p-6">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Verifying your reset link...</p>
        </div>
      );
    }

    if (tokenVerified === false) {
      return (
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-red-600">Invalid Reset Link</h2>
          <p>This password reset link is invalid or has expired.</p>
          <Button 
            onClick={onComplete} 
            className="mt-4 w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold">Reset Your Password</h2>
          <p className="text-gray-600 mt-2">Please create a new secure password for your account</p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div className="space-y-4">
            <PasswordInput
              password={password}
              isValid={password.length >= 8}
              showRequirements={true}
              onChange={setPassword}
            />
            
            <div className="space-y-1">
              <PasswordInput
                password={confirmPassword}
                isValid={confirmPassword.length >= 8 && password === confirmPassword}
                showRequirements={false}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                id="confirm-password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || password.length < 8 || password !== confirmPassword}
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
