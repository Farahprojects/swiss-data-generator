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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LoginVerificationModalProps {
  isOpen: boolean;
  email: string;
  currentEmail: string; // The user's confirmed email address
  pendingEmail?: string; // The new email address where verification was sent
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  onVerified: () => void;
  onCancel: () => void;
}

export const LoginVerificationModal: React.FC<LoginVerificationModalProps> = ({
  isOpen,
  email,
  currentEmail,
  pendingEmail,
  resendVerificationEmail,
  onVerified,
  onCancel
}) => {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Use pendingEmail if available, otherwise fall back to email
  const verificationEmail = pendingEmail || email;
  const isEmailChange = !!pendingEmail;
  
  // Use the actual current email for display
  const displayCurrentEmail = currentEmail || user?.email || email;

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      // Use Supabase edge function via the client
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: {
          user_id: user?.id || ''
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to resend verification');
      }

      setResendSuccess(true);

    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl border bg-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-gray-900 font-medium">
            <Mail className="h-5 w-5 text-[#7C3AED]" />
            {isEmailChange ? 'Verify Your New Email Address' : 'Verify Your Email Address'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            We've sent instructions to <span className="font-medium text-gray-800">{verificationEmail}</span>
            {isEmailChange && (
              <span className="block mt-1 text-xs text-gray-500">
                (This is your new email address)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
          <li>Check your <strong>{verificationEmail}</strong> inbox for a verification email</li>
          <li>Click the link in that email to confirm your address</li>
          <li>Didn't get it? Check your spam or junk folder</li>
          {isEmailChange && displayCurrentEmail !== verificationEmail && (
            <li className="text-xs text-gray-500">Your previous email ({displayCurrentEmail}) has also been notified of this change</li>
          )}
        </ul>

        {resendSuccess && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
            <CheckCircle className="h-5 w-5 mt-0.5 text-[#7C3AED]" />
            <div>
              <p className="font-medium">Email resent</p>
              <p className="text-xs text-gray-600">A new verification link has been sent to {verificationEmail}</p>
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
            className="text-sm border-gray-200 text-gray-700 hover:bg-gray-50 min-w-[120px]"
          >
            {isResending ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Email'
            )}
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
