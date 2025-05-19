
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EmailInput from '@/components/auth/EmailInput';
import { validateEmail } from '@/utils/authValidation';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      console.log(`Sending password reset email to ${email} with redirectTo: ${window.location.origin}/auth/password`);
      
      // Make sure we're using the full URL for the redirectTo
      const redirectUrl = new URL('/auth/password', window.location.origin).toString();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Password reset email error:", error);
        toast({ 
          title: 'Error', 
          description: error.message,
          variant: 'destructive'
        });
      } else {
        console.log("Password reset email sent successfully");
        setEmailSent(true);
        toast({ 
          title: 'Email sent', 
          description: 'Check your inbox for the password reset link'
        });
      }
    } catch (err: any) {
      console.error("Password reset email error:", err);
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
      <div className="space-y-8 text-center">
        <div>
          <h3 className="text-2xl font-bold mb-1">Check your email</h3>
          <p className="text-gray-600">
            We sent a password reset link to <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or request another link.
          </p>
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={() => setEmailSent(false)}
              className="w-full bg-primary text-white hover:bg-primary-hover"
            >
              Try again
            </Button>
            <Button 
              variant="outline" 
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
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-1">Reset password</h3>
        <p className="text-gray-600">
          Enter your email and we'll send you a link to reset your password
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <EmailInput 
            email={email} 
            isValid={emailValid} 
            onChange={setEmail} 
          />
        </div>

        <div className="flex flex-col space-y-3">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !emailValid}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Login
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
