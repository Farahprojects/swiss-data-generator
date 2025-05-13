
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Eye, EyeOff, Check, Key } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    if (!key) return "••••••••••••••";
    // Use the actual key length, showing first 4 chars and last 4 chars
    const maskedMiddle = "•".repeat(Math.min(key.length - 8, 12)); // Max 12 dots for middle part
    return showApiKey ? key : key.substring(0, 4) + maskedMiddle + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Key size={28} className="text-primary" />
        <h2 className="text-2xl font-semibold">API Keys</h2>
      </div>
      
      <Card className="mb-6 overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Key Security</CardTitle>
              <CardDescription>Important information about your API key</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-black text-sm">
            <p className="font-medium mb-2">Keep your API key secure</p>
            <p>Your API key provides full access to your account and services. Never share your API key in public repositories, client-side code, or with unauthorized individuals. If you suspect your key has been compromised, regenerate it immediately.</p>
            <p className="mt-2">We recommend storing your API key in environment variables or secure secret management systems.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Your API Key</CardTitle>
          <CardDescription>
            Use this key to authenticate your API requests
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="bg-gray-50 p-4 rounded-md font-mono text-sm break-all border border-gray-200">
              {maskApiKey(apiKey)}
            </div>
            <div className="absolute right-3 top-3 flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={handleToggleVisibility}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={handleCopyApiKey}
                disabled={isCopying || !apiKey}
              >
                {isCopying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-6 px-6">
          <div className="w-full space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRegenerateClick}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Regenerating..." : "Regenerate API Key"}
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Regenerating your API key will invalidate your old key immediately.
              All existing integrations will need to be updated.
            </p>
            
            {createdAt && (
              <p className="text-xs text-muted-foreground">
                Created: {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>API Usage Guidelines</CardTitle>
          <CardDescription>Best practices for using your API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-medium mb-1 text-primary">Development vs Production</h3>
              <p className="text-sm text-muted-foreground">Consider using separate API keys for development and production environments to minimize risks.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-medium mb-1 text-primary">Regular Rotation</h3>
              <p className="text-sm text-muted-foreground">Periodically regenerate your API keys as a security best practice, especially after team member changes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
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
