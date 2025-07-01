
import React from 'react';
import { ArrowLeft, Copy, Download, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
              variant={isCopyCompleted ? "default" : "outline"}
              size="sm"
              onClick={onChatGPTClick}
              disabled={!isCopyCompleted}
              className={`flex items-center gap-2 ${
                !isCopyCompleted 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <img 
                src="/lovable-uploads/97523ce9-e477-4fb9-9a9c-f8cf223342c6.png" 
                alt="ChatGPT" 
                className="h-4 w-4"
              />
              ChatGPT
              <ExternalLink className="h-3 w-3" />
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
