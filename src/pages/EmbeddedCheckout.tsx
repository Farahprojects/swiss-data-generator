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

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/c',
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed.');
    } else {
      // Extract guest_id and chat_id from URL for proper redirect
      const url = new URL(window.location.href);
      const guest_id = url.searchParams.get('guest_id');
      const chat_id = url.searchParams.get('chat_id');
      
      if (guest_id && chat_id) {
        // Redirect to guest chat with the specific thread
        window.location.replace(`/c/g/${chat_id}`);
      } else {
        // Fallback to regular chat
        window.location.replace('/c');
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
      <div className="p-10 flex flex-col justify-center items-center bg-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" asLink={false} />
          </div>
          <h1 className="text-4xl font-light italic">Complete your purchase</h1>
          <p className="text-gray-600">Minimal, elegant, Apple-style layout. Your card is processed securely by Stripe.</p>
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


