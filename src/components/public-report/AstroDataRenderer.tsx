import React from 'react';
import { parseSwissData, degreesToZodiac, PLANET_NAMES, ASPECT_NAMES, type ParsedSwissData, type BirthInformation, type PlanetPosition, type AspectData } from '@/utils/swissDataFormatter';

interface AstroDataRendererProps {
  swissData: any;
}

const BirthInfoSection = ({ birthInfo }: { birthInfo: BirthInformation }) => {
  if (!birthInfo.date && !birthInfo.time && !birthInfo.location) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 tracking-tight">
        BIRTH INFORMATION
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {birthInfo.date && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Date</div>
            <div className="text-base text-gray-900 font-light">{birthInfo.date}</div>
          </div>
        )}
        {birthInfo.time && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Time</div>
            <div className="text-base text-gray-900 font-light">{birthInfo.time}</div>
          </div>
        )}
        {birthInfo.location && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Location</div>
            <div className="text-base text-gray-900 font-light">{birthInfo.location}</div>
          </div>
        )}
        {typeof birthInfo.latitude === 'number' && typeof birthInfo.longitude === 'number' && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Coordinates</div>
            <div className="text-base text-gray-900 font-light">
              {birthInfo.latitude.toFixed(4)}°, {birthInfo.longitude.toFixed(4)}°
            </div>
          </div>
        )}
        {birthInfo.timezone && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Timezone</div>
            <div className="text-base text-gray-900 font-light">{birthInfo.timezone}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const PlanetaryPositionsSection = ({ planets }: { planets: PlanetPosition[] }) => {
  if (!planets || planets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 tracking-tight">
        PLANETARY POSITIONS
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planets.map((planet, index) => {
          const planetName = PLANET_NAMES[planet.planet?.toLowerCase()] || planet.planet;
          const retrograde = planet.retrograde ? ' (R)' : '';
          
          let positionText = 'Position unavailable';
          if (planet.sign && typeof planet.degree === 'number' && typeof planet.minute === 'number') {
            positionText = `${planet.degree}°${planet.minute.toString().padStart(2, '0')}' ${planet.sign}${retrograde}`;
          } else if (typeof planet.longitude === 'number') {
            const zodiac = degreesToZodiac(planet.longitude);
            positionText = `${zodiac.degree}°${zodiac.minute.toString().padStart(2, '0')}' ${zodiac.sign}${retrograde}`;
          }

          return (
            <div key={index} className="space-y-1 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {planetName}
              </div>
              <div className="text-base text-gray-900 font-light">
                {positionText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AspectsSection = ({ aspects }: { aspects: AspectData[] }) => {
  if (!aspects || aspects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 tracking-tight">
        ASPECTS TO NATAL
      </h2>
      <div className="space-y-2">
        {aspects.map((aspect, index) => {
          const planet1 = PLANET_NAMES[aspect.planet1?.toLowerCase()] || aspect.planet1;
          const planet2 = PLANET_NAMES[aspect.planet2?.toLowerCase()] || aspect.planet2;
          const aspectName = ASPECT_NAMES[aspect.aspect?.toLowerCase()] || aspect.aspect;
          const orb = typeof aspect.orb === 'number' ? aspect.orb.toFixed(2) : 'N/A';

          return (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="text-base text-gray-900 font-light">
                <span className="font-medium">{planet1}</span> {aspectName} <span className="font-medium">{planet2}</span>
              </div>
              <div className="text-sm text-gray-600">
                {orb}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RawDataSection = ({ rawData }: { rawData: any }) => {
  if (!rawData || typeof rawData === 'object' && Object.keys(rawData).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 tracking-tight">
        RAW DATA
      </h2>
      <div className="bg-gray-50 p-6 rounded-lg">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
          {typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export const AstroDataRenderer = ({ swissData }: AstroDataRendererProps) => {
  const parsedData = parseSwissData(swissData);
  
  // Check if we have any meaningful data to display
  const hasBirthInfo = parsedData.birthInfo.date || parsedData.birthInfo.time || parsedData.birthInfo.location;
  const hasPlanets = parsedData.planets.length > 0;
  const hasAspects = parsedData.aspects.length > 0;
  const hasStructuredData = hasBirthInfo || hasPlanets || hasAspects;

  if (!hasStructuredData) {
    return <RawDataSection rawData={parsedData.rawData} />;
  }

  return (
    <div className="space-y-8">
      <BirthInfoSection birthInfo={parsedData.birthInfo} />
      <PlanetaryPositionsSection planets={parsedData.planets} />
      <AspectsSection aspects={parsedData.aspects} />
    </div>
  );
};