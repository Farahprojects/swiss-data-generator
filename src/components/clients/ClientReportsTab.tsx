
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, FileText, ChevronRight, User, Calendar } from 'lucide-react';
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
  if (!report.response_payload?.report) return 'Report generated successfully';
  
  const content = report.response_payload.report;
  if (typeof content === 'string') {
    // Extract first meaningful paragraph or sentence
    const sentences = content.split('.').filter(s => s.trim().length > 20);
    return sentences[0] ? sentences[0].trim() + '.' : content.substring(0, 150) + '...';
  }
  
  return 'Report generated successfully';
};

const hasExpandableContent = (report: ClientReport) => {
  if (!report.response_payload?.report) return false;
  const content = report.response_payload.report;
  return typeof content === 'string' && content.length > 200;
};

export const ClientReportsTab: React.FC<ClientReportsTabProps> = ({
  clientReports,
  onCreateReport,
  onViewReport
}) => {
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
                      <p className="text-gray-900 leading-relaxed text-base">
                        {summary}
                      </p>
                      
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
                              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {report.response_payload.report}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewReport(report)}
                              disabled={!isSuccess}
                              className="text-gray-600 hover:text-primary hover:bg-primary/5 p-2 h-auto"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>View report details</span>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReport(report)}
                        disabled={!isSuccess}
                        className="text-gray-600 hover:text-primary hover:bg-primary/5 group"
                      >
                        <span className="text-sm">View Full Report</span>
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ClientReportsTab;
