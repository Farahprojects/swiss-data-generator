

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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

const formatReportTier = (tier: string | null | undefined): string => {
  if (!tier) return 'Unknown';
  return tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const ClientReportsTab: React.FC<ClientReportsTabProps> = ({
  clientReports,
  onCreateReport,
  onViewReport
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reports</h3>
        <Button onClick={onCreateReport}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Empty State */}
      {clientReports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-lg text-gray-400 mb-2">No reports generated yet</div>
            <p className="mb-4 text-gray-600">Generate astrological reports for this client</p>
            <Button onClick={onCreateReport}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* Table */}
          <Table className="min-w-full">
            {/* Define explicit column widths so header & body stay aligned */}
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[200px]" />
              <col className="w-[240px]" />
              <col className="w-[160px]" />
            </colgroup>

            {/* Table Head */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] px-0 pl-4 text-left">Date</TableHead>
                <TableHead className="w-[200px] px-0 pl-4 text-left">Name</TableHead>
                <TableHead className="w-[240px] px-0 pl-4 text-left">Reports Type</TableHead>
                <TableHead className="w-[160px] px-0 pl-4 text-left">Actions</TableHead>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody>
              {clientReports.map(report => (
                <TableRow key={report.id}>
                  <TableCell className="w-[120px] px-0 pl-4 py-3 align-middle text-sm text-gray-600">
                    {formatDate(report.created_at)}
                  </TableCell>
                  <TableCell className="w-[200px] px-0 pl-4 py-3 align-middle truncate text-sm font-medium text-gray-900">
                    {getDisplayName(report)}
                  </TableCell>
                  <TableCell className="w-[240px] px-0 pl-4 py-3 align-middle text-sm text-gray-600">
                    {formatReportTier(report.report_tier)}
                  </TableCell>
                  <TableCell className="w-[160px] px-0 pl-4 py-3 align-middle">
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
                        <FileText className="mr-1 h-3 w-3" />
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

