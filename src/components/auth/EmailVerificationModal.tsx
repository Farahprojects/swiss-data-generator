
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

/* Types -------------------------------------------------------------------*/
interface Props {
  isOpen: boolean;
  email?: string;  // Making email optional
  resend?: (email: string) => Promise<{ error: Error | null }>; // Making resend optional
  onVerified: () => void;
  onCancel: () => void;
  newEmail?: string; // Added newEmail prop to match usage in AccountSettingsPanel
}

/* Dev‑only logger ---------------------------------------------------------*/
const debug = (...a: any[]) => process.env.NODE_ENV !== 'production' && console.log('[EVModal]', ...a);

// Import the hardcoded URL directly
const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

/* Component ---------------------------------------------------------------*/
export function EmailVerificationModal({ isOpen, email, resend, onVerified, onCancel, newEmail }: Props) {
  const { toast } = useToast();
  const targetEmail = newEmail || email || ''; // Use newEmail if provided, fall back to email

  /** request state */
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);

  /** polling timer */
  const intervalRef = useRef<number | null>(null);
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const poll = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        stopPolling();
        onVerified();
      }
    } finally {
      setChecking(false);
    }
  };

  const handleVerificationButton = async () => {
    setChecking(true);
    setAutoSigningIn(true);
    
    try {
      // First refresh the session to check if email is verified
      await supabase.auth.refreshSession();
      
      // Get the current session and user data
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      
      debug('Current session:', sessionData?.session ? 'exists' : 'none');
      debug('User verification status:', userData?.user?.email_confirmed_at ? 'verified' : 'not verified');
      
      // Try a second refresh if the first one didn't work
      if (!userData?.user?.email_confirmed_at) {
        debug('First check failed, trying another refresh');
        // Adding a small delay before the second attempt
        await new Promise(resolve => setTimeout(resolve, 500));
        await supabase.auth.refreshSession();
        const { data: retryData } = await supabase.auth.getUser();
        
        debug('Retry verification status:', retryData?.user?.email_confirmed_at ? 'verified' : 'still not verified');
        
        if (retryData?.user?.email_confirmed_at) {
          // Email is verified on second attempt
          stopPolling();
          toast({ 
            title: 'Success', 
            description: 'Email verified successfully', 
          });
          return onVerified();
        }
      } else {
        // Email was verified on first attempt
        stopPolling();
        toast({ 
          title: 'Success', 
          description: 'Email verified successfully', 
        });
        return onVerified();
      }
      
      // If we get here, the email is still not verified
      toast({ 
        title: 'Not yet verified', 
        description: 'Please check your email and click the verification link first', 
      });
    } catch (error) {
      console.error('Verification check failed:', error);
      toast({ 
        title: 'Verification check failed', 
        description: 'Please try again', 
        variant: 'destructive' 
      });
    } finally {
      setChecking(false);
      setAutoSigningIn(false);
    }
  };

  /* send / resend link -----------------------------------------------------*/
  const sendLink = async () => {
    if (!targetEmail) {
      debug('No email provided');
      setStatus('error');
      setStatusMessage('Unable to send verification email: no email address provided');
      toast({ title: 'Error', description: 'Unable to send verification email', variant: 'destructive' });
      return;
    }

    debug('Resending confirmation to', targetEmail);
    setStatus('sending');
    setStatusMessage(null);
    
    try {
      // Use the resend-email-change edge function
      console.log(`Calling resend-email-change function: ${SUPABASE_URL}/functions/v1/resend-email-change`);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/resend-email-change`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          email: targetEmail,
        }),
      });
      
      console.log("Resend email change response status:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("Resend email change data:", data);
      } catch (err) {
        console.error("Failed to parse resend-email-change response:", err);
        setStatus('error');
        setStatusMessage('Failed to process server response');
        toast({ 
          title: 'Error', 
          description: 'Failed to process server response', 
          variant: 'destructive' 
        });
        return;
      }
      
      // Handle the specific status responses from the edge function
      if (data.status === 'resent') {
        setStatus('success');
        setStatusMessage(`Verification email sent to ${targetEmail}`);
        toast({ 
          title: 'Verification email sent', 
          description: `Check ${targetEmail}` 
        });
      } else if (data.status === 'no_pending_change') {
        // No pending change to confirm
        setStatus('error');
        setStatusMessage('No pending email change to confirm');
        toast({ 
          title: 'Info', 
          description: 'No pending email change was found for this account' 
        });
      } else if (data.status === 'no_user_found') {
        setStatus('error');
        setStatusMessage('No account found with this email address');
        toast({ 
          title: 'Error', 
          description: 'No account found with this email address', 
          variant: 'destructive' 
        });
      } else if (resend) {
        // Fall back to the provided resend function if the edge function didn't handle it
        // and we have a resend function provided
        const { error } = await resend(targetEmail);
        
        if (error) {
          debug('resend error', error);
          setStatus('error');
          setStatusMessage(`Failed to send verification email: ${error.message}`);
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return;
        }
        
        setStatus('success');
        setStatusMessage(`Verification email sent to ${targetEmail}`);
        toast({ title: 'Verification email sent', description: `Check ${targetEmail}` });
      } else {
        // Unexpected status response or error
        setStatus('error');
        setStatusMessage('Unable to send verification email');
        toast({ 
          title: 'Error', 
          description: 'Unable to send verification email', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      debug('resend exception', error);
      setStatus('error');
      setStatusMessage(`Failed to send verification email: ${error.message || 'Unknown error'}`);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send verification email', 
        variant: 'destructive' 
      });
    }
    
    stopPolling();
    intervalRef.current = window.setInterval(poll, 3000);
  };

  /* lifecycle -------------------------------------------------------------*/
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      return;
    }

    // auto‑trigger when modal opens
    sendLink();

    // realtime listener (covers user clicking link in another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
        debug('Realtime confirmation detected');
        stopPolling();
        onVerified();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetEmail]);

  /* render helpers ---------------------------------------------------------*/
  const Notice = () => {
    if (status === 'success' && statusMessage)
      return (
        <div className="mt-4 flex items-center rounded-md bg-green-50 p-2 text-green-700">
          <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{statusMessage}</p>
        </div>
      );
    if (status === 'error' && statusMessage)
      return (
        <div className="mt-4 flex items-center rounded-md bg-red-50 p-2 text-red-700">
          <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{statusMessage}</p>
        </div>
      );
    return null;
  };

  /* UI --------------------------------------------------------------------*/
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Verify your email address</DialogTitle>
          <DialogDescription>
            We just sent a verification link to <strong>{targetEmail}</strong>. Please confirm to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4 text-sm text-gray-600">
          You won't be able to sign in until your email is verified.
          <Notice />
          <Button
            variant="outline"
            onClick={sendLink}
            disabled={status === 'sending'}
            className="w-full"
          >
            {status === 'sending' ? (
              <span className="flex items-center"><Loader className="mr-2 h-4 w-4 animate-spin" /> Sending…</span>
            ) : (
              'Resend verification email'
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleVerificationButton} disabled={checking || autoSigningIn}>
            {checking || autoSigningIn ? (
              <span className="flex items-center"><Loader className="mr-2 h-4 w-4 animate-spin" /> {autoSigningIn ? 'Signing in...' : 'Checking…'}</span>
            ) : (
              "I've verified my email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
