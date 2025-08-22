import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendPasswordChangeNotification } from '@/utils/notificationService';

export function usePasswordManagement() {
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const verifyCurrentPassword = async (email: string, currentPassword: string) => {
    if (!currentPassword) {
      return { success: false, error: "Password is required" };
    }
    
    setIsUpdatingPassword(true);
    
    try {
      // Verify current password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (error) {
        setIsUpdatingPassword(false);
        return { success: false, error: "Current password is incorrect." };
      }

      setIsUpdatingPassword(false);
      return { success: true };
    } catch (error: any) {
      setIsUpdatingPassword(false);
      return { success: false, error: error.message || "There was an error verifying your password." };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    
    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) {
        setIsUpdatingPassword(false);
        return { success: false, error: error.message };
      }
      
      // Send notification if the user has them enabled
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          // Check if notifications are enabled
          const { data, error: prefsError } = await supabase
            .from('user_preferences')
            .select('email_notifications_enabled, password_change_notifications')
            .eq('user_id', userData.user.id)
            .single();
          
          // Default to sending notification if we can't get preferences or if settings allow it
          const shouldSendNotification = 
            prefsError || // Default is to send if error occurred
            !data || // Default is to send if no preferences found
            (data.email_notifications_enabled !== false && 
             data.password_change_notifications !== false);
          
          if (shouldSendNotification) {
            await sendPasswordChangeNotification(userData.user.email);
          }
        }
      } catch (notifError) {
        // Log the error but don't fail the password change
        console.error('Failed to send password change notification:', notifError);
      }
      
      setIsUpdatingPassword(false);
      return { success: true };
    } catch (error: any) {
      setIsUpdatingPassword(false);
      return { success: false, error: error.message };
    }
  };
  
  const resetPassword = async (email: string) => {
    if (!email) return { success: false, error: "Email is required" };
    
    setResetEmailSent(false);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/settings`
          : '/settings',
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Show inline success message
      setResetEmailSent(true);
      return { success: true };
    } catch (error: any) {
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