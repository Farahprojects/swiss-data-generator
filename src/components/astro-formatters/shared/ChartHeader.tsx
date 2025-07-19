
import React from 'react';

interface ChartHeaderProps {
  name: string;
  birthDate?: string;
  birthLocation?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  name,
  birthDate,
  birthLocation,
  latitude,
  longitude,
  title
}) => {
  const coordinates = latitude && longitude ? `${latitude}°, ${longitude}°` : '';
  const displayTitle = title || `${name}'s Astro Data`;
  
  return (
    <div className="text-center mb-12 pb-8 border-b border-gray-200">
      <h1 className="text-4xl font-light text-gray-900 mb-8 tracking-tight">
        {displayTitle}
      </h1>
      <div className="space-y-3 text-gray-700 max-w-md mx-auto">
        <div className="text-lg font-medium">{name}</div>
        {birthDate && <div className="text-sm">Born: {birthDate}</div>}
        {birthLocation && <div className="text-sm">{birthLocation}</div>}
        {coordinates && <div className="text-xs text-gray-500">{coordinates}</div>}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          Generated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
