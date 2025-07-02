
import React, { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ReportActionsProps {
  onCopyToClipboard: () => void;
  onDownloadPdf: () => void;
  onChatGPTClick: () => void;
  reportPdfData?: string | null;
  isCopyCompleted: boolean;
}

export const ReportActions = ({
  onCopyToClipboard,
  onDownloadPdf,
  onChatGPTClick,
  reportPdfData,
  isCopyCompleted
}: ReportActionsProps) => {
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
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
              onClick={onCopyToClipboard}
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
                onClick={onDownloadPdf}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-200 bg-gray-100">
              <img 
                src="/lovable-uploads/67ed6da3-4beb-4530-be57-881bfb7b0f3f.png" 
                alt="ChatGPT" 
                className="h-6 w-6"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Analyze with ChatGPT</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isCopyCompleted 
                  ? 'Open ChatGPT to analyze your copied report'
                  : 'Copy your report and open ChatGPT for deeper insights'
                }
              </p>
            </div>
            <Button 
              onClick={handleChatGPTClick}
              className="w-full font-inter transition-all duration-200 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md"
            >
              <img 
                src="/lovable-uploads/67ed6da3-4beb-4530-be57-881bfb7b0f3f.png" 
                alt="ChatGPT" 
                className="h-4 w-4 mr-2"
              />
              <span className="font-medium">ChatGPT</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
