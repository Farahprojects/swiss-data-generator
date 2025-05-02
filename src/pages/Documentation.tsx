
import React from "react";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { codeSnippets } from "@/data/documentationCodeSnippets";

// Import our newly created components
import CodeTabsExample from "@/components/documentation/CodeTabsExample";
import JsonResponseExample from "@/components/documentation/JsonResponseExample";
import RequestExplanationSection from "@/components/documentation/RequestExplanationSection";
import RequestBodySection from "@/components/documentation/RequestBodySection";
import ProcessExplanationSection from "@/components/documentation/ProcessExplanationSection";
import CustomizationSection from "@/components/documentation/CustomizationSection";
import ExplorationSection from "@/components/documentation/ExplorationSection";

const Documentation = () => {
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <UnifiedNavigation />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="py-16 bg-gradient-to-b from-primary/10 to-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-bold text-primary mb-6">Quick Start: Your First API Call</h1>
              <p className="text-xl text-gray-700 mb-4">
                Ready to dive in? This guide walks you through making your first call to the TheRaiAPI using curl. 
                We&apos;ll request a &quot;Body Matrix&quot; calculation, a common starting point.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
                <p className="text-yellow-800">
                  <span className="font-bold">Prerequisites:</span>
                </p>
                <ul className="list-disc ml-6 mt-2 text-yellow-800">
                  <li>You have your unique API Key.</li>
                  <li>You have curl installed (common on Linux/macOS, available for Windows).</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-12">
              {/* Step 1 - API Request Examples */}
              <CodeTabsExample 
                title="1. The Request: Get a Body Matrix"
                description="Below are examples of how to make the exact same API request using different languages. Choose the tab that matches your preferred tool or language."
                curlCode={codeSnippets.curl}
                pythonCode={codeSnippets.python}
                javaCode={codeSnippets.java}
              />
              <RequestExplanationSection />
              
              {/* Step 2 - Request Body */}
              <RequestBodySection />
              
              {/* Step 3 - Process Explanation */}
              <ProcessExplanationSection />
              
              {/* Step 4 - Example Response */}
              <JsonResponseExample 
                title="4. Example Response"
                description="You'll receive a JSON response containing the results. Here's an actual response received from the exact curl command shown above (when run targeting a specific moment):"
                jsonCode={codeSnippets.jsonResponse}
              />
              <p className="mt-4 text-sm text-gray-600 italic">
                Note: The exact data (phases, aspects, rulers, timestamps) will naturally vary depending on when you make the call or if you specify a different analysis_date. However, the structure of the response for a body_matrix request will generally follow this pattern.
              </p>
              
              {/* Step 5 - Customization */}
              <CustomizationSection />
              
              {/* Step 6 - Exploring Other Endpoints */}
              <ExplorationSection />
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Documentation;
