
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logToSupabase } from '@/utils/batchedLogManager';

export function useEmailChange() {
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const { toast, clearToast } = useToast();

  const changeEmail = async (currentEmail: string, newEmail: string, password: string) => {
    if (!newEmail) {
      return { success: false, error: "Email is required" };
    }
    
    // Prevent changing to the same email
    if (newEmail === currentEmail) {
      return { success: false, error: "This is already your current email address." };
    }
    
    setIsUpdatingEmail(true);
    clearToast();
    
    try {
      logToSupabase("Verifying password for email change", {
        level: 'info',
        page: 'useEmailChange'
      });
      
      // Verify password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentEmail || '',
        password: password
      });

      if (verifyError) {
        logToSupabase("Password verification failed for email change", {
          level: 'error',
          page: 'useEmailChange',
          data: { error: verifyError.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Password is incorrect."
        });
        setIsUpdatingEmail(false);
        return { success: false, error: "Password is incorrect." };
      }

      logToSupabase("Initiating email change", {
        level: 'info',
        page: 'useEmailChange',
        data: { from: currentEmail, to: newEmail }
      });
      
      // Store the new email before updating
      setNewEmailAddress(newEmail);

      // Update the email
      const { error, data: updateData } = await supabase.auth.updateUser({ 
        email: newEmail 
      });
      
      logToSupabase("Update user email response", {
        level: 'debug',
        page: 'useEmailChange',
        data: { response: updateData, error: error?.message }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your email address."
        });
        setIsUpdatingEmail(false);
        return { success: false, error: error.message };
      }
      
      // Show the verification modal
      setPendingEmailVerification(true);
      
      toast({
        title: "Email verification sent",
        description: "We've sent a notification email to your current email address and a verification link to your new email address. Please check both inboxes."
      });
      
      setIsUpdatingEmail(false);
      return { success: true, pendingVerification: true };
    } catch (error: any) {
      logToSupabase("Error updating email address", {
        level: 'error',
        page: 'useEmailChange',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your email address."
      });
      
      setIsUpdatingEmail(false);
      return { success: false, error: error.message || "There was an error updating your email address." };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    logToSupabase("Resending email verification", {
      level: 'info',
      page: 'useEmailChange',
      data: { email }
    });
    
    try {
      // Use our custom edge function to resend verification
      const response = await fetch(`https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/resend-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      return { error: result.error ? new Error(result.error) : null };
    } catch (err: any) {
      logToSupabase("Error resending verification", {
        level: 'error',
        page: 'useEmailChange',
        data: { error: err.message || String(err) }
      });
      
      return { error: err as Error };
    }
  };

  const handleVerificationComplete = async () => {
    setPendingEmailVerification(false);
    
    try {
      logToSupabase("Refreshing session after email verification", {
        level: 'info',
        page: 'useEmailChange'
      });
      
      await supabase.auth.refreshSession();
      
      toast({
        title: "Email verified",
        description: "Your email address has been successfully verified."
      });
      
      return { success: true };
    } catch (error: any) {
      logToSupabase("Error refreshing session", {
        level: 'error',
        page: 'useEmailChange',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem refreshing your session."
      });
      
      return { success: false, error: error.message };
    }
  };

  const cancelEmailChange = () => {
    setPendingEmailVerification(false);
    
    logToSupabase("Email change cancelled by user", {
      level: 'info',
      page: 'useEmailChange'
    });
    
    toast({
      title: "Email change cancelled",
      description: "Your email address change has been cancelled."
    });
  };

  return {
    isUpdatingEmail,
    pendingEmailVerification,
    setPendingEmailVerification,
    newEmailAddress,
    setNewEmailAddress,
    changeEmail,
    resendVerificationEmail,
    handleVerificationComplete,
    cancelEmailChange
  };
}

export default useEmailChange;
