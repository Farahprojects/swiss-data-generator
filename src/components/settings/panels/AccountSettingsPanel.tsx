
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
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

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError("confirmPassword", { 
        message: "The passwords do not match" 
      });
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      // Verify current password first by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.currentPassword
      });

      if (verifyError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Current password is incorrect."
        });
        return;
      }

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
    
    setIsUpdatingEmail(true);
    
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
        return;
      }

      // Update the email
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
      
      toast({
        title: "Email update initiated",
        description: "Please check your new email address for a confirmation link."
      });
      
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
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isUpdatingPassword}
              className="mt-2"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};
