
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
      <div className={`text-center text-gray-500 ${className}`}>
        <p>No synastry data available for this report.</p>
      </div>
    );
  }

  return (
    <div className={`font-light ${className}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      <ChartHeader
        name={`${personA} × ${personB}`}
        title="SYNASTRY CHART ANALYSIS"
      />

      {/* Person A Data */}
      {swissData.person_a?.planets && (
        <div className="mb-12">
          <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight border-b border-gray-200 pb-2">
            {personA}
          </h2>
          <PlanetaryPositions planets={swissData.person_a.planets} />
        </div>
      )}

      {/* Person B Data */}
      {swissData.person_b?.planets && (
        <div className="mb-12">
          <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight border-b border-gray-200 pb-2">
            {personB}
          </h2>
          <PlanetaryPositions planets={swissData.person_b.planets} />
        </div>
      )}

      {/* Synastry Aspects */}
      {swissData.synastry_aspects && (
        <div className="mb-12">
          <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight border-b border-gray-200 pb-2">
            Relationship Dynamics
          </h2>
          <AspectTable aspects={swissData.synastry_aspects} title="SYNASTRY ASPECTS" />
        </div>
      )}

      {/* Composite Chart */}
      {swissData.composite_chart && (
        <div className="mb-12">
          <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight border-b border-gray-200 pb-2">
            Composite Chart
          </h2>
          {swissData.composite_chart.planets && (
            <PlanetaryPositions planets={swissData.composite_chart.planets} title="COMPOSITE PLANETS" />
          )}
        </div>
      )}

      {/* Current Transits */}
      {(swissData.transits?.person_a || swissData.transits?.person_b) && (
        <div className="mb-8">
          <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight border-b border-gray-200 pb-2">
            Current Transits
          </h2>
          {swissData.transits.person_a && (
            <div className="mb-6">
              <PlanetaryPositions planets={swissData.transits.person_a} title={`TRANSITS TO ${personA.toUpperCase()}`} />
            </div>
          )}
          {swissData.transits.person_b && (
            <div className="mb-6">
              <PlanetaryPositions planets={swissData.transits.person_b} title={`TRANSITS TO ${personB.toUpperCase()}`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
