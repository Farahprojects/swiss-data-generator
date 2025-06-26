
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportForm } from "@/components/shared/ReportForm";

interface ModernReportPageProps {
  customizationData: any;
  coachSlug: string;
}

export const ModernReportPage: React.FC<ModernReportPageProps> = ({ 
  customizationData, 
  coachSlug 
}) => {
  const navigate = useNavigate();
  const themeColor = customizationData.themeColor || '#6366F1';
  const fontFamily = customizationData.fontFamily || 'Inter';

  return (
    <div className="bg-gray-50 min-h-screen" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Header with Back Button */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
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
              {customizationData.coachName || "Alex Johnson"}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-600 opacity-20"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center text-white">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
            {customizationData.reportTitle || "Transform Your Life with Data-Driven Insights"}
          </h1>
          <p className="text-lg sm:text-xl mb-8 sm:mb-10 text-gray-300 leading-relaxed max-w-3xl mx-auto">
            {customizationData.reportSubtitle || "Get a comprehensive analysis tailored to your unique situation and goals"}
          </p>
        </div>
      </section>

      {/* Report Form Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-10">
            <ReportForm 
              coachSlug={coachSlug}
              themeColor={themeColor}
              fontFamily={fontFamily}
            />
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-12 sm:py-16" style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to unlock your potential?
          </h3>
          <p className="text-base opacity-90">
            Join thousands who have transformed their lives with personalized insights
          </p>
        </div>
      </section>
    </div>
  );
};
