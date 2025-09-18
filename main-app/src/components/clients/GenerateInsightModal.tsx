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

// Configuration for what data to include in insights
const INSIGHT_DATA_CONFIG = {
  INCLUDE_REPORT_TEXT: true,      // Send generated report content
  INCLUDE_ASTRO_DATA: false,      // Send raw astrological data
  INCLUDE_JOURNAL_ENTRIES: true   // Send journal entries
};

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
  swiss_data: any;
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

  const extractReportText = (report: ClientReport) => {
    const reportType = report.report_tier || report.request_type || 'Report';
    
    // Extract human-readable report content from response payload
    let reportText = '';
    try {
      if (report.swiss_data) {
        const payload = report.swiss_data;
        
        // Look for generated report content in various fields
        if (payload.report?.content) {
          reportText = payload.report.content;
        } else if (payload.generated_text) {
          reportText = payload.generated_text;
        } else if (payload.narrative) {
          reportText = payload.narrative;
        } else if (payload.content) {
          reportText = payload.content;
        } else if (payload.text) {
          reportText = payload.text;
        } else if (typeof payload === 'string') {
          reportText = payload;
        } else {
          // Fallback: try to find any text content in the payload
          const textContent = Object.values(payload)
            .filter(value => typeof value === 'string' && value.length > 100)
            .join('\n\n');
          reportText = textContent || 'No readable report content found.';
        }
      } else {
        reportText = 'No report content available.';
      }
    } catch (error) {
      console.error('Error extracting report text:', error);
      reportText = 'Unable to extract report content.';
    }

    return {
      id: report.id,
      type: reportType,
      created_at: report.created_at,
      report_text: reportText
    };
  };

  const extractAstroData = (report: ClientReport) => {
    const reportType = report.report_tier || report.request_type || 'Report';
    
    // Extract raw astrological data from response payload
    let astroData = '';
    try {
      if (report.swiss_data?.astroData || report.swiss_data?.natal || report.swiss_data?.transits) {
        const payload = report.swiss_data;
        
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
        astroData = JSON.stringify(report.swiss_data, null, 2);
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
    console.log('🔥 MODAL: Configuration:', INSIGHT_DATA_CONFIG);
    console.log('🔥 MODAL: Client object received:', client);
    
    setIsGenerating(true);

    try {
      // Process data based on configuration
      let extractedReportTexts: any[] = [];
      let extractedAstroData: any[] = [];
      
      if (INSIGHT_DATA_CONFIG.INCLUDE_REPORT_TEXT) {
        extractedReportTexts = previousReports.map(extractReportText);
        console.log('🔥 MODAL: Extracted report texts:', extractedReportTexts);
      }
      
      if (INSIGHT_DATA_CONFIG.INCLUDE_ASTRO_DATA) {
        extractedAstroData = previousReports.map(extractAstroData);
        console.log('🔥 MODAL: Extracted astro data:', extractedAstroData);
      }

      // Build clientData object based on configuration
      const clientData: any = {
        fullName: client.full_name,
        goals: client.notes || undefined,
      };

      // Add journal entries if configured
      if (INSIGHT_DATA_CONFIG.INCLUDE_JOURNAL_ENTRIES) {
        clientData.journalEntries = journalEntries;
      }

      // Add report texts if configured and available
      if (INSIGHT_DATA_CONFIG.INCLUDE_REPORT_TEXT && extractedReportTexts.length > 0) {
        const reportTexts = extractedReportTexts.map((report, index) => {
          const date = new Date(report.created_at).toLocaleDateString();
          return `Report Type: ${report.type}\nDate: ${date}\nReport Content:\n${report.report_text}`;
        }).join('\n\n---\n\n');
        clientData.previousReportTexts = reportTexts;
      }

      // Add astro data if configured and available
      if (INSIGHT_DATA_CONFIG.INCLUDE_ASTRO_DATA && extractedAstroData.length > 0) {
        const astroTexts = extractedAstroData.map((astroReport, index) => {
          const date = new Date(astroReport.created_at).toLocaleDateString();
          return `Report Type: ${astroReport.type}\nDate: ${date}\nAstrological Data:\n${astroReport.astro_data}`;
        }).join('\n\n---\n\n');
        clientData.previousAstroDataText = astroTexts;
      }

      console.log('🔥 MODAL: Final clientData object:', clientData);

      const title = customTitle.trim() || generateDateTitle();
      
      const requestPayload = {
        clientId: client.id,
        coachId: client.coach_id,
        insightType: 'general',
        title,
        clientData
      };

      console.log('🔥 MODAL: Request payload to insights service:', requestPayload);
      
      const response = await insightsService.generateInsight(requestPayload);

      console.log('🔥 MODAL: Response received:', response);
      
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
      console.error('🔥 MODAL: Error in generate insight modal:', error);
      
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
