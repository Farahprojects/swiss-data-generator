
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/types/database';
import { insightsService } from '@/services/insights';
import { Loader2 } from 'lucide-react';
import { Pencil } from 'lucide-react';

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

export const GenerateInsightModal: React.FC<GenerateInsightModalProps> = ({
  open,
  onOpenChange,
  client,
  journalEntries,
  onInsightGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const { toast } = useToast();

  const generateDateTitle = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleGenerate = async () => {
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

      const title = customTitle.trim() || generateDateTitle();

      const response = await insightsService.generateInsight({
        clientId: client.id,
        coachId: client.coach_id,
        insightType: 'general',
        title,
        clientData
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Insight generated successfully!",
        });
        onInsightGenerated();
        onOpenChange(false);
        setCustomTitle('');
        setShowTitleInput(false);
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
      setCustomTitle('');
      setShowTitleInput(false);
    }
  };

  const handleAddTitle = () => {
    setShowTitleInput(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Insight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-foreground">
            This will analyze {client.full_name}'s profile, birth chart data, goals, and {journalEntries.length} journal {journalEntries.length === 1 ? 'entry' : 'entries'} to generate personalized insights.
          </div>
          
          <div className="text-sm text-muted-foreground">
            Insight will be titled: <strong>{customTitle.trim() || generateDateTitle()}</strong>
          </div>

          {!showTitleInput && (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
                onClick={handleAddTitle}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Add title
              </Button>
            </div>
          )}

          {showTitleInput && (
            <div className="space-y-2">
              <Input
                placeholder="Enter Title..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowTitleInput(false);
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCustomTitle('');
                    setShowTitleInput(false);
                  }}
                >
                  Clear
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowTitleInput(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Insight'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
