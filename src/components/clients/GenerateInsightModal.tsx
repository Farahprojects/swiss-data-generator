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

  const extractAstroData = (report: ClientReport) => {
    const reportType = report.report_tier || report.request_type || 'Report';
    
    // Extract raw astrological data from response payload
    let astroData = '';
    try {
      if (report.response_payload?.astroData || report.response_payload?.natal || report.response_payload?.transits) {
        const payload = report.response_payload;
        
        // Extract natal chart data
        if (payload.natal) {
          astroData += `Natal Chart Data:\n`;
          if (payload.natal.planets) {
            astroData += `Planets: ${JSON.stringify(payload.natal.planets, null, 2)}\n`;
          }
          if (payload.natal.houses) {
            astroData += `Houses: ${JSON.stringify(payload.natal.houses, null, 2)}\n`;
          }
          if (payload.natal.aspects) {
            astroData += `Aspects: ${JSON.stringify(payload.natal.aspects, null, 2)}\n`;
          }
          if (payload.natal.angles) {
            astroData += `Angles: ${JSON.stringify(payload.natal.angles, null, 2)}\n`;
          }
        }
        
        // Extract transit data
        if (payload.transits) {
          astroData += `\nTransit Data:\n`;
          if (payload.transits.planets) {
            astroData += `Transit Planets: ${JSON.stringify(payload.transits.planets, null, 2)}\n`;
          }
          if (payload.transits.aspects) {
            astroData += `Transit Aspects: ${JSON.stringify(payload.transits.aspects, null, 2)}\n`;
          }
        }
        
        // Extract essence calculations if available
        if (payload.essence) {
          astroData += `\nEssence Calculations:\n${JSON.stringify(payload.essence, null, 2)}\n`;
        }
        
        // Extract any other astrological data
        if (payload.astroData) {
          astroData += `\nAdditional Astro Data:\n${JSON.stringify(payload.astroData, null, 2)}\n`;
        }
      } else {
        // Fallback to raw payload if no specific astro structure
        astroData = JSON.stringify(report.response_payload, null, 2);
      }
    } catch (error) {
      console.error('Error extracting astro data from report:', error);
      astroData = 'Unable to extract astrological data from this report.';
    }

    return {
      id: report.id,
      type: reportType,
      created_at: report.created_at,
      astro_data: astroData
    };
  };

  const handleGenerate = async () => {
    console.log('🔥 === MODAL: STARTING INSIGHT GENERATION ===');
    console.log('🔥 MODAL: Client object received:', client);
    console.log('🔥 MODAL: Client ID:', client.id);
    console.log('🔥 MODAL: Client name:', client.full_name);
    console.log('🔥 MODAL: Client coach_id:', client.coach_id);
    console.log('🔥 MODAL: Client notes (goals):', client.notes);
    
    setIsGenerating(true);

    try {
      // Log journal entries being processed
      console.log('🔥 MODAL: Journal entries received:', journalEntries);
      console.log('🔥 MODAL: Journal entries count:', journalEntries.length);
      journalEntries.forEach((entry, index) => {
        console.log(`🔥 MODAL: Journal entry ${index + 1}:`, {
          id: entry.id,
          title: entry.title,
          entry_text_length: entry.entry_text?.length || 0,
          created_at: entry.created_at,
          entry_text_preview: entry.entry_text?.substring(0, 100) + '...'
        });
      });

      // Log previous reports being processed and extract astro data
      console.log('🔥 MODAL: Previous reports received:', previousReports);
      console.log('🔥 MODAL: Previous reports count:', previousReports.length);
      const extractedAstroData = previousReports.map(extractAstroData);
      console.log('🔥 MODAL: Extracted astro data for insight:', extractedAstroData);

      const clientData = {
        fullName: client.full_name,
        goals: client.notes || undefined,
        journalEntries: journalEntries,
        previousAstroData: extractedAstroData
      };

      console.log('🔥 MODAL: === CLIENT DATA BEING CREATED ===');
      console.log('🔥 MODAL: Full clientData object:', clientData);
      console.log('🔥 MODAL: Goals field value:', clientData.goals);
      console.log('🔥 MODAL: Journal entries field:', clientData.journalEntries);
      console.log('🔥 MODAL: Previous astro data field:', clientData.previousAstroData);

      const title = customTitle.trim() || generateDateTitle();
      console.log('🔥 MODAL: Generated title:', title);

      const requestPayload = {
        clientId: client.id,
        coachId: client.coach_id,
        insightType: 'general',
        title,
        clientData
      };

      console.log('🔥 MODAL: === FINAL REQUEST PAYLOAD TO INSIGHTS SERVICE ===');
      console.log('🔥 MODAL: Complete request payload:', requestPayload);
      console.log('🔥 MODAL: Payload as JSON string:', JSON.stringify(requestPayload, null, 2));
      console.log('🔥 MODAL: Request payload keys:', Object.keys(requestPayload));
      console.log('🔥 MODAL: Client ID in payload:', requestPayload.clientId);
      console.log('🔥 MODAL: Coach ID in payload:', requestPayload.coachId);
      console.log('🔥 MODAL: Insight Type in payload:', requestPayload.insightType);
      console.log('🔥 MODAL: Title in payload:', requestPayload.title);
      console.log('🔥 MODAL: ClientData keys:', Object.keys(requestPayload.clientData));

      console.log('🔥 MODAL: About to call insightsService.generateInsight...');
      
      const response = await insightsService.generateInsight(requestPayload);

      console.log('🔥 MODAL: === INSIGHTS SERVICE RESPONSE ===');
      console.log('🔥 MODAL: Response received:', response);
      console.log('🔥 MODAL: Response success:', response.success);
      
      if (response.success) {
        console.log('🔥 MODAL: Insight generated successfully!');
        console.log('🔥 MODAL: Insight ID:', response.insightId);
        console.log('🔥 MODAL: Content length:', response.content?.length || 0);
        
        toast({
          title: "Success",
          description: "Insight generated successfully!",
        });
        onInsightGenerated();
        onOpenChange(false);
        setCustomTitle('');
        setShowTitleInput(false);
      } else {
        console.error('🔥 MODAL: === INSIGHT GENERATION FAILED ===');
        console.error('🔥 MODAL: Error from service:', response.error);
        console.error('🔥 MODAL: Request ID:', response.requestId);
        throw new Error(response.error || 'Failed to generate insight');
      }
    } catch (error) {
      console.error('🔥 MODAL: === CRITICAL ERROR IN GENERATE INSIGHT MODAL ===');
      console.error('🔥 MODAL: Error type:', typeof error);
      console.error('🔥 MODAL: Error message:', error instanceof Error ? error.message : String(error));
      console.error('🔥 MODAL: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('🔥 MODAL: Full error object:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      console.log('🔥 MODAL: === MODAL FINISHED (success or error) ===');
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
            This will analyze {client.full_name}'s goals, progress through {previousReports.length} previous astro report{previousReports.length !== 1 ? 's' : ''}, and {journalEntries.length} journal {journalEntries.length === 1 ? 'entry' : 'entries'} to generate personalized coaching insights.
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
