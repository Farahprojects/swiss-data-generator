
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
import { Loader } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";
import useEmailChange from "@/hooks/useEmailChange";

type EmailFormValues = {
  newEmail: string;
};

export const EmailSettingsPanel = () => {
  const { user } = useAuth();
  const { clearToast } = useToast();
  
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
    }
  });

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
    
    // Use the hook's changeEmail function - no password needed anymore
    const result = await changeEmail(user?.email || '', data.newEmail);
    
    logToSupabase("Email change attempt result", {
      level: 'info',
      page: 'EmailSettingsPanel',
      data: { success: result.success, hasError: !!result.error }
    });
    
    if (result.success) {
      // Reset the form on success
      emailForm.reset();
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
          
          <Button 
            type="submit" 
            disabled={isUpdatingEmail || !emailForm.watch("newEmail")}
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
