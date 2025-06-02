
import React from "react";
import { ApiDocumentation } from "./ApiDocumentation";
import { Card } from "@/components/ui/card";
import { Info, ArrowRight, Copy, Check, Code, Key } from "lucide-react";
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
    <div className="w-full max-w-none overflow-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">API Documentation</h1>
        <p className="text-gray-600 text-lg">
          Learn how to integrate our astrology API into your application with these simple examples.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="mb-8 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Code className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Quick Start Guide</h2>
        </div>

        {/* Authentication Overview */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Key className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">
                All API requests require your Bearer token in the Authorization header. Your API key authenticates your requests securely.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Authorization Header</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard("Authorization: Bearer yourtheriaapikeyhere", "auth-header")}
                    className="h-8 px-2 text-gray-500 hover:text-gray-700"
                  >
                    {copied === "auth-header" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <code className="text-sm text-gray-800 font-mono">
                  Authorization: Bearer yourtheriaapikeyhere
                </code>
              </div>
            </div>
          </div>
        </Card>

        {/* Basic Request Example */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Request Example</h3>
          <p className="text-gray-600 mb-4">
            Here's a complete example of making a natal chart request:
          </p>

          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <span className="text-gray-300 text-sm font-medium">CURL</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`curl -X POST \\
  'https://api.theriaapi.com/swiss/natal' \\
  -H 'Authorization: Bearer yourtheriaapikeyhere' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "birth_date": "1990-01-15",
    "birth_time": "14:30",
    "location": "New York, USA",
    "bearer": "yourtheriaapikeyhere"
  }'`, "curl-example")}
                  className="h-6 px-2 text-gray-400 hover:text-white"
                >
                  {copied === "curl-example" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="p-4">
                <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                  <code>{`curl -X POST \\
  'https://api.theriaapi.com/swiss/natal' \\
  -H 'Authorization: Bearer yourtheriaapikeyhere' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "birth_date": "1990-01-15",
    "birth_time": "14:30",
    "location": "New York, USA",
    "bearer": "yourtheriaapikeyhere"
  }'`}</code>
                </pre>
              </div>
            </div>
          </div>
        </Card>

        {/* Request Structure */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Request Structure</h3>
          <p className="text-gray-600 mb-4">
            When making requests, include your API key in both the header and request body:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Headers */}
            <div>
              <h4 className="font-medium mb-2 text-gray-700">Headers</h4>
              <div className="bg-gray-50 rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">JSON</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`{
  "Authorization": "Bearer yourtheriaapikeyhere",
  "Content-Type": "application/json"
}`, "headers-example")}
                    className="h-6 px-1 text-gray-500 hover:text-gray-700"
                  >
                    {copied === "headers-example" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  <code>{`{
  "Authorization": "Bearer yourtheriaapikeyhere",
  "Content-Type": "application/json"
}`}</code>
                </pre>
              </div>
            </div>

            {/* Body */}
            <div>
              <h4 className="font-medium mb-2 text-gray-700">Request Body</h4>
              <div className="bg-gray-50 rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">JSON</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "bearer": "yourtheriaapikeyhere"
}`, "body-example")}
                    className="h-6 px-1 text-gray-500 hover:text-gray-700"
                  >
                    {copied === "body-example" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  <code>{`{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "bearer": "yourtheriaapikeyhere"
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Ready to explore?</h3>
              <p className="text-gray-600">
                Check out the detailed API documentation below for all available endpoints, parameters, and response formats.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden w-full min-w-0">
        <ApiDocumentation />
      </Card>
    </div>
  );
};

export default ApiDocumentationContent;
