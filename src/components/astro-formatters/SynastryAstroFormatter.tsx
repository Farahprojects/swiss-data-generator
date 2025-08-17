import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseAstroData } from '@/lib/astroFormatter';
import { normalizeSync } from '@/lib/astro/normalizeSync';
import { ChartHeader } from './shared/ChartHeader';
import { AspectTable } from './shared/AspectTable';
import { ChartAngles } from './shared/ChartAngles';
import { HouseCusps } from './shared/HouseCusps';
import { PlanetaryPositions } from './shared/PlanetaryPositions';
import { TransitMetadata } from './shared/TransitMetadata';
import { formatPos } from '@/lib/astro/format';

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
  
  // Normalize for UI consumption
  const vm = normalizeSync(astroData);
  
  const { synastry_aspects, composite_chart } = astroData;

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
      <ChartHeader
        title="Relationship Chart"
        name={vm.subjects.map(s => s.name).join(' & ') || 'Synastry Analysis'}
        date={vm.analysisDate}
        subtitle={vm.timeBasis === 'per_subject_local' ? 'Times shown per subject\'s local timezone' : undefined}
      />

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
              <CardTitle className="text-2xl font-light text-gray-800">
                Composite Chart: The Relationship's Identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This chart represents the relationship itself as a third entity.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Planet</TableHead>
                    <TableHead>Degree</TableHead>
                    <TableHead>Sign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {composite_chart?.map((planet: any) => (
                    <TableRow key={planet.name}>
                      <TableCell className="font-medium">
                        <span className="mr-2">{planet.unicode}</span> {planet.name}
                      </TableCell>
                      <TableCell>{`${Math.floor(planet.deg)}°`}</TableCell>
                      <TableCell>{planet.sign}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Individual Charts */}
        {vm.subjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">
                Individual Charts: Natal & Current Transits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={vm.subjects[0]?.key} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  {vm.subjects.map((subject) => (
                    <TabsTrigger key={subject.key} value={subject.key}>
                      {subject.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {vm.subjects.map((subject) => (
                  <TabsContent key={subject.key} value={subject.key} className="space-y-6">
                    {/* Natal Section */}
                    <div>
                      <h4 className="text-xl font-light text-gray-700 mb-4">Natal Chart</h4>
                      <div className="grid gap-6">
                        {subject.natal?.angles && (
                          <ChartAngles angles={subject.natal.angles} title="Chart Angles" />
                        )}
                        {subject.natal?.houses && (
                          <HouseCusps houses={subject.natal.houses} title="House Cusps" />
                        )}
                        {subject.natal?.planets && (
                          <PlanetaryPositions planets={subject.natal.planets} title="Planetary Positions" />
                        )}
                        {subject.natal?.aspects && subject.natal.aspects.length > 0 && (
                          <AspectTable aspects={subject.natal.aspects} title="Natal Aspects" />
                        )}
                      </div>
                    </div>
                    
                    {/* Current Transits Section */}
                    {subject.transits && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xl font-light text-gray-700">Current Transits</h4>
                          {subject.tzDisplay && (
                            <span className="text-sm text-gray-500">
                              Timezone: {subject.tzDisplay}
                            </span>
                          )}
                        </div>
                        
                        {subject.transits.datetime_utc && (
                          <TransitMetadata 
                            transits={{
                              datetime_utc: subject.transits.datetime_utc,
                              timezone: subject.transits.timezone
                            }}
                          />
                        )}
                        
                        <div className="grid gap-6">
                          {subject.transits?.planets && (
                            <PlanetaryPositions 
                              planets={subject.transits.planets} 
                              title="Transit Positions" 
                            />
                          )}
                          {subject.transits?.aspects_to_natal && subject.transits.aspects_to_natal.length > 0 && (
                            <AspectTable 
                              aspects={subject.transits.aspects_to_natal} 
                              title="Transits to Natal" 
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};