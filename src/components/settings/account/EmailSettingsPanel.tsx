
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
import useEmailChange from "@/hooks/useEmailChange";

type EmailFormValues = {
  newEmail: string;
  password: string;
};

export const EmailSettingsPanel = () => {
  const { user } = useAuth();
  const { clearToast } = useToast();
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [isTypingNewEmail, setIsTypingNewEmail] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Use the hook for all email change related state and functions
  const {
    isUpdatingEmail,
    pendingEmailVerification,
    newEmailAddress,
    changeEmail,
    resendVerificationEmail,
    handleVerificationComplete,
    cancelEmailChange
  } = useEmailChange();
  
  const emailForm = useForm<EmailFormValues>({
    defaultValues: {
      newEmail: "",
      password: "",
    }
  });

  const newEmailValue = emailForm.watch("newEmail");
  const passwordValue = emailForm.watch("password");
  
  // Watch for changes in the newEmail field to show/hide password field
  useEffect(() => {
    if (newEmailValue && newEmailValue.trim() !== '') {
      setIsTypingNewEmail(true);
    } else {
      setIsTypingNewEmail(false);
    }
  }, [newEmailValue]);

  // Clear password error when user types
  useEffect(() => {
    if (passwordError && passwordValue) {
      logToSupabase("Clearing password error as user is typing", {
        level: 'debug',
        page: 'EmailSettingsPanel'
      });
      setPasswordError(null);
    }
  }, [passwordValue, passwordError]);

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
    
    // Clear any existing errors
    setPasswordError(null);
    clearToast();
    
    // Use the hook's changeEmail function
    const result = await changeEmail(user?.email || '', data.newEmail, data.password);
    
    logToSupabase("Email change attempt result", {
      level: 'info',
      page: 'EmailSettingsPanel',
      data: { success: result.success, hasError: !!result.error }
    });
    
    if (result.success) {
      // Reset the form on success
      emailForm.reset();
      setIsTypingNewEmail(false);
    } else if (result.error) {
      // Check if it's a password error
      if (result.error.includes("Password is incorrect")) {
        logToSupabase("Setting password error state", {
          level: 'info',
          page: 'EmailSettingsPanel',
          data: { error: result.error }
        });
        
        // Set password error state with a more explicit error
        setPasswordError("Invalid password - please try again");
        
        // Log the state change
        console.log("Password error set:", "Invalid password - please try again");
      }
    }
  };

  // Debug effect to monitor passwordError state changes
  useEffect(() => {
    console.log("Password error state changed:", passwordError);
  }, [passwordError]);

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
                        className={passwordError ? 'border-red-500' : ''}
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
                  {passwordError && (
                    <div className="flex items-center mt-2">
                      <p className="text-sm font-semibold text-red-600">{passwordError}</p>
                    </div>
                  )}
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

      {/* Email Verification Modal */}
      <EmailVerificationModal 
        isOpen={pendingEmailVerification}
        email={newEmailAddress}
        resend={resendVerificationEmail}
        onVerified={handleVerificationComplete}
        onCancel={cancelEmailChange}
      />
    </div>
  );
};

export default EmailSettingsPanel;
