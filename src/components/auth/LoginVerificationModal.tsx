
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logToSupabase } from '@/utils/batchedLogManager';

interface LoginVerificationModalProps {
  isOpen: boolean;
  email: string;
  resend: (email: string) => Promise<{ error: Error | null }>;
  onVerified: () => void;
  onCancel: () => void;
}

export const LoginVerificationModal: React.FC<LoginVerificationModalProps> = ({
  isOpen,
  email,
  resend,
  onVerified,
  onCancel
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  
  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);
    
    try {
      logToSupabase("Resending login verification email", {
        level: 'info',
        page: 'LoginVerificationModal',
        data: { email }
      });
      
      const { error } = await resend(email);
      
      if (error) {
        setResendError(error.message);
        logToSupabase("Error resending login verification", {
          level: 'error',
          page: 'LoginVerificationModal',
          data: { error: error.message }
        });
      } else {
        setResendSuccess(true);
        logToSupabase("Login verification email resent successfully", {
          level: 'info',
          page: 'LoginVerificationModal'
        });
      }
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email');
      logToSupabase("Exception resending login verification", {
        level: 'error',
        page: 'LoginVerificationModal',
        data: { error: error.message || String(error) }
      });
    } finally {
      setIsResending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-blue-50 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5 text-primary" />
            Verify Your Email Address
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            We've sent verification instructions to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 bg-primary/5 rounded-md text-sm border border-primary/10">
          <h4 className="font-medium text-primary mb-2">Important:</h4>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Check your <strong>{email}</strong> inbox for a verification email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Click the verification link in that email to confirm your address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Also check your spam/junk folder if you don't see it</span>
            </li>
          </ul>
        </div>
        
        {resendSuccess && (
          <div className="flex items-start gap-2 p-3 bg-green-50 text-green-700 rounded-md border border-green-100">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Verification email resent</p>
              <p className="text-sm">A new verification link has been sent to {email}</p>
            </div>
          </div>
        )}
        
        {resendError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-md border border-red-100">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to resend</p>
              <p className="text-sm">{resendError}</p>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex sm:justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-primary/20 text-gray-700 hover:bg-primary/5"
          >
            Cancel Verification
          </Button>
          
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              variant="secondary"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isResending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Resend Email
            </Button>
            
            <Button
              type="button"
              onClick={onVerified}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              I've Verified
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
