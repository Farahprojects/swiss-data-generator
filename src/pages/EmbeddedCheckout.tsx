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

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const amount = Number(url.searchParams.get('amount') || '0');
      const guest_id = url.searchParams.get('guest_id') || undefined;
      const chat_id = url.searchParams.get('chat_id') || undefined;

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount, currency: 'usd', guest_id, chat_id, description: 'Conversation payment' }
      });
      if (error) return;
      setClientSecret(data?.client_secret || null);
    })();
  }, []);

  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

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
          <div className="space-y-4">
            <a 
              href={`${window.location.origin}?stripe=cancel`}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              Return to Therai.co
            </a>
          </div>
        </div>
        
        <div className="max-w-md w-full space-y-4 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <span>Powered by</span>
            <svg className="h-4" viewBox="0 0 100 20" fill="none">
              <path d="M13.5 2.5h-3v15h3v-15zM20.5 2.5h-3v15h3v-15zM27.5 2.5h-3v15h3v-15zM34.5 2.5h-3v15h3v-15zM41.5 2.5h-3v15h3v-15zM48.5 2.5h-3v15h3v-15zM55.5 2.5h-3v15h3v-15zM62.5 2.5h-3v15h3v-15zM69.5 2.5h-3v15h3v-15zM76.5 2.5h-3v15h3v-15z" fill="#635BFF"/>
              <text x="85" y="12" fontSize="8" fill="#635BFF" fontFamily="system-ui">Stripe</text>
            </svg>
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


