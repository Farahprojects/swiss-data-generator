import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CreateClientData } from '@/types/database';
import { clientsService } from '@/services/clients';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useTabVisibility } from '@/hooks/useTabVisibility';

const clientFormSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  birth_time: z.string().optional(),
  birth_location: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
}

const ClientForm = ({ open, onOpenChange, onClientCreated }: ClientFormProps) => {
  const { toast } = useToast();
  const { isVisible } = useTabVisibility();
  const [selectedPlaceData, setSelectedPlaceData] = useState<PlaceData | null>(null);
  
  // Form persistence
  const { formData, updateFormData, clearFormData, autoSave } = useFormPersistence(
    'newClientForm',
    {
      full_name: '',
      email: '',
      phone: '',
      birth_date: '',
      birth_time: '',
      birth_location: '',
      notes: ''
    }
  );
  
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: formData
  });

  // Watch form values and auto-save when tab is not visible
  const watchedValues = watch();
  
  useEffect(() => {
    if (!isVisible && open) {
      // Auto-save form data when tab becomes hidden
      updateFormData(watchedValues);
    }
  }, [isVisible, open, watchedValues, updateFormData]);

  // Auto-save on form field changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        updateFormData(watchedValues);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues, open, updateFormData]);

  // Restore form data when modal opens
  useEffect(() => {
    if (open && formData) {
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          setValue(key as keyof ClientFormData, value);
        }
      });
    }
  }, [open, formData, setValue]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      // Clean up empty strings to undefined for optional fields
      const cleanedData: CreateClientData = {
        full_name: data.full_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        birth_date: data.birth_date || undefined,
        birth_time: data.birth_time || undefined,
        birth_location: data.birth_location || undefined,
        latitude: selectedPlaceData?.latitude,
        longitude: selectedPlaceData?.longitude,
        notes: data.notes || undefined,
      };

      await clientsService.createClient(cleanedData);
      
      toast({
        title: "Success",
        description: "Client created successfully!",
      });

      reset();
      setSelectedPlaceData(null);
      clearFormData(); // Clear persisted form data
      onOpenChange(false);
      onClientCreated();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    setSelectedPlaceData(null);
    clearFormData(); // Clear persisted form data
    onOpenChange(false);
  };

  const handlePlaceSelect = (placeData: PlaceData) => {
    console.log('Place selected with coordinates:', placeData);
    setSelectedPlaceData(placeData);
    setValue('birth_location', placeData.name);
    autoSave('birth_location', placeData.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add New Client</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Enter client's full name"
                onChange={(e) => {
                  register('full_name').onChange(e);
                  autoSave('full_name', e.target.value);
                }}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="client@example.com"
                onChange={(e) => {
                  register('email').onChange(e);
                  autoSave('email', e.target.value);
                }}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="Enter phone number"
              onChange={(e) => {
                register('phone').onChange(e);
                autoSave('phone', e.target.value);
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
                onChange={(e) => {
                  register('birth_date').onChange(e);
                  autoSave('birth_date', e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_time">Birth Time</Label>
              <Input
                id="birth_time"
                type="time"
                {...register('birth_time')}
                step="60"
                onChange={(e) => {
                  register('birth_time').onChange(e);
                  autoSave('birth_time', e.target.value);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Controller
              name="birth_location"
              control={control}
              render={({ field }) => (
                <CleanPlaceAutocomplete
                  label="Birth Location"
                  value={field.value || ''}
                  onChange={field.onChange}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Enter birth city, state, country"
                  id="birth_location"
                  error={errors.birth_location?.message}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Goals</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="What are the client's main goals and aspirations..."
              rows={4}
              onChange={(e) => {
                register('notes').onChange(e);
                autoSave('notes', e.target.value);
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;
