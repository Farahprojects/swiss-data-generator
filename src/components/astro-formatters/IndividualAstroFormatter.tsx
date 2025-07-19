
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

      {/* Birth Information */}
      {enrichedData.name && (
        <div className="text-center mb-8 text-gray-700">
          <div className="text-lg font-medium">{enrichedData.name}</div>
          <div className="text-sm">
            {enrichedData.dateISO} — {enrichedData.timeISO} ({enrichedData.tz})
          </div>
          {enrichedData.meta?.location && (
            <div className="text-sm">
              {enrichedData.meta.location}
              {enrichedData.meta.lat && enrichedData.meta.lon && (
                <span className="text-xs text-gray-500 ml-2">
                  ({enrichedData.meta.lat.toFixed(2)}°, {enrichedData.meta.lon.toFixed(2)}°)
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
