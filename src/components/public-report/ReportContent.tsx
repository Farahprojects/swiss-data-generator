
import React from 'react';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { AstroDataRenderer } from './AstroDataRenderer';
import { ReportData } from '@/utils/reportContentExtraction';

interface ReportContentProps {
  reportData: ReportData;
  activeView: 'report' | 'astro';
  setActiveView: (view: 'report' | 'astro') => void;
  isMobile?: boolean;
}

export const ReportContent: React.FC<ReportContentProps> = ({
  reportData,
  activeView,
  setActiveView,
  isMobile = false
}) => {
  const contentType = reportData.metadata.content_type;

  // Timing logs for overall content rendering
  const renderStartTime = performance.now();
  console.log('[ReportContent] 🚀 Starting content rendering...');
  console.log(`[ReportContent] 📋 Content type: ${contentType}, Active view: ${activeView}`);

  const renderContent = () => {
    switch (contentType) {
      case 'ai':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            <ReportRenderer reportData={reportData} />
          </div>
        );
      
      case 'astro':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            <AstroDataRenderer 
              swissData={reportData.swiss_data} 
              reportData={reportData}
            />
          </div>
        );
      
      case 'both':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            {activeView === 'astro' ? (
              <AstroDataRenderer 
                swissData={reportData.swiss_data} 
                reportData={reportData}
              />
            ) : (
              <ReportRenderer reportData={reportData} />
            )}
          </div>
        );
      
      default:
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            <div className="text-center text-gray-500">
              <p>No content available for this report.</p>
            </div>
          </div>
        );
    }
  };

  const content = renderContent();
  
  const renderEndTime = performance.now();
  const renderDuration = renderEndTime - renderStartTime;
  console.log(`[ReportContent] ✅ Content rendering completed in ${renderDuration.toFixed(2)}ms`);
  
  return content;
};
