
import React from 'react';
import { LandingPageImageManager } from '@/components/dashboard/LandingPageImageManager';

const LandingPageSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landing Page Settings</h1>
        <p className="text-muted-foreground">
          Customize the images and content on your landing page.
        </p>
      </div>
      
      <LandingPageImageManager />
    </div>
  );
};

export default LandingPageSettings;
