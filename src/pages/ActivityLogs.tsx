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
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

// Define the filter state type
type ActivityLogsFilterState = {
  startDate?: Date;
  endDate?: Date;
  reportType: string | null;
  status: string | null;
  search: string;
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
  const isMobile = useIsMobile();
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Function to open the drawer with a specific log
  const openDrawer = (log: ActivityLog) => {
    console.log('Opening drawer for log:', log.id, log.request_type); // Debug logging
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  // Handle click with event propagation
  const handleLogClick = (e: React.MouseEvent, log: ActivityLog) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Log clicked:', log.id); // Debug logging
    openDrawer(log);
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

  // Render status icon with tooltip
  const renderStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-white">
              <p>Success</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
                <X className="h-4 w-4 text-red-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-white">
              <p>Failed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  // Helper function to check if a log is failed
  const isFailedLog = (status: number): boolean => {
    return status >= 400;
  };

  // Helper function to check if a log has a valid report
  const hasValidReport = (log: ActivityLog): boolean => {
    return !!log.report_tier && !isFailedLog(log.response_status);
  };

  // Format the type value with proper capitalization and consistent display
  const formatTypeValue = (type: string | null): string => {
    if (!type) return 'None';
    // Ensure first letter is capitalized
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed header at the top */}
      <div className="sticky top-0 z-50">
        <UnifiedNavigation />
      </div>
      
      {/* Main content area - flexes below the header */}
      <div className="flex flex-grow bg-gray-50 pt-1">
        <div className="flex w-full">
          <DashboardSidebar />
          
          <SidebarInset className="p-0 md:p-6">
            <div className="p-4 md:p-0">
              <h1 className="text-2xl font-bold mb-6">API Activity Logs</h1>
              
              {/* Filters Bar - Mobile Friendly */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-col gap-4">
                  {/* Date Range Picker */}
                  <div className="flex-1">
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
                  
                  {/* Responsive grid for filter controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Report Type Dropdown */}
                    <div>
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
                    <div>
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
                    <div className="sm:col-span-2 md:col-span-1">
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
              </div>
              
              {/* Activity Logs Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-right">Cost</th>
                          {/* Hide Time column on mobile */}
                          {!isMobile && (
                            <th className="px-4 py-3 text-right">Time</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {logs.map((log) => (
                          <tr 
                            key={log.id} 
                            className="group hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              {log.created_at ? 
                                format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss') : 
                                'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              {renderStatusIcon(log.response_status)}
                            </td>
                            <td 
                              className="px-4 py-3 cursor-pointer relative"
                              onClick={(e) => handleLogClick(e, log)}
                            >
                              <div className="flex flex-col space-y-1">
                                <div className="font-medium text-primary hover:underline text-sm transition-colors">
                                  {formatTypeValue(log.request_type)}
                                </div>
                                {log.report_tier && (
                                  <div className="text-sm text-primary hover:underline transition-colors">
                                    {formatTypeValue(log.report_tier)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              ${log.total_cost_usd?.toFixed(2) || '0.00'}
                            </td>
                            {/* Hide Time column on mobile */}
                            {!isMobile && (
                              <td className="px-4 py-3 text-right">
                                {log.processing_time_ms ? 
                                  `${(log.processing_time_ms / 1000).toFixed(2)}s` : 
                                  'N/A'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
      
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
