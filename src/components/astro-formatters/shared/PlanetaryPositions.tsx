
import React from 'react';
import { formatPosDecimalWithHouse } from '@/lib/astro/format';

interface Planet {
  name: string;
  sign: string;
  deg: number;
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
        deg: data.degree || data.deg || 0,
        house: data.house,
        retro: data.retrograde || data.retro
      }));

  if (planetArray.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
        {title}
      </h2>
      
      {/* Desktop Table */}
      <div className="hidden md:block max-w-2xl mx-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Planet</th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 text-sm">Position</th>
            </tr>
          </thead>
          <tbody>
            {planetArray.map((planet) => {
              const position = formatPosDecimalWithHouse(planet);
              
              return (
                <tr key={planet.name} className="border-b border-gray-100 hover:bg-gray-50/30">
                  <td className="py-3 px-4 font-medium text-gray-900 text-left">
                    {planet.name}
                    {planet.retro && <span className="ml-2 text-xs italic text-gray-600">Retrograde</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-700 text-right">{position}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 px-4">
        {planetArray.map((planet) => {
          const position = formatPosDecimalWithHouse(planet);
          
          return (
            <div key={planet.name} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-base">
                    {planet.name}
                  </h3>
                  {planet.retro && (
                    <span className="text-xs italic text-gray-600 mt-1 block">Retrograde</span>
                  )}
                </div>
                <div className="text-right ml-4">
                  <span className="text-gray-700 font-medium">{position}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
