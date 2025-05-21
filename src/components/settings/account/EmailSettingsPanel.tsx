
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Eye, EyeOff, Loader } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";

type EmailFormValues = {
  newEmail: string;
  password: string;
};

export const EmailSettingsPanel = () => {
  const { user } = useAuth();
  const { toast, clearToast } = useToast();
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [isTypingNewEmail, setIsTypingNewEmail] = useState(false);
  
  const emailForm = useForm<EmailFormValues>({
    defaultValues: {
      newEmail: "",
      password: "",
    }
  });

  const newEmailValue = emailForm.watch("newEmail");
  
  // Watch for changes in the newEmail field to show/hide password field
  useEffect(() => {
    if (newEmailValue && newEmailValue.trim() !== '') {
      setIsTypingNewEmail(true);
    } else {
      setIsTypingNewEmail(false);
    }
  }, [newEmailValue]);

  // Set up auth state listener for email change events
  useEffect(() => {
    logToSupabase("Setting up email change auth state listener", {
      level: 'debug',
      page: 'EmailSettingsPanel'
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logToSupabase("EmailSettingsPanel: Auth state change event", {
        level: 'debug',
        page: 'EmailSettingsPanel',
        data: { event }
      });
      
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        logToSupabase("EmailSettingsPanel: Email change confirmed or user updated", {
          level: 'info',
          page: 'EmailSettingsPanel',
          data: { email: session?.user?.email, confirmed: session?.user?.email_confirmed_at }
        });
        
        // If the user has confirmed their email, close the verification modal
        if (session?.user?.email_confirmed_at && 
            pendingEmailVerification && 
            session?.user?.email === newEmailAddress) {
          logToSupabase("EmailSettingsPanel: Email verified, closing modal", {
            level: 'info',
            page: 'EmailSettingsPanel'
          });
          handleEmailVerificationComplete();
        }
      }
    });
    
    return () => {
      logToSupabase("Cleaning up auth state listener in EmailSettingsPanel", {
        level: 'debug',
        page: 'EmailSettingsPanel'
      });
      subscription.unsubscribe();
    };
  }, [pendingEmailVerification, newEmailAddress]);
  
  // Check if the user has a pending email verification
  useEffect(() => {
    if (user && !user.email_confirmed_at && user.email) {
      // If email is not confirmed, show the verification modal
      setPendingEmailVerification(true);
      setNewEmailAddress(user.email);
      logToSupabase("User has pending email verification", {
        level: 'info',
        page: 'EmailSettingsPanel',
        data: { email: user.email }
      });
    } else {
      logToSupabase("User email status", {
        level: 'debug',
        page: 'EmailSettingsPanel',
        data: { email: user?.email, confirmed_at: user?.email_confirmed_at }
      });
      setPendingEmailVerification(false);
    }
  }, [user]);

  const onEmailSubmit = async (data: EmailFormValues) => {
    if (!data.newEmail) {
      emailForm.setError("newEmail", { 
        message: "Email is required" 
      });
      return;
    }
    
    // Prevent changing to the same email
    if (data.newEmail === user?.email) {
      emailForm.setError("newEmail", { 
        message: "This is already your current email address." 
      });
      return;
    }
    
    setIsUpdatingEmail(true);
    clearToast();
    
    try {
      logToSupabase("Verifying password for email change", {
        level: 'info',
        page: 'EmailSettingsPanel'
      });
      
      // Verify password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.password
      });

      if (verifyError) {
        logToSupabase("Password verification failed for email change", {
          level: 'error',
          page: 'EmailSettingsPanel',
          data: { error: verifyError.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Password is incorrect."
        });
        setIsUpdatingEmail(false);
        return;
      }

      logToSupabase("Initiating email change", {
        level: 'info',
        page: 'EmailSettingsPanel',
        data: { from: user?.email, to: data.newEmail }
      });
      
      // Store the new email before updating
      setNewEmailAddress(data.newEmail);

      // Update the email
      const { error, data: updateData } = await supabase.auth.updateUser({ 
        email: data.newEmail 
      });
      
      logToSupabase("Update user email response", {
        level: 'debug',
        page: 'EmailSettingsPanel',
        data: { response: updateData, error: error?.message }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your email address."
        });
        setIsUpdatingEmail(false);
        return;
      }
      
      // Show the verification modal
      setPendingEmailVerification(true);
      
      toast({
        title: "Email verification sent",
        description: "We've sent a notification email to your current email address and a verification link to your new email address. Please check both inboxes."
      });
      
      // Reset the form
      emailForm.reset();
      setIsTypingNewEmail(false);
    } catch (error: any) {
      logToSupabase("Error updating email address", {
        level: 'error',
        page: 'EmailSettingsPanel',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your email address."
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleEmailVerificationComplete = async () => {
    // The email has been verified, close the modal
    setPendingEmailVerification(false);
    
    // Force refresh the session to get the latest user data
    try {
      logToSupabase("Refreshing session after email verification", {
        level: 'info',
        page: 'EmailSettingsPanel'
      });
      
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      logToSupabase("Session refreshed after email verification", {
        level: 'info',
        page: 'EmailSettingsPanel',
        data: { user_email: data?.user?.email, confirmed_at: data?.user?.email_confirmed_at }
      });
      
      toast({
        title: "Email verified",
        description: "Your email address has been successfully verified."
      });
    } catch (error: any) {
      logToSupabase("Error refreshing session", {
        level: 'error',
        page: 'EmailSettingsPanel',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem refreshing your session. Please try logging out and back in."
      });
    }
  };

  const handleCancelEmailChange = async () => {
    // User wants to cancel the email change
    setPendingEmailVerification(false);
    
    logToSupabase("Email change cancelled by user", {
      level: 'info',
      page: 'EmailSettingsPanel'
    });
    
    toast({
      title: "Email change cancelled",
      description: "Your email address change has been cancelled."
    });
  };

  const resendEmailChangeVerification = async (email: string) => {
    logToSupabase("Resending email verification", {
      level: 'info',
      page: 'EmailSettingsPanel',
      data: { email }
    });
    
    try {
      // Instead of calling updateUser directly, use our custom edge function
      // This will send a notification to the original email and a verification link to the new email
      const response = await fetch(`https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/resend-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
        body: JSON.stringify({ email: user?.email })
      });

      const result = await response.json();
      return { error: result.error ? new Error(result.error) : null };
    } catch (err: any) {
      logToSupabase("Error resending verification", {
        level: 'error',
        page: 'EmailSettingsPanel',
        data: { error: err.message || String(err) }
      });
      
      return { error: err as Error };
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Email Address</h3>
      <Input 
        value={user?.email || ''} 
        disabled 
        className="max-w-md bg-gray-50 mb-4"
      />
      
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4 max-w-md">
          <FormField
            control={emailForm.control}
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Email Address</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Enter your new email" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {isTypingNewEmail && (
            <FormField
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showEmailPassword ? "text" : "password"} 
                        placeholder="Enter your current password" 
                        {...field} 
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPassword(!showEmailPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        tabIndex={-1}
                      >
                        {showEmailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <Button 
            type="submit" 
            disabled={isUpdatingEmail || !isTypingNewEmail || !emailForm.watch("password")}
            className="mt-2"
          >
            {isUpdatingEmail ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : "Update Email"}
          </Button>
        </form>
      </Form>

      {isTypingNewEmail && (
        <div className="text-sm text-gray-500 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
          <h4 className="font-medium text-blue-700 mb-2">What happens next?</h4>
          <ol className="list-decimal ml-5 space-y-1">
            <li>A notification email will be sent to your current email address.</li>
            <li>A verification link will be sent to your new email address.</li>
            <li>You must click the verification link in the new email to complete the change.</li>
          </ol>
          <p className="mt-2">Your email will not be changed until you verify the new address.</p>
        </div>
      )}

      {/* Email Verification Modal */}
      <EmailVerificationModal 
        isOpen={pendingEmailVerification}
        email={newEmailAddress}
        resend={resendEmailChangeVerification}
        onVerified={handleEmailVerificationComplete}
        onCancel={handleCancelEmailChange}
      />
    </div>
  );
};

export default EmailSettingsPanel;
