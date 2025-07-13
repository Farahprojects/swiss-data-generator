import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  X,
  Download,
  Copy as CopyIcon,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

/** ★ Apple‑style colours & corner‑radius */
const IOS_PRIMARY = 'bg-[#0A84FF] hover:bg-[#0066CC] text-white';
const IOS_SURFACE = 'bg-white/80 backdrop-blur-xl';
const IOS_BORDER = 'border border-gray-200/70';

export const ReportViewer = ({ mappedReport, onBack, isMobile = false }: ReportViewerProps) => {
  /* toast */
  const { toast } = useToast();

  /* ChatGPT confirm modal */
  const [showChatGPT, setShowChatGPT] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  /* toggle logic */
  const logic = getToggleDisplayLogic({
    reportContent: mappedReport.reportContent,
    swissData: mappedReport.swissData,
    swissBoolean: mappedReport.swissBoolean,
    hasReport: mappedReport.hasReport,
  });
  const [view, setView] = useState<'report' | 'astro'>(logic.defaultView);

  /* lock to allowed view if toggle hidden */
  useEffect(() => {
    if (!logic.showToggle) setView(logic.defaultView);
  }, [logic.showToggle, logic.defaultView]);

  /* helpers */
  const copyReportPlainText = async () => {
    const temp = document.createElement('div');
    temp.innerHTML = mappedReport.reportContent;
    await navigator.clipboard.writeText(temp.textContent || temp.innerText || '');
  };

  const handlePdfDownload = async () => {
    try {
      if (mappedReport.pdfData) {
        /* use existing PDF */
        const byte = atob(mappedReport.pdfData);
        const arr = new Uint8Array(byte.length);
        for (let i = 0; i < byte.length; i++) arr[i] = byte.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mappedReport.customerName.replace(/\s+/g, '_')}_Report.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        /* generate unified */
        await PdfGenerator.generateUnifiedPdf({
          reportContent: mappedReport.reportContent,
          swissData: mappedReport.swissData,
          customerName: mappedReport.customerName,
          reportPdfData: mappedReport.pdfData,
          reportType: mappedReport.reportType,
        });
      }
      toast({ title: 'PDF downloaded' });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const openChatGPT = async () => {
    try {
      await copyReportPlainText();
      const url = 'https://chat.openai.com/';
      window.open(url, '_blank');
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const MobileHeader = () => (
    <header className={`flex items-center justify-between ${IOS_SURFACE} ${IOS_BORDER} px-4 py-3 sticky top-0 z-50`}>
      <Button variant="ghost" size="icon" onClick={onBack} className="p-2">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {logic.showToggle && (
        <div className="flex rounded-full bg-gray-200 p-1">
          {(['report', 'astro'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={`px-3 py-1 text-sm rounded-full transition-all ${
                view === t ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}
      {mappedReport.pdfData && (
        <Button variant="ghost" size="icon" onClick={handlePdfDownload} className="p-2">
          <Download className="h-5 w-5" />
        </Button>
      )}
    </header>
  );

  const MobileFooter = () => (
    <footer className={`flex justify-around ${IOS_SURFACE} ${IOS_BORDER} px-4 py-4 gap-6 sticky bottom-0 z-50`}>
      <button onClick={copyReportPlainText} className="flex items-center gap-2 text-gray-900 text-base font-medium hover:opacity-75">
        <Paperclip className="h-5 w-5" />
        Copy
      </button>
      <button onClick={() => setShowChatGPT(true)} className="flex items-center gap-2 text-gray-900 text-base font-medium hover:opacity-75">
        <img src={openaiLogo} alt="ChatGPT" className="h-5 w-5" />
        GPT
      </button>
      <button onClick={onBack} className="flex items-center gap-2 text-gray-900 text-base font-medium hover:opacity-75">
        <X className="h-5 w-5" />
        Close
      </button>
    </footer>
  );

  /* ───────────────────────── MOBILE ───────────────────────── */
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6">
          <h1 className="text-xl font-medium mb-4 tracking-tight text-gray-900">
            {logic.title} — Generated for {mappedReport.customerName}
          </h1>
          <ReportContent mappedReport={mappedReport} activeView={view} setActiveView={setView} isMobile />
        </main>
        <MobileFooter />

        {/* ChatGPT Confirmation */}
        <Dialog open={showChatGPT} onOpenChange={setShowChatGPT}>
          <DialogContent className="rounded-3xl p-0 overflow-hidden max-w-sm w-full">
            <DialogHeader className="text-center p-6 space-y-3">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Analyze with <span className="text-[#0A84FF] italic">ChatGPT</span>
              </DialogTitle>
              <DialogDescription>
                We’ll copy your report and switch to ChatGPT. Ready?
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 flex flex-col gap-3">
              <button
                disabled={isCopying}
                onClick={async () => {
                  setIsCopying(true);
                  await copyReportPlainText();
                  setIsCopying(false);
                  setShowChatGPT(false);
                  openChatGPT();
                }}
                className={`rounded-xl py-3 font-medium text-base shadow ${IOS_PRIMARY} disabled:opacity-50`}
              >
                {isCopying ? 'Copying…' : 'Copy & Go'}
              </button>
              <button
                disabled={isCopying}
                onClick={() => setShowChatGPT(false)}
                className="rounded-xl py-3 font-medium text-base bg-gray-100 text-gray-900 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ───────────────────────── DESKTOP ───────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-background min-h-screen"
    >
      {/* Sticky header */}
      <div className={`sticky top-0 z-50 ${IOS_SURFACE} ${IOS_BORDER} backdrop-blur`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {logic.showToggle && (
              <div className="flex bg-gray-200 rounded-full p-1">
                {(['report', 'astro'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setView(t)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                      view === t ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyReportPlainText} className="gap-2">
              <CopyIcon className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdfDownload} className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" onClick={openChatGPT} className={`gap-2 ${IOS_PRIMARY}`}>
              <img src={openaiLogo} alt="ChatGPT" className="h-4 w-4" />
              ChatGPT
            </Button>
            <Button variant="ghost" size="icon" onClick={onBack} className="p-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-medium mb-6 tracking-tight text-gray-900">
          {logic.title} — Generated for {mappedReport.customerName}
        </h1>
        <ReportContent mappedReport={mappedReport} activeView={view} setActiveView={setView} />
      </div>
    </motion.div>
  );
};
