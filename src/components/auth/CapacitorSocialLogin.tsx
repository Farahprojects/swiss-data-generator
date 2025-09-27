import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { capacitorAuth } from '@/lib/capacitorAuth';
import { toast } from 'sonner';

interface CapacitorSocialLoginProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function CapacitorSocialLogin({ onSuccess, onError }: CapacitorSocialLoginProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    try {
      setIsLoading(provider);
      
      const { error } = await capacitorAuth.signInWithOAuth(provider);
      
      if (error) {
        console.error(`${provider} OAuth error:`, error);
        toast.error(`Failed to sign in with ${provider}`);
        onError?.(error as Error);
      } else {
        toast.success(`Successfully signed in with ${provider}`);
        onSuccess?.();
      }
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      toast.error(`Failed to sign in with ${provider}`);
      onError?.(error as Error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="w-full h-12 rounded-full bg-white text-black hover:bg-gray-50 border border-gray-200"
        onClick={() => handleOAuthSignIn('google')}
        disabled={isLoading !== null}
      >
        <FcGoogle className="mr-2 h-5 w-5" />
        {isLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
      </Button>

      <Button
        type="button"
        className="w-full h-12 rounded-full bg-black text-white hover:bg-gray-900"
        onClick={() => handleOAuthSignIn('apple')}
        disabled={isLoading !== null}
      >
        <FaApple className="mr-2 h-5 w-5" />
        {isLoading === 'apple' ? 'Signing in...' : 'Continue with Apple'}
      </Button>
    </div>
  );
}
