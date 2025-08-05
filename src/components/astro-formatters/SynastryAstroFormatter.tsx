
import React from 'react';
import { ChartHeader } from './shared/ChartHeader';
import { PlanetaryPositions } from './shared/PlanetaryPositions';
import { AspectTable } from './shared/AspectTable';
import { parseSynastryRich } from '@/lib/synastryFormatter';

interface SynastryAstroFormatterProps {
  swissData: any;
  reportData: any;
  className?: string;
}

export const SynastryAstroFormatter: React.FC<SynastryAstroFormatterProps> = ({
  swissData,
  reportData,
  className = ''
}) => {
  const reportInfo = reportData.guest_report?.report_data;
  const personAName = reportInfo?.person_a?.name || reportInfo?.name || 'Person A';
  const personBName = reportInfo?.person_b?.name || reportInfo?.secondPersonName || 'Person B';

  if (!swissData) {
    return (
      <div className={`text-center text-gray-500 py-16 ${className}`}>
        <p className="text-lg font-light">No synastry data available for this report.</p>
      </div>
    );
  }

  // Use the rich parser to get complete, formatted synastry data
  const enrichedData = parseSynastryRich(swissData);
  const personADisplay = enrichedData.personA.name || personAName;
  const personBDisplay = enrichedData.personB.name || personBName;

  // Get birth details from mapped report data
  const personABirthDate = reportInfo?.person_a?.birth_date || reportData?.people?.A?.birthDate || reportData?.birthDate;
  const personABirthPlace = reportInfo?.person_a?.location || reportData?.people?.A?.location || reportData?.birthLocation;
  const personBBirthDate = reportInfo?.person_b?.birth_date || reportData?.people?.B?.birthDate || reportData?.secondPersonBirthDate;
  const personBBirthPlace = reportInfo?.person_b?.location || reportData?.people?.B?.location || reportData?.secondPersonBirthLocation;

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
      <ChartHeader
        name={`${personADisplay} & ${personBDisplay}`}
        title="Compatibility Chart Analysis"
      />

      {/* Analysis Information */}
      <div className="text-center mb-12 text-gray-700">
        <div className="space-y-2">
          {personABirthDate || personABirthPlace ? (
            <div className="text-sm">
              <strong>{personADisplay}:</strong> 
              {personABirthDate && ` ${personABirthDate}`}
              {personABirthPlace && `, ${personABirthPlace}`}
            </div>
          ) : null}
          
          {personBBirthDate || personBBirthPlace ? (
            <div className="text-sm">
              <strong>{personBDisplay}:</strong> 
              {personBBirthDate && ` ${personBBirthDate}`}
              {personBBirthPlace && `, ${personBBirthPlace}`}
            </div>
          ) : null}
          
        </div>
      </div>

      {/* Person A Data */}
      <div className="mb-16">
        <div className="text-center mb-8 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-light text-gray-900 tracking-tight">{personADisplay}</h2>
        </div>
        
        {enrichedData.personA.planets && enrichedData.personA.planets.length > 0 && (
          <PlanetaryPositions 
            planets={enrichedData.personA.planets} 
            title="CURRENT POSITIONS" 
          />
        )}
        
        {enrichedData.personA.aspectsToNatal && enrichedData.personA.aspectsToNatal.length > 0 && (
          <AspectTable 
            aspects={enrichedData.personA.aspectsToNatal} 
            title="ASPECTS TO NATAL" 
          />
        )}
      </div>

      {/* Person B Data */}
      <div className="mb-16">
        <div className="text-center mb-8 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-light text-gray-900 tracking-tight">{personBDisplay}</h2>
        </div>
        
        {enrichedData.personB.planets && enrichedData.personB.planets.length > 0 && (
          <PlanetaryPositions 
            planets={enrichedData.personB.planets} 
            title="CURRENT POSITIONS" 
          />
        )}
        
        {enrichedData.personB.aspectsToNatal && enrichedData.personB.aspectsToNatal.length > 0 && (
          <AspectTable 
            aspects={enrichedData.personB.aspectsToNatal} 
            title="ASPECTS TO NATAL" 
          />
        )}
      </div>

      {/* Composite Chart */}
      <div className="mb-16">
        <div className="text-center mb-8 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-light text-gray-900 tracking-tight">Composite Chart</h2>
        </div>
        
        {enrichedData.composite && enrichedData.composite.length > 0 ? (
          <PlanetaryPositions 
            planets={enrichedData.composite} 
            title="COMPOSITE MIDPOINTS" 
          />
        ) : (
          <div className="text-center text-gray-500 italic text-sm">
            No composite chart data available.
          </div>
        )}
      </div>

      {/* Synastry Aspects */}
      <div className="mb-16">
        <div className="text-center mb-8 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-light text-gray-900 tracking-tight">Relationship Dynamics</h2>
        </div>
        
        {enrichedData.synastry && enrichedData.synastry.length > 0 ? (
          <AspectTable 
            aspects={enrichedData.synastry} 
            title={`SYNASTRY ASPECTS (${personADisplay} ↔ ${personBDisplay})`} 
          />
        ) : (
          <div className="text-center text-gray-500 italic text-sm">
            No significant synastry aspects detected.
          </div>
        )}
      </div>
    </div>
  );
};
