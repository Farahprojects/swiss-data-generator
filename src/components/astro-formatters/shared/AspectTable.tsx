
import React from 'react';

interface AspectTableProps {
  aspects: Record<string, any>;
  title?: string;
}

export const AspectTable: React.FC<AspectTableProps> = ({
  aspects,
  title = "MAJOR ASPECTS"
}) => {
  if (!aspects) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4 tracking-wide uppercase text-sm">
        {title}
      </h3>
      <div className="space-y-2">
        {Object.entries(aspects).map(([aspectKey, data]: [string, any]) => {
          const orb = data.orb ? Math.round(data.orb * 100) / 100 : '';
          const aspect = data.aspect || aspectKey;
          const planet1 = data.planet1 || '';
          const planet2 = data.planet2 || '';
          
          return (
            <div key={aspectKey} className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-900">
                {planet1 && planet2 && aspect ? 
                  `${planet1} ${aspect} ${planet2}` : 
                  aspectKey
                }
              </span>
              <span className="text-gray-600 text-sm">{orb}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
