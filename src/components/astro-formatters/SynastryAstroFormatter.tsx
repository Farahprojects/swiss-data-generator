
import React from 'react';
import { ChartHeader } from './shared/ChartHeader';
import { PlanetaryPositions } from './shared/PlanetaryPositions';
import { AspectTable } from './shared/AspectTable';

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
  const personA = reportInfo?.name || 'Person A';
  const personB = reportInfo?.secondPersonName || 'Person B';

  if (!swissData) {
    return (
      <div className={`text-center text-gray-500 py-16 ${className}`}>
        <p className="text-lg font-light">No synastry data available for this report.</p>
      </div>
    );
  }

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
      <ChartHeader
        name={`${personA} × ${personB}`}
        title="Synastry Chart Analysis"
      />

      {/* Person A Data */}
      {swissData.person_a?.planets && (
        <div className="mb-16">
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">{personA}</h2>
          </div>
          <PlanetaryPositions planets={swissData.person_a.planets} title="PLANETARY POSITIONS" />
        </div>
      )}

      {/* Person B Data */}
      {swissData.person_b?.planets && (
        <div className="mb-16">
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">{personB}</h2>
          </div>
          <PlanetaryPositions planets={swissData.person_b.planets} title="PLANETARY POSITIONS" />
        </div>
      )}

      {/* Synastry Aspects */}
      {swissData.synastry_aspects && (
        <div className="mb-16">
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">Relationship Dynamics</h2>
          </div>
          <AspectTable aspects={swissData.synastry_aspects} title="SYNASTRY ASPECTS" />
        </div>
      )}

      {/* Composite Chart */}
      {swissData.composite_chart && (
        <div className="mb-16">
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">Composite Chart</h2>
          </div>
          {swissData.composite_chart.planets && (
            <PlanetaryPositions planets={swissData.composite_chart.planets} title="COMPOSITE PLANETS" />
          )}
        </div>
      )}

      {/* Current Transits */}
      {(swissData.transits?.person_a || swissData.transits?.person_b) && (
        <div className="mb-12">
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">Current Transits</h2>
          </div>
          {swissData.transits.person_a && (
            <div className="mb-8">
              <PlanetaryPositions planets={swissData.transits.person_a} title={`TRANSITS TO ${personA.toUpperCase()}`} />
            </div>
          )}
          {swissData.transits.person_b && (
            <div className="mb-8">
              <PlanetaryPositions planets={swissData.transits.person_b} title={`TRANSITS TO ${personB.toUpperCase()}`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
