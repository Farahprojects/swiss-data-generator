
import React from 'react';

interface PlanetaryPositionsProps {
  planets: Record<string, any>;
  title?: string;
}

export const PlanetaryPositions: React.FC<PlanetaryPositionsProps> = ({
  planets,
  title = "PLANETARY POSITIONS"
}) => {
  if (!planets) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4 tracking-wide uppercase text-sm">
        {title}
      </h3>
      <div className="space-y-2">
        {Object.entries(planets).map(([planet, data]: [string, any]) => {
          const sign = data.sign || '';
          const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
          const house = data.house ? ` (House ${data.house})` : '';
          
          return (
            <div key={planet} className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="font-medium text-gray-900 min-w-[100px]">{planet}</span>
              <span className="text-gray-700">{degree}° {sign}{house}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
