
import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { useToast } from '@/hooks/use-toast';

interface DesktopReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  onBack: () => void;
}

const DesktopReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  onBack 
}: DesktopReportViewerProps) => {
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

      console.log('📥 PDF download initiated');
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
      });
      
      console.log('📋 Report copied to clipboard');
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
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Form
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Your Report</h1>
                <p className="text-sm text-muted-foreground">Generated for {customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Text
              </Button>
              {reportPdfData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-6 w-6 text-primary" />
              Report Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-lg max-w-none">
              <ReportRenderer content={reportContent} />
            </div>
          </CardContent>
        </Card>

        {/* Actions Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Copy className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Copy Report Text</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Copy your report content to paste into notes, messages, or any app
                  </p>
                </div>
                <Button 
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {reportPdfData && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Download PDF</h3>
                    <p className="text-sm text-muted-foreground mt-1">
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

export default DesktopReportViewer;
