
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportForm } from "@/components/shared/ReportForm";

interface CreativeReportPageProps {
  customizationData: any;
  coachSlug: string;
}

export const CreativeReportPage: React.FC<CreativeReportPageProps> = ({ 
  customizationData, 
  coachSlug 
}) => {
  const navigate = useNavigate();
  const themeColor = customizationData.themeColor || '#F59E0B';
  const fontFamily = customizationData.fontFamily || 'Poppins';

  return (
    <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 min-h-screen" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Creative Header */}
      <header className="bg-white/80 backdrop-blur-sm">
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
            <div className="text-xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              {customizationData.coachName || "Jamie Rivers"}
            </div>
          </div>
        </div>
      </header>

      {/* Creative Hero */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full transform -translate-x-32 -translate-y-32 opacity-70"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full transform translate-x-48 translate-y-48 opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent leading-tight">
              {customizationData.reportTitle || "Unleash Your Creative Potential"}
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-gray-700 leading-relaxed">
              {customizationData.reportSubtitle || "A vibrant journey of self-discovery that reveals your unique creative gifts and pathways to authentic expression"}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span>Innovative</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                <span>Personalized</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                <span>Inspiring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creative Form */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 shadow-xl">
            <ReportForm 
              coachSlug={coachSlug}
              themeColor={themeColor}
              fontFamily={fontFamily}
            />
          </div>
        </div>
      </section>

      {/* Creative CTA */}
      <section className="py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full opacity-10 transform -translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full opacity-10 transform translate-x-40 translate-y-40"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">
            {customizationData.reportCTA || "Ready to Paint Your Future?"}
          </h3>
          <p className="text-lg opacity-90">
            Let's turn your dreams into a colorful masterpiece of possibility
          </p>
        </div>
      </section>
    </div>
  );
};
