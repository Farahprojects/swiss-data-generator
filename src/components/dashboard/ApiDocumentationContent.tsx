
import React from "react";
import { ApiDocumentation } from "./ApiDocumentation";
import { Card } from "@/components/ui/card";

// This component serves as a wrapper for API documentation in the dashboard
const ApiDocumentationContent: React.FC = () => {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Your API Documentation</h1>
        <p className="text-gray-600">
          Use the examples below to integrate our API with your application. All examples include your Bearer token.
        </p>
      </div>
      <Card className="overflow-hidden">
        <ApiDocumentation />
      </Card>
    </div>
  );
};

export default ApiDocumentationContent;
