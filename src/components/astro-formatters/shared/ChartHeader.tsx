
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
  title = "ASTROLOGICAL CHART"
}) => {
  const coordinates = latitude && longitude ? `${latitude}°, ${longitude}°` : '';
  
  return (
    <div className="mb-8 pb-6 border-b border-gray-200">
      <h2 className="text-2xl font-light text-gray-900 mb-4 tracking-tight">
        {title}
      </h2>
      <div className="space-y-2 text-sm text-gray-700">
        <div><span className="font-medium">Name:</span> {name}</div>
        {birthDate && <div><span className="font-medium">Birth Date:</span> {birthDate}</div>}
        {birthLocation && <div><span className="font-medium">Birth Location:</span> {birthLocation}</div>}
        {coordinates && <div><span className="font-medium">Coordinates:</span> {coordinates}</div>}
        <div><span className="font-medium">Analysis Date:</span> {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
};
