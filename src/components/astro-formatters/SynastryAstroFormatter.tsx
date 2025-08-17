import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartHeader } from './shared/ChartHeader';
import { AspectTable } from './shared/AspectTable';
import { ChartAngles } from './shared/ChartAngles';
import { PlanetaryPositions } from './shared/PlanetaryPositions';
import { parseAstroData } from '@/lib/synastryFormatter';
import { TransitMetadata } from './shared/TransitMetadata';

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
  if (!swissData) {
    return (
      <div className={`text-center text-gray-500 py-16 ${className}`}>
        <p className="text-lg font-light">No synastry data available for this report.</p>
      </div>
    );
  }

  // Use the new dynamic parser
  const astroData = parseAstroData(swissData);
  const { subject, natal_set, synastry_aspects, composite_chart, transits } = astroData;

  const personA = natal_set?.personA;
  const personB = natal_set?.personB;

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
      {meta && (
        <ChartHeader
          title="Relationship Chart"
          name={personA && personB ? `${personA.name} & ${personB.name}` : 'Synastry Analysis'}
        />
      )}

      <div className="space-y-8 mt-8">
        {/* Synastry Aspects */}
        {synastry_aspects && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">
                Synastry: The Core Dynamics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                These aspects show the fundamental interactions between your two personalities.
              </p>
              <AspectTable aspects={synastry_aspects.aspects} />
            </CardContent>
          </Card>
        )}

        {/* Composite Chart */}
        {composite_chart && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">Composite Chart: The Relationship's Essence</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanetaryPositions planets={composite_chart} title="Composite Planets" />
            </CardContent>
          </Card>
        )}

        {/* Natal Charts as Accordion */}
        {natal_set && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="natal-charts">
              <AccordionTrigger className="text-2xl font-light text-gray-800 hover:no-underline">
                Natal Charts: The Foundation
              </AccordionTrigger>
              <AccordionContent className="space-y-6">
                {personA && (
                  <div>
                    <h4 className="text-xl font-light text-gray-700 mb-2">{personA.name}</h4>
                    <ChartAngles angles={personA.angles} />
                    <AspectTable aspects={personA.aspects} title="Natal Aspects" />
                  </div>
                )}
                {personB && (
                  <div>
                    <h4 className="text-xl font-light text-gray-700 mt-6 mb-2">{personB.name}</h4>
                    <ChartAngles angles={personB.angles} />
                    <AspectTable aspects={personB.aspects} title="Natal Aspects" />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Transits */}
        {transits && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">
                Current Transits: The Present Moment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <TransitMetadata transits={transits} />
              {transits.personA && (
                <div>
                  {transits.personA.name && <h4 className="text-lg font-semibold text-gray-700 mb-4">{transits.personA.name}'s Transits</h4>}
                  <PlanetaryPositions planets={transits.personA.planets} title="Current Transit Positions" />
                  <AspectTable aspects={transits.personA.aspects_to_natal} title={`Transit Aspects to ${transits.personA.name || 'Natal'}`} />
                </div>
              )}
              {transits.personB && (
                <div className="mt-8">
                  {transits.personB.name && <h4 className="text-lg font-semibold text-gray-700 mb-4">{transits.personB.name}'s Transits</h4>}
                  <PlanetaryPositions planets={transits.personB.planets} title="Current Transit Positions" />
                  <AspectTable aspects={transits.personB.aspects_to_natal} title={`Transit Aspects to ${transits.personB.name || 'Natal'}`} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};