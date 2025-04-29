
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
    if (confirmation.toLowerCase() !== "delete my account") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please type the confirmation phrase exactly as shown."
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // In a real implementation, this would call Supabase auth to delete the user
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await signOut();
      window.location.href = '/login';
    } catch (error) {
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
              Type "delete my account" to confirm:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="delete my account"
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
              disabled={isDeleting || confirmation.toLowerCase() !== "delete my account"}
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
