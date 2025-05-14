import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw, Eye, EyeOff, Check, Key, AlertCircle } from "lucide-react";
import { useApiKey } from "@/hooks/useApiKey";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ApiKeySection() {
  const [isCopying, setIsCopying] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [regenerationState, setRegenerationState] = useState<'idle' | 'loading' | 'success'>('idle');
  const { toast, message, clearToast } = useToast();
  
  const { 
    apiKey, 
    isLoading, 
    error,
    createdAt,
    regenerateApiKey,
    refreshApiKey
  } = useApiKey();

  // Reset success state after timeout
  useEffect(() => {
    if (regenerationState === 'success') {
      const timer = setTimeout(() => {
        setRegenerationState('idle');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [regenerationState]);

  // Retry loading API key if there was an error or none was found
  useEffect(() => {
    if ((!apiKey && !isLoading) || error) {
      const timer = setTimeout(() => {
        console.log("No API key found or error occurred, retrying...");
        refreshApiKey();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [apiKey, isLoading, error, refreshApiKey]);

  const handleCopyApiKey = () => {
    if (!apiKey) return;
    
    setIsCopying(true);
    navigator.clipboard.writeText(apiKey)
      .catch((err) => {
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

  const handleConfirmRegeneration = async () => {
    setIsConfirmDialogOpen(false);
    setRegenerationState('loading');
    
    try {
      await regenerateApiKey();
      setRegenerationState('success');
      toast({
        title: "Success",
        description: "Your API key has been regenerated."
      });
    } catch (error) {
      console.error('Error regenerating API key:', error);
      setRegenerationState('idle');
      toast({
        title: "Error",
        description: "Failed to regenerate API key.",
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibility = () => {
    setShowApiKey(prev => !prev);
  };

  // Improved API key masking with more realistic length representation
  const maskApiKey = (key: string | null) => {
    if (!key) return "••••••••••••••";
    // Use the actual key length, showing first 4 chars and last 4 chars
    const maskedMiddle = "•".repeat(Math.min(key.length - 8, 12)); // Max 12 dots for middle part
    return showApiKey ? key : key.substring(0, 4) + maskedMiddle + key.substring(key.length - 4);
  };

  const renderRegenerateButton = () => {
    switch (regenerationState) {
      case 'loading':
        return <div className="bg-gray-200 h-10 w-full flex items-center justify-center rounded-md animate-pulse">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
        </div>;
      case 'success':
        return (
          <div className="bg-green-500 h-10 w-full flex items-center justify-center text-white rounded-md">
            <Check className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <Button 
            variant="outline" 
            onClick={handleRegenerateClick}
            disabled={isLoading}
            className="w-full bg-white text-black border-black hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Processing..." : "Regenerate API Key"}
          </Button>
        );
    }
  };

  // Helper function to render the inline toast message
  const renderToastMessage = () => {
    if (!message) return null;
    
    return (
      <Alert className={`mb-4 ${
        message.variant === "destructive" 
          ? "bg-red-50 border-red-200 text-red-800" 
          : message.variant === "success"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-blue-50 border-blue-200 text-blue-800"
      }`}>
        <AlertCircle className={`h-4 w-4 ${
          message.variant === "destructive" 
            ? "text-red-600" 
            : message.variant === "success"
            ? "text-green-600"
            : "text-blue-600"
        }`} />
        <AlertDescription>
          {message.title && <p className="font-medium">{message.title}</p>}
          {message.description && <p>{message.description}</p>}
        </AlertDescription>
      </Alert>
    );
  };

  if (isLoading && !apiKey) {
    return (
      <Card className="w-full h-full overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mb-4 text-gray-500" />
            <p>Loading API key details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardContent className="pt-6">
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
            <p className="text-red-600 font-medium">Error loading API key:</p>
            <p className="text-red-500 text-sm">{error.message}</p>
          </div>
          <Button onClick={refreshApiKey} variant="outline" className="w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!apiKey) {
    return (
      <Card className="w-full h-full overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardContent className="pt-6">
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mb-4">
            <p className="text-amber-700 font-medium">No API key found</p>
            <p className="text-amber-600 text-sm">
              We couldn't find your API key. This might happen if your account was just created.
            </p>
          </div>
          <Button 
            onClick={regenerateApiKey} 
            className="w-full bg-amber-500 hover:bg-amber-600"
          >
            Generate API Key
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full h-full flex flex-col overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API Key
          </CardTitle>
          <CardDescription>
            Your API key for integrating with our service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
          {/* Display inline toast message if present */}
          {message && renderToastMessage()}
          
          <div className="relative">
            <div className="bg-gray-50 p-3 rounded-md font-mono text-sm flex justify-between items-start border border-gray-200">
              <div className="w-full pr-16 break-all">{maskApiKey(apiKey)}</div>
              <div className="flex space-x-1 shrink-0 absolute right-3 top-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleToggleVisibility}
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCopyApiKey}
                  disabled={isCopying || !apiKey}
                  title="Copy API key"
                >
                  {isCopying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {createdAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Created: {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-auto pt-5">
          <div className="w-full">
            {renderRegenerateButton()}
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current API key immediately. Any applications 
              using this key will stop working until updated with the new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegeneration}>
              Regenerate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
