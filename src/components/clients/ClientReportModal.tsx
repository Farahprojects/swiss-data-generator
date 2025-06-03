
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { Client } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const reportFormSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type'),
  relationshipType: z.string().optional(),
  essenceType: z.string().optional(),
  notes: z.string().optional(),
  // For compatibility/sync reports
  secondPersonName: z.string().optional(),
  secondPersonBirthDate: z.string().optional(),
  secondPersonBirthTime: z.string().optional(),
  secondPersonBirthLocation: z.string().optional(),
  // For return reports
  returnYear: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

interface ClientReportModalProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportGenerated?: () => void;
}

const reportTypes = [
  { value: 'solar-return', label: 'Solar Return' },
  { value: 'lunar-return', label: 'Lunar Return' },
  { value: 'essence-professional', label: 'Essence Professional' },
  { value: 'essence-basic', label: 'Essence Basic' },
  { value: 'flow-professional', label: 'Flow Professional' },
  { value: 'flow-basic', label: 'Flow Basic' },
  { value: 'sync-professional', label: 'Sync Professional' },
  { value: 'sync-basic', label: 'Sync Basic' },
  { value: 'transit', label: 'Transit' },
  { value: 'progression', label: 'Progression' },
];

const relationshipTypes = [
  { value: 'romantic', label: 'Romantic' },
  { value: 'friendship', label: 'Friendship' },
  { value: 'family', label: 'Family' },
  { value: 'business', label: 'Business' },
  { value: 'general', label: 'General' },
];

const essenceTypes = [
  { value: 'personality', label: 'Personality' },
  { value: 'career', label: 'Career' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'general', label: 'General' },
];

const ClientReportModal = ({ 
  client, 
  open, 
  onOpenChange, 
  onReportGenerated 
}: ClientReportModalProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
  });

  const selectedReportType = watch('reportType');

  const requiresSecondPerson = ['sync-professional', 'sync-basic'].includes(selectedReportType);
  const requiresRelationshipType = requiresSecondPerson;
  const requiresEssenceType = ['essence-professional', 'essence-basic'].includes(selectedReportType);
  const requiresReturnYear = ['solar-return', 'lunar-return'].includes(selectedReportType);

  const onSubmit = async (data: ReportFormData) => {
    try {
      setIsGenerating(true);
      
      // Here we'll call the report generation service
      // For now, just show a success message
      toast({
        title: "Report Generation Started",
        description: `Generating ${data.reportType} report for ${client.full_name}...`,
      });

      console.log('Report generation data:', {
        client,
        reportData: data,
      });

      // TODO: Integrate with actual report generation service
      // await generateClientReport(client, data);

      handleClose();
      if (onReportGenerated) {
        onReportGenerated();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Generate Report for {client.full_name}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type *</Label>
            <Controller
              control={control}
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
            {errors.reportType && (
              <p className="text-sm text-destructive">{errors.reportType.message}</p>
            )}
          </div>

          {/* Conditional Fields */}
          {requiresEssenceType && (
            <div className="space-y-2">
              <Label htmlFor="essenceType">Essence Focus *</Label>
              <Controller
                control={control}
                name="essenceType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select essence focus" />
                    </SelectTrigger>
                    <SelectContent>
                      {essenceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {requiresReturnYear && (
            <div className="space-y-2">
              <Label htmlFor="returnYear">Return Year *</Label>
              <Input
                {...register('returnYear')}
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
                  {...register('secondPersonName')}
                  placeholder="Enter second person's name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secondPersonBirthDate">Birth Date *</Label>
                  <Input
                    {...register('secondPersonBirthDate')}
                    type="date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondPersonBirthTime">Birth Time</Label>
                  <Input
                    {...register('secondPersonBirthTime')}
                    type="time"
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondPersonBirthLocation">Birth Location *</Label>
                <Input
                  {...register('secondPersonBirthLocation')}
                  placeholder="City, State/Province, Country"
                />
              </div>
            </div>
          )}

          {requiresRelationshipType && (
            <div className="space-y-2">
              <Label htmlFor="relationshipType">Relationship Type *</Label>
              <Controller
                control={control}
                name="relationshipType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              {...register('notes')}
              placeholder="Any specific focus areas or questions for this report..."
              rows={3}
            />
          </div>

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
      </DialogContent>
    </Dialog>
  );
};

export default ClientReportModal;
