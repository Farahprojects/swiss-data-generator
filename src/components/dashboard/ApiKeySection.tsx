
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Define interface for user_info view data
interface UserInfo {
  id: string;
  email: string;
  plan_type: string;
  addon_transits: boolean;
  addon_relationship: boolean;
  addon_yearly_cycle: boolean;
  calls_limit: number;
  calls_made: number;
  api_key: string;
}

export const ApiKeySection = () => {
  const { user } = useAuth();
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const { toast } = useToast();

  // Fetch user data from the user_info view
  const { data: userInfo, isLoading } = useQuery<UserInfo>({
    queryKey: ['userInfo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data as UserInfo;
    },
    enabled: !!user
  });

  const copyApiKey = () => {
    if (userInfo?.api_key) {
      navigator.clipboard.writeText(userInfo.api_key);
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
                  value={userInfo?.api_key || ''}
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
              <p>Current Plan: <span className="font-medium capitalize">{userInfo?.plan_type}</span></p>
              <p>API Calls: <span className="font-medium">{userInfo?.calls_made.toLocaleString()}</span> / <span className="font-medium">{userInfo?.calls_limit.toLocaleString()}</span></p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${(userInfo?.calls_made / userInfo?.calls_limit * 100) || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
