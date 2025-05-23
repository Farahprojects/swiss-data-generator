
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
      <DialogContent className="sm:max-w-sm rounded-2xl border bg-white px-8 py-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-gray-900 font-medium">
            <Mail className="h-5 w-5 text-[#7C3AED]" />
            Verify Your Email Address
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            We've sent instructions to <span className="font-medium text-gray-800">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
          <li>Check your <strong>{email}</strong> inbox for a verification email</li>
          <li>Click the link in that email to confirm your address</li>
          <li>Didn't get it? Check your spam or junk folder</li>
        </ul>

        {resendSuccess && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
            <CheckCircle className="h-5 w-5 mt-0.5 text-[#7C3AED]" />
            <div>
              <p className="font-medium">Email resent</p>
              <p className="text-xs text-gray-600">A new verification link has been sent to {email}</p>
            </div>
          </div>
        )}

        {resendError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
            <AlertCircle className="h-5 w-5 mt-0.5 text-red-500" />
            <div>
              <p className="font-medium">Resend failed</p>
              <p className="text-xs text-gray-600">{resendError}</p>
            </div>
          </div>
        )}

        <hr className="my-5 border-gray-100" />

        <DialogFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-sm border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            variant="outline"
            className="text-sm border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {isResending && <Loader className="mr-2 h-4 w-4 animate-spin" />} Resend Email
          </Button>

          <Button
            type="button"
            onClick={onVerified}
            className="text-sm bg-[#7C3AED] text-white hover:bg-[#6B2FC9]"
          >
            I've Verified
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
