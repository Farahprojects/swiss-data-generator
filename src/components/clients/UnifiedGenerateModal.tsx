
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { X, Pencil } from 'lucide-react';
import { Client } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { insightsService } from '@/services/insights';
import { clientReportsService, ClientReportFormData } from '@/services/clientReports';
import { TheraLoader } from '@/components/ui/TheraLoader';

// Insight form schema
const insightFormSchema = z.object({
  title: z.string().optional(),
});

// Report form schema
const reportFormSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type'),
  relationshipType: z.string().optional(),
  essenceType: z.string().optional(),
  notes: z.string().optional(),
  secondPersonName: z.string().optional(),
  secondPersonBirthDate: z.string().optional(),
  secondPersonBirthTime: z.string().optional(),
  secondPersonBirthLocation: z.string().optional(),
  returnYear: z.string().optional(),
});

type InsightFormData = z.infer<typeof insightFormSchema>;
type ReportFormData = z.infer<typeof reportFormSchema>;

interface UnifiedGenerateModalProps {
  mode: 'insight' | 'report';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  journalEntries?: Array<{
    id: string;
    title?: string;
    entry_text: string;
    created_at: string;
  }>;
  onGenerated: () => void;
}

const reportTypes = [
  { value: 'natal', label: 'Natal Report' },
  { value: 'composite', label: 'Composite Report' },
  { value: 'compatibility', label: 'Compatibility Report' },
  { value: 'return', label: 'Solar/Lunar Return Report' },
  { value: 'positions', label: 'Planetary Positions' },
  { value: 'sync', label: 'Sync Report' },
  { value: 'essence', label: 'Essence Report' },
  { value: 'flow', label: 'Flow Report' },
  { value: 'mindset', label: 'Mindset Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'focus', label: 'Focus Report' },
];

const relationshipTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
];

const essenceTypes = [
  { value: 'personal-identity', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
  { value: 'relational', label: 'Relational' },
];

const UnifiedGenerateModal: React.FC<UnifiedGenerateModalProps> = ({
  mode,
  open,
  onOpenChange,
  client,
  journalEntries = [],
  onGenerated
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);

  // Insight form
  const insightForm = useForm<InsightFormData>({
    resolver: zodResolver(insightFormSchema),
  });

  // Report form
  const reportForm = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
  });

  const selectedReportType = reportForm.watch('reportType');
  const customTitle = insightForm.watch('title') || '';

  const requiresSecondPerson = selectedReportType === 'sync';
  const requiresRelationshipType = requiresSecondPerson;
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';

  const generateDateTitle = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleInsightSubmit = async (data: InsightFormData) => {
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

      const title = data.title?.trim() || generateDateTitle();

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
        onGenerated();
        handleClose();
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

  const handleReportSubmit = async (data: ReportFormData) => {
    try {
      setIsGenerating(true);
      
      if (!client.birth_date || !client.birth_time || !client.birth_location) {
        toast({
          title: "Missing Birth Information",
          description: "This client needs complete birth information (date, time, and location) to generate reports.",
          variant: "destructive",
        });
        return;
      }

      const serviceData: ClientReportFormData = {
        reportType: data.reportType,
        relationshipType: data.relationshipType,
        essenceType: data.essenceType,
        notes: data.notes,
        secondPersonName: data.secondPersonName,
        secondPersonBirthDate: data.secondPersonBirthDate,
        secondPersonBirthTime: data.secondPersonBirthTime,
        secondPersonBirthLocation: data.secondPersonBirthLocation,
        returnYear: data.returnYear,
      };

      await clientReportsService.generateClientReport(client, serviceData);

      toast({
        title: "Report Generated Successfully",
        description: `${data.reportType} report has been generated for ${client.full_name}.`,
      });

      handleClose();
      onGenerated();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      insightForm.reset();
      reportForm.reset();
      setShowTitleInput(false);
      onOpenChange(false);
    }
  };

  const getCurrentYear = () => new Date().getFullYear();

  if (isGenerating) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <TheraLoader 
            message={mode === 'insight' ? "Generating insights..." : "Generating report..."} 
            size="md" 
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Generate {mode === 'insight' ? 'Insight' : 'Report'} for {client.full_name}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Client Information Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Client Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <span className="ml-2 font-medium">{client.full_name}</span>
            </div>
            {client.birth_date && (
              <div>
                <span className="text-gray-500">Birth Date:</span>
                <span className="ml-2 font-medium">{new Date(client.birth_date).toLocaleDateString()}</span>
              </div>
            )}
            {client.birth_time && (
              <div>
                <span className="text-gray-500">Birth Time:</span>
                <span className="ml-2 font-medium">{client.birth_time}</span>
              </div>
            )}
            {client.birth_location && (
              <div className="col-span-2">
                <span className="text-gray-500">Birth Location:</span>
                <span className="ml-2 font-medium">{client.birth_location}</span>
              </div>
            )}
          </div>
        </div>

        {mode === 'insight' ? (
          /* Insight Form */
          <form onSubmit={insightForm.handleSubmit(handleInsightSubmit)} className="space-y-4">
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
                  onClick={() => setShowTitleInput(true)}
                  type="button"
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
                  {...insightForm.register('title')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
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
                      insightForm.setValue('title', '');
                      setShowTitleInput(false);
                    }}
                    type="button"
                  >
                    Clear
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowTitleInput(false)}
                    type="button"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isGenerating} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                Generate Insight
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Report Form */
          <form onSubmit={reportForm.handleSubmit(handleReportSubmit)} className="space-y-6">
            {/* Report Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type *</Label>
              <Controller
                control={reportForm.control}
                name="reportType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {reportForm.formState.errors.reportType && (
                <p className="text-sm text-destructive">{reportForm.formState.errors.reportType.message}</p>
              )}
            </div>

            {/* Conditional Fields */}
            {requiresEssenceType && (
              <div className="space-y-2">
                <Label htmlFor="essenceType">Essence Focus *</Label>
                <Controller
                  control={reportForm.control}
                  name="essenceType"
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={field.onChange}
                      className="justify-start"
                    >
                      {essenceTypes.map((type) => (
                        <ToggleGroupItem 
                          key={type.value} 
                          value={type.value}
                          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          {type.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </div>
            )}

            {requiresReturnYear && (
              <div className="space-y-2">
                <Label htmlFor="returnYear">Return Year *</Label>
                <Input
                  {...reportForm.register('returnYear')}
                  type="number"
                  placeholder={getCurrentYear().toString()}
                  min="1900"
                  max="2100"
                />
              </div>
            )}

            {requiresSecondPerson && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Second Person Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="secondPersonName">Name *</Label>
                  <Input
                    {...reportForm.register('secondPersonName')}
                    placeholder="Enter second person's name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondPersonBirthDate">Birth Date *</Label>
                    <Input
                      {...reportForm.register('secondPersonBirthDate')}
                      type="date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondPersonBirthTime">Birth Time</Label>
                    <Input
                      {...reportForm.register('secondPersonBirthTime')}
                      type="time"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondPersonBirthLocation">Birth Location *</Label>
                  <Input
                    {...reportForm.register('secondPersonBirthLocation')}
                    placeholder="City, State/Province, Country"
                  />
                </div>
              </div>
            )}

            {requiresRelationshipType && (
              <div className="space-y-2">
                <Label htmlFor="relationshipType">Relationship Type *</Label>
                <Controller
                  control={reportForm.control}
                  name="relationshipType"
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={field.onChange}
                      className="justify-start"
                    >
                      {relationshipTypes.map((type) => (
                        <ToggleGroupItem 
                          key={type.value} 
                          value={type.value}
                          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          {type.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedGenerateModal;
