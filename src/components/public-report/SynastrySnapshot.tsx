// components/public-report/SynastrySnapshot.tsx
import React from "react";
import { parseSynastryRich, EnrichedPlanet, EnrichedAspect } from "@/lib/synastryFormatter";

const SectionTitle: React.FC<{ children: string }> = ({ children }) => (
  <h3 className="mt-8 mb-2 text-center font-semibold tracking-wider text-xs text-neutral-500 uppercase border-b pb-1">
    {children}
  </h3>
);

const PlanetTable: React.FC<{ planets: EnrichedPlanet[] }> = ({ planets }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="text-neutral-500 text-xs tracking-wide">
        <th className="text-left py-1">Planet</th>
        <th className="text-left py-1">Position</th>
      </tr>
    </thead>
    <tbody>
      {planets.map((p) => (
        <tr key={p.name}>
          <td className="py-1 pr-2 text-left">{p.name}</td>
          <td className="py-1 text-left">
            {String(p.deg).padStart(2, "0")}°{String(p.min).padStart(2, "0")}' in {p.sign}
            {p.retro && <span className="italic text-sm ml-1">Retrograde</span>}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const AspectTable: React.FC<{ aspects: EnrichedAspect[] }> = ({ aspects }) => (
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
      {aspects.map((a, i) => (
        <tr key={i}>
          <td className="py-1 pr-2 text-left">{a.a}</td>
          <td className="py-1 pr-2 text-left">{a.type}</td>
          <td className="py-1 pr-2 text-left">{a.b}</td>
          <td className="py-1 text-left">
            {a.orbDeg}°{String(a.orbMin).padStart(2, "0")}'
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

interface Props {
  rawSyncJSON: any;
  reportData?: any; // Form data containing names and birth details
}

const SynastrySnapshot: React.FC<Props> = ({ rawSyncJSON, reportData }) => {
  // COMMENTED OUT: Extract names from mapped report data (testing backend enrichment)
  // const personAName = reportData?.people?.A?.name || reportData?.customerName || reportData?.name || reportData?.firstName;
  // const personBName = reportData?.people?.B?.name || reportData?.secondPersonName;
  
  // COMMENTED OUT: Inject names into rawSyncJSON if available (testing backend enrichment)
  // const enrichedData = {
  //   ...rawSyncJSON,
  //   chartData: {
  //     ...rawSyncJSON.chartData,
  //     person_a_name: personAName,
  //     person_b_name: personBName
  //   }
  // };

  // TESTING: Use raw data directly from backend (should already have enriched names)
  const data = parseSynastryRich(rawSyncJSON);

  const formattedDate = new Date(data.meta.dateISO).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = new Date(`1970-01-01T${data.meta.time}Z`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Use actual names if available, fallback to Person A/B
  const personADisplay = data.personA.name || "Person A";
  const personBDisplay = data.personB.name || "Person B";
  
  // Get birth details from mapped report data
  const personABirthDate = reportData?.people?.A?.birthDate || reportData?.birthDate;
  const personABirthPlace = reportData?.people?.A?.location || reportData?.birthLocation;
  const personBBirthDate = reportData?.people?.B?.birthDate || reportData?.secondPersonBirthDate;
  const personBBirthPlace = reportData?.people?.B?.location || reportData?.secondPersonBirthLocation;

  return (
    <div className="w-full max-w-md mx-auto font-sans text-[14.5px] leading-relaxed text-neutral-900 tracking-tight">
      {/* Header: Compatibility Data */}
      <div className="text-center mb-6">
        <h2 className="font-semibold text-lg mb-2">
          {personADisplay} & {personBDisplay} - Compatibility Astro Data
        </h2>
        
        {/* Person A Details */}
        {(personABirthDate || personABirthPlace) && (
          <div className="text-xs text-neutral-600 mb-1">
            <strong>{personADisplay}:</strong> 
            {personABirthDate && ` ${personABirthDate}`}
            {personABirthPlace && `, ${personABirthPlace}`}
          </div>
        )}
        
        {/* Person B Details */}
        {(personBBirthDate || personBBirthPlace) && (
          <div className="text-xs text-neutral-600 mb-2">
            <strong>{personBDisplay}:</strong> 
            {personBBirthDate && ` ${personBBirthDate}`}
            {personBBirthPlace && `, ${personBBirthPlace}`}
          </div>
        )}
        
        <p className="text-sm text-neutral-600">
          Analysis: {formattedDate}
        </p>
        {data.meta.tz && (
          <p className="text-xs text-neutral-500">{data.meta.tz}</p>
        )}
      </div>

      {/* Person A */}
      <SectionTitle>{`${personADisplay} - CURRENT POSITIONS`}</SectionTitle>
      <PlanetTable planets={data.personA.planets} />

      <SectionTitle>{`${personADisplay} - ASPECTS TO NATAL`}</SectionTitle>
      <AspectTable aspects={data.personA.aspectsToNatal} />

      {/* Divider between Person A and B */}
      <div className="my-6 border-t border-neutral-200" />

      {/* Person B */}
      <SectionTitle>{`${personBDisplay} - CURRENT POSITIONS`}</SectionTitle>
      <PlanetTable planets={data.personB.planets} />

      <SectionTitle>{`${personBDisplay} - ASPECTS TO NATAL`}</SectionTitle>
      <AspectTable aspects={data.personB.aspectsToNatal} />

      {/* Composite Chart */}
      {data.composite.length > 0 ? (
        <>
          <SectionTitle>COMPOSITE CHART - MIDPOINTS</SectionTitle>
          <PlanetTable planets={data.composite} />
        </>
      ) : (
        <>
          <SectionTitle>COMPOSITE CHART - MIDPOINTS</SectionTitle>
          <p className="text-xs italic text-neutral-500 text-center mt-2">
            No composite chart data available.
          </p>
        </>
      )}

      {/* Synastry Aspects */}
      {data.synastry.length > 0 ? (
        <>
          <SectionTitle>{`SYNASTRY ASPECTS (${personADisplay} ↔ ${personBDisplay})`}</SectionTitle>
          <AspectTable aspects={data.synastry} />
        </>
      ) : (
        <>
          <SectionTitle>{`SYNASTRY ASPECTS (${personADisplay} ↔ ${personBDisplay})`}</SectionTitle>
          <p className="text-xs italic text-neutral-500 text-center mt-2">
            No significant synastry aspects detected.
          </p>
        </>
      )}
    </div>
  );
};

export default SynastrySnapshot;