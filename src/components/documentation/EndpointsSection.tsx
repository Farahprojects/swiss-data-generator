
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DocSection from "./DocSection";
import CodeBlock from "./CodeBlock";
import { codeSnippets } from "@/data/documentationData";

const EndpointsSection: React.FC = () => {
  return (
    <DocSection id="endpoints" title="API Endpoints">
      <p className="mb-6">
        All endpoints are accessible through <code className="bg-gray-100 px-2 py-1 rounded">https://api.therairai.com/v1/</code>
      </p>

      <div id="natal-chart" className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-2xl font-bold">Natal Chart</h3>
          <Badge variant="default">Starter Plan</Badge>
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
