
import React from "react";
import { Outlet } from "react-router-dom";
import { WebsiteBuilderProvider } from "@/hooks/useWebsiteBuilder";
import { WebsiteBuilderHeader } from "./WebsiteBuilderHeader";

export const WebsiteBuilderLayout = () => {
  return (
    <WebsiteBuilderProvider>
      <div className="min-h-screen bg-gray-50">
        <WebsiteBuilderHeader />
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Outlet />
            </div>
            <div className="lg:sticky lg:top-6">
              {/* Live Preview Panel will be inserted here by individual pages */}
            </div>
          </div>
        </div>
      </div>
    </WebsiteBuilderProvider>
  );
};
