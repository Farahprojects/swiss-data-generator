
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useApiKey } from "@/hooks/useApiKey";

export const ApiKeysPanel = () => {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const { 
    apiKey, 
    isLoading, 
    error,
    createdAt,
    regenerateApiKey
  } = useApiKey();

  const handleCopyApiKey = () => {
    if (!apiKey) return;
    
    setIsCopying(true);
    navigator.clipboard.writeText(apiKey)
      .catch(err => {
        console.error("Failed to copy API key:", err);
      })
      .finally(() => {
        setTimeout(() => setIsCopying(false), 1000);
        toast({
          title: "API Key copied",
          description: "Your API key has been copied to clipboard."
        });
      });
  };
  
  const handleRegenerateClick = () => {
    setIsConfirmDialogOpen(true);
  };
  
  const confirmRegenerate = async () => {
    setIsConfirmDialogOpen(false);
    
    try {
      await regenerateApiKey();
      
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
    }
  };

  const handleToggleVisibility = () => {
    setShowApiKey(prev => !prev);
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return "••••••••••••••••••••••";
    return showApiKey ? key : key.substring(0, 4) + "••••••••••••••••••" + key.substring(key.length - 4);
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
            onClick={handleCopyApiKey}
            disabled={isCopying || !apiKey}
          >
            {isCopying ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {isCopying ? "Copied" : "Copy"}
          </Button>
        </div>
        
        <div className="relative">
          <div className="bg-gray-50 p-3 rounded-md font-mono text-sm break-all">
            {maskApiKey(apiKey)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={handleToggleVisibility}
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleRegenerateClick}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Regenerating..." : "Regenerate API Key"}
        </Button>
        
        <p className="text-sm text-gray-500 mt-2">
          Regenerating your API key will invalidate your old key immediately.
        </p>
        
        {createdAt && (
          <p className="text-xs text-gray-500 mt-1">
            Created: {new Date(createdAt).toLocaleDateString()}
          </p>
        )}
      </div>
      
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current API key immediately. Any applications using this key will stop working until updated with the new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegenerate}>
              Yes, Regenerate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
