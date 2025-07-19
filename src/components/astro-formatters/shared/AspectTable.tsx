
import React from 'react';

interface AspectTableProps {
  aspects: Record<string, any>;
  title?: string;
}

export const AspectTable: React.FC<AspectTableProps> = ({
  aspects,
  title = "CURRENT PLANETARY POSITIONS"
}) => {
  if (!aspects) return null;

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
              <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Aspect</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">To</th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 text-sm">Orb</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(aspects).map(([aspectKey, data]: [string, any]) => {
              const orb = data.orb ? `${Math.round(data.orb * 100) / 100}°` : '';
              const aspect = data.aspect || '';
              const planet1 = data.planet1 || '';
              const planet2 = data.planet2 || '';
              
              return (
                <tr key={aspectKey} className="border-b border-gray-100 hover:bg-gray-50/30">
                  <td className="py-3 px-4 text-gray-900">{planet1}</td>
                  <td className="py-3 px-4 text-gray-700">{aspect}</td>
                  <td className="py-3 px-4 text-gray-700">{planet2}</td>
                  <td className="py-3 px-4 text-gray-600 text-right text-sm">{orb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
