
import React from 'react';
import { ChartHeader } from './shared/ChartHeader';
import { PlanetaryPositions } from './shared/PlanetaryPositions';
import { AspectTable } from './shared/AspectTable';
import { HouseCusps } from './shared/HouseCusps';
import { ChartAngles } from './shared/ChartAngles';
import { parseSwissDataRich } from '@/utils/swissFormatter';

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
  const name = reportInfo?.person_a?.name || reportInfo?.name || 'Unknown';
  const birthDate = reportInfo?.person_a?.birth_date || reportInfo?.birthDate;
  const birthLocation = reportInfo?.person_a?.birth_location || reportInfo?.birthLocation;
  const latitude = reportInfo?.person_a?.latitude || reportInfo?.latitude;
  const longitude = reportInfo?.person_a?.longitude || reportInfo?.longitude;

  if (!swissData) {
    return (
      <div className={`text-center text-gray-500 py-16 ${className}`}>
        <p className="text-lg font-light">No astrological data available for this report.</p>
      </div>
    );
  }

  // Use the rich parser to get complete, formatted data
  const enrichedData = parseSwissDataRich(swissData);

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
      <ChartHeader
        name={name}
        birthDate={birthDate}
        birthLocation={birthLocation}
        latitude={latitude}
        longitude={longitude}
      />


      {/* Chart Angles */}
      {enrichedData.angles && enrichedData.angles.length > 0 && (
        <ChartAngles angles={enrichedData.angles} />
      )}

      {/* House Cusps */}
      {enrichedData.houses && enrichedData.houses.length > 0 && (
        <HouseCusps houses={enrichedData.houses} title="HOUSE CUSPS" />
      )}

      {/* Natal Planetary Positions */}
      {enrichedData.planets && enrichedData.planets.length > 0 && (
        <PlanetaryPositions planets={enrichedData.planets} title="NATAL PLANETARY POSITIONS" />
      )}

      {/* Natal Aspects */}
      {enrichedData.aspects && enrichedData.aspects.length > 0 && (
        <AspectTable aspects={enrichedData.aspects} title="NATAL ASPECTS" />
      )}

      {/* Current Transit Positions */}
      {enrichedData.transits?.planets && enrichedData.transits.planets.length > 0 && (
        <PlanetaryPositions 
          planets={enrichedData.transits.planets} 
          title="CURRENT TRANSIT POSITIONS"
        />
      )}

      {/* Transit Aspects to Natal */}
      {enrichedData.transits?.aspects && enrichedData.transits.aspects.length > 0 && (
        <AspectTable 
          aspects={enrichedData.transits.aspects} 
          title="TRANSIT ASPECTS TO NATAL"
        />
      )}
    </div>
  );
};
