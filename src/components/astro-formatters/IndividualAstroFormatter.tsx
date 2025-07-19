
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
      <div className={`text-center text-gray-500 py-16 ${className}`}>
        <p className="text-lg font-light">No astrological data available for this report.</p>
      </div>
    );
  }

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
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
        <AspectTable aspects={swissData.natal.aspects} title="MAJOR ASPECTS" />
      )}

      {swissData.natal?.houses && (
        <HouseCusps houses={swissData.natal.houses} />
      )}

      {swissData.natal?.angles && (
        <div className="mb-12">
          <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
            CHART ANGLES
          </h2>
          
          <div className="max-w-2xl mx-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Angle</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 text-sm">Position</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(swissData.natal.angles).map(([angle, data]: [string, any]) => {
                  const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
                  const sign = data.sign || '';
                  const position = `${degree}° ${sign}`;
                  
                  return (
                    <tr key={angle} className="border-b border-gray-100 hover:bg-gray-50/30">
                      <td className="py-3 px-4 font-medium text-gray-900">{angle}</td>
                      <td className="py-3 px-4 text-gray-700 text-right">{position}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
