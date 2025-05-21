
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
  
  // Watch for changes in the newEmail field to show/hide password field
  useEffect(() => {
    if (newEmailValue && newEmailValue.trim() !== '') {
      setIsTypingNewEmail(true);
    } else {
      setIsTypingNewEmail(false);
    }
  }, [newEmailValue]);

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
    
    clearToast();
    
    // Use the hook's changeEmail function
    const result = await changeEmail(user?.email || '', data.newEmail, data.password);
    
    if (result.success) {
      // Reset the form on success
      emailForm.reset();
      setIsTypingNewEmail(false);
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
        resend={resendVerificationEmail}
        onVerified={handleVerificationComplete}
        onCancel={cancelEmailChange}
      />
    </div>
  );
};

export default EmailSettingsPanel;
