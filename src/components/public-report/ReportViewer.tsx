// ✅ Apple-polished Mobile Layout — updated per user specs

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, ArrowLeft, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ReportContent } from './ReportContent';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';
import { MappedReport } from '@/types/mappedReport';
import openaiLogo from '@/assets/openai-logo.png';

interface ReportViewerProps {
  mappedReport: MappedReport;
  onBack: () => void;
  isMobile?: boolean;
}

export const ReportViewer = ({ mappedReport, onBack, isMobile = false }: ReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  const [showChatGPTConfirm, setShowChatGPTConfirm] = useState(false);
  const [isCopping, setIsCopping] = useState(false);

  const reportAnalysisData = {
    reportContent: mappedReport.reportContent,
    swissData: mappedReport.swissData,
    swissBoolean: mappedReport.swissBoolean,
    hasReport: mappedReport.hasReport,
  };
  const toggleLogic = getToggleDisplayLogic(reportAnalysisData);
  const [activeView, setActiveView] = useState<'report' | 'astro'>(toggleLogic.defaultView);

  useEffect(() => {
    if (!toggleLogic.showToggle) {
      setActiveView(toggleLogic.defaultView);
    }
  }, [toggleLogic.showToggle, toggleLogic.defaultView]);

  const handleCopyToClipboard = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = mappedReport.reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      await navigator.clipboard.writeText(cleanText);
      setIsCopyCompleted(true);
      toast({ title: 'Copied!', description: 'Report copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', description: 'Try copying manually.', variant: 'destructive' });
    }
  };

  const handleChatGPT = () => {
    if (isMobile) setShowChatGPTConfirm(true);
    else handleChatGPTDesktop();
  };

  const handleChatGPTDesktop = async () => {
    if (!isCopyCompleted) await handleCopyToClipboard();
    window.open('https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai', '_blank');
  };

  const handleChatGPTCopyAndGo = async () => {
    setIsCopping(true);
    await handleCopyToClipboard();
    setTimeout(() => {
      const cleanText = mappedReport.reportContent.replace(/<[^>]+>/g, '');
      const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(`Please analyze this astrological report:\n\n${cleanText}`)}`;
      window.open(chatGPTUrl, '_blank');
      setShowChatGPTConfirm(false);
      setIsCopping(false);
    }, 1200);
  };

  const handleDownloadPdf = () => {
    if (!mappedReport.pdfData) return;
    const byteCharacters = atob(mappedReport.pdfData);
    const byteArray = new Uint8Array([...byteCharacters].map(c => c.charCodeAt(0)));
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mappedReport.customerName.replace(/\s+/g, '_')}_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 👉 Apple-polished Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Unified Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b bg-white shadow-sm">
          <Button variant="ghost" size="icon" onClick={onBack} className="p-2 hover:bg-gray-100">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Button>
          {toggleLogic.showToggle && (
            <div className="flex space-x-2 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveView('report')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeView === 'report' ? 'bg-white text-black shadow' : 'text-gray-600 hover:text-black'
                }`}
              >
                Report
              </button>
              <button
                onClick={() => setActiveView('astro')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeView === 'astro' ? 'bg-white text-black shadow' : 'text-gray-600 hover:text-black'
                }`}
              >
                Astro
              </button>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleDownloadPdf} className="p-2 hover:bg-gray-100">
            <Download className="h-5 w-5 text-gray-700" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h1 className="text-xl font-light text-gray-900 mb-4">
            {toggleLogic.title} — Generated for {mappedReport.customerName}
          </h1>
          <ReportContent 
            mappedReport={mappedReport}
            activeView={activeView}
            setActiveView={setActiveView}
            isMobile
          />
        </div>

        {/* Footer with 2 buttons */}
        <div className="px-6 py-4 border-t bg-white shadow-md flex justify-center gap-6">
          <Button variant="ghost" onClick={handleCopyToClipboard} className="text-gray-700 text-base font-medium hover:text-black">
            <Paperclip className="h-5 w-5 mr-1" /> Copy
          </Button>
          <Button variant="ghost" onClick={handleChatGPT} className="text-gray-700 text-base font-medium hover:text-black">
            <img src={openaiLogo} alt="ChatGPT" className="h-5 w-5 mr-1" /> GPT
          </Button>
        </div>

        {/* Confirmation Popup */}
        <Dialog open={showChatGPTConfirm} onOpenChange={setShowChatGPTConfirm}>
          <DialogContent className="mx-4 rounded-2xl max-w-sm w-full p-0 shadow-xl">
            <div className="bg-white">
              <DialogHeader className="text-center px-6 pt-8 pb-4 space-y-3">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Analyze with <span className="italic text-primary">ChatGPT</span>
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  We'll copy your report to clipboard and open ChatGPT for you.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6">
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleChatGPTCopyAndGo}
                    className="w-full bg-black text-white py-3 rounded-xl text-base font-medium hover:bg-gray-900 transition active:scale-95 shadow"
                    disabled={isCopping}
                  >
                    {isCopping ? 'Copied!' : 'Copy & Go'}
                  </button>
                  <button
                    onClick={() => setShowChatGPTConfirm(false)}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl text-base font-medium hover:bg-gray-200 transition active:scale-95"
                    disabled={isCopping}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null; // Desktop untouched in this snippet
};
