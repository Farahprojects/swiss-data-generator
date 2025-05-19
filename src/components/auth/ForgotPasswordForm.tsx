
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EmailInput from '@/components/auth/EmailInput';
import { validateEmail } from '@/utils/authValidation';

interface ForgotPasswordFormProps {
  onCancel: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onCancel }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const emailValid = validateEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast({ 
          title: 'Error', 
          description: error.message,
          variant: 'destructive'
        });
      } else {
        setEmailSent(true);
        toast({ 
          title: 'Email sent', 
          description: 'Check your inbox for the password reset link'
        });
      }
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to send reset email',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-medium">Check your email</h3>
          <p className="text-gray-600">
            We sent a password reset link to <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or request another link.
          </p>
          <div className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              onClick={() => setEmailSent(false)}
              className="w-full"
            >
              Try again
            </Button>
            <Button 
              variant="ghost" 
              onClick={onCancel}
              className="w-full"
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <EmailInput 
          email={email} 
          isValid={emailValid} 
          onChange={setEmail} 
        />
      </div>

      <div className="flex flex-col space-y-2">
        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading || !emailValid}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          className="w-full"
        >
          Back to Login
        </Button>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
