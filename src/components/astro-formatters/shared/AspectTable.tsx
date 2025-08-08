
import React from 'react';

interface Aspect {
  a?: string;
  b?: string;
  type: string;
  orb?: number;
  orbDeg?: number;
  orbMin?: number;
  transitPlanet?: string;
  natalPlanet?: string;
  planet1?: string;
  planet2?: string;
  aspect?: string;
}

interface AspectTableProps {
  aspects: Aspect[] | Record<string, any>;
  title?: string;
}

export const AspectTable: React.FC<AspectTableProps> = ({
  aspects,
  title = "ASPECTS"
}) => {
  if (!aspects) return null;

  // Convert object format to array format if needed
  const aspectArray: Aspect[] = Array.isArray(aspects) 
    ? aspects 
    : Object.entries(aspects).map(([key, data]: [string, any]) => ({
        ...data,
        key
      }));

  if (aspectArray.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
          {title}
        </h2>
        <div className="text-center text-gray-500 italic text-sm">
          No significant aspects detected.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-xl font-light text-gray-900 mb-8 text-center tracking-wide uppercase">
        {title}
      </h2>
      
      <div className="max-w-2xl mx-auto">
        <div className="-mx-4 sm:mx-0 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-sm">Planet</th>
                <th className="text-left py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-sm">Aspect</th>
                <th className="text-left py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-sm">To</th>
                <th className="hidden sm:table-cell text-right py-2 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-sm">Orb</th>
              </tr>
            </thead>
            <tbody>
              {aspectArray.map((aspect, index) => {
                // Handle different aspect data formats
                const planetA = aspect.transitPlanet || aspect.a || aspect.planet1 || 'Unknown';
                const planetB = aspect.natalPlanet || aspect.b || aspect.planet2 || 'Unknown';
                const aspectType = aspect.type || aspect.aspect || 'Unknown';
                
                // Calculate orb display
                let orbDisplay = '';
                if (aspect.orbDeg !== undefined && aspect.orbMin !== undefined) {
                  orbDisplay = `${aspect.orbDeg}°${String(aspect.orbMin).padStart(2, "0")}'`;
                } else if (aspect.orb !== undefined) {
                  const orbDeg = Math.floor(aspect.orb);
                  const orbMin = Math.round((aspect.orb - orbDeg) * 60);
                  orbDisplay = `${orbDeg}°${String(orbMin).padStart(2, "0")}'`;
                }
                
                return (
                  <tr key={`${planetA}-${aspectType}-${planetB}-${index}`} className="border-b border-gray-100 hover:bg-gray-50/30">
                    <td className="py-2 px-3 sm:py-3 sm:px-4 text-gray-900 text-left">{planetA}</td>
                    <td className="py-2 px-3 sm:py-3 sm:px-4 text-gray-700 text-left">
                      {aspectType}
                      {orbDisplay && (
                        <div className="sm:hidden text-xs text-gray-500 mt-0.5">Orb: {orbDisplay}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 sm:py-3 sm:px-4 text-gray-700 text-left">{planetB}</td>
                    <td className="hidden sm:table-cell py-2 px-3 sm:py-3 sm:px-4 text-gray-600 text-right text-sm">{orbDisplay}</td>
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
