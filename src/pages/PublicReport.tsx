
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Shield, CheckCircle } from 'lucide-react';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import PublicReportForm from '@/components/public-report/PublicReportForm';

const reportSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  birthDate: z.string().min(1, 'Birth date is required'),
  birthTime: z.string().min(1, 'Birth time is required'),
  birthLocation: z.string().min(1, 'Birth location is required'),
  // Optional fields for compatibility reports
  name2: z.string().optional(),
  birthDate2: z.string().optional(),
  birthTime2: z.string().optional(),
  birthLocation2: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

const PublicReport = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      name2: '',
      birthDate2: '',
      birthTime2: '',
      birthLocation2: '',
    },
  });

  const selectedReportType = form.watch('reportType');

  const handleSubmit = async (data: ReportFormData) => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with Stripe checkout
      console.log('Report data:', data);
      alert('Payment integration coming soon! Your report data has been logged to console.');
    } catch (error) {
      console.error('Error processing report:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-16 text-center">
          <Badge variant="secondary" className="mb-4">
            Instant Personalized Reports
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Get Your Professional
            <span className="text-primary"> Astrology Report</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Unlock deep insights about your personality, relationships, and life path with our AI-powered astrology reports. Generated instantly and delivered to your email.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Instant Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Professional Quality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Choose Your Report Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTypeSelector 
                value={selectedReportType}
                onChange={(value) => form.setValue('reportType', value)}
                error={form.formState.errors.reportType?.message}
              />
            </CardContent>
          </Card>

          {selectedReportType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Enter Your Birth Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PublicReportForm 
                  form={form}
                  reportType={selectedReportType}
                />
              </CardContent>
            </Card>
          )}

          {selectedReportType && (
            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="px-12 py-6 text-lg"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Generate My Report - $29'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Reports?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Accuracy</h3>
              <p className="text-muted-foreground">Advanced algorithms ensure precise calculations and personalized insights.</p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Instant Delivery</h3>
              <p className="text-muted-foreground">Get your comprehensive report delivered to your email within minutes.</p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Professional Quality</h3>
              <p className="text-muted-foreground">Detailed, professional-grade reports trusted by astrology enthusiasts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicReport;
