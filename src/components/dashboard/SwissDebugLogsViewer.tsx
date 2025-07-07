
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SwissDebugLog {
  id: number;
  timestamp: string;
  api_key: string;
  user_id: string;
  balance_usd: number;
  request_type: string;
  request_payload: any;
  response_status: number;
}

export const SwissDebugLogsViewer = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<SwissDebugLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  const fetchSwissDebugLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("swissdebuglogs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching Swiss debug logs:", error);
        toast.error("Failed to fetch Swiss debug logs");
        setLogs([]);
      } else {
        setLogs(data || []);
        if (data && data.length === 0) {
          toast.info("No Swiss debug logs found.");
        }
      }
    } catch (error) {
      console.error("Error in fetchSwissDebugLogs:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email?.includes('admin')) {
      fetchSwissDebugLogs();
    }
  }, [user]);

  const handleRefresh = () => {
    fetchSwissDebugLogs();
  };

  const toggleExpandLog = (id: number) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const downloadLogs = () => {
    if (logs.length === 0) return;
    
    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `swiss-debug-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user?.email?.includes('admin')) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Swiss API Debug Logs</CardTitle>
            <CardDescription>Recent API calls and responses</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Refreshing...
                </>
              ) : 'Refresh Logs'}
            </Button>
            <Button 
              variant="outline"
              onClick={downloadLogs}
              disabled={logs.length === 0}
              title="Download logs as JSON"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleExpandLog(log.id)}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.api_key?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{log.request_type || "N/A"}</TableCell>
                      <TableCell>
                        <span className={log.response_status >= 400 ? "text-red-500" : "text-green-500"}>
                          {log.response_status}
                        </span>
                      </TableCell>
                      <TableCell>${log.balance_usd?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>
                        {expandedLogs[log.id] ? "▲" : "▼"}
                      </TableCell>
                    </TableRow>
                    {expandedLogs[log.id] && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50">
                          <div className="p-4 space-y-4">
                            <div>
                              <div className="font-semibold mb-1">User ID:</div>
                              <div className="font-mono text-xs bg-gray-100 p-2 rounded">{log.user_id}</div>
                            </div>
                            
                            <div>
                              <div className="font-semibold mb-1">Request Payload:</div>
                              <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap text-xs">
                                {JSON.stringify(log.request_payload, null, 2)}
                              </pre>
                            </div>
                            
                            <div>
                              <div className="font-semibold mb-1">Response Status:</div>
                              <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap text-xs">
                                {log.response_status}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            No Swiss API debug logs found. Make sure the API is receiving requests.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
