
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocSection from "./DocSection";
import CodeBlock from "./CodeBlock";
import { codeSnippets } from "@/data/documentationData";

const AuthenticationSection: React.FC = () => {
  return (
    <DocSection id="authentication" title="Authentication">
      <p className="mb-6">
        All API requests require authentication using your API key. Your key grants access to endpoints based on your subscription plan.
      </p>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <Tabs defaultValue="curl">
          <TabsList className="mb-2">
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl">
            <CodeBlock code={codeSnippets.authentication.curl} language="curl" />
          </TabsContent>
          <TabsContent value="javascript">
            <CodeBlock code={codeSnippets.authentication.javascript} language="javascript" />
          </TabsContent>
          <TabsContent value="python">
            <CodeBlock code={codeSnippets.authentication.python} language="python" />
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <p className="text-yellow-700">
          <span className="font-bold">Important:</span> Keep your API key secure and never expose it in client-side code.
        </p>
      </div>
    </DocSection>
  );
};

export default AuthenticationSection;
