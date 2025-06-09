
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { formatDateTime } from '@/utils/dateFormatters';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
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

const getReportTypeLabel = (reportType: string) => {
  const typeMap: { [key: string]: string } = {
    'natal': 'Natal Report',
    'composite': 'Composite Report', 
    'compatibility': 'Compatibility Report',
    'return': 'Solar/Lunar Return',
    'positions': 'Planetary Positions',
    'sync': 'Sync Report',
    'essence': 'Essence Report',
    'flow': 'Flow Report',
    'mindset': 'Mindset Report',
    'monthly': 'Monthly Report',
    'focus': 'Focus Report',
  };
  return typeMap[reportType] || reportType;
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
        <div className="space-y-4">
          {clientReports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {getDisplayName(report)}
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      {getReportTypeLabel(report.request_type)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(report.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {!(report.response_status >= 200 && report.response_status < 300) && (
                      <Badge variant="destructive">
                        failed
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewReport(report)}
                      disabled={!(report.response_status >= 200 && report.response_status < 300)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      View Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
