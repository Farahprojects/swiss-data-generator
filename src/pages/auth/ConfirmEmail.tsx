
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { useToast } from "@/hooks/use-toast";

const ConfirmEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const processEmailVerification = async () => {
      try {
        // Get token and type from URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        // Handle both email confirmation and email change
        if (type !== 'signup' && type !== 'email_change') {
          setStatus('error');
          setMessage('Invalid verification link type.');
          return;
        }
        
        // Attempt to verify the email based on the type
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'signup' | 'email_change'
        });
        
        if (error) {
          console.error('Error verifying email:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. The link may have expired.');
          
          toast({
            variant: "destructive",
            title: "Verification failed",
            description: "We couldn't verify your email. Please try again or request a new link."
          });
        } else {
          setStatus('success');
          
          if (type === 'signup') {
            setMessage('Your email has been successfully confirmed! You can now access your account.');
            toast({
              variant: "success",
              title: "Email verified!",
              description: "Your account has been successfully activated."
            });
          } else if (type === 'email_change') {
            setMessage('Your email has been successfully changed!');
            toast({
              variant: "success",
              title: "Email updated!",
              description: "Your email address has been successfully changed."
            });
          }
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      } catch (error) {
        console.error('Unexpected error during email verification:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again later.');
        
        toast({
          variant: "destructive",
          title: "Verification error",
          description: "An unexpected error occurred during verification."
        });
      }
    };
    
    processEmailVerification();
  }, [location.search, navigate, toast]);
  
  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="w-full py-4 px-6 flex justify-center border-b bg-white shadow-sm">
        <Logo size="md" />
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                {status === 'loading' ? 'Email Verification' : 
                 status === 'success' ? 'Verification Successful' : 'Verification Failed'}
              </CardTitle>
              <CardDescription>
                {status === 'loading' ? 'Processing your verification...' : 
                 status === 'success' ? 'Your email has been verified' : 'We encountered an issue'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center py-8">
              <div className="mb-4">
                {status === 'loading' && (
                  <div className="rounded-full bg-primary/10 p-3">
                    <Loader className="h-14 w-14 text-primary animate-spin" />
                  </div>
                )}
                
                {status === 'success' && (
                  <div className="rounded-full bg-green-50 p-3">
                    <CheckCircle className="h-14 w-14 text-green-500" />
                  </div>
                )}
                
                {status === 'error' && (
                  <div className="rounded-full bg-red-50 p-3">
                    <XCircle className="h-14 w-14 text-red-500" />
                  </div>
                )}
              </div>
              
              <p className="text-center text-gray-700 mt-4 max-w-xs">{message}</p>
              
              {status === 'success' && (
                <p className="text-sm text-muted-foreground mt-3">
                  Redirecting you to the dashboard in a moment...
                </p>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              {status === 'success' ? (
                <Button 
                  onClick={handleReturnToDashboard} 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleGoToLogin} 
                    className="w-full"
                    variant={status === 'error' ? "default" : "outline"}
                  >
                    Return to Login
                  </Button>
                  
                  {status === 'error' && (
                    <Button 
                      asChild
                      variant="outline" 
                      className="w-full"
                    >
                      <Link to="/signup">Create New Account</Link>
                    </Button>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
          
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              className="text-gray-500 hover:text-gray-800" 
              onClick={handleGoToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="py-4 text-center text-sm text-gray-500 bg-white border-t">
        <p>© {new Date().getFullYear()} Theraiapi. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ConfirmEmail;
