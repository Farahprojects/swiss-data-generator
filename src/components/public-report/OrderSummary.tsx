
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Mail, Download } from 'lucide-react';

interface OrderSummaryProps {
  reportType: string;
}

const reportTitles: Record<string, string> = {
  natal: 'Natal Report',
  compatibility: 'Compatibility Report',
  essence: 'Essence Report',
  flow: 'Flow Report',
  mindset: 'Mindset Report',
  monthly: 'Monthly Forecast',
};

const OrderSummary = ({ reportType }: OrderSummaryProps) => {
  const selectedReport = reportTitles[reportType];
  
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Report */}
        {selectedReport ? (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{selectedReport}</h3>
                <p className="text-sm text-muted-foreground">Professional astrology report</p>
              </div>
              <Badge variant="secondary">Selected</Badge>
            </div>
            
            <Separator />
            
            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Report price</span>
                <span>$29.00</span>
              </div>
              <div className="flex justify-between">
                <span>Processing fee</span>
                <span>$0.00</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">$29.00</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a report type to see your order summary</p>
          </div>
        )}

        {/* What You Get */}
        <div className="space-y-3">
          <h4 className="font-medium">What You'll Receive:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Comprehensive PDF report (15-25 pages)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-green-500" />
              <span>Instant email delivery</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4 text-green-500" />
              <span>Downloadable for your records</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Professional astrology insights</span>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">100% Satisfaction Guarantee</h4>
          <p className="text-xs text-muted-foreground">
            Not satisfied with your report? Contact us within 7 days for a full refund.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
