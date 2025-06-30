
import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';

interface MobileReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  onBack: () => void;
}

const MobileReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  onBack 
}: MobileReportViewerProps) => {
  const handleDownloadPdf = () => {
    if (!reportPdfData) {
      console.warn('No PDF data available for download');
      return;
    }

    try {
      // Create blob from base64 data
      const byteCharacters = atob(reportPdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customerName.replace(/\s+/g, '_')}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('📥 PDF download initiated');
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Your Report</h2>
          <p className="text-sm text-gray-600">Generated for {customerName}</p>
        </div>
        {reportPdfData && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        )}
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Report Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportRenderer content={reportContent} />
          </CardContent>
        </Card>

        {/* Download Section */}
        {reportPdfData && (
          <Card className="mt-4 border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Download PDF</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Save your report as a PDF for offline reading
                  </p>
                </div>
                <Button 
                  onClick={handleDownloadPdf}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

export default MobileReportViewer;
