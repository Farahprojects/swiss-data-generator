
import React from "react";
import { ApiDocumentation } from "./ApiDocumentation";
import { Card } from "@/components/ui/card";
import { Info, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

// This component serves as a wrapper for API documentation in the dashboard
const ApiDocumentationContent: React.FC = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Your API Documentation</h1>
        <p className="text-gray-600">
          Use the examples below to integrate our API with your application. All examples include your Bearer token.
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card className="overflow-hidden mb-6 border-blue-200 bg-blue-50">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-blue-800">Quick Start Guide</h2>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-700">How to use your API key:</h3>
            
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <div className="bg-gray-50 border rounded-md p-3 flex-grow w-full md:w-auto">
                <code className="text-sm">https://api.theriaapi.com/api/horoscope</code>
              </div>
              <div className="flex items-center">
                <ArrowRight className="hidden md:block mx-2 text-blue-500" />
                <div className="md:hidden flex justify-center w-full my-2">
                  <ArrowRight className="transform rotate-90 text-blue-500" />
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex-grow w-full md:w-auto">
                <div className="flex justify-between">
                  <code className="text-sm font-bold">Authorization: Bearer yourtheriaapikeyhere</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard("Authorization: Bearer yourtheriaapikeyhere", "bearer")}
                    className="ml-2 h-6 px-2 text-gray-500 hover:text-gray-700"
                  >
                    {copied === "bearer" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Always add your API key as a Bearer token in the Authorization header for all requests.
            </p>

            <div className="bg-gray-50 p-3 rounded-md border">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Complete request example:</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`curl -X GET \\
  'https://api.theriaapi.com/api/horoscope' \\
  -H 'Authorization: Bearer yourtheriaapikeyhere'`, "example")}
                  className="h-6 px-2 text-gray-500 hover:text-gray-700"
                >
                  {copied === "example" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="mt-2 text-xs overflow-x-auto">
                <code>{`curl -X GET \\
  'https://api.theriaapi.com/api/horoscope' \\
  -H 'Authorization: Bearer yourtheriaapikeyhere'`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-700">JSON Request Structure:</h3>
            <p className="text-sm mb-2">
              When sending JSON in your request body, always include your API key as a bearer token in the header:
            </p>

            <div className="bg-gray-50 p-3 rounded-md border">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Header:</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`{
  "Authorization": "Bearer yourtheriaapikeyhere",
  "Content-Type": "application/json"
}`, "json-header")}
                  className="h-6 px-2 text-gray-500 hover:text-gray-700"
                >
                  {copied === "json-header" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="mt-2 text-xs overflow-x-auto">
                <code>{`{
  "Authorization": "Bearer yourtheriaapikeyhere",
  "Content-Type": "application/json"
}`}</code>
              </pre>
            </div>

            <div className="mt-3 bg-gray-50 p-3 rounded-md border">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Body Example:</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060
}`, "json-body")}
                  className="h-6 px-2 text-gray-500 hover:text-gray-700"
                >
                  {copied === "json-body" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="mt-2 text-xs overflow-x-auto">
                <code>{`{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <ApiDocumentation />
      </Card>
    </div>
  );
};

export default ApiDocumentationContent;
