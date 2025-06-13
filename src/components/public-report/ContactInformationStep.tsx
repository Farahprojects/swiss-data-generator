
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReportFormData } from './types';

interface ContactInformationStepProps {
  form: UseFormReturn<ReportFormData>;
}

const ContactInformationStep = ({ form }: ContactInformationStepProps) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="border-t pt-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">2</div>
          <h2 className="text-2xl font-semibold">Contact Information</h2>
        </div>
        
        <div className="pl-1 md:pl-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter your full name"
                className="h-12"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                className="h-12"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInformationStep;
