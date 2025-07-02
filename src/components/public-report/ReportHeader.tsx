
import React, { useState } from 'react';
import { ArrowLeft, Copy, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ReportHeaderProps {
  customerName: string;
  onBack: () => void;
  onCopyToClipboard: () => void;
  onDownloadPdf: () => void;
  onChatGPTClick: () => void;
  reportPdfData?: string | null;
  isCopyCompleted: boolean;
}

export const ReportHeader = ({
  customerName,
  onBack,
  onCopyToClipboard,
  onDownloadPdf,
  onChatGPTClick,
  reportPdfData,
  isCopyCompleted
}: ReportHeaderProps) => {
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const { toast } = useToast();

  const handleChatGPTClick = async () => {
    if (isCopyCompleted) {
      // User has already copied the report, proceed to ChatGPT
      window.open('https://chatgpt.com/', '_blank');
    } else {
      // User hasn't copied yet, copy the report first
      onCopyToClipboard();
      
      // Show success message for 2 seconds
      toast({
        title: "Report copied!",
        description: "Your report has been copied to clipboard. Redirecting to ChatGPT...",
        duration: 2000,
      });

      // Wait 2 seconds then redirect to ChatGPT
      setTimeout(() => {
        window.open('https://chatgpt.com/', '_blank');
      }, 2000);
    }
  };

  return (
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
              onClick={onCopyToClipboard}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Text
            </Button>
            {reportPdfData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadPdf}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleChatGPTClick}
              className="flex items-center gap-2 font-inter transition-all duration-200 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md"
            >
              <img 
                src="/lovable-uploads/67ed6da3-4beb-4530-be57-881bfb7b0f3f.png" 
                alt="ChatGPT" 
                className="h-4 w-4"
              />
              <span className="font-medium">ChatGPT</span>
            </Button>
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
  );
};
