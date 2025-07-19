
import React from 'react';

interface HouseCuspsProps {
  houses: Record<string, any>;
  title?: string;
}

export const HouseCusps: React.FC<HouseCuspsProps> = ({
  houses,
  title = "HOUSE CUSPS"
}) => {
  if (!houses) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
        {title}
      </h2>
      
      <div className="max-w-2xl mx-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">House</th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 text-sm">Cusp</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(houses).map(([house, data]: [string, any]) => {
              const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
              const sign = data.sign || '';
              const cusp = `${degree}° ${sign}`;
              
              return (
                <tr key={house} className="border-b border-gray-100 hover:bg-gray-50/30">
                  <td className="py-3 px-4 font-medium text-gray-900">House {house}</td>
                  <td className="py-3 px-4 text-gray-700 text-right">{cusp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
