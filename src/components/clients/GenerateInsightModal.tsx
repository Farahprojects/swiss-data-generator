
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/types/database';
import { insightsService } from '@/services/insights';
import { Loader2 } from 'lucide-react';

interface GenerateInsightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  journalEntries: Array<{
    id: string;
    title?: string;
    entry_text: string;
    created_at: string;
  }>;
  onInsightGenerated: () => void;
}

const insightTypes = [
  { value: 'pattern', label: 'Pattern Analysis' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'trend', label: 'Trend Analysis' },
  { value: 'milestone', label: 'Milestone Assessment' }
];

export const GenerateInsightModal: React.FC<GenerateInsightModalProps> = ({
  open,
  onOpenChange,
  client,
  journalEntries,
  onInsightGenerated
}) => {
  const [title, setTitle] = useState('');
  const [insightType, setInsightType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!title.trim() || !insightType) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and select an insight type.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const clientData = {
        fullName: client.full_name,
        birthDate: client.birth_date || undefined,
        birthTime: client.birth_time || undefined,
        birthLocation: client.birth_location || undefined,
        notes: client.notes || undefined,
        journalEntries: journalEntries
      };

      const response = await insightsService.generateInsight({
        clientId: client.id,
        coachId: client.coach_id,
        insightType,
        title: title.trim(),
        clientData
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Insight generated successfully!",
        });
        onInsightGenerated();
        onOpenChange(false);
        setTitle('');
        setInsightType('');
      } else {
        throw new Error(response.error || 'Failed to generate insight');
      }
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onOpenChange(false);
      setTitle('');
      setInsightType('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate AI Insight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="insight-title">Insight Title</Label>
            <Input
              id="insight-title"
              placeholder="Enter a title for this insight..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="insight-type">Insight Type</Label>
            <Select value={insightType} onValueChange={setInsightType} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue placeholder="Select insight type..." />
              </SelectTrigger>
              <SelectContent>
                {insightTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
            This will analyze {client.full_name}'s profile, birth chart data, goals, and {journalEntries.length} journal {journalEntries.length === 1 ? 'entry' : 'entries'} to generate personalized insights.
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !title.trim() || !insightType}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Insight ($7.50)'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
