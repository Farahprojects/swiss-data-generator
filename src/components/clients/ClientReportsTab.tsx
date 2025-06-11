

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText } from 'lucide-react';
import { formatDate } from '@/utils/dateFormatters';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
  report_tier?: string;
}

interface ClientReportsTabProps {
  clientReports: ClientReport[];
  onCreateReport: () => void;
  onViewReport: (report: ClientReport) => void;
}

const getDisplayName = (report: ClientReport): string => {
  if (report.report_name) {
    const cleanName = report.report_name
      .split(' - ')[0]
      .split(' | ')[0]
      .split(' (')[0]
      .trim();
    
    return cleanName || `#${report.id.substring(0, 8)}`;
  }
  return `#${report.id.substring(0, 8)}`;
};

const formatReportTier = (tier: string | null): string => {
  if (!tier) return 'Unknown';
  // Replace underscores with spaces and capitalize properly
  return tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const ClientReportsTab: React.FC<ClientReportsTabProps> = ({
  clientReports,
  onCreateReport,
  onViewReport
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reports</h3>
        <Button onClick={onCreateReport}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {clientReports.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-2">No reports generated yet</div>
              <p className="text-gray-600 mb-4">Generate astrological reports for this client</p>
              <Button onClick={onCreateReport}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Report Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(report.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {getDisplayName(report)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {formatReportTier(report.report_tier)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!(report.response_status >= 200 && report.response_status < 300) && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewReport(report)}
                        disabled={!(report.response_status >= 200 && report.response_status < 300)}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default ClientReportsTab;

