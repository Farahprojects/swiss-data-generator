import React from 'react';
import AstroSnapshot from './AstroSnapshot';
import SynastrySnapshot from './SynastrySnapshot';
import { isSynastryData } from '@/lib/synastryFormatter';

interface AstroDataRendererProps {
  swissData: any;
}

export const AstroDataRenderer = ({ swissData }: AstroDataRendererProps) => {
  // Route to appropriate component based on data type
  if (isSynastryData(swissData)) {
    return <SynastrySnapshot rawSyncJSON={swissData} />;
  }
  
  return <AstroSnapshot rawSwissJSON={swissData} />;
};