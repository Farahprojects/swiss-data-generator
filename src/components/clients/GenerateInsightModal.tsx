
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insightsService } from '@/services/insights';
import { JournalEntry } from '@/types/database';
import { Brain, Loader2 } from 'lucide-react';

interface GenerateInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientGoals?: string;
  journalEntries: JournalEntry[];
  clientReports: any[];
  onInsightGenerated: () => void;
}

export const GenerateInsightModal: React.FC<GenerateInsightModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientGoals,
  journalEntries,
  clientReports,
  onInsightGenerated
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [insightType, setInsightType] = useState<'pattern' | 'recommendation' | 'trend' | 'milestone'>('pattern');
  const [customGoals, setCustomGoals] = useState('');
  const [selectedJournals, setSelectedJournals] = useState<string[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    try {
      const journalTexts = journalEntries
        .filter(entry => selectedJournals.includes(entry.id))
        .map(entry => `${entry.title ? entry.title + ': ' : ''}${entry.entry_text}`);

      const reportTexts = clientReports
        .filter(report => selectedReports.includes(report.id))
        .map(report => `${report.report_name || 'Report'}: ${JSON.stringify(report.response_payload).substring(0, 500)}...`);

      await insightsService.generateInsight({
        client_id: clientId,
        goals: customGoals || clientGoals,
        journal_entries: journalTexts.length > 0 ? journalTexts : undefined,
        reports: reportTexts.length > 0 ? reportTexts : undefined,
        insight_type: insightType
      });

      toast({
        title: "Success",
        description: "Insight generated successfully!",
      });

      onInsightGenerated();
      onClose();
      
      // Reset form
      setCustomGoals('');
      setSelectedJournals([]);
      setSelectedReports([]);
      setInsightType('pattern');
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: "Error",
        description: "Failed to generate insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJournalSelection = (journalId: string, checked: boolean) => {
    if (checked) {
      setSelectedJournals(prev => [...prev, journalId]);
    } else {
      setSelectedJournals(prev => prev.filter(id => id !== journalId));
    }
  };

  const handleReportSelection = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports(prev => [...prev, reportId]);
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Generate AI Insight
          </DialogTitle>
          <DialogDescription>
            Create personalized insights using AI analysis of your client's journal entries, reports, and goals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Insight Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="insight-type">Insight Type</Label>
            <Select value={insightType} onValueChange={(value: any) => setInsightType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select insight type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pattern">Pattern Analysis</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
                <SelectItem value="trend">Trend Identification</SelectItem>
                <SelectItem value="milestone">Milestone Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goals Section */}
          <div className="space-y-2">
            <Label htmlFor="goals">Goals & Objectives</Label>
            <Textarea
              id="goals"
              placeholder={clientGoals ? `Current goals: ${clientGoals}` : "Enter specific goals or objectives for this insight..."}
              value={customGoals}
              onChange={(e) => setCustomGoals(e.target.value)}
              rows={3}
            />
          </div>

          {/* Journal Entries Selection */}
          {journalEntries.length > 0 && (
            <div className="space-y-3">
              <Label>Select Journal Entries</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
                {journalEntries.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`journal-${entry.id}`}
                      checked={selectedJournals.includes(entry.id)}
                      onCheckedChange={(checked) => handleJournalSelection(entry.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`journal-${entry.id}`} className="text-sm font-medium cursor-pointer">
                        {entry.title || 'Untitled Entry'}
                      </label>
                      <p className="text-xs text-gray-500 truncate">
                        {entry.entry_text.substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Selection */}
          {clientReports.length > 0 && (
            <div className="space-y-3">
              <Label>Select Reports</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
                {clientReports.slice(0, 10).map((report) => (
                  <div key={report.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`report-${report.id}`}
                      checked={selectedReports.includes(report.id)}
                      onCheckedChange={(checked) => handleReportSelection(report.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`report-${report.id}`} className="text-sm font-medium cursor-pointer">
                        {report.report_name || report.request_type}
                      </label>
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerateInsight} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Insight
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
