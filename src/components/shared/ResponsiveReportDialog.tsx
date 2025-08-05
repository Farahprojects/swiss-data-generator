import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useUnifiedReportForm } from '@/hooks/useUnifiedReportForm';
import { ReportFormSteps } from './ReportFormSteps';
import MobileDrawerHeader from './MobileDrawerHeader';
import MobileDrawerFooter from './MobileDrawerFooter';

interface ResponsiveReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  coachSlug?: string;
  themeColor?: string;
  fontFamily?: string;
  onFormStateChange?: (isValid: boolean, step: number) => void;
  onReportCreated?: (data: { name: string; email: string; guestReportId: string }) => void;
}

export const ResponsiveReportDialog: React.FC<ResponsiveReportDialogProps> = ({
  isOpen,
  onClose,
  coachSlug,
  themeColor,
  fontFamily,
  onFormStateChange,
  onReportCreated
}) => {
  const isMobile = useIsMobile();
  const formState = useUnifiedReportForm();
  
  const {
    form,
    currentStep,
    nextStep,
    prevStep,
    canGoNext,
    isLastStep,
    isProcessing,
    reportCreated,
    submitReport,
    requiresSecondPerson
  } = formState;

  const totalSteps = requiresSecondPerson ? 4 : 3;

  const handleSubmit = async () => {
    const data = form.getValues();
    try {
      const trustedPricing = { 
        valid: true, 
        discount_usd: 0, 
        trusted_base_price_usd: 0, 
        final_price_usd: 0, 
        report_type: data.reportType 
      };
      const result = await submitReport(data, trustedPricing);
      
      if (result.success && result.guestReportId) {
        onReportCreated?.({
          name: data.name,
          email: data.email,
          guestReportId: result.guestReportId
        });
      }
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const content = (
    <ReportFormSteps
      formState={formState}
      coachSlug={coachSlug}
      themeColor={themeColor}
      fontFamily={fontFamily}
      onFormStateChange={onFormStateChange}
      onSubmit={handleSubmit}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <MobileDrawerHeader
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={onClose}
          />
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {content}
          </div>
          
          <MobileDrawerFooter
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrevious={prevStep}
            onNext={nextStep}
            onSubmit={handleSubmit}
            canGoNext={canGoNext}
            isProcessing={isProcessing}
            isLastStep={isLastStep}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
};