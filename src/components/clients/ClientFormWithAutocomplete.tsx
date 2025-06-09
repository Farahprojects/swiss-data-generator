
import React from 'react';
import { useForm } from 'react-hook-form';
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
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete';
import { usePlaceSelection } from '@/hooks/usePlaceSelection';
import { CreateClientData } from '@/types/database';
import { clientsService } from '@/services/clients';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

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

interface ClientFormWithAutocompleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
}

const ClientFormWithAutocomplete = ({ open, onOpenChange, onClientCreated }: ClientFormWithAutocompleteProps) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
  });

  const { placeData, handlePlaceSelect, updateAddress } = usePlaceSelection();

  const onSubmit = async (data: ClientFormData) => {
    try {
      // Clean up empty strings to undefined for optional fields
      const cleanedData: CreateClientData = {
        full_name: data.full_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        birth_date: data.birth_date || undefined,
        birth_time: data.birth_time || undefined,
        birth_location: placeData.address || data.birth_location || undefined,
        notes: data.notes || undefined,
      };

      await clientsService.createClient(cleanedData);
      
      toast({
        title: "Success",
        description: "Client created successfully!",
      });

      reset();
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
    onOpenChange(false);
  };

  const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
    handlePlaceSelect(place);
    setValue('birth_location', place.formatted_address || '');
  };

  const handleLocationChange = (value: string) => {
    updateAddress(value);
    setValue('birth_location', value);
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
            <Label htmlFor="birth_location">Birth Location</Label>
            <PlaceAutocomplete
              value={placeData.address}
              onChange={handleLocationChange}
              onPlaceSelect={handleLocationSelect}
              placeholder="City, State, Country"
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
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormWithAutocomplete;
