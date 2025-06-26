
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportForm } from "@/components/shared/ReportForm";

interface ProfessionalReportPageProps {
  customizationData: any;
  coachSlug: string;
}

export const ProfessionalReportPage: React.FC<ProfessionalReportPageProps> = ({ 
  customizationData, 
  coachSlug 
}) => {
  const navigate = useNavigate();
  const themeColor = customizationData.themeColor || '#1E40AF';
  const fontFamily = customizationData.fontFamily || 'Inter';

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Professional Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/${coachSlug}`)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Website</span>
            </Button>
            <div className="text-xl font-bold" style={{ color: themeColor }}>
              {customizationData.coachName || "Michael Thompson"}
            </div>
          </div>
        </div>
      </header>

      {/* Professional Hero */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-gray-900 leading-tight">
                {customizationData.reportTitle || "Executive Assessment Report"}
              </h1>
              <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600 leading-relaxed">
                {customizationData.reportSubtitle || "Comprehensive leadership analysis designed for senior executives and high-performers"}
              </p>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-500 justify-center lg:justify-start">
                <div>✓ Evidence-Based</div>
                <div>✓ Actionable Insights</div>
                <div>✓ Confidential Results</div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 sm:p-8 text-white shadow-2xl">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-2">98%</div>
                    <div className="text-blue-200 text-sm">Accuracy Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-2">24h</div>
                    <div className="text-blue-200 text-sm">Delivery Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-2">500+</div>
                    <div className="text-blue-200 text-sm">Executives Served</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-2">15+</div>
                    <div className="text-blue-200 text-sm">Key Metrics</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Form */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 lg:p-10 border">
            <ReportForm 
              coachSlug={coachSlug}
              themeColor={themeColor}
              fontFamily={fontFamily}
            />
          </div>
        </div>
      </section>

      {/* Professional CTA */}
      <section className="py-12 sm:py-16" style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">
            Investment in Excellence
          </h3>
          <p className="text-lg opacity-90">
            Join the ranks of successful executives who've accelerated their growth
          </p>
        </div>
      </section>
    </div>
  );
};
