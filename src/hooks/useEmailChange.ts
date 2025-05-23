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
    logToSupabase("Starting email verification resend process", {
      level: 'info',
      page: 'useEmailChange',
      data: { email }
    });
    
    try {
      // Check if we have a valid session first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logToSupabase("Session error when trying to resend verification", {
          level: 'error',
          page: 'useEmailChange',
          data: { error: sessionError.message }
        });
        return { error: new Error(`Session error: ${sessionError.message}`) };
      }
      
      if (!sessionData?.session?.access_token) {
        logToSupabase("No valid access token found for resend request", {
          level: 'error',
          page: 'useEmailChange',
          data: { hasSession: !!sessionData?.session, hasToken: !!sessionData?.session?.access_token }
        });
        return { error: new Error('No valid authentication token available') };
      }

      const functionUrl = `https://auth.theraiastro.com/functions/v1/resend-email-change`;
      const requestBody = JSON.stringify({ email });
      const authToken = sessionData.session.access_token;

      logToSupabase("About to make fetch request to resend-email-change", {
        level: 'info',
        page: 'useEmailChange',
        data: { 
          url: functionUrl,
          hasAuthToken: !!authToken,
          tokenLength: authToken?.length || 0,
          requestBodyLength: requestBody.length
        }
      });

      // Make the fetch request with detailed logging
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0'
        },
        body: requestBody
      });

      logToSupabase("Fetch request completed", {
        level: 'info',
        page: 'useEmailChange',
        data: { 
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          }
        }
      });

      // Check if the response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        logToSupabase("HTTP error response from resend-email-change", {
          level: 'error',
          page: 'useEmailChange',
          data: { 
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          }
        });
        
        // Handle specific HTTP status codes
        switch (response.status) {
          case 401:
            return { error: new Error('Authentication failed. Please log in again.') };
          case 404:
            return { error: new Error('Email resend service not found. Please contact support.') };
          case 500:
            return { error: new Error('Server error. Please try again later.') };
          default:
            return { error: new Error(`Request failed with status ${response.status}: ${errorText}`) };
        }
      }

      // Try to parse the JSON response
      let result;
      try {
        result = await response.json();
        logToSupabase("Successfully parsed JSON response", {
          level: 'info',
          page: 'useEmailChange',
          data: { result }
        });
      } catch (parseError: any) {
        logToSupabase("Failed to parse JSON response", {
          level: 'error',
          page: 'useEmailChange',
          data: { parseError: parseError.message }
        });
        return { error: new Error('Invalid response format from server') };
      }

      // Check if the result indicates an error
      if (result.error) {
        logToSupabase("Edge function returned an error", {
          level: 'error',
          page: 'useEmailChange',
          data: { error: result.error, details: result.details }
        });
        return { error: new Error(result.error) };
      }

      logToSupabase("Email verification resend completed successfully", {
        level: 'info',
        page: 'useEmailChange',
        data: { status: result.status }
      });

      return { error: null };

    } catch (fetchError: any) {
      // This catches network errors, timeouts, etc.
      logToSupabase("Network error during resend verification", {
        level: 'error',
        page: 'useEmailChange',
        data: { 
          error: fetchError.message || String(fetchError),
          name: fetchError.name,
          stack: fetchError.stack
        }
      });
      
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        return { error: new Error('Network error. Please check your connection and try again.') };
      }
      
      return { error: new Error(fetchError.message || 'An unexpected error occurred') };
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
