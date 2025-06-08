
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const ClientInsightsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Insights</h3>
      </div>
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">No insights available</div>
            <p className="text-gray-600 mb-4">AI insights will appear here based on client data and patterns</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
