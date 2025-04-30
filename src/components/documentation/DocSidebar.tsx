
import React from "react";
import { Badge } from "@/components/ui/badge";

const DocSidebar: React.FC = () => {
  return (
    <div className="lg:w-1/4 mb-8 lg:mb-0">
      <div className="sticky top-24 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Quick Navigation</h3>
        <ul className="space-y-2">
          <li>
            <a href="#getting-started" className="text-primary hover:underline">Getting Started</a>
          </li>
          <li>
            <a href="#authentication" className="text-primary hover:underline">Authentication</a>
          </li>
          <li>
            <a href="#endpoints" className="text-primary hover:underline">API Endpoints</a>
          </li>
        </ul>

        <h3 className="font-semibold text-lg mt-8 mb-4">Endpoints by Plan</h3>
        <ul className="space-y-4">
          <li>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-700">Starter Plan</span>
              <Badge variant="default">50K calls/mo</Badge>
            </div>
            <ul className="pl-4 space-y-1">
              <li>
                <a href="#natal-chart" className="text-gray-700 hover:text-primary">Natal Chart (Basic)</a>
              </li>
            </ul>
          </li>
          <li>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-700">Growth Plan</span>
              <Badge variant="secondary">200K calls/mo</Badge>
            </div>
            <ul className="pl-4 space-y-1">
              <li>
                <a href="#natal-chart-pro" className="text-gray-700 hover:text-primary">Natal Chart (Advanced)</a>
              </li>
              <li>
                <a href="#transits" className="text-gray-700 hover:text-primary">Transit Calculations</a>
              </li>
            </ul>
          </li>
          <li>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-700">Professional Plan</span>
              <Badge variant="outline">750K calls/mo</Badge>
            </div>
            <ul className="pl-4 space-y-1">
              <li>
                <a href="#compatibility" className="text-gray-700 hover:text-primary">Compatibility Analysis</a>
              </li>
              <li>
                <a href="#yearly-cycle" className="text-gray-700 hover:text-primary">Yearly Cycle Analysis</a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DocSidebar;
