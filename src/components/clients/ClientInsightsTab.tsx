import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, FileText, Edit2, Check, X, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/dateFormatters';
import { InsightEntry, Client } from '@/types/database';
import { GenerateInsightModal } from './GenerateInsightModal';
import { insightsService } from '@/services/insights';
import { useToast } from '@/hooks/use-toast';

interface ClientInsightsTabProps {
  insightEntries?: InsightEntry[];
  client?: Client;
  journalEntries?: Array<{
    id: string;
    title?: string;
    entry_text: string;
    created_at: string;
  }>;
  onInsightGenerated?: () => void;
  onViewInsight?: (insight: InsightEntry) => void;
}

const formatDateForMobile = (dateString: string): string => {
  const date = new Date(dateString);
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${monthShort} ${day}`;
};

const getInsightTypeLabel = (type: string) => {
  const typeMap: { [key: string]: string } = {
    'pattern': 'Pattern',
    'recommendation': 'Recommendation',
    'trend': 'Trend',
    'milestone': 'Milestone'
  };
  return typeMap[type] || type;
};

const getInsightBadgeVariant = (type: string) => {
  switch (type) {
    case 'pattern':
      return 'default';
    case 'recommendation':
      return 'secondary';
    case 'trend':
      return 'outline';
    case 'milestone':
      return 'default';
    default:
      return 'secondary';
  }
};

export const ClientInsightsTab: React.FC<ClientInsightsTabProps> = ({
  insightEntries = [],
  client,
  journalEntries = [],
  onInsightGenerated,
  onViewInsight
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [editSummaryValue, setEditSummaryValue] = useState('');
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateInsight = () => {
    if (!client) return;
    setShowGenerateModal(true);
  };

  const handleInsightGenerated = () => {
    if (onInsightGenerated) {
      onInsightGenerated();
    }
  };

  const handleViewInsight = (insight: InsightEntry) => {
    if (onViewInsight) {
      onViewInsight(insight);
    }
  };

  const handleDeleteInsight = async (insightId: string) => {
    try {
      setDeletingInsightId(insightId);
      await insightsService.deleteInsight(insightId);
      toast({
        title: "Success",
        description: "Insight deleted successfully.",
      });
      if (onInsightGenerated) {
        onInsightGenerated();
      }
    } catch (error) {
      console.error('Error deleting insight:', error);
      toast({
        title: "Error",
        description: "Failed to delete insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingInsightId(null);
    }
  };

  const handleEditSummary = (insight: InsightEntry) => {
    setEditingSummary(insight.id);
    // For now, use the first line of content as summary or create a placeholder
    const summary = insight.content.split('\n')[0].substring(0, 100) + '...';
    setEditSummaryValue(summary);
  };

  const handleSaveSummary = () => {
    // TODO: Implement actual summary save functionality
    console.log('Saving summary:', editSummaryValue);
    setEditingSummary(null);
  };

  const handleCancelEdit = () => {
    setEditingSummary(null);
    setEditSummaryValue('');
  };

  const getSummary = (insight: InsightEntry) => {
    // For now, extract first line or first 100 characters as summary
    return insight.content.split('\n')[0].substring(0, 100) + (insight.content.length > 100 ? '...' : '');
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Insights</h3>
          <Button onClick={handleGenerateInsight} disabled={!client}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Insight
          </Button>
        </div>

        {insightEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2">No insights available</div>
                <p className="text-gray-600 mb-4">AI insights will appear here based on client data and patterns</p>
                <Button onClick={handleGenerateInsight} disabled={!client}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate First Insight
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Summary</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insightEntries.map((insight) => (
                  <TableRow key={insight.id}>
                    <TableCell className="text-sm text-gray-600">
                      <span className="hidden md:inline">{formatDate(insight.created_at)}</span>
                      <span className="md:hidden">{formatDateForMobile(insight.created_at)}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium hover:text-primary cursor-help">
                              {insight.title || `${getInsightTypeLabel(insight.type)} Insight`}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md p-3">
                            <div className="space-y-1">
                              <div className="font-medium">{insight.title || `${getInsightTypeLabel(insight.type)} Insight`}</div>
                              <div className="text-sm text-gray-600">
                                {getInsightTypeLabel(insight.type)}
                                {insight.confidence_score && ` • ${insight.confidence_score}% confidence`}
                              </div>
                              <div className="text-sm max-h-32 overflow-y-auto">
                                {insight.content}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {editingSummary === insight.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editSummaryValue}
                              onChange={(e) => setEditSummaryValue(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs border rounded"
                              placeholder="Add a summary..."
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveSummary}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span>{getSummary(insight)}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditSummary(insight)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewInsight(insight)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={deletingInsightId === insight.id}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Insight</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this insight? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteInsight(insight.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {client && (
          <GenerateInsightModal
            open={showGenerateModal}
            onOpenChange={setShowGenerateModal}
            client={client}
            journalEntries={journalEntries}
            onInsightGenerated={handleInsightGenerated}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
