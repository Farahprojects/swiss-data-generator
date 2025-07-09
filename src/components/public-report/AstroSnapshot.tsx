// AstroSnapshot.tsx  – Elegant React renderer
// -------------------------------------------------
import React from "react";
import { parseSwissDataRich, EnrichedSnapshot } from "@/utils/swissFormatter";

interface Props {
  rawSwissJSON: any;              // pass the raw payload here
}

const SectionTitle: React.FC<{children:string}> = ({children}) => (
  <h3 className="mt-6 mb-2 text-center font-semibold tracking-wider text-xs text-neutral-500 uppercase">
    {children}
  </h3>
);

const AstroSnapshot: React.FC<Props> = ({ rawSwissJSON }) => {
  const data: EnrichedSnapshot = parseSwissDataRich(rawSwissJSON);

  return (
    <div className="w-full max-w-sm mx-auto font-[SFMono-Regular] leading-relaxed text-[15px] text-neutral-900">
      {/* Date & Time */}
      <SectionTitle>DATE AND TIME</SectionTitle>
      <p className="text-center">
        {new Date(data.dateISO).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}{" "}
        <span className="inline-block w-4" /> {/* small gap */}
        {new Date(`1970-01-01T${data.timeISO}Z`).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" })}
      </p>

      {/* Planetary positions */}
      <SectionTitle>CURRENT PLANETARY POSITIONS</SectionTitle>
      <table className="w-full">
        <tbody>
          {data.planets.map(p => (
            <tr key={p.name}>
              <td className="pr-2">{p.name}</td>
              <td className="whitespace-nowrap">
                {String(p.deg).padStart(2,"0")}°{String(p.min).padStart(2,"0")}' in {p.sign}
                {p.retro && <span className="italic text-sm ml-1">Retrograde</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Aspects */}
      <SectionTitle>ASPECTS TO NATAL</SectionTitle>
      <table className="w-full">
        <tbody>
          {data.aspects.map((a,i) => (
            <tr key={i}>
              <td className="pr-2">{a.a}</td>
              <td className="pr-2">{a.type}</td>
              <td className="pr-2">{a.b}</td>
              <td className="text-right">
                {a.orbDeg}°{String(a.orbMin).padStart(2,"0")}'
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AstroSnapshot;