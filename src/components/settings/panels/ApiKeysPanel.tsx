
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, RefreshCw } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Mock data - this would come from database in a real app
const mockApiData = {
  apiKey: "thp_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
  apiCallsUsed: 5000,
  apiCallsLimit: 50000
};

export const ApiKeysPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const usagePercentage = (mockApiData.apiCallsUsed / mockApiData.apiCallsLimit) * 100;
  
  const copyApiKey = () => {
    navigator.clipboard.writeText(mockApiData.apiKey);
    setIsCopied(true);
    
    toast({
      title: "API Key copied",
      description: "Your API key has been copied to clipboard."
    });
    
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleRegenerateClick = () => {
    setIsConfirmDialogOpen(true);
  };
  
  const confirmRegenerate = async () => {
    setIsConfirmDialogOpen(false);
    setIsRegenerating(true);
    
    try {
      // In a real implementation, this would call a Supabase function
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "API Key regenerated",
        description: "Your new API key has been generated successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to regenerate API key."
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">API Keys</h2>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Your API Key</h3>
          <Button
            variant="outline" 
            size="sm"
            onClick={copyApiKey}
            disabled={isCopied}
          >
            <Copy className="h-4 w-4 mr-2" />
            {isCopied ? "Copied" : "Copy"}
          </Button>
        </div>
        
        <div className="relative">
          <Input 
            value={mockApiData.apiKey} 
            readOnly 
            className="font-mono bg-gray-50 pr-24"
          />
        </div>
        
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleRegenerateClick}
          disabled={isRegenerating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
          {isRegenerating ? "Regenerating..." : "Regenerate API Key"}
        </Button>
        
        <p className="text-sm text-gray-500 mt-2">
          Regenerating your API key will invalidate your old key immediately.
        </p>
      </div>
      
      <div>
        <h3 className="font-medium mb-2">API Usage This Month</h3>
        
        <div className="mb-2 flex justify-between text-sm">
          <span>
            {mockApiData.apiCallsUsed.toLocaleString()} calls used
          </span>
          <span>
            {mockApiData.apiCallsLimit.toLocaleString()} calls limit
          </span>
        </div>
        
        <Progress value={usagePercentage} className="h-2" />
        
        <p className="text-sm text-gray-500 mt-3">
          Your API usage resets at the beginning of each billing cycle.
        </p>
      </div>
      
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API Key?</DialogTitle>
            <DialogDescription>
              This will invalidate your current API key immediately. Any applications using this key will stop working until updated with the new key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRegenerate}>
              Yes, Regenerate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
