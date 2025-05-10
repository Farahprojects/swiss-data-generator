
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Filter, FileText, BadgeCheck, Badge, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';

type ActivityLogsFilterState = {
  startDate: Date | undefined;
  endDate: Date | undefined;
  reportType: string | null;
  status: string | null;
  search: string;
};

// Define the structure of the API activity log entry
type ActivityLog = {
  id: string;
  created_at: string;
  response_status: number;
  request_type: string;
  endpoint?: string; // Make endpoint optional since it might not exist in translator_logs
  report_tier: string | null;
  total_cost_usd: number;
  processing_time_ms: number | null;
  response_payload?: any;
  request_payload?: any;
  error_message?: string;
  google_geo?: boolean;
};

const ActivityLogs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityLogsFilterState>({
    startDate: undefined,
    endDate: undefined,
    reportType: null,
    status: null,
    search: '',
  });
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Function to open the drawer with a specific log
  const openDrawer = (log: ActivityLog) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  // Function to load logs from the database
  const loadLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      let query = supabase
        .from('translator_logs')
        .select(`
          *,
          api_usage!translator_log_id(total_cost_usd)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        // Set time to end of day for endDate
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }
      
      if (filters.reportType) {
        query = query.eq('report_tier', filters.reportType);
      }
      
      if (filters.status) {
        // Convert the text status to a number
        const statusCode = filters.status === 'success' ? 200 : 
                          filters.status === 'failed' ? 400 : null;
        if (statusCode && statusCode === 200) {
          query = query.eq('response_status', statusCode);
        } else if (statusCode && statusCode === 400) {
          query = query.or('response_status.gt.399,response_status.lt.600');
        }
      }
      
      if (filters.search) {
        // This is a simplified search - in a real implementation you'd need to 
        // check if the database supports full-text search or adjust accordingly
        query = query.or(`request_type.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching logs:", error);
        return;
      }

      // Process the data to match the ActivityLog type
      const processedData: ActivityLog[] = data?.map(item => {
        return {
          id: item.id,
          created_at: item.created_at,
          response_status: item.response_status || 0,
          // Use request_type as the endpoint display value 
          // since endpoint doesn't exist in translator_logs
          endpoint: item.request_type || 'unknown',
          request_type: item.request_type || '',
          report_tier: item.report_tier,
          total_cost_usd: item.api_usage?.[0]?.total_cost_usd || 0,
          processing_time_ms: item.processing_time_ms,
          response_payload: item.response_payload,
          request_payload: item.request_payload,
          error_message: item.error_message,
          google_geo: item.google_geo
        };
      }) || [];
      
      setLogs(processedData);
    } catch (err) {
      console.error("Unexpected error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load logs when component mounts or filters change
  useEffect(() => {
    loadLogs();
  }, [user, filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof ActivityLogsFilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <UiBadge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
          <Check className="mr-1 h-3 w-3" /> Success
        </UiBadge>
      );
    } else {
      return (
        <UiBadge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
          <X className="mr-1 h-3 w-3" /> Failed
        </UiBadge>
      );
    }
  };

  // Helper function to check if a log is failed
  const isFailedLog = (status: number): boolean => {
    return status >= 400;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">API Activity Logs</h1>
          
          {/* Filters Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Date Range Picker */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.startDate ? (
                          filters.endDate ? (
                            <>
                              {format(filters.startDate, 'PPP')} - {format(filters.endDate, 'PPP')}
                            </>
                          ) : (
                            format(filters.startDate, 'PPP')
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <ScrollArea className="h-[300px]">
                        <div className="p-3">
                          <div className="mb-3">
                            <div className="text-sm font-medium mb-1">Start Date</div>
                            <CalendarComponent
                              mode="single"
                              selected={filters.startDate}
                              onSelect={(date) => handleFilterChange('startDate', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">End Date</div>
                            <CalendarComponent
                              mode="single"
                              selected={filters.endDate}
                              onSelect={(date) => handleFilterChange('endDate', date)}
                              disabled={(date) => filters.startDate ? date < filters.startDate : false}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </div>
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Report Type Dropdown */}
              <div className="w-full md:w-[180px]">
                <Select
                  value={filters.reportType || ""}
                  onValueChange={(value) => handleFilterChange('reportType', value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <FileText className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="essence">Essence</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="mindset">Mindset</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="spiritual">Spiritual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status Dropdown */}
              <div className="w-full md:w-[180px]">
                <Select
                  value={filters.status || ""}
                  onValueChange={(value) => handleFilterChange('status', value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Search Field */}
              <div className="w-full md:w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Activity Logs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <p>Loading activity logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <p>No activity logs found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Endpoint</th>
                      <th className="px-4 py-3 text-left">Report Type</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-right">Processing Time</th>
                      <th className="px-4 py-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {log.created_at ? 
                            format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss') : 
                            'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {renderStatusBadge(log.response_status)}
                        </td>
                        <td className="px-4 py-3">
                          {isFailedLog(log.response_status) ? (
                            <span className="text-gray-400">None</span>
                          ) : (
                            <span className="font-medium cursor-pointer text-primary hover:underline" 
                              onClick={() => openDrawer(log)}>
                              {log.request_type}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isFailedLog(log.response_status) ? (
                            <span className="text-gray-400">None</span>
                          ) : log.report_tier ? (
                            <span className="capitalize text-primary hover:underline cursor-pointer" 
                              onClick={() => openDrawer(log)}>
                              {log.report_tier}
                            </span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ${log.total_cost_usd?.toFixed(3) || '0.000'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {log.processing_time_ms ? 
                            `${(log.processing_time_ms / 1000).toFixed(2)}s` : 
                            'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isFailedLog(log.response_status) ? (
                            <span className="text-gray-400">None</span>
                          ) : (
                            <div className="flex justify-center items-center space-x-2">
                              {log.response_payload?.report && (
                                <Button
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-primary hover:text-primary/80 p-1 h-auto"
                                  onClick={() => openDrawer(log)}
                                >
                                  <Badge className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Report</span>
                                </Button>
                              )}
                              {log.response_payload && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-primary hover:text-primary/80 p-1 h-auto" 
                                  onClick={() => openDrawer(log)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Payload</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Drawer for displaying log details */}
      <ActivityLogDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logData={selectedLog}
      />
      
      <Footer />
    </div>
  );
};

export default ActivityLogs;
