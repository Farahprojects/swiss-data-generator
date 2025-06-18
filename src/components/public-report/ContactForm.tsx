
import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';

interface ContactFormProps {
  register: UseFormRegister<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
}

const ContactForm = ({ register, errors }: ContactFormProps) => {
  return (
    <FormStep stepNumber={2} title="Contact Information" className="bg-muted/20">
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </FormStep>
  );
};

export default ContactForm;
