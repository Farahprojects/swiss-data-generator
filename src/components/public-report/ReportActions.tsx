
import React from 'react';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-200 ${
              isCopyCompleted ? 'bg-[#10A37F]/10' : 'bg-gray-100'
            }`}>
              <img 
                src="/lovable-uploads/67ed6da3-4beb-4530-be57-881bfb7b0f3f.png" 
                alt="ChatGPT" 
                className={`h-6 w-6 transition-opacity duration-200 ${!isCopyCompleted ? 'opacity-50' : ''}`}
              />
            </div>
            <div>
              <h3 className={`font-semibold transition-colors duration-200 ${isCopyCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                Analyze with ChatGPT
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isCopyCompleted 
                  ? 'Paste your copied report into our specialized ChatGPT for deeper insights'
                  : 'Copy your report first to unlock ChatGPT analysis'
                }
              </p>
            </div>
            <Button 
              onClick={onChatGPTClick}
              disabled={!isCopyCompleted}
              className={`w-full transition-all duration-200 ${
                isCopyCompleted 
                  ? 'bg-[#10A37F] hover:bg-[#0D8A6B] text-white border-[#10A37F] shadow-sm hover:shadow-md' 
                  : 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
              }`}
            >
              <img 
                src="/lovable-uploads/67ed6da3-4beb-4530-be57-881bfb7b0f3f.png" 
                alt="ChatGPT" 
                className="h-4 w-4 mr-2"
              />
              ChatGPT
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
