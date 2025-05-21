
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
import usePasswordManagement from "@/hooks/usePasswordManagement";

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
  const [invalidPasswordError, setInvalidPasswordError] = useState(false);
  const { verifyCurrentPassword, updatePassword, resetPassword, isUpdatingPassword: isPasswordUpdating, resetEmailSent: isResetEmailSent } = usePasswordManagement();

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
  
  // Check if passwords match
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

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
    setInvalidPasswordError(false);
    
    try {
      // Get the current user's email
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email;
      
      if (!userEmail) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to verify user information."
        });
        setIsUpdatingPassword(false);
        return;
      }
      
      logToSupabase("Verifying current password", {
        level: 'info',
        page: 'PasswordSettingsPanel'
      });
      
      const { success, error } = await verifyCurrentPassword(userEmail, currentPassword);
      
      if (!success) {
        logToSupabase("Current password verification failed", {
          level: 'error',
          page: 'PasswordSettingsPanel',
          data: { error }
        });
        
        setInvalidPasswordError(true);
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
      
      const { success, error } = await updatePassword(data.newPassword);
      
      if (!success) {
        logToSupabase("Password update failed", {
          level: 'error',
          page: 'PasswordSettingsPanel',
          data: { error }
        });
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error || "There was an error updating your password."
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
  
  const handleResetPassword = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email;
      
      if (!userEmail) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to verify user information."
        });
        return;
      }
      
      clearToast();
      setResetEmailSent(false);
      
      const { success, error } = await resetPassword(userEmail);
      
      if (!success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error || "Failed to send reset password email."
        });
        return;
      }
      
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
                    {invalidPasswordError && (
                      <div className="text-red-500 text-xs mt-1">Invalid password</div>
                    )}
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
                    onClick={handleResetPassword}
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
                          label=""
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="mt-2">
                  {!passwordValid.length && newPassword.length > 0 && (
                    <div className="text-xs text-gray-600 flex items-center">
                      <span className="ml-1">At least 8 characters</span>
                    </div>
                  )}
                  {passwordValid.length && (
                    <div className="text-xs text-green-600 flex items-center">
                      <Check size={16} className="mr-1" />
                      <span>At least 8 characters</span>
                    </div>
                  )}
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
                            label=""
                          />
                        </FormControl>
                        {confirmPassword.length > 0 && (
                          <div className="text-xs mt-1">
                            {passwordsMatch ? (
                              <span className="text-green-600">matching</span>
                            ) : (
                              <span className="text-red-500">not matching</span>
                            )}
                          </div>
                        )}
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
                      !passwordsMatch ||
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
