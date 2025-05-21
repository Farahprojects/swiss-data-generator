
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logToSupabase } from '@/utils/batchedLogManager';

export function usePasswordManagement() {
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast, clearToast } = useToast();

  const verifyCurrentPassword = async (email: string, currentPassword: string) => {
    if (!currentPassword) {
      return { success: false, error: "Password is required" };
    }
    
    setIsUpdatingPassword(true);
    clearToast();
    
    try {
      logToSupabase("Verifying current password", {
        level: 'info',
        page: 'usePasswordManagement'
      });
      
      // Verify current password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (error) {
        logToSupabase("Current password verification failed", {
          level: 'error',
          page: 'usePasswordManagement',
          data: { error: error.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Current password is incorrect."
        });
        setIsUpdatingPassword(false);
        return { success: false, error: "Current password is incorrect." };
      }

      logToSupabase("Current password verified successfully", {
        level: 'info',
        page: 'usePasswordManagement'
      });
      
      setIsUpdatingPassword(false);
      return { success: true };
    } catch (error: any) {
      logToSupabase("Error verifying current password", {
        level: 'error',
        page: 'usePasswordManagement',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error verifying your password."
      });
      setIsUpdatingPassword(false);
      return { success: false, error: error.message || "There was an error verifying your password." };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    clearToast();
    
    try {
      logToSupabase("Updating password", {
        level: 'info',
        page: 'usePasswordManagement'
      });
      
      // Update the password
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) {
        logToSupabase("Password update failed", {
          level: 'error',
          page: 'usePasswordManagement',
          data: { error: error.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your password."
        });
        setIsUpdatingPassword(false);
        return { success: false, error: error.message };
      }
      
      logToSupabase("Password updated successfully", {
        level: 'info',
        page: 'usePasswordManagement'
      });
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully."
      });
      
      setIsUpdatingPassword(false);
      return { success: true };
    } catch (error: any) {
      logToSupabase("Error updating password", {
        level: 'error',
        page: 'usePasswordManagement',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your password."
      });
      
      setIsUpdatingPassword(false);
      return { success: false, error: error.message };
    }
  };
  
  const resetPassword = async (email: string) => {
    if (!email) return { success: false, error: "Email is required" };
    
    clearToast();
    setResetEmailSent(false);
    
    try {
      logToSupabase("Sending password reset email", {
        level: 'info',
        page: 'usePasswordManagement',
        data: { email }
      });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      
      if (error) {
        logToSupabase("Failed to send reset password email", {
          level: 'error',
          page: 'usePasswordManagement',
          data: { error: error.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset password email."
        });
        return { success: false, error: error.message };
      }
      
      logToSupabase("Password reset email sent successfully", {
        level: 'info',
        page: 'usePasswordManagement',
        data: { email }
      });
      
      // Show inline success message
      setResetEmailSent(true);
      return { success: true };
    } catch (error: any) {
      logToSupabase("Error sending password reset email", {
        level: 'error',
        page: 'usePasswordManagement',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset password email."
      });
      
      return { success: false, error: error.message };
    }
  };

  return {
    isUpdatingPassword,
    resetEmailSent,
    verifyCurrentPassword,
    updatePassword,
    resetPassword
  };
}

export default usePasswordManagement;
