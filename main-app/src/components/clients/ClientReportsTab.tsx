import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, FileText, Trash2, User, Calendar } from 'lucide-react';
import { ActionConfirmDialog } from './ActionConfirmDialog';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ReportData } from '@/utils/reportContentExtraction';
import { formatDate } from '@/utils/dateFormatters';

interface ClientReport {
  id: string;
  request_type: string;
  swiss_data: any;
  created_at: string;
  response_status: number;
  report_tier?: string;
}

interface ClientReportsTabProps {
  clientReports: ClientReport[];
  onCreateReport: () => void;
  onViewReport: (report: ClientReport) => void;
  onDeleteReport: (report: ClientReport) => void;
  client?: { id: string; full_name: string } | null;
}

// Helper function to convert legacy string content to ReportData format
const createLegacyReportData = (content: string): ReportData => {
  return {
    guest_report: {
      id: 'legacy',
      email: '',
      report_type: null,
      is_ai_report: null,
      payment_status: 'completed',
      created_at: new Date().toISOString(),
      report_data: { report: content }
    },
    report_content: content,
    swiss_data: null,
    metadata: {
      has_ai_report: false,
      content_type: 'ai',
      has_swiss_data: false,
      is_ready: true,
      report_type: null
    }
  };
};

const getDisplayName = (report: ClientReport): string => {
  return `#${report.id.substring(0, 8)}`;
};

const formatReportTier = (tier: string | null | undefined): string => {
  if (!tier) return 'Unknown';
  return tier
    .replace(/_/g, ' ')
    .replace(/\breport\b/gi, '')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });
};

const getReportBadgeVariant = (tier: string | null | undefined) => {
  switch (tier?.toLowerCase()) {
    case 'basic_report':
      return 'secondary';
    case 'premium_report':
      return 'default';
    case 'detailed_report':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getReportSummary = (report: ClientReport) => {
  if (!report.swiss_data?.report) return '';
  
  const content = report.swiss_data.report;
  if (typeof content === 'string') {
    // Extract first meaningful paragraph or sentence
    const sentences = content.split('.').filter(s => s.trim().length > 20);
    return sentences[0] ? sentences[0].trim() + '.' : content.substring(0, 150) + '...';
  }
  
  return '';
};

const hasExpandableContent = (report: ClientReport) => {
  if (!report.swiss_data?.report) return false;
  const content = report.swiss_data.report;
  return typeof content === 'string' && content.length > 200;
};

export const ClientReportsTab: React.FC<ClientReportsTabProps> = ({
  clientReports,
  onCreateReport,
  onViewReport,
  onDeleteReport,
  client = null
}) => {
  const [reportToDelete, setReportToDelete] = useState<ClientReport | null>(null);

  const handleDeleteClick = (report: ClientReport) => {
    setReportToDelete(report);
  };

  const handleConfirmDelete = () => {
    if (reportToDelete) {
      onDeleteReport(reportToDelete);
      setReportToDelete(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Reports</h3>
          <Button onClick={onCreateReport}>
            <Plus className="w-4 h-4 mr-2" />
            Add
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
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clientReports.map((report) => {
              const summary = getReportSummary(report);
              const hasContent = hasExpandableContent(report);
              const isSuccess = report.response_status >= 200 && report.response_status < 300;
              
              return (
                <Card key={report.id} className="p-6 hover:shadow-md transition-all duration-200 border border-gray-100">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {getDisplayName(report)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDateForDisplay(report.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isSuccess && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                        <Badge 
                          variant={getReportBadgeVariant(report.report_tier)}
                          className="bg-primary/10 text-primary border-primary/20 font-medium px-3 py-1"
                        >
                          {formatReportTier(report.report_tier)}
                        </Badge>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-3">
                      {summary && (
                        <p className="text-gray-900 leading-relaxed text-base">
                          {summary}
                        </p>
                      )}
                      
                      {/* Expandable Full Report */}
                      {hasContent && isSuccess && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="full-report" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Full Report</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <ReportRenderer 
                                reportData={createLegacyReportData(report.swiss_data.report)}
                                className="text-gray-700"
                              />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReport(report)}
                        disabled={!isSuccess}
                        className="text-gray-600 hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">View Full Report</span>
                      </Button>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(report)}
                            className="text-gray-600 hover:text-destructive hover:bg-destructive/5 p-2 h-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>Delete report</span>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ActionConfirmDialog
          open={!!reportToDelete}
          onOpenChange={(open) => !open && setReportToDelete(null)}
          title="Delete Report"
          description="Are you sure you want to delete this report? This action cannot be undone."
          actionLabel="Delete"
          onConfirm={handleConfirmDelete}
          client={client}
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
};

export default ClientReportsTab;
