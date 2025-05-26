
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
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationModalProps {
  isOpen: boolean;
  currentEmail: string;
  newEmail: string;
  resend: (currentEmail: string, newEmail: string) => Promise<{ error: Error | null }>;
  onVerified: () => void;
  onCancel: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  currentEmail,
  newEmail,
  resend,
  onVerified,
  onCancel
}) => {
  const { user } = useAuth();
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
        data: { currentEmail, newEmail }
      });

      // Call the email-verification edge function with exact payload format
      const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

      const response = await fetch(`${SUPABASE_URL}/functions/v1/email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          user_id: user?.id || '',
          current_email: currentEmail,
          new_email: newEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to resend verification (${response.status})`);
      }

      const result = await response.json();
      
      if (result.status === 'sent') {
        setResendSuccess(true);
        logToSupabase("Verification email resent successfully", {
          level: 'info',
          page: 'EmailVerificationModal'
        });
      } else {
        throw new Error(result.error || 'Unexpected response from server');
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
      <DialogContent className="sm:max-w-sm rounded-xl border bg-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-gray-900">
            <Mail className="h-5 w-5 text-gray-500" />
            Verify Your New Email Address
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            We've sent instructions to <span className="font-medium text-gray-800">{newEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-4 space-y-3 text-sm text-gray-700">
          <li>Check your <strong>{newEmail}</strong> inbox for a verification email</li>
          <li>Click the link in that email to confirm your address</li>
          <li>Check your spam/junk folder if it's not in your inbox</li>
          <li>Your old email has also been notified of this change</li>
        </ul>

        {resendSuccess && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
            <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
            <div>
              <p className="font-medium">Email resent</p>
              <p className="text-xs text-gray-600">A new verification link has been sent to {newEmail}</p>
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

        <DialogFooter className="mt-6 flex justify-end gap-3">
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
            className="text-sm bg-gray-900 text-white hover:bg-gray-800"
          >
            I've Verified
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
