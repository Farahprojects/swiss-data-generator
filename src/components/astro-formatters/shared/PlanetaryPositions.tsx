
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
    <div className="mb-12">
      <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
        {title}
      </h2>
      
      <div className="max-w-2xl mx-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Planet</th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 text-sm">Position</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(planets).map(([planet, data]: [string, any]) => {
              const sign = data.sign || '';
              const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
              const house = data.house ? ` (House ${data.house})` : '';
              const position = `${degree}° ${sign}${house}`;
              
              return (
                <tr key={planet} className="border-b border-gray-100 hover:bg-gray-50/30">
                  <td className="py-3 px-4 font-medium text-gray-900">{planet}</td>
                  <td className="py-3 px-4 text-gray-700 text-right">{position}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
