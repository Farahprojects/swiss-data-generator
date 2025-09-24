import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';
import { passwordRequirements } from '@/utils/authValidation';
import { CheckCircle } from 'lucide-react';

interface PasswordResetFormProps {
  onSuccess: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isPasswordValid = passwordRequirements.every(requirement => 
    requirement.test(newPassword)
  );
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordValid && passwordsMatch && !isUpdating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsUpdating(true);
    try {
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message || 'Failed to update password');
      }

      // Sign out the user after password update to ensure clean state
      await supabase.auth.signOut();

      setShowSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated. Please sign in with your new password.',
        variant: 'default'
      });

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="max-w-md mx-auto space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-light text-gray-900">Password <em>Updated</em></h3>
            <p className="text-gray-600 font-light leading-relaxed">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h3 className="text-2xl font-light text-gray-900">Set your new <em>password</em></h3>
        <p className="text-gray-600 font-light leading-relaxed">
          Choose a strong password for your account
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <PasswordInput 
            password={newPassword} 
            isValid={isPasswordValid} 
            onChange={setNewPassword}
            placeholder="Enter new password"
          />
          
          <PasswordInput 
            password={confirmPassword} 
            isValid={passwordsMatch} 
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
          />
        </div>

        <div className="space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-gray-900 text-white hover:bg-gray-800 font-light px-8 py-4 rounded-full text-lg" 
            disabled={!canSubmit}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PasswordResetForm;