
import React from 'react';
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { logToSupabase } from '@/utils/batchedLogManager';

interface SocialLoginProps {
  onGoogleSignIn: () => void;
}

const SocialLogin: React.FC<SocialLoginProps> = ({ onGoogleSignIn }) => {
  const handleGoogleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    
    logToSupabase('Google sign in attempt', {
      page: 'SocialLogin',
      level: 'info'
    });
    
    // Call the Google sign-in function provided via props
    onGoogleSignIn();
  };
  
  const handleAppleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    
    logToSupabase('Apple sign in attempt', {
      page: 'SocialLogin',
      level: 'info',
      data: { feature: 'not-implemented' }
    });
    
    // This functionality is not implemented yet
    // For now, we'll just log that the user tried to use it
    alert("Sign in with Apple coming soon!");
  };

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center"
        >
          <FcGoogle className="mr-2 h-5 w-5" />
          Google
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAppleSignIn}
          className="flex items-center justify-center"
        >
          <FaApple className="mr-2 h-5 w-5" />
          Apple
        </Button>
      </div>
    </div>
  );
};

export default SocialLogin;
