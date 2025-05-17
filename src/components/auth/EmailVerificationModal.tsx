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
  email: string;
  resend: (email: string) => Promise<{ error: Error | null }>;
  onVerified: () => void;
  onCancel: () => void;
}

/* Dev‑only logger ---------------------------------------------------------*/
const debug = (...a: any[]) => process.env.NODE_ENV !== 'production' && console.log('[EVModal]', ...a);

/* Component ---------------------------------------------------------------*/
export function EmailVerificationModal({ isOpen, email, resend, onVerified, onCancel }: Props) {
  const { toast } = useToast();

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
    debug('Resending confirmation to', email);
    setStatus('sending');
    const { error } = await resend(email);

    if (error) {
      debug('resend error', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setStatus('error');
      return;
    }

    setStatus('success');
    toast({ title: 'Verification email sent', description: `Check ${email}` });
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
  }, [isOpen, email]);

  /* render helpers ---------------------------------------------------------*/
  const Notice = () => {
    if (status === 'success')
      return (
        <div className="mt-4 flex items-center rounded-md bg-green-50 p-2 text-green-700">
          <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Verification sent to <strong>{email}</strong>
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
            We just sent a verification link to <strong>{email}</strong>. Please confirm to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4 text-sm text-gray-600">
          You won’t be able to sign in until your email is verified.
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
