import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Heart, Target, ArrowLeft, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, Tag } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { SimpleDateTimePicker } from '@/components/ui/SimpleDateTimePicker';
import { astroRequestCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { usePricing } from '@/contexts/PricingContext';
import { toast } from 'sonner';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useUserConversationsStore } from '@/stores/userConversationsStore';
import { chatController } from '@/features/chat/ChatController';

interface AstroDataFormProps {
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
}

export const AstroDataForm: React.FC<AstroDataFormProps> = ({
  onClose,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'secondPerson' | 'payment'>('type');
  const [selectedAstroType, setSelectedAstroType] = useState<string>('');
  const [activeSelector, setActiveSelector] = useState<'date' | 'time' | 'secondDate' | 'secondTime' | null>(null);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string>('');
  const [trustedPricing, setTrustedPricing] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const isMobile = useIsMobile();
  
  // Auth detection
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const isAuthenticated = !!user && !!userId;
  
  // Conversation management for authenticated users
  const { addConversation } = useUserConversationsStore();
  const chat_id = useChatStore((state) => state.chat_id);
  
  
  const { getPriceById, isLoading: pricesLoading } = usePricing();

  const form = useForm<ReportFormData>({
    defaultValues: {
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
      request: '',
      reportType: '',
      promoCode: '',
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const formValues = watch();

  // Get price identifier from form data (mirroring PaymentStep logic)
  const getPriceIdentifier = () => {
    // Prioritize direct reportType for unified behavior
    if (formValues.reportType) {
      return formValues.reportType;
    }
    
    // Fallback to request field for astro data
    if (formValues.request) {
      return formValues.request;
    }
    
    return '';
  };

  // Get base price from cached data (mirroring PaymentStep logic)
  const getBasePrice = () => {
    const priceIdentifier = getPriceIdentifier();
    if (!priceIdentifier) return 0;
    
    const priceData = getPriceById(priceIdentifier);
    return priceData ? Number(priceData.unit_price_usd) : 0;
  };

  // Validate promo code and get trusted pricing (mirroring PaymentStep logic)
  const validatePromoCode = async (promoCode: string): Promise<any> => {
    setIsValidatingPromo(true);
    setPromoError('');

    try {
      const id = getPriceIdentifier();
      
      if (!id) {
        return { valid: false, discount_usd: 0, trusted_base_price_usd: 0, final_price_usd: 0, report_type: '', reason: 'Invalid report type' };
      }

      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode, basePrice: getBasePrice(), reportType: id }
      });

      if (error) {
        return { valid: false, discount_usd: 0, trusted_base_price_usd: getBasePrice(), final_price_usd: getBasePrice(), report_type: id, reason: 'Failed to validate promo code' };
      }

      // Use the base price from cache, but apply promo discount from validation
      const promoResult = data;
      
      return {
        ...promoResult,
        trusted_base_price_usd: getBasePrice(), // Use cached price
        final_price_usd: promoResult.valid ? promoResult.final_price_usd : getBasePrice(),
      };

    } catch (error) {
      console.error('❌ Promo validation exception:', error);
      throw new Error('Failed to validate pricing');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleAstroTypeSelect = (type: string) => {
    setSelectedAstroType(type);
    setValue('request', type);
    setValue('reportType', type);
    setCurrentStep('details');
  };

  const handlePlaceSelect = (place: PlaceData) => {
    setValue('birthLocation', place.name);
    if (place.latitude) setValue('birthLatitude', place.latitude);
    if (place.longitude) setValue('birthLongitude', place.longitude);
    if (place.placeId) setValue('birthPlaceId', place.placeId);
  };

  // Handle form submission for authenticated users
  const handleAuthenticatedSubmit = async (data: ReportFormData) => {
    if (!user) return;
    
    try {
      // Ensure we have a chat_id
      let currentChatId = chat_id || sessionStorage.getItem('therai_chat_id');
      
      if (!currentChatId) {
        // Create a new conversation
        currentChatId = await addConversation(user.id, 'New Chat');
        sessionStorage.setItem('therai_chat_id', currentChatId);
        chatController.initializeConversation(currentChatId);
      }

      // Build payload for translator-edge
      const payload = buildTranslatorPayload(data, currentChatId);
      
      // Invoke translator-edge
      const { data: result, error } = await supabase.functions.invoke('translator-edge', {
        body: payload
      });

      if (error) {
        console.error('[AstroDataForm] Translator-edge error:', error);
        toast.error('Failed to process astro data. Please try again.');
        return;
      }

      // Success - show toast and close modal
      toast.success('Astro data submitted successfully!');
      onClose();
      
    } catch (error) {
      console.error('[AstroDataForm] Error submitting astro data:', error);
      toast.error('Failed to submit astro data. Please try again.');
    }
  };

  // Build payload for translator-edge
  const buildTranslatorPayload = (data: ReportFormData, chatId: string) => {
    const basePayload = {
      user_id: chatId,
      is_guest: false,
      reportType: selectedAstroType,
      email: user?.email,
      name: data.name,
    };

    // Build person_a data
    const personA = {
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      location: data.birthLocation,
      latitude: data.birthLatitude,
      longitude: data.birthLongitude,
      name: data.name,
    };

    // Add optional fields if present
    if (data.timezone) personA.timezone = data.timezone;
    if (data.houseSystem) personA.house_system = data.houseSystem;

    if (selectedAstroType === 'sync' && data.secondPersonName) {
      // Compatibility request with second person
      const personB = {
        birth_date: data.secondPersonBirthDate,
        birth_time: data.secondPersonBirthTime,
        location: data.secondPersonBirthLocation,
        latitude: data.secondPersonLatitude,
        longitude: data.secondPersonLongitude,
        name: data.secondPersonName,
      };

      return {
        ...basePayload,
        request: 'sync',
        person_a: personA,
        person_b: personB,
      };
    } else {
      // Single person request
      return {
        ...basePayload,
        request: data.request || selectedAstroType,
        person_a: personA,
      };
    }
  };

  const handleFormSubmit = (data: ReportFormData) => {
    // If compatibility type is selected, go to second person form
    if (selectedAstroType === 'sync') {
      setCurrentStep('secondPerson');
    } else {
      // For authenticated users, skip payment step and submit directly
      if (isAuthenticated) {
        handleAuthenticatedSubmit(data);
      } else {
        setCurrentStep('payment');
      }
    }
  };

  const handleSecondPersonSubmit = (data: ReportFormData) => {
    // For authenticated users, skip payment step and submit directly
    if (isAuthenticated) {
      handleAuthenticatedSubmit(data);
    } else {
      setCurrentStep('payment');
    }
  };

  const handleSecondPlaceSelect = (place: PlaceData) => {
    setValue('secondPersonBirthLocation', place.name);
    if (place.latitude) setValue('secondPersonLatitude', place.latitude);
    if (place.longitude) setValue('secondPersonLongitude', place.longitude);
    if (place.placeId) setValue('secondPersonPlaceId', place.placeId);
  };

  const handlePaymentSubmit = async () => {
    setIsProcessingPayment(true);
    try {
      const formData = form.getValues();
      const currentPromoCode = formData.promoCode?.trim() || '';
      let pricingResult: any;

      // Validate promo code if provided, otherwise use base pricing
      if (currentPromoCode) {
        pricingResult = await validatePromoCode(currentPromoCode);
        
        if (!pricingResult.valid) {
          setPromoError(pricingResult.reason || 'Invalid Promo Code');
          return;
        }
      } else {
        // No promo code provided - use base pricing
        const priceIdentifier = getPriceIdentifier();
        if (!priceIdentifier) {
          setPromoError('Invalid report type');
          return;
        }
        
        pricingResult = {
          valid: true,
          discount_usd: 0,
          trusted_base_price_usd: getBasePrice(),
          final_price_usd: getBasePrice(),
          report_type: priceIdentifier,
          reason: undefined
        };
      }

      setTrustedPricing(pricingResult);

      // Transform form data to match translator edge function field names (mirroring ReportForm)
      const transformedReportData = {
        // Keep original form fields for compatibility
        ...formData,
        
        // Add translator field names for birth data
        birth_date: formData.birthDate,
        birth_time: formData.birthTime,
        location: formData.birthLocation,
        latitude: formData.birthLatitude,
        longitude: formData.birthLongitude,
        
        // Second person fields with translator names
        second_person_birth_date: formData.secondPersonBirthDate,
        second_person_birth_time: formData.secondPersonBirthTime,
        second_person_location: formData.secondPersonBirthLocation,
        second_person_latitude: formData.secondPersonLatitude,
        second_person_longitude: formData.secondPersonLongitude,
        
        // Ensure request field is set
        request: formData.request || (formData.reportType?.includes('sync') ? 'sync' : 'essence'),
        
        // Guest flags
        is_guest: true
      };

      // Call initiate-report-flow to create guest report and get chat_id
      const { data: response, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData: transformedReportData,
          trustedPricing: pricingResult
        }
      });

      if (error) {
        console.error('Failed to initiate report flow:', error);
        toast.error('Failed to initiate report flow. Please try again.');
        return;
      }

      if (response) {
        console.log('Report flow initiated successfully:', response);
        
        // Check if we need to redirect to Stripe checkout
        if (response.checkoutUrl) {
          console.log(`[AstroForm] 💳 Redirecting to Stripe checkout: ${response.checkoutUrl}`);
          toast.success('Redirecting to payment...');
          
          // Redirect to Stripe checkout
          try {
            window.open(response.checkoutUrl, '_self');
          } catch (redirectError) {
            console.warn('[AstroForm] Failed to redirect with window.open, falling back to location.href');
            window.location.href = response.checkoutUrl;
          }
          return;
        }
        
        // If this is a free report, proceed with chat setup
        if (response.paymentStatus === 'paid' || pricingResult.final_price_usd === 0) {
          console.log(`[AstroForm] ✅ Report ready (${pricingResult.final_price_usd === 0 ? 'free' : 'paid'}), setting up chat for: ${response.guestReportId}`);
          
          // Update URL with guest_id and chat_id for session persistence (no page reload)
          const currentUrl = window.location.pathname;
          const newUrl = `${currentUrl}?guest_id=${response.guestReportId}&chat_id=${response.chatId}`;
          window.history.replaceState({}, "", newUrl);
          
          console.log(`[AstroForm] 🔗 URL updated for session persistence: ${newUrl}`);
          
          // Hydrate chat store immediately so chat is usable right away
          try {
            useChatStore.getState().startConversation(response.chatId, response.guestReportId);
            console.log(`[AstroForm] 🧠 Store hydrated with chat_id and guest_id: ${response.chatId}, ${response.guestReportId}`);
          } catch (e) {
            console.error('[AstroForm] ❌ Failed to hydrate chat store:', e);
          }
          
          // Store the chat_id and guest_report_id for the chat session
          onSubmit({
            ...formData,
            chat_id: response.chatId,
            guest_report_id: response.guestReportId
          });
        } else {
          console.error('[AstroForm] ❌ Unexpected response - no checkout URL and not paid/free');
          toast.error('Unexpected response from server');
        }
      }
    } catch (error) {
      console.error('Error initiating report flow:', error);
      toast.error('Something went wrong. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const goBackToType = () => {
    setCurrentStep('type');
    setSelectedAstroType('');
  };

  const goBackToDetails = () => {
    setCurrentStep('details');
  };

  const goBackToSecondPerson = () => {
    setCurrentStep('secondPerson');
  };

  const ErrorMsg = ({ msg }: { msg: string }) => (
    <div className="text-sm text-red-500 mt-1 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span>{msg}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {(currentStep === 'details' || currentStep === 'secondPerson' || currentStep === 'payment') && (
            <button
              onClick={() => {
                if (currentStep === 'details') goBackToType();
                else if (currentStep === 'secondPerson') setCurrentStep('details');
                else if (currentStep === 'payment') {
                  selectedAstroType === 'sync' ? setCurrentStep('secondPerson') : setCurrentStep('details');
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl font-medium text-gray-900">
            {currentStep === 'type' 
              ? 'Choose Discovery Type' 
              : currentStep === 'details'
              ? 'Your Details'
              : currentStep === 'secondPerson'
              ? 'Second Person Details'
              : 'Review & Payment'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {currentStep === 'type' ? (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-gray-600 text-center mb-6 col-span-full">
                How would you like to explore today
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {astroRequestCategories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedAstroType === category.value;
                
                return (
                  <motion.button
                    key={category.value}
                    type="button"
                    onClick={() => handleAstroTypeSelect(category.value)}
                    className={`w-full p-4 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? 'border-gray-900 bg-gray-900 text-white' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
                        isSelected ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="text-left">
                        <h3 className={`font-medium ${
                          isSelected ? 'text-white' : 'text-gray-900'
                        }`}>
                          {category.title}
                        </h3>
                        <p className={`text-sm ${
                          isSelected ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
              </div>
            </motion.div>
          ) : currentStep === 'details' ? (
            <motion.form
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="Enter your full name"
                    className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                  />
                  {errors.name && <ErrorMsg msg={errors.name.message || ''} />}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    placeholder="your@email.com"
                    className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                  />
                  {errors.email && <ErrorMsg msg={errors.email.message || ''} />}
                </div>

                <div>
                  {isMobile ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <InlineDateTimeSelector
                          type="date"
                          value={formValues.birthDate || ''}
                          onChange={(date) => setValue('birthDate', date)}
                          onConfirm={() => setActiveSelector(null)}
                          onCancel={() => setActiveSelector(null)}
                          isOpen={activeSelector === 'date'}
                          placeholder="Select date"
                          hasError={!!errors.birthDate}
                          onOpen={() => setActiveSelector('date')}
                        />
                        {errors.birthDate && <ErrorMsg msg={errors.birthDate.message || ''} />}
                      </div>
                      <div>
                        <InlineDateTimeSelector
                          type="time"
                          value={formValues.birthTime || ''}
                          onChange={(time) => setValue('birthTime', time)}
                          onConfirm={() => setActiveSelector(null)}
                          onCancel={() => setActiveSelector(null)}
                          isOpen={activeSelector === 'time'}
                          placeholder="Select time"
                          hasError={!!errors.birthTime}
                          onOpen={() => setActiveSelector('time')}
                        />
                        {errors.birthTime && <ErrorMsg msg={errors.birthTime.message || ''} />}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <SimpleDateTimePicker
                        dateValue={formValues.birthDate || ''}
                        timeValue={formValues.birthTime || ''}
                        onDateChange={(date) => {
                          setValue('birthDate', date);
                        }}
                        onTimeChange={(time) => {
                          setValue('birthTime', time);
                        }}
                        hasDateError={!!errors.birthDate}
                        hasTimeError={!!errors.birthTime}
                      />
                      <div className="grid grid-cols-2 gap-4 mt-1">
                        <div>
                          {errors.birthDate && <ErrorMsg msg={errors.birthDate.message || ''} />}
                        </div>
                        <div>
                          {errors.birthTime && <ErrorMsg msg={errors.birthTime.message || ''} />}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <CleanPlaceAutocomplete
                    value={formValues.birthLocation || ''}
                    onChange={(val) => setValue('birthLocation', val)}
                    onPlaceSelect={handlePlaceSelect}
                     placeholder="Enter birth city, state, country"
                    className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                  />
                  {errors.birthLocation && <ErrorMsg msg={errors.birthLocation.message || ''} />}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToType}
                  className="flex-1 hover:bg-gray-100 hover:text-gray-700 border-gray-200"
                >
                  Back
                </Button>
                                            <Button
                              type="submit"
                              className="flex-1 bg-gray-900 hover:bg-gray-800"
                            >
                              Next
                            </Button>
              </div>
            </motion.form>
          ) : currentStep === 'secondPerson' ? (
            <motion.form
              key="secondPerson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit(handleSecondPersonSubmit)}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="secondPersonName" className="text-sm font-medium text-gray-700">
                    Second Person's Full Name *
                  </Label>
                  <Input
                    id="secondPersonName"
                    {...register('secondPersonName', { required: 'Second person name is required' })}
                    placeholder="Enter second person's full name"
                    className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                  />
                  {errors.secondPersonName && <ErrorMsg msg={errors.secondPersonName.message || ''} />}
                </div>

                <div>
                  {isMobile ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <InlineDateTimeSelector
                          type="date"
                          value={formValues.secondPersonBirthDate || ''}
                          onChange={(date) => setValue('secondPersonBirthDate', date)}
                          onConfirm={() => setActiveSelector(null)}
                          onCancel={() => setActiveSelector(null)}
                          isOpen={activeSelector === 'secondDate'}
                          placeholder="Select date"
                          hasError={!!errors.secondPersonBirthDate}
                          onOpen={() => setActiveSelector('secondDate')}
                        />
                        {errors.secondPersonBirthDate && <ErrorMsg msg={errors.secondPersonBirthDate.message || ''} />}
                      </div>

                      <div>
                        <InlineDateTimeSelector
                          type="time"
                          value={formValues.secondPersonBirthTime || ''}
                          onChange={(time) => setValue('secondPersonBirthTime', time)}
                          onConfirm={() => setActiveSelector(null)}
                          onCancel={() => setActiveSelector(null)}
                          isOpen={activeSelector === 'secondTime'}
                          placeholder="Select time"
                          hasError={!!errors.secondPersonBirthTime}
                          onOpen={() => setActiveSelector('secondTime')}
                        />
                        {errors.secondPersonBirthTime && <ErrorMsg msg={errors.secondPersonBirthTime.message || ''} />}
                      </div>
                    </div>
                  ) : (
                    <SimpleDateTimePicker
                      dateValue={formValues.secondPersonBirthDate || ''}
                      timeValue={formValues.secondPersonBirthTime || ''}
                      onDateChange={(date) => setValue('secondPersonBirthDate', date)}
                      onTimeChange={(time) => setValue('secondPersonBirthTime', time)}
                      hasDateError={!!errors.secondPersonBirthDate}
                      hasTimeError={!!errors.secondPersonBirthTime}
                    />
                  )}
                  {(errors.secondPersonBirthDate || errors.secondPersonBirthTime) && (
                    <div className="mt-2 space-y-1">
                      {errors.secondPersonBirthDate && <ErrorMsg msg={errors.secondPersonBirthDate.message || ''} />}
                      {errors.secondPersonBirthTime && <ErrorMsg msg={errors.secondPersonBirthTime.message || ''} />}
                    </div>
                  )}
                </div>

                <div>
                  <CleanPlaceAutocomplete
                    value={formValues.secondPersonBirthLocation || ''}
                    onChange={(val) => setValue('secondPersonBirthLocation', val)}
                    onPlaceSelect={handleSecondPlaceSelect}
                    placeholder="Enter birth city, state, country"
                    className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                  />
                  {errors.secondPersonBirthLocation && <ErrorMsg msg={errors.secondPersonBirthLocation.message || ''} />}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('details')}
                  className="flex-1 hover:bg-gray-100 hover:text-gray-700 border-gray-200"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  {isAuthenticated ? 'Create Astro Data' : 'Continue to Payment'}
                </Button>
              </div>
            </motion.form>
          ) : !isAuthenticated ? (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Payment Step */}
              <div className="text-center mb-6">
                <p className="text-gray-600">
                  Everything's in position. Complete your journey.
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Order Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-base text-gray-700">
                    <span>
                      {selectedAstroType === 'essence' ? 'The Self' : selectedAstroType === 'sync' ? 'Compatibility' : 'Discovery'}
                    </span>
                    <span>${pricesLoading ? '...' : (trustedPricing?.trusted_base_price_usd || getBasePrice()).toFixed(2)}</span>
                  </div>
                  {trustedPricing?.discount_usd > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-light">Promo discount</span>
                      <span className="text-green-600 font-light">
                        -${trustedPricing.discount_usd.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-medium text-gray-900">
                  <span>Total</span>
                  <span>${pricesLoading ? '...' : (trustedPricing?.final_price_usd || getBasePrice()).toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <Collapsible 
                open={showPromoCode} 
                onOpenChange={setShowPromoCode}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-light hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    <span>Have a promo code?</span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="promoCode" className="text-base font-light text-gray-700">Promo Code</Label>
                      
                      <div className="relative">
                        <Input
                          id="promoCode"
                          {...register('promoCode')}
                          placeholder="Enter promo code"
                          className={`h-12 rounded-xl text-base font-light border-gray-200 focus:border-gray-400 transition-all duration-200 ${
                            promoError ? 'border-red-400 ring-1 ring-red-400' : ''
                          }`}
                          disabled={isValidatingPromo}
                        />
                        
                        {isValidatingPromo && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 h-4 animate-spin" />
                          </div>
                        )}
                        
                        {/* Clean text error message */}
                        {promoError && (
                          <p className="mt-2 text-sm text-red-600 font-light leading-relaxed">
                            {promoError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    selectedAstroType === 'sync' ? setCurrentStep('secondPerson') : setCurrentStep('details');
                  }}
                  className="flex-1 hover:bg-gray-100 hover:text-gray-700 border-gray-200"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={isProcessingPayment}
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  {isProcessingPayment ? 'Processing...' : 'Proceed to Payment'}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
