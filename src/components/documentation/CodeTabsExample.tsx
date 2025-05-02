
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeTabsExampleProps {
  title: string;
  description?: string;
  curlCode: string;
  pythonCode: string;
  javaCode: string;
}

const CodeTabsExample: React.FC<CodeTabsExampleProps> = ({
  title,
  description,
  curlCode,
  pythonCode,
  javaCode,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
      {description && <p className="mb-4">{description}</p>}
      
      <Tabs defaultValue="curl" className="w-full">
        <TabsList className="w-full mb-2 grid grid-cols-3">
          <TabsTrigger value="curl">curl (Command Line)</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
          <TabsTrigger value="java">Java</TabsTrigger>
        </TabsList>
        
        <TabsContent value="curl">
          <p className="mb-2">This is the most direct way to test from your terminal.</p>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-gray-200 text-sm font-medium">Bash</span>
              <Button 
                onClick={() => copyToClipboard(curlCode, "curl")} 
                className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                variant="ghost"
                size="sm"
              >
                {copied === "curl" ? (
                  <>
                    <Check className="h-4 w-4" /> 
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> 
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
              <code>{curlCode}</code>
            </pre>
          </div>
        </TabsContent>
        
        <TabsContent value="python">
          <p className="mb-2">This example uses the popular requests library. If you don&apos;t have it, install it using pip: <code className="bg-gray-100 px-1 rounded">pip install requests</code></p>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-gray-200 text-sm font-medium">Python</span>
              <Button 
                onClick={() => copyToClipboard(pythonCode, "python")} 
                className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                variant="ghost"
                size="sm"
              >
                {copied === "python" ? (
                  <>
                    <Check className="h-4 w-4" /> 
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> 
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
              <code>{pythonCode}</code>
            </pre>
          </div>
        </TabsContent>
        
        <TabsContent value="java">
          <p className="mb-2">This example uses Java&apos;s modern, built-in HTTP client, available since Java 11.</p>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-gray-200 text-sm font-medium">Java</span>
              <Button 
                onClick={() => copyToClipboard(javaCode, "java")} 
                className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                variant="ghost"
                size="sm"
              >
                {copied === "java" ? (
                  <>
                    <Check className="h-4 w-4" /> 
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> 
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
              <code>{javaCode}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CodeTabsExample;
