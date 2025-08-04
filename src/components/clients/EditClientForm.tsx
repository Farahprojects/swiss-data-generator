
import React, { useState } from 'react';
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
import { Client, CreateClientData } from '@/types/database';
import { clientsService } from '@/services/clients';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';

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

interface EditClientFormProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated: () => void;
}

const EditClientForm = ({ client, open, onOpenChange, onClientUpdated }: EditClientFormProps) => {
  const { toast } = useToast();
  const [selectedPlaceData, setSelectedPlaceData] = useState<PlaceData | null>(
    client.latitude && client.longitude 
      ? { 
          name: client.birth_location || '', 
          latitude: client.latitude, 
          longitude: client.longitude 
        }
      : null
  );
  
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      full_name: client.full_name,
      email: client.email || '',
      phone: client.phone || '',
      birth_date: client.birth_date || '',
      birth_time: client.birth_time || '',
      birth_location: client.birth_location || '',
      notes: client.notes || '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      const cleanedData: Partial<CreateClientData> = {
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

      await clientsService.updateClient(client.id, cleanedData);
      
      toast({
        title: "Success",
        description: "Client updated successfully!",
      });

      onOpenChange(false);
      onClientUpdated();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    setSelectedPlaceData(null);
    onOpenChange(false);
  };

  const handlePlaceSelect = (placeData: PlaceData) => {
    console.log('Place selected with coordinates:', placeData);
    setSelectedPlaceData(placeData);
    setValue('birth_location', placeData.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Client</DialogTitle>
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
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_time">Birth Time</Label>
              <Input
                id="birth_time"
                type="time"
                {...register('birth_time')}
                step="60"
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
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientForm;
