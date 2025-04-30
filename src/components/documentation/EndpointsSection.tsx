
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Info, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DocSection from "./DocSection";
import CodeBlock from "./CodeBlock";
import { codeSnippets } from "@/data/documentationData";

const EndpointsSection: React.FC = () => {
  return (
    <DocSection id="endpoints" title="API Endpoints">
      <p className="mb-6">
        All endpoints are accessible through <code className="bg-gray-100 px-2 py-1 rounded">https://api.theriaapi.com/api</code>
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-8">
        <h3 className="flex items-center text-lg font-semibold mb-2 text-blue-800">
          <Info className="w-5 h-5 mr-2" /> Quick Start Example
        </h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="bg-white border rounded p-3 flex-grow">
              <p className="font-mono text-sm">GET https://api.theriaapi.com/api/natal-chart</p>
            </div>
            <ArrowRight className="mx-4 text-blue-500" />
            <div className="bg-white border rounded p-3 flex-grow">
              <p className="font-mono text-sm">Authorization: Bearer yourtheriaapikeyhere</p>
            </div>
          </div>
          <p className="text-sm text-blue-800">
            Simply add your API key to all requests as a Bearer token. Get your API key from your dashboard.
          </p>
        </div>
      </div>

      <div id="natal-chart" className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-2xl font-bold">Natal Chart</h3>
          <Badge variant="default">Starter Plan</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <Info className="w-5 h-5 text-gray-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Get complete birth chart details including planets, houses, and aspects.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Tabs defaultValue="curl">
          <TabsList className="mb-2">
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl">
            <CodeBlock code={codeSnippets.natalChart.curl} language="curl" />
          </TabsContent>
          <TabsContent value="javascript">
            <CodeBlock code={codeSnippets.natalChart.javascript} language="javascript" />
          </TabsContent>
          <TabsContent value="python">
            <CodeBlock code={codeSnippets.natalChart.python} language="python" />
          </TabsContent>
        </Tabs>
      </div>
    </DocSection>
  );
};

export default EndpointsSection;
