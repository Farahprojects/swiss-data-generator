
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logToSupabase } from '@/utils/batchedLogManager';

export function useEmailChange() {
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const { toast, clearToast } = useToast();

  // Set up auth state listener for email change events
  useEffect(() => {
    logToSupabase("Setting up email change auth state listener", {
      level: 'debug',
      page: 'useEmailChange'
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logToSupabase("useEmailChange: Auth state change event", {
        level: 'debug',
        page: 'useEmailChange',
        data: { event }
      });
      
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        logToSupabase("useEmailChange: Email change confirmed or user updated", {
          level: 'info',
          page: 'useEmailChange',
          data: { email: session?.user?.email, confirmed: session?.user?.email_confirmed_at }
        });
        
        // If the user has confirmed their email, close the verification modal
        if (session?.user?.email_confirmed_at && 
            pendingEmailVerification && 
            session?.user?.email === newEmailAddress) {
          logToSupabase("useEmailChange: Email verified, closing modal", {
            level: 'info',
            page: 'useEmailChange'
          });
          handleVerificationComplete();
        }
      }
    });
    
    return () => {
      logToSupabase("Cleaning up auth state listener in useEmailChange", {
        level: 'debug',
        page: 'useEmailChange'
      });
      subscription.unsubscribe();
    };
  }, [pendingEmailVerification, newEmailAddress]);
  
  // Check if the user has a pending email verification
  useEffect(() => {
    const checkPendingEmailVerification = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      
      if (user && !user.email_confirmed_at && user.email) {
        // If email is not confirmed, show the verification modal
        setPendingEmailVerification(true);
        setNewEmailAddress(user.email);
        logToSupabase("User has pending email verification", {
          level: 'info',
          page: 'useEmailChange',
          data: { email: user.email }
        });
      } else {
        logToSupabase("User email status", {
          level: 'debug',
          page: 'useEmailChange',
          data: { email: user?.email, confirmed_at: user?.email_confirmed_at }
        });
        setPendingEmailVerification(false);
      }
    };
    
    checkPendingEmailVerification();
  }, []);

  const changeEmail = async (currentEmail: string, newEmail: string) => {
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
      logToSupabase("Initiating email change", {
        level: 'info',
        page: 'useEmailChange',
        data: { from: currentEmail, to: newEmail }
      });
      
      // Store the new email before updating
      setNewEmailAddress(newEmail);

      // Update the email - no password verification needed
      const { error, data: updateData } = await supabase.auth.updateUser({ 
        email: newEmail 
      });
      
      logToSupabase("Update user email response", {
        level: 'debug',
        page: 'useEmailChange',
        data: { response: updateData, error: error?.message }
      });
      
      if (error) {
        console.log("Email update error:", error.message);
        
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
      
      // Check user preferences for notifications
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data, error: prefsError } = await supabase
          .from('user_preferences')
          .select('email_notifications_enabled, email_change_notifications')
          .eq('user_id', userData.user.id)
          .single();
        
        // Check both the master toggle and the specific notification toggle
        // Default to showing if there's an error or no preferences found
        const shouldShowNotification = 
          prefsError || 
          !data || 
          (data.email_notifications_enabled !== false && 
           data.email_change_notifications !== false);
        
        if (shouldShowNotification) {
          toast({
            title: "Email verification sent",
            description: "We've sent a verification link to your new email address. Please check your inbox."
          });
        } else {
          toast({
            title: "Email verification sent",
            description: "We've sent a verification link to your new email address. Please check your inbox."
          });
        }
      }
      
      setIsUpdatingEmail(false);
      return { success: true, pendingVerification: true };
    } catch (error: any) {
      logToSupabase("Error updating email address", {
        level: 'error',
        page: 'useEmailChange',
        data: { error: error.message || String(error) }
      });
      
      console.log("Email change error:", error.message || String(error));
      
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
      // Use the new email-verification edge function
      const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

      const response = await fetch(`${SUPABASE_URL}/functions/v1/email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          email: email,
          template_type: 'email_change'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to resend verification (${response.status})`);
      }

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
