
import React, { useState } from "react";

interface CodeBlockProps {
  code: string;
  language: "curl" | "javascript" | "python";
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copySuccess, setCopySuccess] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess("Copied!");
    setTimeout(() => {
      setCopySuccess("");
    }, 2000);
  };

  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code)}
        className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
      >
        {copySuccess || "Copy"}
      </button>
    </div>
  );
};

export default CodeBlock;
