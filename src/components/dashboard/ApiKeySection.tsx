
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ApiKeySection() {
  const [isCopying, setIsCopying] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [regenerationState, setRegenerationState] = useState<'idle' | 'loading' | 'success'>('idle');
  
  const { 
    apiKey, 
    isLoading, 
    createdAt,
    regenerateApiKey
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

  const handleCopyApiKey = () => {
    if (!apiKey) return;
    
    setIsCopying(true);
    navigator.clipboard.writeText(apiKey)
      .catch((err) => {
        console.error("Failed to copy API key:", err);
      })
      .finally(() => {
        setTimeout(() => setIsCopying(false), 1000);
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
    } catch (error) {
      console.error('Error regenerating API key:', error);
      setRegenerationState('idle');
    }
  };

  const handleToggleVisibility = () => {
    setShowApiKey(prev => !prev);
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return "••••••••••••••••••••••";
    if (showApiKey) return key;
    return key.substring(0, 4) + "••••••••••••••••••" + key.substring(key.length - 4);
  };

  const usagePercentage = (usageData.apiCallsCount / usageData.apiCallLimit) * 100;

  const renderRegenerateButton = () => {
    switch (regenerationState) {
      case 'loading':
        return <Progress value={100} className="h-10 animate-pulse" indicatorColor="bg-gray-200" />;
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
    return <Card><CardContent className="pt-6">Loading API key details...</CardContent></Card>;
  }

  // Base URL for API calls
  const apiBaseUrl = "https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/api";
  const apiEndpoint = apiBaseUrl;

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

          <Tabs defaultValue="key" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="key" className="flex-1">API Key</TabsTrigger>
              <TabsTrigger value="usage" className="flex-1">Usage Example</TabsTrigger>
            </TabsList>
            
            <TabsContent value="key">
              <div className="relative">
                <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto whitespace-nowrap flex justify-between items-center">
                  <span className="truncate mr-2">{maskApiKey(apiKey)}</span>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleToggleVisibility}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleCopyApiKey}
                      disabled={isCopying || !apiKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {createdAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="usage">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">API Endpoint</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                  <code>{apiEndpoint}</code>
                </div>
                
                <h4 className="text-sm font-medium">Authorization Header</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                  <code>Authorization: Bearer {apiKey ? (showApiKey ? apiKey : maskApiKey(apiKey)) : "YOUR_API_KEY"}</code>
                </div>
                
                <h4 className="text-sm font-medium">cURL Example</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                  <pre>curl -X GET "{apiEndpoint}" \<br />  -H "Authorization: Bearer {apiKey ? (showApiKey ? apiKey : "YOUR_API_KEY") : "YOUR_API_KEY"}" \<br />  -H "Content-Type: application/json"</pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
