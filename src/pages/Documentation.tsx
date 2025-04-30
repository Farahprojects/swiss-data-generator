
import { useState } from "react";
import { Button } from "@/components/ui/button";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

// Import our new components
import DocSidebar from "@/components/documentation/DocSidebar";
import GettingStartedSection from "@/components/documentation/GettingStartedSection";
import AuthenticationSection from "@/components/documentation/AuthenticationSection";
import EndpointsSection from "@/components/documentation/EndpointsSection";
import RateLimitsSection from "@/components/documentation/RateLimitsSection";
import { docContent } from "@/data/documentationData";

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
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-primary mb-6">{docContent.header.title}</h1>
              <p className="text-xl text-gray-700 mb-8">
                {docContent.header.description}
              </p>
              <div className="flex justify-center gap-4">
                <Button>Get API Key</Button>
                <Button variant="outline">View Pricing</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row">
              {/* Sidebar Navigation */}
              <DocSidebar />

              {/* Main Content Area */}
              <div className="lg:w-3/4 lg:pl-12">
                <GettingStartedSection />
                <AuthenticationSection />
                <EndpointsSection />
                <RateLimitsSection />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-16 text-center text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">{docContent.cta.title}</h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl">
              {docContent.cta.description}
            </p>
            <Button className="bg-white text-primary hover:bg-gray-100 px-8 py-6 text-lg">
              Start Free Trial
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Documentation;
