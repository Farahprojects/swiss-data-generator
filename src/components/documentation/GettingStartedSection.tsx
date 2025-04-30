
import React from "react";
import DocSection from "./DocSection";

const GettingStartedSection: React.FC = () => {
  return (
    <DocSection id="getting-started" title="Getting Started">
      <p className="mb-4">
        Welcome to the Therairai API documentation. Our unified API provides comprehensive astrological calculations
        powered by the Swiss Ephemeris, suitable for all types of applications.
      </p>
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="font-semibold mb-4">Quick Start Guide</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Sign up and choose your subscription plan</li>
          <li>Get your API key from the dashboard</li>
          <li>Use your key to authenticate requests</li>
          <li>Access endpoints based on your plan tier</li>
        </ol>
      </div>
    </DocSection>
  );
};

export default GettingStartedSection;
