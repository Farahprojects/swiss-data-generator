
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SuccessScreenProps {
  name: string;
  email: string;
}

const SuccessScreen = ({ name, email }: SuccessScreenProps) => {
  // Extract first name from full name
  const firstName = name.split(' ')[0];

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-2xl w-full border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <CheckCircle className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Report Created!</h1>
                <p className="text-muted-foreground">Your free report has been generated</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Success!</h3>
              <p className="text-foreground">
                Hi {firstName}, we sent an email to {email} with your free report. 
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
