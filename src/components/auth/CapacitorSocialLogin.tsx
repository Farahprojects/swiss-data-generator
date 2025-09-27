import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Apple, Chrome } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-12 bg-white border-gray-200 hover:bg-gray-50 text-gray-900 font-medium"
          onClick={() => handleOAuthSignIn('google')}
          disabled={isLoading !== null}
        >
          <Chrome className="w-5 h-5 mr-3" />
          {isLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
        </Button>
        
        <Button
          variant="outline"
          className="w-full h-12 bg-black border-gray-200 hover:bg-gray-900 text-white font-medium"
          onClick={() => handleOAuthSignIn('apple')}
          disabled={isLoading !== null}
        >
          <Apple className="w-5 h-5 mr-3" />
          {isLoading === 'apple' ? 'Signing in...' : 'Continue with Apple'}
        </Button>
      </div>
      
      <div className="text-center text-sm text-gray-500">
        Secure authentication powered by Supabase
      </div>
    </div>
  );
}
