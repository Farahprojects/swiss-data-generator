
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AppUser {
  id: string;
  email: string;
  plan_name: string;
  api_key: string;
  api_calls_count: number;
  api_call_limit: number;
  addon_relationship_compatibility: boolean;
  addon_yearly_cycle: boolean;
  addon_transit_12_months: boolean;
}

export const ApiKeySection = () => {
  const { user } = useAuth();
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const { toast } = useToast();

  // Fetch user data from the app_users table
  const { data: appUser, isLoading } = useQuery<AppUser>({
    queryKey: ['appUser'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data as AppUser;
    },
    enabled: !!user
  });

  const copyApiKey = () => {
    if (appUser?.api_key) {
      navigator.clipboard.writeText(appUser.api_key);
      toast({
        title: "API Key Copied",
        description: "Your API key has been copied to clipboard",
      });
    }
  };

  const toggleKeyVisibility = () => {
    setIsKeyVisible(!isKeyVisible);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API Key</CardTitle>
        <CardDescription>Use this key to authenticate your API requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Live API Key
            </label>
            <div className="flex">
              <div className="relative flex-grow">
                <input
                  type={isKeyVisible ? "text" : "password"}
                  value={appUser?.api_key || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={toggleKeyVisibility}
                className="px-4 py-2 border-y border-gray-300"
              >
                {isKeyVisible ? "Hide" : "Show"}
              </Button>
              <Button
                type="button"
                onClick={copyApiKey}
                className="rounded-l-none"
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <div className="text-sm text-gray-500 space-y-2">
              <p>Current Plan: <span className="font-medium capitalize">{appUser?.plan_name}</span></p>
              <p>API Calls: <span className="font-medium">{appUser?.api_calls_count.toLocaleString()}</span> / <span className="font-medium">{appUser?.api_call_limit.toLocaleString()}</span></p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${(appUser?.api_calls_count / (appUser?.api_call_limit || 1) * 100) || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
