
import React from "react";
import { parseAstroData } from "@/lib/astroFormatter";
import { formatPosDecimal, formatPosDecimalWithHouse } from "@/lib/astro/format";

interface Props {
  rawSwissJSON: any;
  reportData?: any; // Form data containing names and birth details
}

const SectionTitle: React.FC<{ children: string }> = ({ children }) => (
  <h3 className="mt-8 mb-2 text-center font-semibold tracking-wider text-xs text-neutral-500 uppercase border-b pb-1">
    {children}
  </h3>
);

const AstroSnapshot: React.FC<Props> = ({ rawSwissJSON, reportData }) => {
  // Add debugging for Swiss data structure
  console.log('🔍 AstroSnapshot received data:', {
    hasRawSwissJSON: !!rawSwissJSON,
    hasReportData: !!reportData,
    swissDataType: typeof rawSwissJSON,
    swissDataKeys: rawSwissJSON ? Object.keys(rawSwissJSON) : []
  });

  // Add error handling for null/invalid data
  if (!rawSwissJSON) {
    console.warn('⚠️ AstroSnapshot: No Swiss data provided');
    return (
      <div className="w-full max-w-md mx-auto font-sans text-[15px] leading-relaxed text-neutral-900">
        <div className="text-center mb-6">
          <h2 className="font-semibold text-lg mb-2">Astro Data</h2>
          <p className="text-sm text-neutral-600">No astronomical data available</p>
        </div>
      </div>
    );
  }

  let parsed: any;
  try {
    parsed = parseAstroData(rawSwissJSON);
  } catch (error) {
    console.error('❌ AstroSnapshot: Failed to parse astro data:', error);
    return (
      <div className="w-full max-w-md mx-auto font-sans text-[15px] leading-relaxed text-neutral-900">
        <div className="text-center mb-6">
          <h2 className="font-semibold text-lg mb-2">Astro Data</h2>
          <p className="text-sm text-neutral-600 mb-4">Error parsing astronomical data</p>
          <details className="text-xs text-left bg-red-50 p-2 rounded">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify(rawSwissJSON, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!parsed?.natal) {
    console.warn('⚠️ AstroSnapshot: No natal data found in astro payload');
    return (
      <div className="w-full max-w-md mx-auto font-sans text-[15px] leading-relaxed text-neutral-900">
        <div className="text-center mb-6">
          <h2 className="font-semibold text-lg mb-2">Astro Data</h2>
          <p className="text-sm text-neutral-600">No natal data available</p>
        </div>
      </div>
    );
  }

  const natal = parsed.natal;
  const data: any = {
    dateISO: parsed.meta?.date || new Date().toISOString().split('T')[0],
    timeISO: parsed.meta?.time || '00:00:00',
    tz: parsed.meta?.tz,
    meta: {
      location: parsed.meta?.location,
      lat: parsed.meta?.lat,
      lon: parsed.meta?.lon,
    },
    angles: Array.isArray(natal.angles)
      ? natal.angles
      : [],
    houses: Array.isArray(natal.houses)
      ? natal.houses
      : natal.houses && typeof natal.houses === 'object'
        ? Object.entries(natal.houses).map(([number, h]: [string, any]) => ({ number: Number(number), ...h }))
        : [],
    planets: (natal.planets || []).map((p: any) => ({
      ...p,
      retro: p.retrograde,
    })),
    aspects: (natal.aspects || []),
    transits: parsed.transits?.personA
      ? {
          planets: (parsed.transits.personA.planets || []),
          aspects: (parsed.transits.personA.aspects_to_natal || []),
        }
      : { planets: [], aspects: [] },
  };

  // Show parsing errors if any
  if (data.meta?.error) {
    console.warn('⚠️ AstroSnapshot: Parser returned error:', data.meta.error);
  }
  
  // Extract name and birth details from mapped report data
  const personName = reportData?.people?.A?.name || reportData?.customerName || reportData?.name || reportData?.firstName;
  const birthDate = reportData?.people?.A?.birthDate || reportData?.birthDate;
  const birthPlace = reportData?.people?.A?.location || reportData?.birthLocation;

  const formattedDate = new Date(data.dateISO).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = new Date(`1970-01-01T${data.timeISO}Z`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="w-full max-w-md mx-auto font-sans text-[15px] leading-relaxed text-neutral-900">
      {/* Header: Identity */}
      <div className="text-center mb-6">
        <h2 className="font-semibold text-lg mb-2">
          {personName ? `${personName}'s Astro Data` : 'Your Astro Data'}
        </h2>
        
        {/* Person Details */}
        {(birthDate || birthPlace) && (
          <div className="text-xs text-neutral-600 mb-2">
            {birthDate && <div>Born: {birthDate}</div>}
            {birthPlace && <div>{birthPlace}</div>}
          </div>
        )}
        
        <p className="text-sm text-neutral-600">
          Analysis: {formattedDate}
        </p>
        {data.meta?.location && (
          <p className="text-sm text-neutral-600">
            Calculation Location: {data.meta.location}
            {data.meta.lat && data.meta.lon && (
              <span> ({data.meta.lat.toFixed(2)}°, {data.meta.lon.toFixed(2)}°)</span>
            )}
          </p>
        )}
      </div>

      {/* Chart Angles */}
      {data.angles.length > 0 && (
        <>
          <SectionTitle>CHART ANGLES</SectionTitle>
          <table className="w-full text-sm">
            <tbody>
              {data.angles.map((angle) => (
                <tr key={angle.name}>
                  <td className="py-1 pr-2 text-left font-medium">{angle.name}</td>
                  <td className="py-1 text-left">
                    {formatPosDecimal(angle)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* House Cusps */}
      {data.houses.length > 0 && (
        <>
          <SectionTitle>HOUSE CUSPS</SectionTitle>
          <table className="w-full text-sm">
            <tbody>
              {data.houses.map((house) => (
                <tr key={house.number}>
                  <td className="py-1 pr-2 text-left">House {house.number}</td>
                  <td className="py-1 text-left">
                    {formatPosDecimal(house)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Natal Planetary Positions */}
      <SectionTitle>NATAL PLANETARY POSITIONS</SectionTitle>
      {data.planets.length > 0 ? (
        <table className="w-full text-sm">
          <tbody>
            {data.planets.map((p) => (
              <tr key={p.name}>
                <td className="py-1 pr-2 text-left">{p.name}</td>
                <td className="py-1 text-left">
                  {formatPosDecimalWithHouse(p)}
                  {p.retro && <span className="italic text-sm ml-1">Retrograde</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-sm text-neutral-500 py-4">
          <p>No planetary positions found</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs text-left bg-yellow-50 p-2 rounded mt-2">
              <summary className="cursor-pointer">Debug: Raw Data Structure</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(rawSwissJSON, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Natal Aspects */}
      <SectionTitle>NATAL ASPECTS</SectionTitle>
      {data.aspects.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-500 text-xs tracking-wide">
              <th className="text-left py-1">Planet</th>
              <th className="text-left py-1">Aspect</th>
              <th className="text-left py-1">To</th>
              <th className="text-left py-1">Orb</th>
            </tr>
          </thead>
          <tbody>
            {data.aspects.map((a, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 text-left">{a.a}</td>
                <td className="py-1 pr-2 text-left">{a.type}</td>
                <td className="py-1 pr-2 text-left">{a.b}</td>
                <td className="py-1 text-left">
                  {a.orb.toFixed(2)}°
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-sm text-neutral-500 py-4">
          <p>No aspects found</p>
        </div>
      )}

      {/* Transit Data */}
      {data.transits && (data.transits.planets.length > 0 || data.transits.aspects.length > 0) && (
        <>
          {/* Transit Planetary Positions */}
          {data.transits.planets.length > 0 && (
            <>
              <SectionTitle>CURRENT TRANSIT POSITIONS</SectionTitle>
              {data.transits.datetime && (
                <p className="text-xs text-neutral-500 text-center mb-2">
                  Calculated for: {new Date(data.transits.datetime).toLocaleString()}
                </p>
              )}
              <table className="w-full text-sm">
                <tbody>
                  {data.transits.planets.map((p) => (
                    <tr key={p.name}>
                      <td className="py-1 pr-2 text-left">{p.name}</td>
                      <td className="py-1 text-left">
                        {formatPosDecimal(p)}
                        {p.retro && <span className="italic text-sm ml-1">Retrograde</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Transit Aspects to Natal */}
          {data.transits.aspects.length > 0 && (
            <>
              <SectionTitle>TRANSIT ASPECTS TO NATAL</SectionTitle>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-500 text-xs tracking-wide">
                    <th className="text-left py-1">Transit</th>
                    <th className="text-left py-1">Aspect</th>
                    <th className="text-left py-1">Natal</th>
                    <th className="text-left py-1">Orb</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transits.aspects.map((a, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-2 text-left">{a.transitPlanet}</td>
                      <td className="py-1 pr-2 text-left">{a.type}</td>
                      <td className="py-1 pr-2 text-left">{a.natalPlanet}</td>
                      <td className="py-1 text-left">
                        {a.orb.toFixed(2)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AstroSnapshot;
