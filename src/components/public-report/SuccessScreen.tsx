
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const SuccessScreen = () => {
  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 text-center">
        <Card className="max-w-2xl mx-auto border-2 border-green-200">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Report Created!</h1>
                <p className="text-gray-600">Your free report has been generated</p>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Success!</h3>
              <p className="text-green-700">
                Your free report has been generated and will be sent to your email shortly. 
                Please check your inbox (and spam folder) for the report.
              </p>
            </div>

            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="mt-4"
            >
              Create Another Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
