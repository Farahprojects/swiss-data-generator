
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import ReportsFilter from '@/components/reports/ReportsFilter';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Report = {
  id: string;
  created_at: string;
  request_type: string;
  report_tier: string | null;
  report_name: string | null;
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
        .from('translator_logs')
        .select(`
          *,
          api_usage!translator_log_id(total_cost_usd)
        `)
        .eq('user_id', user.id)
        .gte('response_status', 200)
        .lt('response_status', 300)
        .or('report_tier.not.is.null,report_name.not.is.null')
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
        report_name: item.report_name,
        total_cost_usd: item.api_usage?.[0]?.total_cost_usd || 0,
        processing_time_ms: item.processing_time_ms,
        response_payload: item.response_payload,
        request_payload: item.request_payload,
        error_message: item.error_message,
        google_geo: item.google_geo
      })) || [];
      
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
      filtered = filtered.filter(report => report.report_tier === reportType);
    }

    // Filter by search term (report name or ID)
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filtered = filtered.filter(report => {
        const reportName = report.report_name?.toLowerCase() || '';
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
    // Replace underscores with spaces and capitalize properly
    return tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Generate a clean report identifier when no name is stored
  const generateReportId = (report: Report): string => {
    const shortId = report.id.substring(0, 8);
    return `#${shortId}`;
  };

  const getDisplayName = (report: Report): string => {
    if (report.report_name) {
      // Remove any descriptive text after delimiters like " - ", " | ", etc.
      const cleanName = report.report_name
        .split(' - ')[0]  // Remove everything after " - "
        .split(' | ')[0]  // Remove everything after " | "
        .split(' (')[0]   // Remove everything after " ("
        .trim();
      
      return cleanName || generateReportId(report);
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
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500">Report Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500">Report Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500 text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {filteredReports.map((report) => (
                  <TableRow 
                    key={report.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDrawer(report)}
                  >
                    <TableCell className="py-3">
                      {report.created_at ? 
                        format(new Date(report.created_at), 'MMM d, yyyy HH:mm') : 
                        'N/A'}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-medium text-gray-900">
                        {getDisplayName(report)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-medium text-primary hover:underline">
                        {formatReportTier(report.report_tier)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm">
                      ${report.total_cost_usd?.toFixed(2) || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
