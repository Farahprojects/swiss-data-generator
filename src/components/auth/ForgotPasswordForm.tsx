
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EmailInput from '@/components/auth/EmailInput';
import { validateEmail } from '@/utils/authValidation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logToSupabase } from '@/utils/batchedLogManager';

interface ForgotPasswordFormProps {
  onCancel: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onCancel }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const emailValid = validateEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || loading) return;

    setLoading(true);
    try {
      logToSupabase(`Processing password reset request for ${email}`, {
        level: 'info',
        page: 'ForgotPasswordForm',
        data: { email }
      });

      // First, get the user by email using the admin function
      const { data: userData, error: userError } = await supabase
        .rpc('admin_get_user_by_email', { email_input: email });

      if (userError) {
        logToSupabase("Error fetching user by email", {
          level: 'error',
          page: 'ForgotPasswordForm',
          data: { error: userError.message }
        });
        throw new Error('Failed to process request');
      }

      if (!userData || userData.length === 0) {
        // Don't reveal if email exists or not for security
        logToSupabase("No user found for email, but showing success message", {
          level: 'info',
          page: 'ForgotPasswordForm',
          data: { email }
        });
        setEmailSent(true);
        setResetLinkSent(true);
        setLoading(false);
        return;
      }

      const user = userData[0];
      
      // Call the password_token edge function with the user ID
      const { error: functionError } = await supabase.functions.invoke('password_token', {
        body: { user_id: user.id }
      });
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      logToSupabase("Password reset email sent successfully", {
        level: 'info',
        page: 'ForgotPasswordForm',
        data: { email }
      });
      
      setEmailSent(true);
      setResetLinkSent(true);
    } catch (err: any) {
      logToSupabase("Password reset email error", {
        level: 'error',
        page: 'ForgotPasswordForm',
        data: { error: err.message || String(err) }
      });
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
          
          {resetLinkSent && (
            <div className="flex items-center justify-center text-sm text-green-600 py-2">
              <CheckCircle className="h-4 w-4 mr-1" />
              Reset link sent! Check your email
            </div>
          )}
          
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
