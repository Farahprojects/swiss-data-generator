
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Brain, TrendingUp, Calendar, Target, FileText } from 'lucide-react';
import { formatDateTime } from '@/utils/dateFormatters';
import { InsightEntry, Client } from '@/types/database';
import { GenerateInsightModal } from './GenerateInsightModal';

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

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'pattern':
      return <TrendingUp className="w-4 h-4" />;
    case 'recommendation':
      return <Target className="w-4 h-4" />;
    case 'trend':
      return <Calendar className="w-4 h-4" />;
    case 'milestone':
      return <Brain className="w-4 h-4" />;
    default:
      return <Brain className="w-4 h-4" />;
  }
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

export const ClientInsightsTab: React.FC<ClientInsightsTabProps> = ({
  insightEntries = [],
  client,
  journalEntries = [],
  onInsightGenerated,
  onViewInsight
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

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

  return (
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
        <div className="space-y-4">
          {insightEntries.map((insight) => (
            <Card key={insight.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {insight.title}
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      {getInsightTypeLabel(insight.type)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(insight.created_at)}
                      </span>
                      {insight.confidence_score && (
                        <Badge variant="outline">
                          {insight.confidence_score}% confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewInsight(insight)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      View Insight
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
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
  );
};
