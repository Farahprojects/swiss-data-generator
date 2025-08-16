import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatSidebarControls } from './ChatSidebarControls';
import { useReportModal } from '@/contexts/ReportModalContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { uuid } = location.state || {}; // This is the guest_report_id
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { open } = useReportModal();

  useEffect(() => {
    console.log(`[Chat] guestReportId=${uuid}`); // Add precise log
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, uuid]); // Add uuid to dependency array

  const handleFetchCompletion = (error?: string | null) => {
    setIsLoadingReport(false);
    if (error) {
      setReportError(error);
    }
  };

  const openReport = () => {
    console.log(`[ReportModal] open id=${uuid}`); // Add precise log
    setIsLoadingReport(true);
    setReportError(null); // Clear previous errors
    open(uuid, handleFetchCompletion);
  };
  
  const retryFetch = () => {
    setReportError(null);
    openReport();
  }

  return (
    <>
      <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-0">
        {/* Left Sidebar (Desktop) */}
        <div className="hidden md:flex w-64 border-r border-gray-100 p-4 flex-col gap-4 bg-gray-50/50">
          <button
            type="button"
            onClick={openReport}
            disabled={isLoadingReport}
            className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 disabled:opacity-50"
          >
            {isLoadingReport ? 'Loading Report...' : 'View Report'}
          </button>
          <ChatSidebarControls />
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-col flex-1 w-full min-w-0">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2 p-3 bg-white border-b border-gray-100 pt-safe">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className="p-2 rounded-md border border-gray-200 bg-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] sm:max-w-xs p-4">
                <div className="mb-3">
                  <h2 className="text-lg font-light italic">Settings</h2>
                </div>
                <button
                  type="button"
                  onClick={openReport}
                  disabled={isLoadingReport}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 mb-3 disabled:opacity-50"
                >
                  {isLoadingReport ? 'Loading Report...' : 'View Report'}
                </button>
                <ChatSidebarControls />
              </SheetContent>
            </Sheet>
            <div className="flex-1" />
          </div>

          {/* Message List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
            <MessageList />
          </div>

          {/* Footer Area */}
          <div className="pb-safe">
            {error && (
              <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">
                {error}
              </div>
            )}
            <div className="border-t border-gray-100">
              <ChatInput />
            </div>
          </div>

          {/* Conversation Overlay */}
          <ConversationOverlay />
        </div>
      </div>

      {/* Report Modal is now rendered by the provider */}
      <AlertDialog open={!!reportError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error Fetching Report</AlertDialogTitle>
            <AlertDialogDescription>
              We're having issues fetching your data, please try again.
              <br />
              <small className="text-gray-500">{reportError}</small>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportError(null)}>Close</AlertDialogCancel>
            <AlertDialogAction onClick={retryFetch}>Try Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
