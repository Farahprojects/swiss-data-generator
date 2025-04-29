
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Mock user data for demonstration
const mockUserData = {
  email: "user@example.com",
  plan_type: "Growth",
  api_key: "sk_test_CosmosAPI_2023XYZ",
  api_calls_count: 27850,
  calls_limit: 100000,
  calls_made: 27850,
  created_at: new Date().toISOString(),
};

export function ApiKeySection() {
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Mock data instead of using useQuery
  const userData = mockUserData;
  const isLoading = false;
  const error = null;

  const handleCopyApiKey = () => {
    if (!userData.api_key) return;
    
    setIsCopying(true);
    navigator.clipboard.writeText(userData.api_key)
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

  const handleRegenerateApiKey = () => {
    setIsRegenerating(true);
    
    // Mock API key regeneration - in a real app this would call an API
    setTimeout(() => {
      toast({
        title: "API Key regenerated",
        description: "Your new API key has been generated successfully."
      });
      setIsRegenerating(false);
    }, 1000);
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6">Loading API key details...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="pt-6">Error loading API key details. Please try again.</CardContent></Card>;
  }

  const usagePercentage = (userData.api_calls_count / userData.calls_limit) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          You are on the <strong>{userData.plan_type}</strong> plan with <strong>{userData.api_calls_count.toLocaleString()}</strong> API calls used out of <strong>{userData.calls_limit.toLocaleString()}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">API Usage</span>
            <span className="text-sm text-muted-foreground">
              {userData.api_calls_count.toLocaleString()} / {userData.calls_limit.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2 bg-gray-200">
            <div className="h-full bg-primary" style={{ width: `${usagePercentage}%` }} />
          </Progress>
        </div>

        <div className="relative">
          <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto whitespace-nowrap">
            {userData.api_key}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={handleCopyApiKey}
            disabled={isCopying}
          >
            <Copy className="h-4 w-4 mr-1" />
            {isCopying ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button 
          variant="outline" 
          onClick={handleRegenerateApiKey} 
          disabled={isRegenerating}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
          {isRegenerating ? "Regenerating..." : "Regenerate API Key"}
        </Button>
      </CardFooter>
    </Card>
  );
}
