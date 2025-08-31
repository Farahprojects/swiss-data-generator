
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AuthEmailHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Email confirmation error:', error);
          toast({
            title: "Verification Error",
            description: "There was an error verifying your email. Please try again.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        if (data.session) {
          toast({
            title: "Email Verified",
            description: "Your email has been successfully verified!",
            variant: "success",
          });
          navigate('/chat');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        navigate('/');
      }
    };

    handleEmailConfirmation();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Verifying your email...</h1>
        <p className="text-muted-foreground">Please wait while we confirm your email address.</p>
      </div>
    </div>
  );
};

export default AuthEmailHandler;
