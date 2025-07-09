// AstroSnapshot.tsx  – Elegant React renderer
// -------------------------------------------------
import React from "react";
import { parseSwissDataRich, EnrichedSnapshot } from "@/utils/swissFormatter";

interface Props {
  rawSwissJSON: any;              // pass the raw payload here
}

const SectionTitle: React.FC<{children:string}> = ({children}) => (
  <div className="mt-6 mb-2">
    <h3 className="text-left font-semibold tracking-wider text-xs text-neutral-500 uppercase">
      {children}
    </h3>
    <div className="border-b border-neutral-200 mt-1"></div>
  </div>
);

const AstroSnapshot: React.FC<Props> = ({ rawSwissJSON }) => {
  const data: EnrichedSnapshot = parseSwissDataRich(rawSwissJSON);

  return (
    <div className="w-full max-w-2xl mx-auto font-mono leading-relaxed text-[15px] text-neutral-900">
      {/* Person Info */}
      {data.personName && (
        <div className="mb-6 text-left">
          <h2 className="text-lg font-semibold text-neutral-800 mb-1">
            Astrological Report for {data.personName}
          </h2>
          {data.birthLocation && (
            <p className="text-sm text-neutral-600">
              Born in {data.birthLocation}
              {data.coordinates && (
                <span className="ml-2">
                  ({data.coordinates.lat}°, {data.coordinates.lon}°)
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Date & Time */}
      <SectionTitle>DATE AND TIME</SectionTitle>
      <div className="text-left mb-4">
        <p>
          {new Date(data.dateISO).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}{" "}
          {new Date(`1970-01-01T${data.timeISO}Z`).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" })}
        </p>
      </div>

      {/* Planetary positions */}
      <SectionTitle>CURRENT PLANETARY POSITIONS</SectionTitle>
      <div className="mb-4">
        <table className="w-full text-left">
          <tbody>
            {data.planets.map(p => (
              <tr key={p.name}>
                <td className="pr-4 py-1">{p.name}</td>
                <td className="whitespace-nowrap">
                  {String(p.deg).padStart(2,"0")}°{String(p.min).padStart(2,"0")}' in {p.sign}
                  {p.retro && <span className="italic text-sm ml-1">Retrograde</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aspects */}
      <SectionTitle>ASPECTS TO NATAL</SectionTitle>
      <div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-neutral-500 uppercase tracking-wider">
              <th className="pr-4 py-2 font-medium text-left">Planet</th>
              <th className="pr-4 py-2 font-medium text-left">Aspect</th>
              <th className="pr-4 py-2 font-medium text-left">To</th>
              <th className="py-2 font-medium text-right">Orb</th>
            </tr>
          </thead>
          <tbody>
            {data.aspects.map((a,i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="pr-4 py-1">{a.a}</td>
                <td className="pr-4 py-1">{a.type}</td>
                <td className="pr-4 py-1">{a.b}</td>
                <td className="text-right py-1">
                  {a.orbDeg}°{String(a.orbMin).padStart(2,"0")}'
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AstroSnapshot;