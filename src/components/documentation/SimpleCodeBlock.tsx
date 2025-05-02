
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimpleCodeBlockProps {
  title?: string;
  description?: string;
  code: string;
  language: string;
}

const SimpleCodeBlock: React.FC<SimpleCodeBlockProps> = ({
  title,
  description,
  code,
  language,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4">
      {title && <h3 className="font-semibold mb-2">{title}</h3>}
      {description && <p className="mb-2 text-sm">{description}</p>}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-gray-200 text-sm font-medium">{language}</span>
          <Button 
            onClick={() => copyToClipboard(code)} 
            className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
            variant="ghost"
            size="sm"
          >
            {copied ? (
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
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default SimpleCodeBlock;
