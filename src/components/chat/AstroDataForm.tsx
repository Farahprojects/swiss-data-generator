import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Heart, Target, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { SimpleDateTimePicker } from '@/components/ui/SimpleDateTimePicker';
import { astroRequestCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/integrations/supabase/config';
import { toast } from 'sonner';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLocation, useNavigate } from 'react-router-dom';
// Removed - using single source of truth in useChatStore
import { chatController } from '@/features/chat/ChatController';
import { unifiedWebSocketService } from '@/services/websocket/UnifiedWebSocketService';

interface AstroDataFormProps {
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
  preselectedType?: string;
  reportType?: string;
  // Universal ID parameter - can be chat_id or user_id
  contextId?: string;
  // Whether this form is being used in profile flow (should trigger onSubmit)
  isProfileFlow?: boolean;
  // UI variant: when 'insights', suppress internal header/type step
  variant?: 'standalone' | 'insights';
}

export const AstroDataForm: React.FC<AstroDataFormProps> = ({
  onClose,
  onSubmit,
  preselectedType,
  reportType,
  contextId,
  isProfileFlow = false,
  variant = 'standalone',
}) => {
  const isInsights = variant === 'insights';
  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'secondPerson'>(
    isInsights ? 'details' : (preselectedType ? 'details' : 'type')
  );
  const [selectedAstroType, setSelectedAstroType] = useState<string>(preselectedType || '');
  const [activeSelector, setActiveSelector] = useState<'date' | 'time' | 'secondDate' | 'secondTime' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isCreatingReportId, setIsCreatingReportId] = useState(false);
  const isMobile = useIsMobile();
  
  // Auth detection - use route-based logic
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Route-based authentication: /c routes are authenticated
  const isAuthenticated = location.pathname.startsWith('/c/');
  
  // Conversation management for authenticated users
  const { addThread } = useChatStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const { mode } = useMode();
  
  // Universal ID logic: use provided contextId or fall back to chat store
  const finalContextId = contextId || chat_id;

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
      request: preselectedType || '',
      reportType: reportType || null,
    },
  });

  const { register, handleSubmit, setValue, setError, watch, formState: { errors } } = form;
  const formValues = watch();

  // Create insight report ID when we have reportType and user
  useEffect(() => {
    if (reportType && user?.id && currentStep === 'details' && !reportId && !isCreatingReportId) {
      createInsightReportId(user.id, reportType);
    }
  }, [reportType, user?.id, currentStep, reportId, isCreatingReportId]);

  const handleAstroTypeSelect = (type: string) => {
    setSelectedAstroType(type);
    setValue('request', type);
    setValue('reportType', null);
    setCurrentStep('details');
  };

  // Function to create insight report ID
  const createInsightReportId = async (userId: string, reportType: string) => {
    if (reportId) return reportId; // Already have a report ID
    
    setIsCreatingReportId(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-insight-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          user_id: userId,
          report_type: reportType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create report ID');
      }

      const data = await response.json();
      setReportId(data.report_id);
      return data.report_id;
    } catch (error) {
      console.error('[AstroDataForm] Error creating report ID:', error);
      toast.error('Failed to initialize report. Please try again.');
      return null;
    } finally {
      setIsCreatingReportId(false);
    }
  };

  const handlePlaceSelect = (place: PlaceData) => {
    setValue('birthLocation', place.name);
    if (place.latitude) setValue('birthLatitude', place.latitude);
    if (place.longitude) setValue('birthLongitude', place.longitude);
    if (place.placeId) setValue('birthPlaceId', place.placeId);
  };

  // Lightweight guards to ensure lat/lng are present before progressing
  const isPrimaryLocationPending = Boolean(
    (formValues.birthLocation && formValues.birthLocation.trim().length > 0) &&
    (formValues.birthLatitude === undefined || formValues.birthLongitude === undefined)
  );

  // Handle form submission for authenticated users
  const handleAuthenticatedSubmit = async (data: ReportFormData) => {
    if (!user) return;
    
    // If we have a reportType but no reportId yet, wait for it to be created
    if (reportType && !reportId) {
      // Wait a bit for the report ID to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!reportId) {
        toast.error('Report initialization is taking longer than expected. Please try again.');
        return;
      }
    }
    
    setIsProcessing(true);
    
    try {
      // Ensure we have a chat_id
      let currentChatId = chat_id;
      
      if (!currentChatId) {
        // For authenticated users only
        currentChatId = await addThread(user.id, 'New Chat');
        chatController.initializeConversation(currentChatId);
      }

      // Add pending insight thread to UI if this is an insight report
      if (reportId && reportType) {
        const { addPendingInsightThread } = useChatStore.getState();
        addPendingInsightThread(reportId, reportType);
      }

      // Subscribe to WebSocket for report completion if we have a report_id
      if (reportId) {
        await unifiedWebSocketService.subscribeToReport(reportId);
      }
      
      // Build payload for initiate-auth-report
      const payload = buildAuthReportPayload(data, currentChatId);
      
      // Invoke initiate-auth-report edge function
      const { data: result, error } = await supabase.functions.invoke('initiate-auth-report', {
        body: payload
      });

      if (error) {
        console.error('[AstroDataForm] Initiate-auth-report error:', error);
        toast.error('Failed to process astro data. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Call onSubmit for profile flow and insights variant
      if (isProfileFlow || variant === 'insights') {
        onSubmit(data);
        // Do NOT close the modal here; parent will handle next step
      } else {
        // Chat flow - just close the modal
        onClose();
      }
      
    } catch (error) {
      console.error('[AstroDataForm] Error submitting astro data:', error);
      toast.error('Failed to submit astro data. Please try again.');
      setIsProcessing(false);
    }
  };

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
  const convertDateFormat = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    
    // If already in YYYY-MM-DD format, return as is
    if (dateStr.includes('-') && dateStr.length === 10) {
      return dateStr;
    }
    
    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
    }
    
    return dateStr;
  };

  // Build payload for initiate-auth-report
  const buildAuthReportPayload = (data: ReportFormData, contextId: string) => {
    // Build person_a data
    const personA: any = {
      birth_date: convertDateFormat(data.birthDate),
      birth_time: data.birthTime,
      location: data.birthLocation,
      latitude: data.birthLatitude,
      longitude: data.birthLongitude,
      name: data.name,
    };
    
    // Add optional fields if present
    if (data.timezone) personA.timezone = data.timezone;
    if (data.houseSystem) personA.house_system = data.houseSystem;

    const reportData: any = {
      request: data.request || selectedAstroType,
      reportType: data.reportType, // Always use the reportType from form data - no guessing
      person_a: personA,
    };

    // Add person_b for compatibility requests
    if (selectedAstroType === 'sync' && data.secondPersonName) {
      const personB: any = {
        birth_date: data.secondPersonBirthDate,
        birth_time: data.secondPersonBirthTime,
        location: data.secondPersonBirthLocation,
        latitude: data.secondPersonLatitude,
        longitude: data.secondPersonLongitude,
        name: data.secondPersonName,
      };
      
      // Add optional fields for person_b if present
      if (data.secondPersonTimezone) personB.timezone = data.secondPersonTimezone;
      if (data.secondPersonHouseSystem) personB.house_system = data.secondPersonHouseSystem;
      
      reportData.person_b = personB;
    }

    return {
      chat_id: reportId || contextId, // Use report_id for insights, contextId for chat/profile flows
      report_id: reportId, // Pass report_id for insights reports
      report_data: reportData,
      email: user?.email || '',
      name: data.name,
      mode: mode, // Add mode to payload
    };
  };

  const handleFormSubmit = (data: ReportFormData) => {
    // Ensure required fields are set before moving on
    if (!data.name?.trim()) {
      setError('name', { type: 'manual', message: 'Name is required' });
      return;
    }
    if (!data.birthDate) {
      setError('birthDate' as any, { type: 'manual', message: 'Date of birth is required' });
      return;
    }
    if (!data.birthTime) {
      setError('birthTime' as any, { type: 'manual', message: 'Time of birth is required' });
      return;
    }
    if (!data.birthLocation?.trim()) {
      setError('birthLocation', { type: 'manual', message: 'Location is required' });
      return;
    }
    // Require coordinates from a confirmed selection
    if (data.birthLatitude === undefined || data.birthLongitude === undefined) {
      setError('birthLocation', { type: 'manual', message: 'Please select a suggestion to confirm coordinates' });
      toast.error('Please select a location from suggestions to add latitude and longitude.');
      return;
    }
    // If compatibility type is selected, go to second person form
    if (selectedAstroType === 'sync') {
      setCurrentStep('secondPerson');
    } else {
      // Submit directly for authenticated users
      handleAuthenticatedSubmit(data);
    }
  };

  const handleSecondPersonSubmit = (data: ReportFormData) => {
    // Require second person fields when on compatibility flow
    if (!data.secondPersonName?.trim()) {
      setError('secondPersonName', { type: 'manual', message: 'Second person name is required' });
      return;
    }
    if (!data.secondPersonBirthDate) {
      setError('secondPersonBirthDate' as any, { type: 'manual', message: 'Date of birth is required' });
      return;
    }
    if (!data.secondPersonBirthTime) {
      setError('secondPersonBirthTime' as any, { type: 'manual', message: 'Time of birth is required' });
      return;
    }
    if (!data.secondPersonBirthLocation?.trim()) {
      setError('secondPersonBirthLocation', { type: 'manual', message: 'Location is required' });
      return;
    }
    if (data.secondPersonLatitude === undefined || data.secondPersonLongitude === undefined) {
      setError('secondPersonBirthLocation', { type: 'manual', message: 'Please select a suggestion to confirm coordinates' });
      toast.error('Please select a location for the second person to add latitude and longitude.');
      return;
    }
    // Submit directly for authenticated users
    handleAuthenticatedSubmit(data);
  };

  const handleSecondPlaceSelect = (place: PlaceData) => {
    setValue('secondPersonBirthLocation', place.name);
    if (place.latitude) setValue('secondPersonLatitude', place.latitude);
    if (place.longitude) setValue('secondPersonLongitude', place.longitude);
    if (place.placeId) setValue('secondPersonPlaceId', place.placeId);
  };

  // Unified close handler for mobile overlay: restore page state and let parent handle routing/modal
  const handleClose = () => {
    try {
      const html = document.documentElement;
      const scrollY = html.getAttribute('data-scroll-y');
      html.classList.remove('lock-scroll');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
        html.removeAttribute('data-scroll-y');
      }
      document.body.classList.remove('astro-form-open');
    } catch {}
    // Auto-delete empty conversation if user exits without processing
    (async () => {
      try {
        // Only for authenticated chat flow
        if (!isAuthenticated || !user?.id) return;
        const currentChatId = chat_id;
        if (!currentChatId) return;

        // Check if chat has any messages
        const { count, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', currentChatId);
        if (countError) return;

        // If empty, delete conversation (owned by user)
        if ((count ?? 0) === 0) {
          await supabase
            .from('conversations')
            .delete()
            .eq('id', currentChatId)
            .eq('user_id', user.id);
          // Remove from UI store immediately
          const { removeThread, clearChat } = useChatStore.getState();
          removeThread(currentChatId);
          clearChat();
          
          // Redirect away from deleted chat URL
          if (location.pathname.includes(currentChatId)) {
            navigate('/therai', { replace: true });
          }
        }
      } catch {}
    })();
    onClose();
  };



  const goBackToType = () => {
    setCurrentStep('type');
    setSelectedAstroType('');
  };

  const goBackToDetails = () => {
    setCurrentStep('details');
  };


  const ErrorMsg = ({ msg }: { msg: string }) => (
    <div className="text-sm text-red-500 mt-1 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span>{msg}</span>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleClose}
        />
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-white border border-gray-200 shadow-lg overflow-hidden ${
          isMobile 
            ? 'fixed inset-0 z-50 rounded-none flex flex-col' 
            : 'rounded-2xl'
        }`}
      >
      {/* Header (hidden for insights flow; InsightsModal provides header/stepper) */}
      {isInsights ? null : (
        <div className={`flex items-center justify-between border-b border-gray-200 ${
          isMobile ? 'p-4 pt-safe' : 'p-4'
        }`}>
          <div className="flex items-center gap-3">
            {(currentStep === 'details' || currentStep === 'secondPerson') && (
              <button
                onClick={() => {
                  if (currentStep === 'details') goBackToType();
                  else if (currentStep === 'secondPerson') setCurrentStep('details');
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
                : 'Second Person Details'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4 pb-safe' : 'p-6'}`}>
        <AnimatePresence mode="wait">
          {currentStep === 'type' && !isInsights ? (
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

              <div className={`flex gap-3 ${isMobile ? 'bg-white pt-4 pb-safe' : 'pt-4'}`}>
                {isInsights ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBackToType}
                    className="flex-1 hover:bg-gray-100 hover:text-gray-700 border-gray-200"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Next'}
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

              <div className={`flex gap-3 ${isMobile ? 'bg-white pt-4 pb-safe' : 'pt-4'}`}>
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
                  disabled={isProcessing}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Create Astro Data'}
                </Button>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </div>

      </motion.div>
    </>
  );
};
