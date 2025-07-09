import React from 'react';
import AstroSnapshot from './AstroSnapshot';

interface AstroDataRendererProps {
  swissData: any;
}

export const AstroDataRenderer = ({ swissData }: AstroDataRendererProps) => {
  return <AstroSnapshot rawSwissJSON={swissData} />;
};