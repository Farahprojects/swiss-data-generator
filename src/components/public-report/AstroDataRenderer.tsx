import React from 'react';
import AstroSnapshot from './AstroSnapshot';
import SynastrySnapshot from './SynastrySnapshot';
import { isSynastryData } from '@/lib/synastryFormatter';

interface AstroDataRendererProps {
  swissData: any;
  reportData?: any; // Form data containing names, birth details, etc.
}

export const AstroDataRenderer = ({ swissData, reportData }: AstroDataRendererProps) => {
  // Route to appropriate component based on data type
  if (isSynastryData(swissData)) {
    return <SynastrySnapshot rawSyncJSON={swissData} reportData={reportData} />;
  }
  
  return <AstroSnapshot rawSwissJSON={swissData} reportData={reportData} />;
};