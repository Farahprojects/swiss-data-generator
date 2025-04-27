
import React from 'react';
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react"; // Using Mail icon as Google isn't available in lucide-react

interface SocialLoginProps {
  onGoogleSignIn: () => void;
}

const SocialLogin: React.FC<SocialLoginProps> = ({ onGoogleSignIn }) => {
  const handleGoogleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    // Inform user they might be redirected
    onGoogleSignIn();
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
      
      <Button 
        type="button" 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn}
      >
        <Mail className="mr-2 h-4 w-4" /> {/* Using Mail icon instead of Google */}
        Sign in with Google
      </Button>
      
      {/* Hidden placeholders for future social logins */}
      <div className="hidden">
        {/* Apple & Facebook buttons will go here when needed */}
      </div>
    </div>
  );
};

export default SocialLogin;
