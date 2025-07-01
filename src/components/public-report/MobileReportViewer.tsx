
import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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

      
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      // Clean the HTML content to get plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(cleanText);
      
      toast({
        title: "Copied to clipboard!",
        description: "Your report has been copied and is ready to paste anywhere.",
        variant: "success"
      });
      
      
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try selecting and copying the text manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10 flex-shrink-0">
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
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
      </div>

      {/* Report Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="p-4">
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

          {/* Copy to Clipboard Section */}
          <Card className="mt-4 border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Copy className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Copy Report Text</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Copy your report content to paste into notes, messages, or any app
                  </p>
                </div>
                <Button 
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Report to Clipboard
                </Button>
              </div>
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
      </div>
    </motion.div>
  );
};

export default MobileReportViewer;
