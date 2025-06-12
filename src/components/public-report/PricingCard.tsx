
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Shield, Clock, Download } from 'lucide-react';
import { ReportType } from '@/pages/PublicReport';

interface PricingCardProps {
  reportType: ReportType;
  onBack: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  reportType,
  onBack
}) => {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="p-0 h-auto font-normal text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to report selection
      </Button>

      {/* Order Summary */}
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {reportType.icon}
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Report */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{reportType.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{reportType.description}</p>
              </div>
              {reportType.popular && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  Popular
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">What's Included:</h5>
            <ul className="space-y-2">
              {reportType.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-900">Report Price:</span>
              <span className="text-2xl font-bold text-primary">${reportType.price}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Processing Fee:</span>
              <span>$0.00</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between font-semibold">
            <span className="text-lg">Total:</span>
            <span className="text-2xl text-primary">${reportType.price}</span>
          </div>

          {/* Guarantees */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h6 className="font-medium text-gray-900 text-sm">Our Promise:</h6>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Delivered in 5-10 minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Secure payment processing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Download className="w-4 h-4 text-purple-600" />
                <span>PDF download included</span>
              </div>
            </div>
          </div>

          {/* Sample Preview */}
          <div className="text-center">
            <Button variant="outline" size="sm" className="w-full">
              View Sample Report
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              See what your report will look like
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
