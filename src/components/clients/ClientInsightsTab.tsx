
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, FileText, Edit2, Check, X, Trash2, User, Target } from 'lucide-react';
import { formatDate } from '@/utils/dateFormatters';
import { InsightEntry, Client } from '@/types/database';
import { GenerateInsightModal } from './GenerateInsightModal';
import { ActionConfirmDialog } from './ActionConfirmDialog';
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

const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });
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

const parseInsightSections = (content: string) => {
  const lines = content.split('\n').filter(line => line.trim());
  const sections: string[] = [];
  
  for (const line of lines) {
    if (line.includes(':') && line.length > 10) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (value) {
        sections.push(value);
      }
    }
  }
  
  return sections.slice(0, 2); // Take first 2 meaningful sections
};

const categorizeInsightTerms = (content: string) => {
  const negativeTerms = ['Fear of Vulnerability', 'Self-Judgment', 'Emotional Suppression'];
  const positiveTerms = ['Self-Awareness', 'Emotional Responsiveness', 'Courageous Inquiry'];
  
  const foundNegative: string[] = [];
  const foundPositive: string[] = [];
  
  negativeTerms.forEach(term => {
    if (content.includes(term)) {
      foundNegative.push(term);
    }
  });
  
  positiveTerms.forEach(term => {
    if (content.includes(term)) {
      foundPositive.push(term);
    }
  });
  
  return { negative: foundNegative, positive: foundPositive };
};

const extractActions = (content: string) => {
  const lines = content.split('\n').filter(line => line.trim());
  const actions: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for numbered actions (1. 2. 3. etc.)
    const numberedActionMatch = trimmedLine.match(/^\d+\.\s*(.+)/);
    if (numberedActionMatch) {
      let cleanAction = numberedActionMatch[1]
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code markdown
        .trim();
      
      if (cleanAction && cleanAction.length > 10) {
        actions.push(cleanAction);
      }
      continue;
    }
    
    // Look for action-oriented keywords (fallback)
    if (trimmedLine.includes('Recommend') || 
        trimmedLine.includes('Suggest') || 
        trimmedLine.includes('Consider') || 
        trimmedLine.includes('Try') ||
        trimmedLine.includes('Practice') ||
        trimmedLine.includes('Focus on') ||
        trimmedLine.includes('Work on') ||
        trimmedLine.includes('Explore')) {
      // Clean up the action text - remove markdown and formatting
      let cleanAction = trimmedLine
        .replace(/^[•\-\*]\s*/, '') // Remove bullet points
        .replace(/^\d+\.\s*/, '') // Remove numbered lists
        .replace(/^(Recommend|Suggest|Consider|Try|Practice|Focus on|Work on|Explore):\s*/i, '') // Remove action prefixes
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code markdown
        .trim();
      
      if (cleanAction && cleanAction.length > 10) {
        actions.push(cleanAction);
      }
    }
  }
  
  return actions; // Remove the slice limit to show all actions
};

export const ClientInsightsTab: React.FC<ClientInsightsTabProps> = ({
  insightEntries = [],
  client,
  journalEntries = [],
  onInsightGenerated,
  onViewInsight
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [insightToDelete, setInsightToDelete] = useState<InsightEntry | null>(null);
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

  const handleDeleteClick = (insight: InsightEntry) => {
    setInsightToDelete(insight);
    setShowDeleteDialog(true);
  };

  const handleDeleteInsight = async () => {
    if (!insightToDelete) return;
    
    try {
      setDeletingInsightId(insightToDelete.id);
      await insightsService.deleteInsight(insightToDelete.id);
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
      setShowDeleteDialog(false);
      setInsightToDelete(null);
    }
  };

  const getMainInsightText = (insight: InsightEntry) => {
    const lines = insight.content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.length > 50 && !line.includes(':')) {
        return line.trim();
      }
    }
    return lines[0] || insight.content.substring(0, 100) + '...';
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Insights</h3>
          <Button onClick={handleGenerateInsight} disabled={!client}>
            <Plus className="w-4 h-4 mr-2" />
            Add
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
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {insightEntries.map((insight) => {
              const sections = parseInsightSections(insight.content);
              const mainText = getMainInsightText(insight);
              const { negative, positive } = categorizeInsightTerms(insight.content);
              const actions = extractActions(insight.content);
              
              return (
                <Card key={insight.id} className="p-6 hover:shadow-md transition-all duration-200 border border-gray-100">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 font-medium">
                            {formatDateForDisplay(insight.created_at)}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={getInsightBadgeVariant(insight.type)}
                        className="bg-primary/10 text-primary border-primary/20 font-medium px-3 py-1"
                      >
                        {getInsightTypeLabel(insight.type)}
                      </Badge>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-3">
                      <p className="text-gray-900 font-medium leading-relaxed text-base">
                        {mainText}
                      </p>
                      
                      {/* Categorized Terms */}
                      {(negative.length > 0 || positive.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {negative.map((term, index) => (
                            <Badge 
                              key={`negative-${index}`}
                              variant="outline" 
                              className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-1"
                            >
                              {term}
                            </Badge>
                          ))}
                          {positive.map((term, index) => (
                            <Badge 
                              key={`positive-${index}`}
                              variant="outline" 
                              className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-1"
                            >
                              {term}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Collapsible Actions List */}
                      {actions.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="actions" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Actions ({actions.length})</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="space-y-2">
                                {actions.map((action, index) => (
                                  <div key={index} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Target className="w-3 h-3 text-gray-600" />
                                    </div>
                                    <span className="text-sm text-gray-700 leading-relaxed">{action}</span>
                                  </div>
                                ))}
                              </div>
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
                        onClick={() => handleViewInsight(insight)}
                        className="text-gray-600 hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">View Full Insight</span>
                      </Button>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => handleDeleteClick(insight)}
                            disabled={deletingInsightId === insight.id}
                            className="text-gray-600 hover:text-destructive transition-colors p-2 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>Delete insight</span>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
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

        <ActionConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete Insight"
          description="Are you sure you want to delete this insight for {clientName}? This action cannot be undone."
          actionLabel="Delete"
          onConfirm={handleDeleteInsight}
          client={client ? { id: client.id, full_name: client.full_name } : null}
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
};
