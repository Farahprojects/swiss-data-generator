
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Brain, TrendingUp, Calendar, Target } from 'lucide-react';
import { formatDateTime } from '@/utils/dateFormatters';
import { InsightEntry, JournalEntry } from '@/types/database';
import { GenerateInsightModal } from './GenerateInsightModal';

interface ClientInsightsTabProps {
  insightEntries?: InsightEntry[];
  clientId: string;
  clientGoals?: string;
  journalEntries: JournalEntry[];
  clientReports: any[];
  onGenerateInsight?: () => void;
  onInsightGenerated: () => void;
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
  clientId,
  clientGoals,
  journalEntries,
  clientReports,
  onInsightGenerated
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const handleGenerateInsight = () => {
    setShowGenerateModal(true);
  };

  const handleInsightGenerated = () => {
    onInsightGenerated();
    setShowGenerateModal(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Insights</h3>
          <Button onClick={handleGenerateInsight}>
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
                <Button onClick={handleGenerateInsight}>
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
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getInsightIcon(insight.type)}
                        {insight.title}
                      </CardTitle>
                      <div className="text-sm text-gray-600 mt-1">
                        Generated on {formatDateTime(insight.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={getInsightBadgeVariant(insight.type)}>
                        {getInsightTypeLabel(insight.type)}
                      </Badge>
                      {insight.confidence_score && (
                        <Badge variant="outline">
                          {insight.confidence_score}% confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{insight.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GenerateInsightModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        clientId={clientId}
        clientGoals={clientGoals}
        journalEntries={journalEntries}
        clientReports={clientReports}
        onInsightGenerated={handleInsightGenerated}
      />
    </>
  );
};
