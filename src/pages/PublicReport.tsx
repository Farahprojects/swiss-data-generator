
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import ReportGuideModal from '@/components/public-report/ReportGuideModal';
import ReportHeroSection from '@/components/public-report/ReportHeroSection';
import ReportFeaturesSection from '@/components/public-report/ReportFeaturesSection';
import ReportTypeSelectionStep from '@/components/public-report/ReportTypeSelectionStep';
import ContactInformationStep from '@/components/public-report/ContactInformationStep';
import BirthDetailsStep from '@/components/public-report/BirthDetailsStep';
import SecondPersonDetailsStep from '@/components/public-report/SecondPersonDetailsStep';
import PromoCodeSection from '@/components/public-report/PromoCodeSection';
import { getProductByName } from '@/utils/stripe-products';
import { guestCheckoutWithAmount } from '@/utils/guest-checkout';
import { useToast } from '@/hooks/use-toast';
import { reportSchema, ReportFormData } from '@/components/public-report/types';

const PublicReport = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [showReportGuide, setShowReportGuide] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: '',
      relationshipType: '',
      essenceType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      birthLatitude: undefined,
      birthLongitude: undefined,
      birthPlaceId: '',
      secondPersonName: '',
      secondPersonBirthDate: '',
      secondPersonBirthTime: '',
      secondPersonBirthLocation: '',
      secondPersonLatitude: undefined,
      secondPersonLongitude: undefined,
      secondPersonPlaceId: '',
      returnYear: '',
      notes: '',
      promoCode: '',
    },
  });

  const { handleSubmit, watch, setValue } = form;
  const selectedReportType = watch('reportType');

  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const handlePlaceSelect = (placeData: PlaceData, fieldPrefix = '') => {
    const locationField = fieldPrefix ? `${fieldPrefix}Location` : 'birthLocation';
    const latitudeField = fieldPrefix ? `${fieldPrefix}Latitude` : 'birthLatitude';
    const longitudeField = fieldPrefix ? `${fieldPrefix}Longitude` : 'birthLongitude';
    const placeIdField = fieldPrefix ? `${fieldPrefix}PlaceId` : 'birthPlaceId';
    
    setValue(locationField as keyof ReportFormData, placeData.name);
    
    if (placeData.latitude && placeData.longitude) {
      setValue(latitudeField as keyof ReportFormData, placeData.latitude);
      setValue(longitudeField as keyof ReportFormData, placeData.longitude);
      console.log(`📍 Coordinates saved: ${placeData.latitude}, ${placeData.longitude}`);
    }
    
    if (placeData.placeId) {
      setValue(placeIdField as keyof ReportFormData, placeData.placeId);
    }
  };

  // Function to build the complete report type
  const buildCompleteReportType = (data: ReportFormData) => {
    if (data.reportType === 'essence' && data.essenceType) {
      return `essence_${data.essenceType}`;
    }
    if (data.reportType === 'sync' && data.relationshipType) {
      return `sync_${data.relationshipType}`;
    }
    // For other report types that don't have subtypes
    return data.reportType;
  };

  // Report pricing configuration - database lookup only
  const getReportPriceAndDescription = async (reportType: string, relationshipType?: string, essenceType?: string) => {
    const baseDescriptions = {
      'sync': 'Sync Compatibility Report',
      'essence': 'Personal Essence Report',
      'flow': 'Life Flow Analysis Report',
      'mindset': 'Mindset Transformation Report',
      'monthly': 'Monthly Astrology Forecast',
      'focus': 'Life Focus Guidance Report',
    };

    let description = baseDescriptions[reportType as keyof typeof baseDescriptions] || 'Astrology Report';
    
    // Add specific details to description
    if (relationshipType) {
      description += ` (${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Focus)`;
    }
    if (essenceType) {
      description += ` - ${essenceType.charAt(0).toUpperCase() + essenceType.slice(1)} Analysis`;
    }

    // Map report types to product names in the database
    const reportTypeToProductName = {
      'sync': 'Sync',
      'essence': 'Essence',
      'flow': 'Flow',
      'mindset': 'Mindset',
      'monthly': 'Monthly',
      'focus': 'Focus',
    };

    const productName = reportTypeToProductName[reportType as keyof typeof reportTypeToProductName];
    
    if (!productName) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    const product = await getProductByName(productName);
    if (!product) {
      throw new Error(`Product not found in database: ${productName}`);
    }

    return { 
      amount: product.amount_usd, 
      description: product.description || description 
    };
  };

  const onSubmit = async (data: ReportFormData) => {
    setIsProcessing(true);
    setIsPricingLoading(true);
    
    try {
      console.log('Report data:', data);
      
      // Build the complete report type
      const completeReportType = buildCompleteReportType(data);
      console.log('Complete report type:', completeReportType);
      
      const { amount, description } = await getReportPriceAndDescription(
        data.reportType, 
        data.relationshipType, 
        data.essenceType
      );
      
      setIsPricingLoading(false);

      // Prepare report data for storage in payment metadata
      const reportData = {
        reportType: completeReportType, // Use the complete report type here
        relationshipType: data.relationshipType,
        essenceType: data.essenceType,
        name: data.name,
        email: data.email,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthLocation: data.birthLocation,
        birthLatitude: data.birthLatitude,
        birthLongitude: data.birthLongitude,
        birthPlaceId: data.birthPlaceId,
        secondPersonName: data.secondPersonName,
        secondPersonBirthDate: data.secondPersonBirthDate,
        secondPersonBirthTime: data.secondPersonBirthTime,
        secondPersonBirthLocation: data.secondPersonBirthLocation,
        secondPersonLatitude: data.secondPersonLatitude,
        secondPersonLongitude: data.secondPersonLongitude,
        secondPersonPlaceId: data.secondPersonPlaceId,
        returnYear: data.returnYear,
        notes: data.notes,
        promoCode: data.promoCode,
      };
      
      const result = await guestCheckoutWithAmount(data.email, amount, description, reportData);
      
      if (!result.success) {
        toast({
          title: "Payment Error",
          description: result.error || "Failed to initiate checkout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing report:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsPricingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ReportHeroSection />

      {/* Main Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            {/* Step 1: Report Type Selection */}
            <ReportTypeSelectionStep
              form={form}
              selectedReportType={selectedReportType}
              onShowReportGuide={() => setShowReportGuide(true)}
            />

            {/* Step 2: Contact Information */}
            {selectedReportType && (
              <ContactInformationStep form={form} />
            )}

            {/* Step 3: Birth Details */}
            {selectedReportType && (
              <BirthDetailsStep
                form={form}
                onPlaceSelect={handlePlaceSelect}
              />
            )}

            {/* Step 4: Second Person Details (for compatibility/sync reports) */}
            {requiresSecondPerson && (
              <SecondPersonDetailsStep
                form={form}
                onPlaceSelect={handlePlaceSelect}
              />
            )}

            {/* Generate Report Button and Promo Code Section */}
            {selectedReportType && (
              <div className="border-t pt-8 flex flex-col items-center space-y-4">
                <Button 
                  type="submit"
                  size="lg" 
                  className="px-12 py-6 text-lg"
                  disabled={isProcessing || isPricingLoading}
                >
                  {isProcessing || isPricingLoading ? 'Processing...' : 'Generate My Report'}
                </Button>
                
                <PromoCodeSection
                  form={form}
                  showPromoCode={showPromoCode}
                  onTogglePromoCode={() => setShowPromoCode(!showPromoCode)}
                />
              </div>
            )}
          </form>
        </div>
      </div>

      <ReportFeaturesSection />

      {/* Report Guide Modal */}
      <ReportGuideModal 
        isOpen={showReportGuide} 
        onClose={() => setShowReportGuide(false)} 
      />
    </div>
  );
};

export default PublicReport;
