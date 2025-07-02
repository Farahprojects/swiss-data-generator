
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [showChatGPTConfirm, setShowChatGPTConfirm] = useState(false);
  const [isCopping, setIsCopping] = useState(false);

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

  const handleChatGPT = () => {
    setShowChatGPTConfirm(true);
  };

  const handleChatGPTCopyAndGo = async () => {
    setIsCopping(true);
    
    try {
      // Clean the HTML content to get plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(cleanText);
      
      // Show "Copied" for 2 seconds
      toast({
        title: "Copied!",
        description: "Report copied to clipboard",
      });
      
      // Wait 2 seconds then redirect
      setTimeout(() => {
        const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(`Please analyze this astrological report and provide additional insights or answer any questions I might have:\n\n${cleanText}`)}`;
        window.open(chatGPTUrl, '_blank');
        setShowChatGPTConfirm(false);
        setIsCopping(false);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
      setIsCopping(false);
      toast({
        title: "Copy failed",
        description: "Unable to copy. Please try manually.",
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

      {/* Report Content - Scrollable with bottom padding for buttons */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ height: 'calc(100vh - 160px)' }}>
        <div className="p-4 pb-20">
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
        </div>
      </div>

      {/* Bottom Action Bar - Thumb-friendly positioning */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-20">
        <Button 
          onClick={handleCopyToClipboard}
          variant="outline"
          className="flex-1 h-12 text-base font-medium border-2 border-primary/20 hover:border-primary/40"
        >
          <Copy className="h-5 w-5 mr-2" />
          Copy
        </Button>
        <Button 
          onClick={handleChatGPT}
          className="flex-1 h-12 text-base font-medium bg-primary hover:bg-primary/90"
        >
          <span className="mr-2 text-lg">🤖</span>
          ChatGPT
        </Button>
      </div>

      {/* ChatGPT Confirmation Dialog */}
      <Dialog open={showChatGPTConfirm} onOpenChange={setShowChatGPTConfirm}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Analyze with ChatGPT</DialogTitle>
            <DialogDescription>
              Ready to get AI insights on your report? We'll copy your report to clipboard and open ChatGPT for analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowChatGPTConfirm(false)}
              className="flex-1"
              disabled={isCopping}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChatGPTCopyAndGo}
              className="flex-1"
              disabled={isCopping}
            >
              {isCopping ? "Copied!" : "Copy & Go"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MobileReportViewer;
