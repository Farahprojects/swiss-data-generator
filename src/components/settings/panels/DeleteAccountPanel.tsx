
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const DeleteAccountPanel = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDeleteClick = () => {
    setIsDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (confirmation !== "DELETE") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please type the confirmation phrase exactly as shown."
      });
      return;
    }
    
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
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No session found')
      }

      // Call the delete account edge function
      const response = await fetch('/functions/v1/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete account')
      }
      
      // If successful, sign out and redirect
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted."
      });
      
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Delete account exception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account. Please try again."
      });
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Delete Account</h2>
      
      <div className="mb-8">
        <p className="text-gray-600 mb-6">
          Deleting your account is permanent and cannot be undone. All your data, 
          API keys, and subscription information will be permanently removed.
        </p>
        
        <Button 
          variant="destructive" 
          onClick={handleDeleteClick}
          className="bg-red-600 hover:bg-red-700"
        >
          Delete Account
        </Button>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Are you absolutely sure?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-3 font-medium">
              Type "DELETE" to confirm:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="mb-2"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting || confirmation !== "DELETE"}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
