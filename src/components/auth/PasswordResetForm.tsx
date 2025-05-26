
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { logToSupabase } from '@/utils/batchedLogManager';
import PasswordInput from './PasswordInput';
import { passwordRequirements } from '@/utils/authValidation';

interface PasswordResetFormProps {
  onSuccess: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  // Check if password meets requirements
  const passwordValid = passwordRequirements.every(req => req.validate(newPassword));
  
  // Check if passwords match
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logToSupabase('Password reset form submitted', {
      level: 'debug',
      page: 'PasswordResetForm',
      data: { passwordValid, passwordsMatch }
    });
    
    if (!passwordValid) {
      toast({
        variant: 'destructive',
        title: 'Invalid Password',
        description: 'Please ensure your password meets all requirements.'
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'Passwords do not match.'
      });
      return;
    }

    setIsUpdating(true);

    try {
      logToSupabase('Updating password after reset', {
        level: 'info',
        page: 'PasswordResetForm'
      });

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      logToSupabase('Password updated successfully after reset', {
        level: 'info',
        page: 'PasswordResetForm'
      });

      // Sign out the user after password update to ensure clean state
      await supabase.auth.signOut();

      setShowSuccess(true);
      toast({
        variant: 'success',
        title: 'Password Updated Successfully!',
        description: 'Please sign in with your new password.'
      });

      // Show success for a moment, then call onSuccess
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      logToSupabase('Error updating password after reset', {
        level: 'error',
        page: 'PasswordResetForm',
        data: { error: error.message || String(error) }
      });

      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update password. Please try again.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>
          Please create a new password for your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            password={newPassword}
            isValid={passwordValid}
            onChange={setNewPassword}
            label="New Password"
            placeholder="Enter your new password"
            id="newPassword"
          />

          {passwordValid && (
            <PasswordInput
              password={confirmPassword}
              isValid={passwordsMatch}
              onChange={setConfirmPassword}
              label="Confirm New Password"
              placeholder="Confirm your new password"
              id="confirmPassword"
              showRequirements={false}
              showMatchError={confirmPassword.length > 0 && !passwordsMatch}
            />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!passwordValid || !passwordsMatch || isUpdating || showSuccess}
          >
            {isUpdating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Updating Password...
              </>
            ) : showSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Password Updated Successfully!
              </>
            ) : (
              'Update Password'
            )}
          </Button>

          {showSuccess && (
            <div className="text-center text-sm text-green-600 mt-2">
              Success! Redirecting to login...
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default PasswordResetForm;
