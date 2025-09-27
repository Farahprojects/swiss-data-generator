import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import Logo from '@/components/Logo';

import { useAuth } from '@/contexts/AuthContext';

type Props = {
  onGoogle?: () => void;
  onApple?: () => void;
};

const MobileLanding: React.FC<Props> = ({ onGoogle, onApple }) => {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple } = useAuth();

  const handleGoogleSignIn = async () => {
    if (onGoogle) {
      onGoogle();
    } else {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign-in error:', error);
      }
    }
  };

  const handleAppleSignIn = async () => {
    if (onApple) {
      onApple();
    } else {
      const { error } = await signInWithApple();
      if (error) {
        console.error('Apple sign-in error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero (white) */}
      <header className="px-5 pt-12 pb-10">
        <div className="flex items-center justify-between">
          <Logo size="sm" asLink={false} />
        </div>
        <div className="mt-12 space-y-3">
          <h1 className="text-4xl font-light text-gray-900 leading-tight">
            Focus Your Energy.
            <span className="italic"> Master Your Self.</span>
          </h1>
          <p className="text-gray-600 font-light">
            Transform the way you reflect, reframe, and act. Our AI-powered system guides you to breaking your energy patterns for personal growth.
          </p>
        </div>
      </header>

      {/* Auth (black) */}
      <section className="mt-auto bg-black text-white px-5 pt-8 pb-10 rounded-t-3xl">
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <Button
            type="button"
            className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90"
            onClick={handleAppleSignIn}
          >
            <FaApple className="mr-2 h-5 w-5" />
            Continue with Apple
          </Button>

          <Button
            type="button"
            className="w-full h-12 rounded-full bg-white/0 text-white border border-white hover:bg-white/10"
            onClick={() => navigate('/login')}
          >
            Log in
          </Button>
        </div>
      </section>
    </div>
  );
};

export default MobileLanding;
