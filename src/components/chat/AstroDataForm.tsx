import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Heart, Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { astroRequestCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePriceFetch } from '@/hooks/usePriceFetch';

interface AstroDataFormProps {
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
}

export const AstroDataForm: React.FC<AstroDataFormProps> = ({
  onClose,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'payment'>('type');
  const [selectedAstroType, setSelectedAstroType] = useState<string>('');
  const [activeSelector, setActiveSelector] = useState<'date' | 'time' | null>(null);
  const isMobile = useIsMobile();
  const { getReportPrice, getReportTitle } = usePriceFetch();

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
      request: '',
      reportType: '',
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const formValues = watch();

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

  const handleFormSubmit = (data: ReportFormData) => {
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = () => {
    const formData = form.getValues();
    onSubmit(formData);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {currentStep === 'details' && (
            <button
              onClick={goBackToType}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl font-medium text-gray-900">
            {currentStep === 'type' ? 'Choose Astro Data Type' : 'Your Details'}
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
              <p className="text-gray-600 text-center mb-6">
                Select the type of astrological data you'd like to generate
              </p>
              
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700">
                      Birth Date *
                    </Label>
                    {isMobile ? (
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
                    ) : (
                      <Input
                        id="birthDate"
                        type="date"
                        {...register('birthDate', { required: 'Birth date is required' })}
                        className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                      />
                    )}
                    {errors.birthDate && <ErrorMsg msg={errors.birthDate.message || ''} />}
                  </div>

                  <div>
                    <Label htmlFor="birthTime" className="text-sm font-medium text-gray-700">
                      Birth Time *
                    </Label>
                    {isMobile ? (
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
                    ) : (
                      <Input
                        id="birthTime"
                        type="time"
                        {...register('birthTime', { required: 'Birth time is required' })}
                        className="h-12 rounded-lg border-gray-200 focus:border-gray-400 mt-1"
                      />
                    )}
                    {errors.birthTime && <ErrorMsg msg={errors.birthTime.message || ''} />}
                  </div>
                </div>

                <div>
                  <Label htmlFor="birthLocation" className="text-sm font-medium text-gray-700">
                    Birth Location *
                  </Label>
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
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  Generate Astro Data
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Payment Step */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Review & Payment
                </h3>
                <p className="text-gray-600">
                  Almost there! Review your order and proceed to payment.
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Order Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-base text-gray-700">
                    <span>
                      {(() => {
                        try {
                          return getReportTitle({
                            reportType: formValues.reportType,
                            request: formValues.request
                          });
                        } catch {
                          return 'Astro Data Report';
                        }
                      })()}
                    </span>
                    <span>
                      ${(() => {
                        try {
                          return getReportPrice({
                            reportType: formValues.reportType,
                            request: formValues.request
                          }).toFixed(2);
                        } catch {
                          return '19.99';
                        }
                      })()}
                    </span>
                  </div>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-medium text-gray-900">
                  <span>Total</span>
                  <span>
                    ${(() => {
                      try {
                        return getReportPrice({
                          reportType: formValues.reportType,
                          request: formValues.request
                        }).toFixed(2);
                      } catch {
                        return '19.99';
                      }
                    })()}
                  </span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800 text-center">
                  Your astro data will be generated instantly and delivered to your email.
                  Secure payment processed by Stripe.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToDetails}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  Proceed to Payment
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
