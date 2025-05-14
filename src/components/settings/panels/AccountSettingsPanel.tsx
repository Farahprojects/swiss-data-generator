
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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
import PasswordInput from "@/components/auth/PasswordInput";
import { Link } from "react-router-dom";
import { validatePassword } from "@/utils/authValidation";
import { Check } from "lucide-react";
import { useInlineToast, InlineToastProps } from "@/hooks/use-inline-toast";

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
  const { user } = useAuth();
  const { message, showToast, clearToast } = useInlineToast();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'verify' | 'create' | 'confirm'>('verify');
  const [passwordValid, setPasswordValid] = useState({
    length: false,
    number: false,
    special: false
  });
  
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
  
  // Check if all password requirements are met
  const allRequirementsMet = passwordValid.length && passwordValid.number && passwordValid.special;

  // Check for password validation on change
  const handlePasswordChange = (value: string) => {
    passwordForm.setValue("newPassword", value);
    
    setPasswordValid({
      length: value.length >= 8,
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*]/.test(value)
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
        showToast({
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
      showToast({
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
        showToast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your password."
        });
        return;
      }
      
      showToast({
        title: "Password updated",
        description: "Your password has been updated successfully."
      });
      
      passwordForm.reset();
      setPasswordStep('verify');
    } catch (error) {
      showToast({
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
    
    setIsUpdatingEmail(true);
    clearToast();
    
    try {
      // Verify password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.password
      });

      if (verifyError) {
        showToast({
          variant: "destructive",
          title: "Error",
          description: "Password is incorrect."
        });
        return;
      }

      // Update the email
      const { error } = await supabase.auth.updateUser({ 
        email: data.newEmail 
      });
      
      if (error) {
        showToast({
          variant: "destructive",
          title: "Error",
          description: error.message || "There was an error updating your email address."
        });
        return;
      }
      
      showToast({
        title: "Email update initiated",
        description: "Please check your new email address for a confirmation link."
      });
      
      emailForm.reset();
    } catch (error) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your email address."
      });
    } finally {
      setIsUpdatingEmail(false);
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
        showToast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset password email."
        });
        return;
      }
      
      showToast({
        title: "Reset email sent",
        description: "Check your email for a password reset link."
      });
    } catch (error) {
      showToast({
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
      <div 
        className={`ml-4 text-sm rounded-md px-3 py-2 ${
          message.variant === "destructive" ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"
        }`}
      >
        {message.title && <p className="font-medium">{message.title}</p>}
        {message.description && <p>{message.description}</p>}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
      
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
              {isUpdatingEmail ? "Updating..." : "Update Email"}
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
                  
                  <div className="flex items-center">
                    <Button 
                      type="button" 
                      onClick={handleCurrentPasswordVerification}
                      disabled={!currentPassword || isUpdatingPassword}
                    >
                      {isUpdatingPassword ? "Verifying..." : "OK"}
                    </Button>
                    {message && passwordStep === 'verify' && renderInlineMessage()}
                  </div>
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
                    {renderPasswordRequirement(passwordValid.number, "At least one number")}
                    {renderPasswordRequirement(passwordValid.special, "At least one special character")}
                  </div>
                  
                  {allRequirementsMet && (
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
                        !allRequirementsMet || 
                        (allRequirementsMet && !confirmPassword) ||
                        isUpdatingPassword
                      }
                    >
                      {isUpdatingPassword ? "Updating..." : "Update Password"}
                    </Button>
                    {message && passwordStep === 'create' && renderInlineMessage()}
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
