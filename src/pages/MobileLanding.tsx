import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { Star, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/contexts/AuthContext';

type Props = {
  onGoogle?: () => void;
  onApple?: () => void;
};

const MobileLanding: React.FC<Props> = ({ onGoogle, onApple }) => {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple } = useAuth();

  // Rotating words for the "Your..." animation - same as desktop
  const rotatingWords = ['Self', 'Mind', 'Bae', 'Soul', 'Will'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // Word rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 3000); // Change word every 3 seconds

    return () => clearInterval(interval);
  }, [rotatingWords.length]);

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
      {/* Hero Section - Same as desktop */}
      <section className="relative flex-1 flex items-center justify-center bg-white overflow-hidden px-4">
        <div className="relative z-10 w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h1 className="text-5xl font-light text-gray-900 leading-tight mb-8">
              Know
              <br />
              <span className="italic font-medium flex items-center justify-center gap-x-4 flex-wrap">
                <span>Your</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    initial={{ opacity: 0, rotateX: 90 }}
                    animate={{ opacity: 1, rotateX: 0 }}
                    exit={{ opacity: 0, rotateX: -90 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block text-left min-w-[4rem] overflow-visible transform-gpu"
                    style={{
                      willChange: 'transform',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {rotatingWords[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-16"
          >
            <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              Psychological insights that create momentum
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="flex justify-center items-center gap-6 text-sm text-gray-500 font-medium mb-12"
          >
            <div className="flex items-center gap-2 group">
              <Star className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>Analyse</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Clock className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>Instant</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Shield className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>Private</span>
            </div>
          </motion.div>
        </div>
      </section>

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
