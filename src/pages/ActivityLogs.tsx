
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import Filters from '@/components/activity-logs/Filters';
import LogsTable from '@/components/activity-logs/LogsTable';
import { buildLogQuery, ActivityLogsFilterState } from '@/components/activity-logs/queryBuilder';

// Define the structure of the API activity log entry
type ActivityLog = {
  id: string;
  created_at: string;
  response_status: number;
  request_type: string;
  endpoint?: string;
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
  });
  const isMobile = useIsMobile();
  
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
      const query = buildLogQuery(user.id, filters);
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed header at the top */}
      <div className="sticky top-0 z-50">
        <UnifiedNavigation />
      </div>
      
      {/* Main content area - flexes below the header */}
      <div className="flex flex-grow bg-gray-50 pt-1">
        <div className="flex w-full">
          <SidebarProvider defaultOpen={true}>
            <DashboardSidebar />
            
            <SidebarInset className="p-0 md:p-6">
              <div className="p-4 md:p-0">
                <h1 className="text-2xl font-bold mb-6">Activity Logs</h1>
                
                <Filters filters={filters} onChange={handleFilterChange} />
                
                <LogsTable 
                  logs={logs} 
                  loading={loading}
                  isMobile={isMobile} 
                  onRowClick={openDrawer} 
                />
              </div>
            </SidebarInset>
          </SidebarProvider>
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
