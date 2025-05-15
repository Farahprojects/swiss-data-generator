
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
import { Check, AlertCircle, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";

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
  
  // Set up auth state listener for email change events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AccountSettingsPanel: Auth state change event:", event);
      
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        console.log("AccountSettingsPanel: Email change confirmed or user updated:", session?.user);
        
        // If the user has confirmed their email, close the verification modal
        if (session?.user?.email_confirmed_at && pendingEmailVerification) {
          console.log("AccountSettingsPanel: Email verified, closing modal");
          handleEmailVerificationComplete();
        }
      }
    });
    
    return () => {
      console.log("Cleaning up auth state listener");
      subscription.unsubscribe();
    };
  }, [pendingEmailVerification]);
  
  // Check if the user has a pending email verification
  useEffect(() => {
    if (user && !user.email_confirmed_at && user.email) {
      // If email is not confirmed, show the verification modal
      setPendingEmailVerification(true);
      setNewEmailAddress(user.email);
      console.log("User has pending email verification:", user.email);
    } else {
      console.log("User email status:", user?.email, "confirmed at:", user?.email_confirmed_at);
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
      // Verify current password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Current password is incorrect."
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Password verified, move to next step
      setPasswordStep('create');
      setIsUpdatingPassword(false);
    } catch (error) {
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
      // Update the password
      const { error } = await supabase.auth.updateUser({ 
        password: data.newPassword 
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your password."
        });
        return;
      }
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully."
      });
      
      passwordForm.reset();
      setPasswordStep('verify');
    } catch (error) {
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
      // Verify password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.password
      });

      if (verifyError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Password is incorrect."
        });
        setIsUpdatingEmail(false);
        return;
      }

      console.log("Initiating email change from", user?.email, "to", data.newEmail);
      
      // Store the new email before updating
      setNewEmailAddress(data.newEmail);

      // Update the email
      const { error, data: updateData } = await supabase.auth.updateUser({ 
        email: data.newEmail 
      });
      
      console.log("Update user response:", updateData);
      
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
      
      // Reset the form
      emailForm.reset();
    } catch (error) {
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
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      console.log("Session refreshed after email verification:", data?.user);
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
    
    toast({
      title: "Email verified",
      description: "Your email address has been successfully verified."
    });
  };

  const handleCancelEmailChange = async () => {
    // User wants to cancel the email change
    setPendingEmailVerification(false);
    
    // Try to revert to the old email if possible
    if (user && user.email && user.email !== newEmailAddress) {
      try {
        toast({
          title: "Email change cancelled",
          description: "Your email address change has been cancelled."
        });
      } catch (error) {
        console.error("Error reverting email change:", error);
      }
    }
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    clearToast();
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset password email."
        });
        return;
      }
      
      toast({
        title: "Reset email sent",
        description: "Check your email for a password reset link."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset password email."
      });
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
        newEmail={newEmailAddress}
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
                    <Input type="email" placeholder="Enter your new email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your current password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isUpdatingEmail}
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

        <p className="text-sm text-gray-500 mt-2">
          Note: You'll need to verify your new email address before the change takes effect.
        </p>
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
                        <Input 
                          type="password" 
                          {...field} 
                          placeholder="Enter your current password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <Button 
                    type="button"
                    variant="link"
                    className="text-sm p-0 h-auto"
                    onClick={resetPassword}
                  >
                    Forgot password?
                  </Button>
                  
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
                          <Input 
                            type="password"
                            placeholder="Enter your new password"
                            value={field.value}
                            onChange={(e) => handlePasswordChange(e.target.value)}
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
                            <Input 
                              type="password" 
                              {...field} 
                              placeholder="Confirm your new password"
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
