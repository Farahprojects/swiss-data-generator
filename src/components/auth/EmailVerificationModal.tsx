
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

/* Component ---------------------------------------------------------------*/
export function EmailVerificationModal({ isOpen, email, resend, onVerified, onCancel, newEmail }: Props) {
  const { toast } = useToast();
  const targetEmail = newEmail || email || ''; // Use newEmail if provided, fall back to email

  /** request state */
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [checking, setChecking] = useState(false);

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

  /* send / resend link -----------------------------------------------------*/
  const sendLink = async () => {
    if (!targetEmail) {
      debug('No email provided');
      setStatus('error');
      toast({ title: 'Error', description: 'Unable to send verification email', variant: 'destructive' });
      return;
    }

    debug('Resending confirmation to', targetEmail);
    setStatus('sending');
    
    try {
      // PART 2: Using the edge function to resend verification
      const emailCheckRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          resend: true
        }),
      });
      
      const emailCheckData = await emailCheckRes.json();
      
      // If we get an error from the edge function
      if (emailCheckData.error) {
        debug('resend error', emailCheckData.error);
        toast({ 
          title: 'Error', 
          description: emailCheckData.error, 
          variant: 'destructive' 
        });
        setStatus('error');
        return;
      }
      
      // If we used the edge function successfully
      if (emailCheckData.status === 'resent' || emailCheckData.status === 'pending') {
        setStatus('success');
        toast({ 
          title: 'Verification email sent', 
          description: `Check ${targetEmail}` 
        });
        stopPolling();
        intervalRef.current = window.setInterval(poll, 3000);
        return;
      }
      
      // Fallback to the provided resend function if the edge function didn't handle it
      if (resend) {
        const { error } = await resend(targetEmail);
        
        if (error) {
          debug('resend error', error);
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          setStatus('error');
          return;
        }
        
        setStatus('success');
        toast({ title: 'Verification email sent', description: `Check ${targetEmail}` });
      } else {
        // No edge function result and no resend function
        setStatus('error');
        toast({ 
          title: 'Error', 
          description: 'No method available to resend verification email', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      debug('resend exception', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send verification email', 
        variant: 'destructive' 
      });
      setStatus('error');
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

    // auto‑trigger when modal opens and resend function is available
    if (resend) {
      sendLink();
    } else {
      // If no resend function, just set up polling
      stopPolling();
      intervalRef.current = window.setInterval(poll, 3000);
    }

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
    if (status === 'success')
      return (
        <div className="mt-4 flex items-center rounded-md bg-green-50 p-2 text-green-700">
          <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Verification sent to <strong>{targetEmail}</strong>
          </p>
        </div>
      );
    if (status === 'error')
      return (
        <div className="mt-4 flex items-center rounded-md bg-red-50 p-2 text-red-700">
          <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Failed to send email. Please try again.</p>
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
          <Button onClick={poll} disabled={checking}>
            {checking ? (
              <span className="flex items-center"><Loader className="mr-2 h-4 w-4 animate-spin" /> Checking…</span>
            ) : (
              "I've verified my email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
