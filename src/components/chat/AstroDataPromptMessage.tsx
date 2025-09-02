import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AstroDataForm } from './AstroDataForm';
import { ReportFormData } from '@/types/public-report';

interface AstroDataPromptMessageProps {
  onAddAstroData: () => void;
  onContinueWithout: () => void;
}

export const AstroDataPromptMessage: React.FC<AstroDataPromptMessageProps> = ({
  onAddAstroData,
  onContinueWithout,
}) => {
  const [showForm, setShowForm] = useState(false);

  const handleAddAstroData = () => {
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
  };

  const handleFormSubmit = (data: ReportFormData & { chat_id?: string; guest_report_id?: string }) => {
    console.log('Astro data submitted:', data);
    
    if (data.chat_id && data.guest_report_id) {
      // Success! We have a chat_id and guest_report_id
      console.log('✅ Report flow initiated successfully:', {
        chat_id: data.chat_id,
        guest_report_id: data.guest_report_id
      });
      
      // TODO: Store these in the chat store or context
      // For now, just show success and close form
      setShowForm(false);
      onAddAstroData();
    } else {
      console.error('Missing chat_id or guest_report_id from form submission');
    }
  };

  if (showForm) {
    return (
      <div className="flex items-start justify-start mb-8">
        <div className="w-full max-w-2xl lg:max-w-4xl">
          <AstroDataForm
            onClose={handleFormClose}
            onSubmit={handleFormSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-start mb-8">
      {/* Message Content */}
      <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black">
        <p className="text-base font-light leading-relaxed text-left mb-4">
          Would you like to add your astrological data for a more personalized experience? This will help me provide insights tailored to your unique chart.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleAddAstroData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-lg"
          >
            <Sparkles className="w-4 h-4" />
            Add Astro Data
          </Button>
          
          <Button
            onClick={onContinueWithout}
            variant="outline"
            className="px-4 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
          >
            Continue Without
          </Button>
        </div>
      </div>
    </div>
  );
};
