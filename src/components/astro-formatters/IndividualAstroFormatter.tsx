
import React from 'react';
import { ChartHeader } from './shared/ChartHeader';
import { PlanetaryPositions } from './shared/PlanetaryPositions';
import { AspectTable } from './shared/AspectTable';
import { HouseCusps } from './shared/HouseCusps';

interface IndividualAstroFormatterProps {
  swissData: any;
  reportData: any;
  className?: string;
}

export const IndividualAstroFormatter: React.FC<IndividualAstroFormatterProps> = ({
  swissData,
  reportData,
  className = ''
}) => {
  const reportInfo = reportData.guest_report?.report_data;
  const name = reportInfo?.name || 'Unknown';
  const birthDate = reportInfo?.birthDate;
  const birthLocation = reportInfo?.birthLocation;
  const latitude = reportInfo?.latitude;
  const longitude = reportInfo?.longitude;

  if (!swissData) {
    return (
      <div className={`text-center text-gray-500 ${className}`}>
        <p>No astrological data available for this report.</p>
      </div>
    );
  }

  return (
    <div className={`font-light ${className}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      <ChartHeader
        name={name}
        birthDate={birthDate}
        birthLocation={birthLocation}
        latitude={latitude}
        longitude={longitude}
      />

      {swissData.natal?.planets && (
        <PlanetaryPositions planets={swissData.natal.planets} />
      )}

      {swissData.natal?.aspects && (
        <AspectTable aspects={swissData.natal.aspects} />
      )}

      {swissData.natal?.houses && (
        <HouseCusps houses={swissData.natal.houses} />
      )}

      {swissData.natal?.angles && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 tracking-wide uppercase text-sm">
            CHART ANGLES
          </h3>
          <div className="space-y-2">
            {Object.entries(swissData.natal.angles).map(([angle, data]: [string, any]) => {
              const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
              const sign = data.sign || '';
              
              return (
                <div key={angle} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="font-medium text-gray-900">{angle}</span>
                  <span className="text-gray-700">{degree}° {sign}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {swissData.transits?.planets && (
        <PlanetaryPositions 
          planets={swissData.transits.planets} 
          title="CURRENT TRANSITS"
        />
      )}
    </div>
  );
};
