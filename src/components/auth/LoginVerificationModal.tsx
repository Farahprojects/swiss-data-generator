
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
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <Mail className="h-5 w-5 text-gray-600" />
            Verify Your Email Address
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            We've sent verification instructions to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 bg-gray-50 rounded-md text-sm border border-gray-100">
          <h4 className="font-medium text-gray-700 mb-2">Important:</h4>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Check your <strong>{email}</strong> inbox for a verification email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Click the verification link in that email to confirm your address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Also check your spam/junk folder if you don't see it</span>
            </li>
          </ul>
        </div>
        
        {resendSuccess && (
          <div className="flex items-start gap-2 p-3 bg-gray-50 text-gray-700 rounded-md border border-gray-200">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-600" />
            <div>
              <p className="font-medium">Verification email resent</p>
              <p className="text-sm text-gray-600">A new verification link has been sent to {email}</p>
            </div>
          </div>
        )}
        
        {resendError && (
          <div className="flex items-start gap-2 p-3 bg-gray-50 text-gray-700 rounded-md border border-gray-200">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-600" />
            <div>
              <p className="font-medium">Failed to resend</p>
              <p className="text-sm text-gray-600">{resendError}</p>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex sm:justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Cancel Verification
          </Button>
          
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {isResending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Resend Email
            </Button>
            
            <Button
              type="button"
              onClick={onVerified}
              className="bg-gray-800 text-white hover:bg-gray-700"
            >
              I've Verified
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
