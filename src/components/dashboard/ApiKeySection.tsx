
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useApiKey } from "@/hooks/useApiKey";

export function ApiKeySection() {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
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

  const handleCopyApiKey = () => {
    if (!apiKey) return;
    
    setIsCopying(true);
    navigator.clipboard.writeText(apiKey)
      .then(() => {
        toast({
          title: "API Key copied",
          description: "Your API key has been copied to clipboard."
        });
      })
      .catch((err) => {
        console.error("Failed to copy API key:", err);
        toast({
          title: "Failed to copy",
          description: "Please try again or copy manually.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setTimeout(() => setIsCopying(false), 1000);
      });
  };

  const handleRegenerateApiKey = async () => {
    await regenerateApiKey();
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

  if (isLoading && !apiKey) {
    return <Card><CardContent className="pt-6">Loading API key details...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          Your API key for integrating with our service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">API Usage</span>
            <span className="text-sm text-muted-foreground">
              {usageData.apiCallsCount.toLocaleString()} / {usageData.apiCallLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2 bg-gray-200" />
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
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          variant="outline" 
          onClick={handleRegenerateApiKey}
          disabled={isLoading}
          className="w-full mb-2 bg-white text-black border-black hover:bg-gray-100"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Processing..." : "Regenerate API Key"}
        </Button>
      </CardFooter>
    </Card>
  );
}
