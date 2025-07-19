
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
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4 tracking-wide uppercase text-sm">
        {title}
      </h3>
      <div className="space-y-2">
        {Object.entries(houses).map(([house, data]: [string, any]) => {
          const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
          const sign = data.sign || '';
          
          return (
            <div key={house} className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="font-medium text-gray-900">House {house}</span>
              <span className="text-gray-700">{degree}° {sign}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
