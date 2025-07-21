
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, User, Mail, CreditCard, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LocationInput from './LocationInput';
import { storeGuestReportId } from '@/utils/urlHelpers';

interface ReportFormProps {
  guestId?: string | null;
}

interface FormData {
  name: string;
  email: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  reportType: string;
}

interface LocationData {
  lat: number;
  lng: number;
  place: string;
}

interface StripePaymentState {
  loading: boolean;
  success: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({ guestId }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    birthDate: '',
    birthTime: '',
    birthLocation: '',
    reportType: 'personal_essence'
  });

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [stripePaymentState, setStripePaymentState] = useState<StripePaymentState>({
    loading: false,
    success: false
  });

  // Check if we already have a guest ID and redirect if report exists
  useEffect(() => {
    if (guestId) {
      // Guest ID exists, the parent component will handle showing the report
      return;
    }
  }, [guestId]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location);
    setFormData(prev => ({ ...prev, birthLocation: location.place }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationData) {
      toast.error("Please select a birth location");
      return;
    }

    setStripePaymentState({ loading: true, success: false });

    try {
      const reportData = {
        name: formData.name,
        email: formData.email,
        birth_date: formData.birthDate,
        birth_time: formData.birthTime,
        birth_location: formData.birthLocation,
        latitude: locationData.lat,
        longitude: locationData.lng,
        report_type: formData.reportType
      };

      console.log('🚀 Submitting form data:', reportData);

      const { data, error } = await supabase.functions.invoke('create-guest-checkout', {
        body: reportData
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Payment setup failed: ${error.message}`);
      }

      if (!data?.checkout_url) {
        console.error('❌ No checkout URL in response:', data);
        throw new Error('Payment setup failed - no checkout URL received');
      }

      console.log('✅ Checkout created successfully:', data);

      // Store the guest ID if provided
      if (data.guest_report_id) {
        storeGuestReportId(data.guest_report_id);
        console.log('📦 Stored guest report ID:', data.guest_report_id);
      }

      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;

    } catch (error) {
      console.error('❌ Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
      setStripePaymentState({ loading: false, success: false });
    }
  };

  const reportTypes = [
    { value: 'personal_essence', label: 'Personal Essence', price: '$9.95', description: 'Deep insights into your core personality' },
    { value: 'sync_analysis', label: 'Sync Analysis', price: '$19.95', description: 'Relationship compatibility analysis' },
    { value: 'life_path', label: 'Life Path', price: '$14.95', description: 'Your life purpose and direction' }
  ];

  const selectedReport = reportTypes.find(r => r.value === formData.reportType);

  return (
    <div className="w-full bg-gradient-to-b from-white to-gray-50/30">
      <div className="w-full md:px-4 md:container md:mx-auto">
        <div className="max-w-4xl mx-auto py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
              Get Your <em className="font-light italic">Personal</em> Report
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Discover deep insights about yourself with our AI-powered astrological analysis.
            </p>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-2 gap-0 md:gap-12">
            {/* Form Section */}
            <Card className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl border-0 md:border border-gray-200/50">
              <CardHeader className="p-6 md:p-8">
                <CardTitle className="text-2xl font-light text-gray-900 tracking-tight flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your name"
                        required
                        className="rounded-xl border-gray-300/60 focus:border-gray-400 focus:ring-gray-400/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="rounded-xl border-gray-300/60 focus:border-gray-400 focus:ring-gray-400/20"
                      />
                    </div>
                  </div>

                  {/* Birth Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <Label className="text-sm font-medium text-gray-700">Birth Details</Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthDate" className="text-xs text-gray-600">Birth Date</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          required
                          className="rounded-xl border-gray-300/60 focus:border-gray-400 focus:ring-gray-400/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthTime" className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Birth Time
                        </Label>
                        <Input
                          id="birthTime"
                          type="time"
                          value={formData.birthTime}
                          onChange={(e) => handleInputChange('birthTime', e.target.value)}
                          required
                          className="rounded-xl border-gray-300/60 focus:border-gray-400 focus:ring-gray-400/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Birth Location
                      </Label>
                      <LocationInput
                        onLocationSelect={handleLocationSelect}
                        placeholder="Enter your birth city"
                      />
                    </div>
                  </div>

                  {/* Report Type Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-gray-600" />
                      <Label className="text-sm font-medium text-gray-700">Report Type</Label>
                    </div>
                    
                    <Select value={formData.reportType} onValueChange={(value) => handleInputChange('reportType', value)}>
                      <SelectTrigger className="rounded-xl border-gray-300/60 focus:border-gray-400 focus:ring-gray-400/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((report) => (
                          <SelectItem key={report.value} value={report.value}>
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <div className="font-medium">{report.label}</div>
                                <div className="text-xs text-gray-500">{report.description}</div>
                              </div>
                              <Badge variant="outline" className="ml-2">{report.price}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={stripePaymentState.loading}
                    className="w-full bg-gray-900 text-white px-8 py-3 rounded-xl text-lg font-normal hover:bg-gray-800 transition-all duration-300 hover:scale-105 border border-gray-800/20 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {stripePaymentState.loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Continue to Payment {selectedReport && `• ${selectedReport.price}`}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Preview Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-none md:rounded-2xl p-6 md:p-8 border-0 md:border border-gray-200/50">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">What You'll Get</h3>
                  <p className="text-gray-600 text-sm">Professional insights delivered instantly</p>
                </div>

                {selectedReport && (
                  <div className="bg-gray-50/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">{selectedReport.label}</h4>
                      <Badge className="bg-gray-900 text-white">{selectedReport.price}</Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{selectedReport.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Instant PDF delivery
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Personalized insights
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        AI-powered analysis
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Professional formatting
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="bg-gray-200/50" />

                <div className="text-center space-y-2">
                  <p className="text-xs text-gray-500">Secure payment processing</p>
                  <div className="flex justify-center items-center gap-4 opacity-60">
                    <div className="text-xs font-medium text-gray-400">STRIPE</div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="text-xs font-medium text-gray-400">256-BIT SSL</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
