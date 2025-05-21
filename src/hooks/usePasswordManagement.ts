
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logToSupabase } from '@/utils/batchedLogManager';
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
      
      setIsUpdatingPassword(false);
      return { success: false, error: error.message || "There was an error verifying your password." };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    
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
        
        setIsUpdatingPassword(false);
        return { success: false, error: error.message };
      }
      
      logToSupabase("Password updated successfully", {
        level: 'info',
        page: 'usePasswordManagement'
      });
      
      // Send notification if the user has them enabled
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          // Check if notifications are enabled
          const { data: userPrefs } = await supabase
            .from('user_preferences')
            .select('email_notifications_enabled')
            .eq('user_id', userData.user.id)
            .single();
          
          // If no preference found or notifications are enabled (default), send notification
          if (!userPrefs || userPrefs.email_notifications_enabled !== false) {
            await sendPasswordChangeNotification(userData.user.email);
          }
        }
      } catch (notifError) {
        // Log the error but don't fail the password change
        logToSupabase("Failed to send password change notification", {
          level: 'error',
          page: 'usePasswordManagement',
          data: { error: notifError }
        });
      }
      
      setIsUpdatingPassword(false);
      return { success: true };
    } catch (error: any) {
      logToSupabase("Error updating password", {
        level: 'error',
        page: 'usePasswordManagement',
        data: { error: error.message || String(error) }
      });
      
      setIsUpdatingPassword(false);
      return { success: false, error: error.message };
    }
  };
  
  const resetPassword = async (email: string) => {
    if (!email) return { success: false, error: "Email is required" };
    
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
