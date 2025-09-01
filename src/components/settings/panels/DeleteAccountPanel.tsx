
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

export const DeleteAccountPanel = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDeleteClick = () => {
    setIsDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No user session found."
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      console.log('🚀 Calling delete-account edge function...');
      
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to delete account')
      }
      
      console.log('✅ Account deletion successful:', data);
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted."
      });
      
      // Redirect to login after successful deletion
      window.location.href = '/login';
      
    } catch (error) {
      console.error('❌ Delete account error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account. Please try again."
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-3">
        <h2 className="text-2xl font-light tracking-tight text-foreground">
          Delete Account
        </h2>
        <p className="text-muted-foreground font-light leading-relaxed max-w-2xl">
          Permanently remove your account and all associated data. This action cannot be undone 
          and will immediately cancel any active subscriptions.
        </p>
      </div>
      
      {/* Warning Section */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-destructive">
              This will permanently delete:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground font-light">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                Your profile and account settings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                All conversations and chat history
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                Payment methods and billing information
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                Active subscriptions (immediately cancelled)
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Action Button */}
      <div className="pt-4">
        <Button 
          variant="destructive" 
          onClick={handleDeleteClick}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl bg-background/95 backdrop-blur-xl">
          <DialogHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-light tracking-tight text-foreground">
              Delete Your Account?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-light leading-relaxed px-2">
              This action cannot be undone. Your account and all data will be permanently deleted, 
              and any active subscriptions will be immediately cancelled.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              className="flex-1 rounded-xl font-medium transition-all duration-200 hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-xl transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin" />
                  Deleting...
                </div>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
