
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailVerificationModalProps {
  isOpen: boolean;
  newEmail: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function EmailVerificationModal({ 
  isOpen, 
  newEmail, 
  onVerified, 
  onCancel 
}: EmailVerificationModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const sendVerification = async () => {
    if (!newEmail) return;
    
    setSending(true);
    setError(null);
    console.log("Starting verification process for:", newEmail);
    
    try {
      // Use Supabase's explicit resend method for email confirmation
      console.log("Sending verification using supabase.auth.resend");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: newEmail,
      });
      
      if (error) {
        console.error("Verification error:", error.message);
        console.error("Full error:", JSON.stringify(error, null, 2));
        setError(`Failed to send email: ${error.message}`);
        toast({
          variant: "destructive",
          title: "Failed to send email",
          description: error.message
        });
      } else {
        console.log("Verification email sent successfully");
        toast({
          title: "Verification email sent",
          description: "Please check your inbox and follow the link to verify your email."
        });
        onVerified();
      }
    } catch (err: any) {
      console.error("Unexpected error in sendVerification:", err);
      console.error("Error stack:", err.stack);
      setError(`Failed to send email: ${err.message || "Unknown error"}`);
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: "Please try again."
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Email verification required</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Your email address <strong>{newEmail}</strong> needs to be verified before you can sign in.
          </p>
          
          {error && (
            <Alert variant="destructive" className="text-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={sendVerification} 
              disabled={sending} 
              className="w-full"
            >
              {sending ? "Sending..." : "Send verification email"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
