import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendEmailChangeNotification } from '@/utils/notificationService';

export function useEmailChange() {
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [currentEmailAddress, setCurrentEmailAddress] = useState("");
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const { toast, clearToast } = useToast();

  // Set up auth state listener for email change events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        // If the user has confirmed their email, close the verification modal
        if (session?.user?.email_confirmed_at && 
            pendingEmailVerification && 
            session?.user?.email === newEmailAddress) {
          handleVerificationComplete();
        }
      }
    });
    
    return () => {
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
      } else {
        setPendingEmailVerification(false);
      }
    };
    
    checkPendingEmailVerification();
  }, []);

  const sendVerificationEmail = async (currentEmail: string, newEmail: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      // Use Supabase edge function via the client
      const { data: result, error } = await supabase.functions.invoke('email-verification', {
        body: {
          user_id: userData?.user?.id || ''
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send verification email');
      }
      
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  const resendVerificationEmail = async (currentEmail: string, newEmail: string) => {
    try {
      await sendVerificationEmail(currentEmail, newEmail);
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

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
      // Store both emails before updating
      setCurrentEmailAddress(currentEmail);
      setNewEmailAddress(newEmail);

      // Update the email without triggering automatic Supabase emails
      const { error, data: updateData } = await supabase.auth.updateUser({ 
        email: newEmail 
      }, {
        emailRedirectTo: undefined // Disable automatic email sending
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
      
      // Send verification email to NEW email address
      await sendVerificationEmail(currentEmail, newEmail);
      
      // Send notification email to OLD email address
      await sendEmailChangeNotification(currentEmail, newEmail);
      
      // Show the verification modal
      setPendingEmailVerification(true);
      
      toast({
        title: "Email verification sent",
        description: `We've sent a verification link to ${newEmail}. Please check your inbox. A notification has also been sent to your current email.`
      });
      
      setIsUpdatingEmail(false);
      return { success: true, pendingVerification: true };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your email address."
      });
      
      setIsUpdatingEmail(false);
      return { success: false, error: error.message || "There was an error updating your email address." };
    }
  };

  const handleVerificationComplete = async () => {
    setPendingEmailVerification(false);
    
    try {
      await supabase.auth.refreshSession();
      
      toast({
        title: "Email verified",
        description: "Your email address has been successfully verified."
      });
      
      return { success: true };
    } catch (error: any) {
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
    
    toast({
      title: "Email change cancelled",
      description: "Your email address change has been cancelled."
    });
  };

  return {
    isUpdatingEmail,
    pendingEmailVerification,
    setPendingEmailVerification,
    currentEmailAddress,
    newEmailAddress,
    setCurrentEmailAddress,
    setNewEmailAddress,
    changeEmail,
    resendVerificationEmail,
    handleVerificationComplete,
    cancelEmailChange
  };
}

export default useEmailChange;