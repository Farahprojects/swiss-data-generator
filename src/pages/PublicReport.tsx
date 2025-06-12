
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Users, Zap } from 'lucide-react';
import { PublicReportForm } from '@/components/public-report/PublicReportForm';
import { ReportTypeSelector } from '@/components/public-report/ReportTypeSelector';
import { PricingCard } from '@/components/public-report/PricingCard';

export interface ReportType {
  id: string;
  name: string;
  description: string;
  price: number;
  tier: 'basic' | 'premium' | 'compatibility';
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const reportTypes: ReportType[] = [
  {
    id: 'basic-natal',
    name: 'Basic Natal Report',
    description: 'Personal birth chart analysis with core planetary positions',
    price: 29.99,
    tier: 'basic',
    features: [
      'Birth chart calculation',
      'Planetary positions',
      'Basic aspects analysis',
      'Sun, Moon & Rising signs',
      '10-15 page report'
    ],
    icon: <Star className="w-6 h-6" />
  },
  {
    id: 'premium-natal',
    name: 'Premium Natal Report',
    description: 'Comprehensive birth chart reading with detailed interpretations',
    price: 49.99,
    tier: 'premium',
    features: [
      'Everything in Basic',
      'Detailed house analysis',
      'Transit predictions',
      'Career & relationship insights',
      'Life purpose guidance',
      '25-35 page report'
    ],
    icon: <Zap className="w-6 h-6" />,
    popular: true
  },
  {
    id: 'compatibility',
    name: 'Compatibility Report',
    description: 'Relationship compatibility analysis for two people',
    price: 39.99,
    tier: 'compatibility',
    features: [
      'Synastry chart analysis',
      'Compatibility score',
      'Relationship strengths',
      'Areas for growth',
      'Communication tips',
      '20-25 page report'
    ],
    icon: <Users className="w-6 h-6" />
  }
];

const PublicReport = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    birthDate: '',
    birthTime: '',
    birthLocation: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    partnerName: '',
    partnerBirthDate: '',
    partnerBirthTime: '',
    partnerBirthLocation: '',
    partnerLatitude: undefined as number | undefined,
    partnerLongitude: undefined as number | undefined,
  });

  const handleReportSelect = (report: ReportType) => {
    setSelectedReport(report);
  };

  const handleFormSubmit = (data: typeof formData) => {
    setFormData(data);
    // Here we'll handle the checkout process later
    console.log('Form submitted:', { selectedReport, formData: data });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">AstroReports</h1>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Clock className="w-3 h-3 mr-1" />
              Delivered in 5-10 minutes
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Get Your Personal Astrology Report
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover your cosmic blueprint with our AI-powered astrology reports. 
            Professional-quality insights delivered instantly to your inbox.
          </p>
        </div>

        {!selectedReport ? (
          /* Report Selection */
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Choose Your Report Type
              </h3>
              <p className="text-gray-600">
                Select the astrological insights that resonate with you
              </p>
            </div>
            
            <ReportTypeSelector 
              reportTypes={reportTypes}
              onSelect={handleReportSelect}
            />
          </div>
        ) : (
          /* Form Section */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {selectedReport.icon}
                    {selectedReport.name}
                  </CardTitle>
                  <CardDescription>
                    Fill in your birth details to generate your personalized report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PublicReportForm 
                    reportType={selectedReport}
                    onSubmit={handleFormSubmit}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <PricingCard 
                reportType={selectedReport}
                onBack={() => setSelectedReport(null)}
              />
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Professional Quality</h4>
              <p className="text-gray-600 text-sm">AI-powered analysis with traditional astrological wisdom</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Instant Delivery</h4>
              <p className="text-gray-600 text-sm">Receive your report within 5-10 minutes</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Personalized</h4>
              <p className="text-gray-600 text-sm">Unique insights based on your exact birth details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicReport;
