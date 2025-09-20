
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
import { LoginVerificationModal } from "@/components/auth/LoginVerificationModal";

type EmailFormValues = {
  newEmail: string;
};

export const EmailSettingsPanel = () => {
  const { user } = useAuth();
  const { toast, clearToast } = useToast();
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState("");
  
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
    
    setIsUpdatingEmail(true);
    clearToast();
    
    try {
      // Update the email using Supabase
      const { error } = await supabase.auth.updateUser({ 
        email: data.newEmail 
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your email address."
        });
        return;
      }
      
      // Store the pending email and show verification modal
      setPendingNewEmail(data.newEmail);
      setShowVerificationModal(true);
      
      toast({
        title: "Email verification sent",
        description: `We've sent a verification link to ${data.newEmail}. Please check your inbox.`
      });
      
      // Reset the form on success
      emailForm.reset();
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your email address."
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleResendVerification = async (emailToVerify: string) => {
    try {
      // Use Supabase edge function via the client
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: {
          user_id: user?.id || ''
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to resend verification');
      }

      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    setPendingNewEmail("");
    
    toast({
      title: "Email verified",
      description: "Your email address has been successfully verified."
    });
  };

  const handleVerificationCancel = () => {
    setShowVerificationModal(false);
    setPendingNewEmail("");
    
    toast({
      title: "Email change cancelled",
      description: "Your email address change has been cancelled."
    });
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

      {/* Login Verification Modal */}
      <LoginVerificationModal
        isOpen={showVerificationModal}
        email={pendingNewEmail}
        currentEmail={user?.email || ''}
        pendingEmail={pendingNewEmail}
        resendVerificationEmail={handleResendVerification}
        onVerified={handleVerificationComplete}
        onCancel={handleVerificationCancel}
      />
    </div>
  );
};

export default EmailSettingsPanel;
