
import React from 'react';
import { formatPosDecimal } from '@/lib/astro/format';

interface House {
  number: number;
  sign: string;
  deg: number;
}

interface HouseCuspsProps {
  houses: House[] | Record<string, any>;
  title?: string;
}

export const HouseCusps: React.FC<HouseCuspsProps> = ({
  houses,
  title = "HOUSE CUSPS"
}) => {
  if (!houses) return null;

  // Convert object format to array format if needed
  const houseArray: House[] = Array.isArray(houses) 
    ? houses 
    : Object.entries(houses).map(([houseNum, data]: [string, any]) => ({
        number: parseInt(houseNum),
        sign: data.sign || '',
        deg: data.degree || data.deg || 0
      })).sort((a, b) => a.number - b.number);

  if (houseArray.length === 0) return null;

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
              <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">House</th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 text-sm">Cusp</th>
            </tr>
          </thead>
          <tbody>
            {houseArray.map((house) => {
              const cusp = formatPosDecimal(house);
              
              return (
                <tr key={house.number} className="border-b border-gray-100 hover:bg-gray-50/30">
                  <td className="py-3 px-4 font-medium text-gray-900">House {house.number}</td>
                  <td className="py-3 px-4 text-gray-700 text-right">{cusp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Grid */}
      <div className="md:hidden px-4">
        <div className="grid grid-cols-2 gap-3">
          {houseArray.map((house) => {
            const cusp = formatPosDecimal(house);
            
            return (
              <div key={house.number} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 text-sm mb-1">
                    House {house.number}
                  </h3>
                  <span className="text-gray-700 text-sm">{cusp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
