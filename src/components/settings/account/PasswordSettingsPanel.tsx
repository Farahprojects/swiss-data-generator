
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { logToSupabase } from "@/utils/batchedLogManager";
import PasswordInput from "@/components/auth/PasswordInput";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const PasswordSettingsPanel = () => {
  const { toast, clearToast } = useToast();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'verify' | 'create' | 'confirm'>('verify');
  const [passwordValid, setPasswordValid] = useState({
    length: false
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const currentPassword = passwordForm.watch("currentPassword");
  const newPassword = passwordForm.watch("newPassword");
  const confirmPassword = passwordForm.watch("confirmPassword");

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
        page: 'PasswordSettingsPanel'
      });
      
      // Verify current password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: supabase.auth.getUser().then(({ data }) => data.user?.email || ''),
        password: currentPassword
      });

      if (error) {
        logToSupabase("Current password verification failed", {
          level: 'error',
          page: 'PasswordSettingsPanel',
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
        page: 'PasswordSettingsPanel'
      });
      
      // Password verified, move to next step
      setPasswordStep('create');
      setIsUpdatingPassword(false);
    } catch (error: any) {
      logToSupabase("Error verifying current password", {
        level: 'error',
        page: 'PasswordSettingsPanel',
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
        page: 'PasswordSettingsPanel'
      });
      
      // Update the password
      const { error } = await supabase.auth.updateUser({ 
        password: data.newPassword 
      });
      
      if (error) {
        logToSupabase("Password update failed", {
          level: 'error',
          page: 'PasswordSettingsPanel',
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
        page: 'PasswordSettingsPanel'
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
        page: 'PasswordSettingsPanel',
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
  
  const resetPassword = async () => {
    const userEmail = await supabase.auth.getUser().then(({ data }) => data.user?.email);
    if (!userEmail) return;
    
    clearToast();
    setResetEmailSent(false);
    
    try {
      logToSupabase("Sending password reset email", {
        level: 'info',
        page: 'PasswordSettingsPanel',
        data: { email: userEmail }
      });
      
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      
      if (error) {
        logToSupabase("Failed to send reset password email", {
          level: 'error',
          page: 'PasswordSettingsPanel',
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
        page: 'PasswordSettingsPanel',
        data: { email: userEmail }
      });
      
      // Show inline success message instead of toast
      setResetEmailSent(true);
    } catch (error: any) {
      logToSupabase("Error sending password reset email", {
        level: 'error',
        page: 'PasswordSettingsPanel',
        data: { error: error.message || String(error) }
      });
      
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

  return (
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
  );
};

export default PasswordSettingsPanel;
