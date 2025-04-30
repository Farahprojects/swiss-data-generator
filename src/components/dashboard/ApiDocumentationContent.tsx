
import React from "react";
import { ApiDocumentation } from "./ApiDocumentation";

// This component serves as a wrapper for API documentation in the dashboard
// It can be extended with additional dashboard-specific features if needed
const ApiDocumentationContent: React.FC = () => {
  return (
    <div className="p-4">
      <ApiDocumentation />
    </div>
  );
};

export default ApiDocumentationContent;
