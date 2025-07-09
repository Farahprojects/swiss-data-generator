import React from "react";
import { parseSwissDataRich, EnrichedSnapshot } from "@/utils/swissFormatter";

interface Props {
  rawSwissJSON: any;
}

const SectionTitle: React.FC<{ children: string }> = ({ children }) => (
  <h3 className="mt-8 mb-2 text-center font-semibold tracking-wider text-xs text-neutral-500 uppercase border-b pb-1">
    {children}
  </h3>
);

const AstroSnapshot: React.FC<Props> = ({ rawSwissJSON }) => {
  const data: EnrichedSnapshot = parseSwissDataRich(rawSwissJSON);

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
        <h2 className="font-semibold text-lg mb-2">Your Astro Data</h2>
        {data.name && (
          <p className="font-medium text-base mb-1">{data.name}</p>
        )}
        <p className="text-sm text-neutral-600">
          {formattedDate} — {formattedTime} ({data.tz})
        </p>
        {data.meta?.location && (
          <p className="text-sm text-neutral-600">
            {data.meta.location}
            {data.meta.lat && data.meta.lon && (
              <span> ({data.meta.lat.toFixed(2)}°, {data.meta.lon.toFixed(2)}°)</span>
            )}
          </p>
        )}
      </div>

      {/* Planetary Positions */}
      <SectionTitle>CURRENT PLANETARY POSITIONS</SectionTitle>
      <table className="w-full text-sm">
        <tbody>
          {data.planets.map((p) => (
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

      {/* Aspects */}
      <SectionTitle>ASPECTS TO NATAL</SectionTitle>
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
                {a.orbDeg}°{String(a.orbMin).padStart(2, "0")}'
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AstroSnapshot;
