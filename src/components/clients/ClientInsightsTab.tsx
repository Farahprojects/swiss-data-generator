
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, FileText, Edit2, Check, X, Trash2, User, ChevronRight } from 'lucide-react';
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
  const sections: Array<{text: string, sentiment: 'positive' | 'negative' | 'neutral'}> = [];
  
  // Keywords that suggest positive insights
  const positiveKeywords = ['improvement', 'progress', 'success', 'achievement', 'strength', 'growth', 'positive', 'better', 'excellent', 'good', 'breakthrough', 'milestone'];
  
  // Keywords that suggest negative/concern insights
  const negativeKeywords = ['concern', 'issue', 'problem', 'difficulty', 'challenge', 'struggle', 'negative', 'decline', 'worse', 'setback', 'barrier', 'obstacle'];
  
  for (const line of lines) {
    if (line.includes(':') && line.length > 10) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (value) {
        const lowerValue = value.toLowerCase();
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        
        if (positiveKeywords.some(keyword => lowerValue.includes(keyword))) {
          sentiment = 'positive';
        } else if (negativeKeywords.some(keyword => lowerValue.includes(keyword))) {
          sentiment = 'negative';
        }
        
        sections.push({ text: value, sentiment });
      }
    }
  }
  
  return sections.slice(0, 4); // Take first 4 meaningful sections
};

const getSentimentBadgeStyle = (sentiment: 'positive' | 'negative' | 'neutral') => {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-150';
    case 'negative':
      return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-150';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150';
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
              
              return (
                <Card key={insight.id} className="p-6 hover:shadow-md transition-all duration-200 border border-gray-100">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
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
                      
                      {/* Individual Insight Tags */}
                      {sections.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {sections.map((section, index) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className={`text-xs px-3 py-1 font-medium border ${getSentimentBadgeStyle(section.sentiment)}`}
                            >
                              {section.text}
                            </Badge>
                          ))}
                        </div>
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
                              onClick={() => handleViewInsight(insight)}
                              className="text-gray-600 hover:text-primary hover:bg-primary/5 p-2 h-auto"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>View insight</span>
                          </TooltipContent>
                        </Tooltip>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
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

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInsight(insight)}
                        className="text-gray-600 hover:text-primary hover:bg-primary/5 group"
                      >
                        <span className="text-sm">View Full Insight</span>
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
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
      </div>
    </TooltipProvider>
  );
};
