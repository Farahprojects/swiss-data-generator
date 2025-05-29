
import React, { useState, useEffect } from 'react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type Report = {
  id: string;
  created_at: string;
  request_type: string;
  report_tier: string | null;
  response_payload?: any;
  request_payload?: any;
  error_message?: string;
  response_status: number;
  processing_time_ms: number | null;
  google_geo?: boolean;
  total_cost_usd: number;
};

const ReportsPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const openDrawer = (report: Report) => {
    setSelectedReport(report);
    setDrawerOpen(true);
  };

  const loadReports = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('translator_logs')
        .select(`
          *,
          api_usage!translator_log_id(total_cost_usd)
        `)
        .eq('user_id', user.id)
        .gte('response_status', 200)
        .lt('response_status', 300)
        .not('report_tier', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching reports:", error);
        return;
      }

      const processedData: Report[] = data?.map(item => ({
        id: item.id,
        created_at: item.created_at,
        response_status: item.response_status || 0,
        request_type: item.request_type || '',
        report_tier: item.report_tier,
        total_cost_usd: item.api_usage?.[0]?.total_cost_usd || 0,
        processing_time_ms: item.processing_time_ms,
        response_payload: item.response_payload,
        request_payload: item.request_payload,
        error_message: item.error_message,
        google_geo: item.google_geo
      })) || [];
      
      setReports(processedData);
    } catch (err) {
      console.error("Unexpected error loading reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const formatReportName = (type: string | null, tier: string | null): string => {
    if (!type && !tier) return 'Unknown Report';
    if (tier) {
      return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() + ' Report';
    }
    return type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Report';
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50">
        <UnifiedNavigation />
      </div>
      
      <div className="flex flex-grow bg-gray-50 pt-1">
        <div className="flex w-full">
          <DashboardSidebar />
          
          <SidebarInset className="p-0 md:p-6">
            <div className="p-4 md:p-0">
              <h1 className="text-2xl font-bold mb-6">Reports</h1>
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <p>Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-8 text-center">
                    <p>No reports found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Report Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reports.map((report) => (
                          <tr 
                            key={report.id} 
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => openDrawer(report)}
                          >
                            <td className="px-4 py-3">
                              {report.created_at ? 
                                format(new Date(report.created_at), 'MMM d, yyyy HH:mm:ss') : 
                                'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-primary hover:underline">
                                {formatReportName(report.request_type, report.report_tier)}
                              </span>
                            </td>
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
      
      <ActivityLogDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logData={selectedReport}
      />
      
      <Footer />
    </div>
  );
};

export default ReportsPage;
