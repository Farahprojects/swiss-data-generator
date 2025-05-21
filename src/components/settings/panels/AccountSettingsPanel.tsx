
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertCircle, Loader, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";
import { logToSupabase } from "@/utils/batchedLogManager";
import PasswordInput from "@/components/auth/PasswordInput";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type EmailFormValues = {
  newEmail: string;
  password: string;
};

export const AccountSettingsPanel = () => {
  const { user, session } = useAuth();
  const { toast, message, clearToast } = useToast();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'verify' | 'create' | 'confirm'>('verify');
  const [passwordValid, setPasswordValid] = useState({
    length: false
  });
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // New state to track if user is typing a new email
  const [isTypingNewEmail, setIsTypingNewEmail] = useState(false);
  
  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const emailForm = useForm<EmailFormValues>({
    defaultValues: {
      newEmail: "",
      password: "",
    }
  });

  const currentPassword = passwordForm.watch("currentPassword");
  const newPassword = passwordForm.watch("newPassword");
  const confirmPassword = passwordForm.watch("confirmPassword");
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
    logToSupabase("Setting up AccountSettingsPanel auth state listener", {
      level: 'debug',
      page: 'AccountSettingsPanel'
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logToSupabase("AccountSettingsPanel: Auth state change event", {
        level: 'debug',
        page: 'AccountSettingsPanel',
        data: { event }
      });
      
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        logToSupabase("AccountSettingsPanel: Email change confirmed or user updated", {
          level: 'info',
          page: 'AccountSettingsPanel',
          data: { email: session?.user?.email, confirmed: session?.user?.email_confirmed_at }
        });
        
        // If the user has confirmed their email, close the verification modal
        if (session?.user?.email_confirmed_at && 
            pendingEmailVerification && 
            session?.user?.email === newEmailAddress) {
          logToSupabase("AccountSettingsPanel: Email verified, closing modal", {
            level: 'info',
            page: 'AccountSettingsPanel'
          });
          handleEmailVerificationComplete();
        }
      }
    });
    
    return () => {
      logToSupabase("Cleaning up auth state listener in AccountSettingsPanel", {
        level: 'debug',
        page: 'AccountSettingsPanel'
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
        page: 'AccountSettingsPanel',
        data: { email: user.email }
      });
    } else {
      logToSupabase("User email status", {
        level: 'debug',
        page: 'AccountSettingsPanel',
        data: { email: user?.email, confirmed_at: user?.email_confirmed_at }
      });
      setPendingEmailVerification(false);
    }
  }, [user]);

  // Check if password requirement is met
  const passwordRequirementMet = passwordValid.length;

  // Check for password validation on change
  const handlePasswordChange = (value: string) => {
    passwordForm.setValue("newPassword", value);
    
    setPasswordValid({
      length: value.length >= 8
    });
  };

  const handleCurrentPasswordVerification = async () => {
    if (!currentPassword) return;
    
    setIsUpdatingPassword(true);
    clearToast();
    
    try {
      logToSupabase("Verifying current password", {
        level: 'info',
        page: 'AccountSettingsPanel'
      });
      
      // Verify current password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (error) {
        logToSupabase("Current password verification failed", {
          level: 'error',
          page: 'AccountSettingsPanel',
          data: { error: error.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Current password is incorrect."
        });
        setIsUpdatingPassword(false);
        return;
      }

      logToSupabase("Current password verified successfully", {
        level: 'info',
        page: 'AccountSettingsPanel'
      });
      
      // Password verified, move to next step
      setPasswordStep('create');
      setIsUpdatingPassword(false);
    } catch (error: any) {
      logToSupabase("Error verifying current password", {
        level: 'error',
        page: 'AccountSettingsPanel',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error verifying your password."
      });
      setIsUpdatingPassword(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError("confirmPassword", { 
        message: "The passwords do not match" 
      });
      return;
    }
    
    setIsUpdatingPassword(true);
    clearToast();
    
    try {
      logToSupabase("Updating password", {
        level: 'info',
        page: 'AccountSettingsPanel'
      });
      
      // Update the password
      const { error } = await supabase.auth.updateUser({ 
        password: data.newPassword 
      });
      
      if (error) {
        logToSupabase("Password update failed", {
          level: 'error',
          page: 'AccountSettingsPanel',
          data: { error: error.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your password."
        });
        return;
      }
      
      logToSupabase("Password updated successfully", {
        level: 'info',
        page: 'AccountSettingsPanel'
      });
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully."
      });
      
      passwordForm.reset();
      setPasswordStep('verify');
    } catch (error: any) {
      logToSupabase("Error updating password", {
        level: 'error',
        page: 'AccountSettingsPanel',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your password."
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
        page: 'AccountSettingsPanel'
      });
      
      // Verify password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.password
      });

      if (verifyError) {
        logToSupabase("Password verification failed for email change", {
          level: 'error',
          page: 'AccountSettingsPanel',
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
        page: 'AccountSettingsPanel',
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
        page: 'AccountSettingsPanel',
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
        variant: "success",
        title: "Verification email sent",
        description: "Please check your inbox to verify your new email address."
      });
      
      // Reset the form
      emailForm.reset();
      setIsTypingNewEmail(false);
    } catch (error: any) {
      logToSupabase("Error updating email address", {
        level: 'error',
        page: 'AccountSettingsPanel',
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
        page: 'AccountSettingsPanel'
      });
      
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      logToSupabase("Session refreshed after email verification", {
        level: 'info',
        page: 'AccountSettingsPanel',
        data: { user_email: data?.user?.email, confirmed_at: data?.user?.email_confirmed_at }
      });
      
      toast({
        variant: "success",
        title: "Email verified",
        description: "Your email address has been successfully verified."
      });
    } catch (error: any) {
      logToSupabase("Error refreshing session", {
        level: 'error',
        page: 'AccountSettingsPanel',
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
      page: 'AccountSettingsPanel'
    });
    
    toast({
      title: "Email change cancelled",
      description: "Your email address change has been cancelled."
    });
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    clearToast();
    setResetEmailSent(false);
    
    try {
      logToSupabase("Sending password reset email", {
        level: 'info',
        page: 'AccountSettingsPanel',
        data: { email: user.email }
      });
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      
      if (error) {
        logToSupabase("Failed to send reset password email", {
          level: 'error',
          page: 'AccountSettingsPanel',
          data: { error: error.message }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset password email."
        });
        return;
      }
      
      logToSupabase("Password reset email sent successfully", {
        level: 'info',
        page: 'AccountSettingsPanel',
        data: { email: user.email }
      });
      
      // Show inline success message instead of toast
      setResetEmailSent(true);
    } catch (error: any) {
      logToSupabase("Error sending password reset email", {
        level: 'error',
        page: 'AccountSettingsPanel',
        data: { error: error.message || String(error) }
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset password email."
      });
    }
  };

  const resendEmailChangeVerification = async (email: string) => {
    logToSupabase("Resending email verification", {
      level: 'info',
      page: 'AccountSettingsPanel',
      data: { email }
    });
    
    try {
      const { error } = await supabase.auth.updateUser({ email });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      logToSupabase("Error resending verification", {
        level: 'error',
        page: 'AccountSettingsPanel',
        data: { error: err.message || String(err) }
      });
      
      return { error: err as Error };
    }
  };

  const renderPasswordRequirement = (met: boolean, text: string) => (
    <div className={`flex items-center text-sm ${met ? 'text-green-600' : 'text-gray-600'}`}>
      {met && <Check size={16} className="mr-2 text-green-600" />}
      <span className={met ? "ml-5" : "ml-7"}>{text}</span>
    </div>
  );

  // Function to render inline toast message
  const renderInlineMessage = () => {
    if (!message) return null;
    
    return (
      <Alert 
        className={`mb-4 ${
          message.variant === "destructive" ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"
        }`}
      >
        <AlertCircle className={`h-4 w-4 ${message.variant === "destructive" ? "text-red-600" : "text-green-600"}`} />
        <AlertDescription>
          {message.title && <p className="font-medium">{message.title}</p>}
          {message.description && <p>{message.description}</p>}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
      
      {message && renderInlineMessage()}
      
      {/* Email Verification Modal */}
      <EmailVerificationModal 
        isOpen={pendingEmailVerification}
        email={newEmailAddress}
        resend={resendEmailChangeVerification}
        onVerified={handleEmailVerificationComplete}
        onCancel={handleCancelEmailChange}
      />
      
      <div className="mb-8">
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
          <p className="text-sm text-gray-500 mt-2">
            Note: You'll need to verify your new email address before the change takes effect.
          </p>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Change Password</h3>
        
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
            {passwordStep === 'verify' && (
              <>
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showCurrentPassword ? "text" : "password"} 
                            {...field} 
                            placeholder="Enter your current password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                            tabIndex={-1}
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button"
                      variant="link"
                      className="text-sm p-0 h-auto"
                      onClick={resetPassword}
                    >
                      Forgot password?
                    </Button>
                    
                    {resetEmailSent && (
                      <span className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Reset link sent!
                      </span>
                    )}
                  </div>
                  
                  <Button 
                    type="button" 
                    onClick={handleCurrentPasswordVerification}
                    disabled={!currentPassword || isUpdatingPassword}
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : "OK"}
                  </Button>
                </div>
              </>
            )}
            
            {passwordStep === 'create' && (
              <>
                <div className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            password={field.value}
                            isValid={passwordRequirementMet}
                            onChange={handlePasswordChange}
                            showRequirements={false}
                            placeholder="Enter your new password"
                            id="newPassword"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded-md">
                    {renderPasswordRequirement(passwordValid.length, "At least 8 characters")}
                  </div>
                  
                  {passwordRequirementMet && (
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              password={field.value}
                              isValid={field.value === newPassword && field.value.length > 0}
                              onChange={(value) => passwordForm.setValue("confirmPassword", value)}
                              showRequirements={false}
                              placeholder="Confirm your new password"
                              id="confirmPassword"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="flex items-center justify-end">
                    <Button 
                      type="submit" 
                      disabled={
                        !newPassword || 
                        !passwordRequirementMet || 
                        (passwordRequirementMet && !confirmPassword) ||
                        isUpdatingPassword
                      }
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : "Update Password"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
};
