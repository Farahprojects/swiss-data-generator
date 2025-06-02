
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ActivityLogItem = {
  id: string;
  created_at: string;
  response_status: number;
  endpoint?: string;
  request_type?: string;
  report_tier: string | null;
  total_cost_usd: number;
  processing_time_ms: number | null;
  response_payload?: any;
  request_payload?: any;
  swiss_payload?: any;
  error_message?: string;
  google_geo?: boolean;
};

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logData: ActivityLogItem | null;
}

const ActivityLogDrawer = ({ isOpen, onClose, logData }: ActivityLogDrawerProps) => {
  const [viewMode, setViewMode] = useState<'report' | 'payload'>('report');

  // Handle download as CSV
  const handleDownloadCSV = () => {
    if (!logData) return;
    
    // Create CSV content
    const headers = "Timestamp,Status,Endpoint/Type,Report Type,Cost,Processing Time\n";
    const row = [
      new Date(logData.created_at).toLocaleString(),
      logData.response_status,
      logData.endpoint || logData.request_type || 'N/A',
      logData.report_tier || 'None',
      logData.total_cost_usd.toFixed(2),
      logData.processing_time_ms ? `${(logData.processing_time_ms / 1000).toFixed(2)}s` : 'N/A'
    ].join(',');
    
    const content = headers + row;
    
    // Create and trigger download
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-log-${logData.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle download as PDF (simplified implementation)
  const handleDownloadPDF = () => {
    if (!logData) return;
    
    // In a real implementation, you would use a library like jsPDF
    // For this example, we'll just show an alert
    alert('PDF download functionality would be implemented with a library like jsPDF');
  };

  // Determine which view to show by default
  useEffect(() => {
    if (logData) {
      const hasReport = logData.response_payload?.report;
      setViewMode(hasReport ? "report" : "payload");
    }
  }, [logData]);

  // Helper function to safely render a report
  const renderReport = (report: any) => {
    // If report is a string, render it directly
    if (typeof report === 'string') {
      return report;
    }
    
    // If report is an object with specific structure, render its content
    if (report && typeof report === 'object') {
      // Handle object with title, content structure
      if ('title' in report && 'content' in report) {
        return (
          <div>
            <h4 className="font-medium mb-2">{report.title}</h4>
            <div className="whitespace-pre-wrap">{report.content}</div>
            {report.generated_at && (
              <p className="text-sm text-muted-foreground mt-2">
                Generated at: {new Date(report.generated_at).toLocaleString()}
              </p>
            )}
          </div>
        );
      }
      
      // If it's some other object, stringify it
      return JSON.stringify(report, null, 2);
    }
    
    return 'No report content available';
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90vh] max-w-[60vw] mx-auto">
        <DrawerHeader className="flex flex-row items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as 'report' | 'payload')}
            >
              <ToggleGroupItem 
                value="report" 
                disabled={!logData?.response_payload?.report}
              >
                Report
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="payload" 
                disabled={!logData?.swiss_payload && !logData?.request_payload}
              >
                Payload
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-normal p-0 h-auto hover:bg-transparent">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                <DropdownMenuItem onClick={handleDownloadCSV}>
                  CSV Format
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  PDF Format
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        <div className="p-4">
          {logData && (
            <div className="mb-4">
              {logData.error_message && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-600">Error</p>
                  <p className="text-red-600">{logData.error_message}</p>
                </div>
              )}
              
              <div className="w-full">
                {viewMode === 'report' && (
                  <ScrollArea className="h-[65vh]">
                    <div className="p-4 bg-gray-50 rounded-md">
                      {logData.response_payload?.report ? (
                        renderReport(logData.response_payload.report)
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No report available
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
                
                {viewMode === 'payload' && (
                  <ScrollArea className="h-[65vh]">
                    <div className="p-4 bg-gray-50 rounded-md">
                      {(logData.swiss_payload || logData.request_payload) ? (
                        <div>
                          {logData.request_payload && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-2">Request Payload</h4>
                              <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto bg-gray-100 p-2 rounded">
                                {JSON.stringify(logData.request_payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {logData.swiss_payload && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Response Payload</h4>
                              <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto bg-gray-100 p-2 rounded">
                                {JSON.stringify(logData.swiss_payload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No payload available
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ActivityLogDrawer;
