
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";

export function ApiKeySection() {
  const [isCopying, setIsCopying] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [regenerationState, setRegenerationState] = useState<'idle' | 'loading' | 'success'>('idle');
  const { toast } = useToast();
  
  const { 
    apiKey, 
    isLoading, 
    error,
    createdAt,
    regenerateApiKey,
    refreshApiKey
  } = useApiKey();

  // Mock usage data - this would come from a proper API endpoint in production
  const usageData = {
    apiCallsCount: 27850,
    apiCallLimit: 100000
  };

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

  const maskApiKey = (key: string | null) => {
    if (!key) return "••••••••••••••••••••••";
    return showApiKey ? key : key.substring(0, 4) + "••••••••••••••••••" + key.substring(key.length - 4);
  };

  const usagePercentage = (usageData.apiCallsCount / usageData.apiCallLimit) * 100;

  const renderRegenerateButton = () => {
    switch (regenerationState) {
      case 'loading':
        return <Progress value={100} className="h-10 animate-pulse bg-gray-200" />;
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
            className="w-full mb-2 bg-white text-black border-black hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Processing..." : "Regenerate API Key"}
          </Button>
        );
    }
  };

  if (isLoading && !apiKey) {
    return (
      <Card>
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
      <Card>
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
      <Card>
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
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Your API key for integrating with our service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">API Usage</span>
              <span className="text-sm text-muted-foreground">
                {usageData.apiCallsCount.toLocaleString()} / {usageData.apiCallLimit.toLocaleString()}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2 bg-gray-200" indicatorColor="bg-[#9b87f5]" />
          </div>

          <div className="relative">
            <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto whitespace-nowrap flex justify-between items-center">
              <span className="truncate mr-2">{maskApiKey(apiKey)}</span>
              <div className="flex space-x-1">
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
        <CardFooter className="flex justify-end mt-auto">
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
