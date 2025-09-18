import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    // Extract guest_id and chat_id from URL for proper redirect
    const url = new URL(window.location.href);
    const guest_id = url.searchParams.get('guest_id');
    const chat_id = url.searchParams.get('chat_id');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: guest_id && chat_id 
          ? `${window.location.origin}/c/g/${chat_id}?payment_status=success&guest_id=${guest_id}`
          : `${window.location.origin}/c?payment_status=success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed.');
      // For failures, redirect with cancelled status to match existing flow
      if (guest_id && chat_id) {
        window.location.replace(`/c/g/${chat_id}?payment_status=cancelled&guest_id=${guest_id}`);
      } else {
        window.location.replace('/c?payment_status=cancelled');
      }
    } else {
      // Success - redirect with success parameters
      if (guest_id && chat_id) {
        window.location.replace(`/c/g/${chat_id}?payment_status=success&guest_id=${guest_id}`);
      } else {
        window.location.replace('/c?payment_status=success');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      {errorMessage && <div className="text-red-600 text-sm">{errorMessage}</div>}
      <Button type="submit" disabled={!stripe || isSubmitting} className="w-full bg-gray-900 text-white">
        {isSubmitting ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  );
}

const EmbeddedCheckout: React.FC = () => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ amount: number; report?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const amount = Number(url.searchParams.get('amount') || '0');
      const guest_id = url.searchParams.get('guest_id') || undefined;
      const chat_id = url.searchParams.get('chat_id') || undefined;
      const report = url.searchParams.get('report') || undefined;

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount, currency: 'usd', guest_id, chat_id, description: 'Conversation payment' }
      });
      if (error) return;
      setClientSecret(data?.client_secret || null);
      setSummary({ amount, report });
    })();
  }, []);

  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  // Build a canonical cancel URL that always carries IDs back to the app
  const cancelHref = useMemo(() => {
    const url = new URL(window.location.href);
    const guest_id = url.searchParams.get('guest_id');
    const chat_id = url.searchParams.get('chat_id');
    return guest_id && chat_id
      ? `/c/g/${chat_id}?payment_status=cancelled&guest_id=${guest_id}`
      : '/c?payment_status=cancelled';
  }, []);

  // Intercept browser back to guarantee cancel redirect with IDs
  useEffect(() => {
    const url = new URL(window.location.href);
    const guest_id = url.searchParams.get('guest_id');
    const chat_id = url.searchParams.get('chat_id');
    const target = guest_id && chat_id
      ? `/c/g/${chat_id}?payment_status=cancelled&guest_id=${guest_id}`
      : '/c?payment_status=cancelled';

    const onPopState = () => {
      window.location.replace(target);
    };

    const onBeforeUnload = () => {
      // Mark as cancelled when user leaves the page
      if (guest_id && chat_id) {
        // Update guest_reports to mark as cancelled
        supabase.functions.invoke('mark-payment-cancelled', {
          body: { guest_id, chat_id }
        }).catch(() => {}); // Ignore errors
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    // Push a state so the next back triggers popstate here
    history.pushState(null, '', window.location.href);
    
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  if (!STRIPE_PUBLISHABLE_KEY) {
    return <div className="p-8">Missing VITE_STRIPE_PUBLISHABLE_KEY</div>;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="p-10 flex flex-col justify-between bg-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" asLink={false} />
          </div>
          <h1 className="text-4xl font-light italic">Therai partners with Stripe for simplified billing.</h1>
          {summary && (
            <div className="mt-8 mx-auto max-w-sm text-center">
              <div className="text-sm text-gray-500 mb-2">Your purchase</div>
              <div className="text-xl font-medium text-gray-900 mb-2">
                {summary.report ? summary.report.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Astrology Report'}
              </div>
              <div className="text-lg font-semibold text-gray-900">USD ${summary.amount.toFixed(2)}</div>
            </div>
          )}
          <div className="space-y-4">
            <a 
              href={cancelHref}
              onClick={(e) => { e.preventDefault(); window.location.replace(cancelHref); }}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              Return to Therai.co
            </a>
            <div className="text-xs text-gray-400 mt-6">
              <div>Therai.co is brand by Farah Projects PTY LTD</div>
              <div>ACN 676 280 229</div>
              <div>Australian registered company (fully legit as)</div>
            </div>
          </div>
        </div>
        
        <div className="max-w-md w-full space-y-4 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <span>Powered by</span>
            <a 
              href="https://stripe.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#635BFF] hover:text-[#4F46E5] font-medium transition-colors"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Stripe
            </a>
          </div>
          <div className="space-x-4">
            <a href="https://stripe.com/billing" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline">Learn more about Stripe Billing</a>
            <a href="https://stripe.com/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline">Terms</a>
            <a href="https://stripe.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline">Privacy</a>
          </div>
        </div>
      </div>
      <div className="p-10 bg-gray-50 flex items-center justify-center">
        {clientSecret && (
          <Elements stripe={stripePromise} options={options as any}>
            <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-sm">
              <CheckoutForm />
            </div>
          </Elements>
        )}
      </div>
    </div>
  );
};

export default EmbeddedCheckout;


