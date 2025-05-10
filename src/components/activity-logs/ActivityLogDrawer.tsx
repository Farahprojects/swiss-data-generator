
import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type ActivityLogItem = {
  id: string;
  created_at: string;
  response_status: number;
  endpoint: string;
  request_type?: string;
  report_tier: string | null;
  total_cost_usd: number;
  processing_time_ms: number | null;
  response_payload?: any;
  request_payload?: any;
  error_message?: string;
  google_geo?: boolean;
};

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logData: ActivityLogItem | null;
}

const ActivityLogDrawer = ({ isOpen, onClose, logData }: ActivityLogDrawerProps) => {
  const [activeTab, setActiveTab] = useState<string>(
    logData?.response_payload?.report ? "report" : "payload"
  );

  // Handle download as CSV
  const handleDownloadCSV = () => {
    if (!logData) return;
    
    // Create CSV content
    const headers = "Timestamp,Status,Endpoint,Report Type,Cost,Processing Time\n";
    const row = [
      new Date(logData.created_at).toLocaleString(),
      logData.response_status,
      logData.endpoint,
      logData.report_tier || 'None',
      logData.total_cost_usd.toFixed(3),
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

  // Determine which tab to show by default
  React.useEffect(() => {
    if (logData) {
      const hasReport = logData.response_payload?.report;
      setActiveTab(hasReport ? "report" : "payload");
    }
  }, [logData]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90vh] max-w-[40vw] mx-auto">
        <DrawerHeader className="flex flex-row items-center justify-between border-b p-4">
          <DrawerTitle className="text-xl">API Log Details</DrawerTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
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
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(logData.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {logData.response_status >= 200 && logData.response_status < 300
                      ? 'Success'
                      : 'Failed'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Endpoint</p>
                  <p className="font-medium">{logData.endpoint}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Report Type</p>
                  <p className="font-medium capitalize">{logData.report_tier || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="font-medium">${logData.total_cost_usd?.toFixed(3) || '0.000'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Time</p>
                  <p className="font-medium">
                    {logData.processing_time_ms 
                      ? `${(logData.processing_time_ms / 1000).toFixed(2)}s` 
                      : 'N/A'}
                  </p>
                </div>
                {logData.error_message && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Error</p>
                    <p className="font-medium text-red-600">{logData.error_message}</p>
                  </div>
                )}
                {logData.google_geo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Geo Lookup</p>
                    <p className="font-medium">Yes</p>
                  </div>
                )}
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger 
                    value="report"
                    disabled={!logData.response_payload?.report}
                  >
                    Report
                  </TabsTrigger>
                  <TabsTrigger 
                    value="payload"
                    disabled={!logData.response_payload && !logData.request_payload}
                  >
                    Payload
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="report" className="mt-4">
                  <ScrollArea className="h-[50vh]">
                    <div className="p-4 bg-gray-50 rounded-md">
                      {logData.response_payload?.report ? (
                        <div>
                          <h3 className="font-medium mb-2">{logData.report_tier?.toUpperCase()} Report</h3>
                          <div className="whitespace-pre-wrap">
                            {logData.response_payload.report}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No report available
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="payload" className="mt-4">
                  <ScrollArea className="h-[50vh]">
                    <div className="p-4 bg-gray-50 rounded-md">
                      {(logData.response_payload || logData.request_payload) ? (
                        <div>
                          {logData.request_payload && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-2">Request Payload</h4>
                              <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto bg-gray-100 p-2 rounded">
                                {JSON.stringify(logData.request_payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {logData.response_payload && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Response Payload</h4>
                              <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto bg-gray-100 p-2 rounded">
                                {JSON.stringify(logData.response_payload, null, 2)}
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
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ActivityLogDrawer;
