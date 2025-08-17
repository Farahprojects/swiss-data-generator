import React from 'react';

interface TransitMetadataProps {
  transits: {
    datetime_utc?: string;
    timezone?: string;
  };
}

export const TransitMetadata: React.FC<TransitMetadataProps> = ({ transits }) => {
  if (!transits) return null;

  const { datetime_utc, timezone } = transits;

  const formattedDate = datetime_utc 
    ? new Date(datetime_utc).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }) 
    : 'N/A';

  return (
    <div className="text-sm text-gray-500 mt-2 mb-4 bg-gray-50 p-3 rounded-md border">
      <p><strong>Transit Date:</strong> {formattedDate}</p>
      {timezone && <p><strong>Timezone:</strong> {timezone}</p>}
    </div>
  );
};
