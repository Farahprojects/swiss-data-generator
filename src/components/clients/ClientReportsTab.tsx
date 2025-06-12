
import React, { useState } from 'react';
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
import { Plus, FileText, ChevronUp, ChevronDown } from 'lucide-react';
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

type SortField = 'created_at' | 'report_name' | 'report_tier';
type SortDirection = 'asc' | 'desc';

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
  // Remove "Report" from the tier name and format
  return tier
    .replace(/_/g, ' ')
    .replace(/\breport\b/gi, '')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

const formatDateForMobile = (dateString: string): string => {
  const date = new Date(dateString);
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${monthShort} ${day}`;
};

export const ClientReportsTab: React.FC<ClientReportsTabProps> = ({
  clientReports,
  onCreateReport,
  onViewReport
}) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const sortedReports = [...clientReports].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'report_name':
        aValue = getDisplayName(a).toLowerCase();
        bValue = getDisplayName(b).toLowerCase();
        break;
      case 'report_tier':
        aValue = formatReportTier(a.report_tier).toLowerCase();
        bValue = formatReportTier(b.report_tier).toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reports</h3>
        <Button onClick={onCreateReport}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Empty State */}
      {clientReports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-lg text-muted-foreground mb-2">No reports generated yet</div>
            <p className="mb-4 text-muted-foreground">Generate astrological reports for this client</p>
            <Button onClick={onCreateReport}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50 text-left"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50 hidden md:table-cell text-left"
                  onClick={() => handleSort('report_name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {getSortIcon('report_name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50 text-left"
                  onClick={() => handleSort('report_tier')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {getSortIcon('report_tier')}
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-left">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedReports.map(report => (
                <TableRow key={report.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm text-muted-foreground text-left">
                    <span className="hidden md:inline">{formatDate(report.created_at)}</span>
                    <span className="md:hidden">{formatDateForMobile(report.created_at)}</span>
                  </TableCell>
                  <TableCell className="font-medium hidden md:table-cell text-left">
                    {getDisplayName(report)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-left">
                    {formatReportTier(report.report_tier)}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2">
                      {!(report.response_status >= 200 && report.response_status < 300) && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReport(report)}
                        disabled={!(report.response_status >= 200 && report.response_status < 300)}
                        className="text-primary hover:text-primary/80 hover:bg-primary/10 p-2 h-auto"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ClientReportsTab;
