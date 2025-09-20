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
import { X } from 'lucide-react';
import { Client } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { clientReportsService, ClientReportFormData } from '@/services/clientReports';

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

  const requiresSecondPerson = selectedReportType === 'sync';
  const requiresRelationshipType = requiresSecondPerson;
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';

  const onSubmit = async (data: ReportFormData) => {
    try {
      setIsGenerating(true);
      
      // Check if client has required birth information
      if (!client.birth_date || !client.birth_time || !client.birth_location) {
        toast({
          title: "Missing Birth Information",
          description: "This client needs complete birth information (date, time, and location) to generate reports.",
          variant: "destructive",
        });
        return;
      }

      // Convert form data to service format
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

      // Generate the report
      await clientReportsService.generateClientReport(client, serviceData);

      toast({
        title: "Report Generated Successfully",
        description: `${data.reportType} report has been generated for ${client.full_name}.`,
      });

      handleClose();
      if (onReportGenerated) {
        onReportGenerated();
      }
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
      </DialogContent>
    </Dialog>
  );
};

export default ClientReportModal;
