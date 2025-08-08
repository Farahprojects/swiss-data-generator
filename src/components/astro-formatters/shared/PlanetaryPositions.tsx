
import React from 'react';

interface Planet {
  name: string;
  sign: string;
  deg: number;
  min: number;
  house?: number;
  retro?: boolean;
}

interface PlanetaryPositionsProps {
  planets: Planet[] | Record<string, any>;
  title?: string;
}

export const PlanetaryPositions: React.FC<PlanetaryPositionsProps> = ({
  planets,
  title = "PLANETARY POSITIONS"
}) => {
  if (!planets) return null;

  // Convert object format to array format if needed
  const planetArray: Planet[] = Array.isArray(planets) 
    ? planets 
    : Object.entries(planets).map(([name, data]: [string, any]) => ({
        name,
        sign: data.sign || '',
        deg: Math.floor(data.degree || data.deg || 0),
        min: Math.round(((data.degree || data.deg || 0) - Math.floor(data.degree || data.deg || 0)) * 60),
        house: data.house,
        retro: data.retrograde || data.retro
      }));

  if (planetArray.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
        {title}
      </h2>
      
      <div className="max-w-2xl mx-auto">
        <div className="-mx-4 sm:mx-0 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-sm">Planet</th>
                <th className="text-right py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-sm">Position</th>
              </tr>
            </thead>
            <tbody>
              {planetArray.map((planet) => {
                let position = `${String(planet.deg).padStart(2, "0")}°${String(planet.min).padStart(2, "0")}' in ${planet.sign}`;
                if (planet.house) {
                  position += ` (House ${planet.house})`;
                }
                
                return (
                  <tr key={planet.name} className="border-b border-gray-100 hover:bg-gray-50/30">
                    <td className="py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-left">
                      {planet.name}
                      {planet.retro && <span className="ml-2 text-xs italic text-gray-600">Retrograde</span>}
                    </td>
                    <td className="py-2 px-3 sm:py-3 sm:px-4 text-gray-700 text-right">{position}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
