
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import ReportsFilter from '@/components/reports/ReportsFilter';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type Report = {
  id: string;
  created_at: string;
  report_type: string;
  report_text: string | null;
  swiss_payload?: any;
  error_message?: string;
  endpoint: string;
  api_key: string;
  user_id: string;
  duration_ms: number | null;
  status: string;
};

const ReportsPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Filter states
  const [reportType, setReportType] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const openDrawer = (report: Report) => {
    setSelectedReport(report);
    setDrawerOpen(true);
  };

  const loadReports = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('report_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'success')
        .not('report_text', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching reports:", error);
        return;
      }

      const processedData: Report[] = data?.map(item => ({
        id: item.id,
        created_at: item.created_at,
        report_type: item.report_type || '',
        report_text: item.report_text,
        swiss_payload: item.swiss_payload,
        error_message: item.error_message,
        endpoint: item.endpoint,
        api_key: item.api_key,
        user_id: item.user_id,
        duration_ms: item.duration_ms,
        status: item.status
      })) || [];
      
      console.log('Fetched reports:', processedData);
      setReports(processedData);
      setFilteredReports(processedData);
    } catch (err) {
      console.error("Unexpected error loading reports:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on current filter states
  useEffect(() => {
    let filtered = [...reports];

    // Filter by report type
    if (reportType) {
      filtered = filtered.filter(report => report.report_type === reportType);
    }

    // Filter by search term (report name or ID)
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filtered = filtered.filter(report => {
        const reportName = report.report_text?.toLowerCase() || '';
        const reportId = report.id.toLowerCase();
        const shortId = report.id.substring(0, 8).toLowerCase();
        
        return reportName.includes(searchTerm) || 
               reportId.includes(searchTerm) || 
               shortId.includes(searchTerm);
      });
    }

    setFilteredReports(filtered);
  }, [reports, reportType, search]);

  useEffect(() => {
    loadReports();
  }, [user]);

  const formatReportTier = (tier: string | null): string => {
    if (!tier) return 'Unknown';
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  };

  // Generate a clean report identifier when no name is stored
  const generateReportId = (report: Report): string => {
    const shortId = report.id.substring(0, 8);
    return `#${shortId}`;
  };

  const getDisplayName = (report: Report): string => {
    if (report.report_text) {
      // Extract first line or first 50 characters as a name
      const firstLine = report.report_text.split('\n')[0];
      if (firstLine.length > 50) {
        return firstLine.substring(0, 47) + '...';
      }
      return firstLine || generateReportId(report);
    }
    return generateReportId(report);
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      
      <ReportsFilter
        reportType={reportType}
        search={search}
        onReportTypeChange={setReportType}
        onSearchChange={setSearch}
      />
      
      {loading ? (
        <div className="p-8 text-center">
          <p>Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-8 text-center">
          <p>{reports.length === 0 ? 'No reports found.' : 'No reports match your current filters.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Report Name</th>
                  <th className="px-4 py-3 text-left">Report Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReports.map((report) => (
                  <tr 
                    key={report.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDrawer(report)}
                  >
                    <td className="px-4 py-3">
                      {report.created_at ? 
                        format(new Date(report.created_at), 'MMM d, yyyy HH:mm') : 
                        'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {getDisplayName(report)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary hover:underline">
                        {formatReportTier(report.report_type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <ActivityLogDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logData={selectedReport}
      />
    </>
  );
};

export default ReportsPage;
