import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/types/database';
import { insightsService } from '@/services/insights';
import { clientReportsService } from '@/services/clientReports';
import { TheraLoader } from '@/components/ui/TheraLoader';
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

interface ClientReport {
  id: string;
  request_type: string;
  report_tier?: string;
  response_payload: any;
  created_at: string;
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
  const [previousReports, setPreviousReports] = useState<ClientReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const { toast } = useToast();

  const generateDateTitle = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Load previous reports when modal opens
  useEffect(() => {
    if (open && client.id) {
      loadPreviousReports();
    }
  }, [open, client.id]);

  const loadPreviousReports = async () => {
    try {
      setLoadingReports(true);
      const reports = await clientReportsService.getClientReports(client.id);
      setPreviousReports(reports);
    } catch (error) {
      console.error('Error loading previous reports:', error);
      // Continue without reports - not critical for insight generation
      setPreviousReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const formatReportForInsight = (report: ClientReport) => {
    const reportType = report.report_tier || report.request_type || 'Report';
    
    // Extract key insights from response payload if available
    let keyInsights = '';
    try {
      if (report.response_payload?.report) {
        // Try to extract a summary or first few lines
        const content = report.response_payload.report;
        if (typeof content === 'string') {
          keyInsights = content.substring(0, 200) + '...';
        }
      }
    } catch (error) {
      console.error('Error extracting insights from report:', error);
    }

    return {
      id: report.id,
      type: reportType,
      created_at: report.created_at,
      key_insights: keyInsights
    };
  };

  const handleGenerate = async () => {
    console.log('=== GENERATE INSIGHT MODAL: Starting insight generation ===');
    console.log('Client object:', {
      id: client.id,
      full_name: client.full_name,
      coach_id: client.coach_id,
      notes: client.notes,
      email: client.email
    });
    
    setIsGenerating(true);

    try {
      // Log journal entries being processed
      console.log('Journal entries received:', journalEntries);
      console.log('Journal entries count:', journalEntries.length);
      journalEntries.forEach((entry, index) => {
        console.log(`Journal entry ${index + 1}:`, {
          id: entry.id,
          title: entry.title,
          entry_text_length: entry.entry_text?.length || 0,
          created_at: entry.created_at,
          entry_text_preview: entry.entry_text?.substring(0, 100) + '...'
        });
      });

      // Log previous reports being processed
      console.log('Previous reports received:', previousReports);
      console.log('Previous reports count:', previousReports.length);
      const formattedReports = previousReports.map(formatReportForInsight);
      console.log('Formatted reports for insight:', formattedReports);

      const clientData = {
        fullName: client.full_name,
        goals: client.notes || undefined,
        journalEntries: journalEntries,
        previousReports: formattedReports
      };

      console.log('=== CLIENT DATA BEING SENT ===');
      console.log('Full clientData object:', clientData);
      console.log('Goals field:', clientData.goals);
      console.log('Journal entries field:', clientData.journalEntries);
      console.log('Previous reports field:', clientData.previousReports);

      const title = customTitle.trim() || generateDateTitle();
      console.log('Generated title:', title);

      const requestPayload = {
        clientId: client.id,
        coachId: client.coach_id,
        insightType: 'general',
        title,
        clientData
      };

      console.log('=== FINAL REQUEST PAYLOAD TO INSIGHTS SERVICE ===');
      console.log('Complete request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('Request payload keys:', Object.keys(requestPayload));
      console.log('Client ID:', requestPayload.clientId);
      console.log('Coach ID:', requestPayload.coachId);
      console.log('Insight Type:', requestPayload.insightType);
      console.log('Title:', requestPayload.title);

      const response = await insightsService.generateInsight(requestPayload);

      console.log('=== INSIGHTS SERVICE RESPONSE ===');
      console.log('Response received:', response);
      console.log('Response success:', response.success);
      
      if (response.success) {
        console.log('Insight generated successfully!');
        console.log('Insight ID:', response.insightId);
        console.log('Content length:', response.content?.length || 0);
        
        toast({
          title: "Success",
          description: "Insight generated successfully!",
        });
        onInsightGenerated();
        onOpenChange(false);
        setCustomTitle('');
        setShowTitleInput(false);
      } else {
        console.error('=== INSIGHT GENERATION FAILED ===');
        console.error('Error from service:', response.error);
        console.error('Request ID:', response.requestId);
        throw new Error(response.error || 'Failed to generate insight');
      }
    } catch (error) {
      console.error('=== CRITICAL ERROR IN GENERATE INSIGHT MODAL ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full error object:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      console.log('=== GENERATE INSIGHT MODAL: Finished (success or error) ===');
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

  if (isGenerating) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <TheraLoader message="Generating insights..." size="md" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Insight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-foreground">
            This will analyze {client.full_name}'s goals, progress through {previousReports.length} previous report{previousReports.length !== 1 ? 's' : ''}, and {journalEntries.length} journal {journalEntries.length === 1 ? 'entry' : 'entries'} to generate personalized coaching insights.
          </div>
          
          {loadingReports && (
            <div className="text-xs text-muted-foreground">
              Loading previous reports...
            </div>
          )}
          
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
          <Button onClick={handleGenerate} disabled={isGenerating || loadingReports}>
            Generate Insight
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
