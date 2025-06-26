
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportForm } from "@/components/shared/ReportForm";

interface MinimalReportPageProps {
  customizationData: any;
  coachSlug: string;
}

export const MinimalReportPage: React.FC<MinimalReportPageProps> = ({ 
  customizationData, 
  coachSlug 
}) => {
  const navigate = useNavigate();
  const themeColor = customizationData.themeColor || '#10B981';
  const fontFamily = customizationData.fontFamily || 'Inter';

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Minimal Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/${coachSlug}`)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-light">Back</span>
            </Button>
            <div className="text-lg font-light tracking-wide" style={{ color: themeColor }}>
              {customizationData.coachName || "Maria Chen"}
            </div>
          </div>
        </div>
      </header>

      {/* Minimal Hero */}
      <section className="py-24 sm:py-32 lg:py-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light mb-8 tracking-wide leading-tight text-gray-900">
            {customizationData.reportTitle || "Discover Your Inner Truth"}
          </h1>
          <div className="w-12 sm:w-16 h-px bg-gray-900 mx-auto mb-8"></div>
          <p className="text-base sm:text-lg font-light leading-relaxed text-gray-600">
            {customizationData.reportSubtitle || "A gentle exploration of your authentic self through mindful assessment"}
          </p>
        </div>
      </section>

      {/* Clean Form Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="bg-white p-8 sm:p-10 rounded-none shadow-sm">
            <ReportForm 
              coachSlug={coachSlug}
              themeColor={themeColor}
              fontFamily={fontFamily}
            />
          </div>
        </div>
      </section>

      {/* Minimal CTA */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="text-lg sm:text-xl font-light mb-4 text-gray-900 tracking-wide">
            {customizationData.reportCTA || "Ready to Begin?"}
          </h3>
          <p className="text-sm text-gray-600 font-light">
            Simple. Focused. Transformative.
          </p>
        </div>
      </section>
    </div>
  );
};
