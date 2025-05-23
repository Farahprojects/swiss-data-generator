
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

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  resend: (email: string) => Promise<{ error: Error | null }>;
  onVerified: () => void;
  onCancel: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
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
      logToSupabase("Resending verification email", {
        level: 'info',
        page: 'EmailVerificationModal',
        data: { email }
      });
      
      const { error } = await resend(email);
      
      if (error) {
        setResendError(error.message);
        logToSupabase("Error resending verification", {
          level: 'error',
          page: 'EmailVerificationModal',
          data: { error: error.message }
        });
      } else {
        setResendSuccess(true);
        logToSupabase("Verification email resent successfully", {
          level: 'info',
          page: 'EmailVerificationModal'
        });
      }
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email');
      logToSupabase("Exception resending verification", {
        level: 'error',
        page: 'EmailVerificationModal',
        data: { error: error.message || String(error) }
      });
    } finally {
      setIsResending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Verify Your New Email Address
          </DialogTitle>
          <DialogDescription>
            We've sent verification instructions to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 bg-blue-50 rounded-md text-sm">
          <h4 className="font-medium text-blue-700 mb-2">Important:</h4>
          <ul className="space-y-2 text-blue-700">
            <li>• Check your <strong>{email}</strong> inbox for a verification email</li>
            <li>• Click the verification link in that email to confirm your new address</li>
            <li>• Also check your spam/junk folder if you don't see it</li>
            <li>• Your original email address has received a notification about this change</li>
          </ul>
        </div>
        
        {resendSuccess && (
          <div className="flex items-start gap-2 p-3 bg-green-50 text-green-700 rounded-md">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Verification email resent</p>
              <p className="text-sm">A new verification link has been sent to {email}</p>
            </div>
          </div>
        )}
        
        {resendError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-md">
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
          >
            Cancel Email Change
          </Button>
          
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              variant="secondary"
            >
              {isResending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Resend Email
            </Button>
            
            <Button
              type="button"
              onClick={onVerified}
            >
              I've Verified
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
