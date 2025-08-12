import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { ChartHeader } from './shared/ChartHeader';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface MonthlyAstroFormatterProps {
  swissData: any;
  reportData: any;
  className?: string;
}

const ScoreBadge = ({ score }: { score: number }) => {
  let colorClass = 'bg-gray-200 text-gray-800';
  if (score > 20) colorClass = 'bg-green-100 text-green-800';
  if (score > 25) colorClass = 'bg-green-200 text-green-900 font-bold';
  if (score < 15) colorClass = 'bg-red-100 text-red-800';

  return <Badge className={`text-sm ${colorClass}`}>{score}</Badge>;
};

export const MonthlyAstroFormatter: React.FC<MonthlyAstroFormatterProps> = ({
  swissData,
  reportData,
  className = ''
}) => {
  if (!swissData || !swissData.monthly) {
    return (
      <div className={`text-center text-gray-500 py-16 ${className}`}>
        <p className="text-lg font-light">No monthly outlook data available for this report.</p>
      </div>
    );
  }

  const { meta, subject, monthly } = swissData;
  const { peaks, top_events, daily_index } = monthly;
  
  const monthName = new Date(`${meta.month}-02`).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className={`font-inter max-w-4xl mx-auto py-8 ${className}`}>
      <ChartHeader
        name={subject?.name || 'Unknown'}
        title={`Monthly Outlook for ${monthName}`}
      />

      <div className="space-y-8 mt-8">
        
        {peaks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">Peak Opportunity Days</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                These are the days this month with the highest potential for positive events and flow.
              </p>
              <div className="flex flex-wrap gap-2">
                {peaks.dates.map((date: string) => (
                  <Badge key={date} variant="secondary" className="text-md px-3 py-1">
                    {new Date(date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {top_events && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">Top 5 Astrological Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Orb</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top_events.items.map((event: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(event.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell>{`${event.transit} ${event.aspect} ${event.natal_target}`}</TableCell>
                      <TableCell className="text-right">{event.orb.toFixed(1)}°</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {daily_index && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-800">Daily Energy Index</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {daily_index.scores.map((day: any, index: number) => (
                  <AccordionItem value={`item-${index}`} key={day.date}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between items-center w-full pr-4">
                        <span>{new Date(day.date).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        <ScoreBadge score={day.score} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
                        {day.events.map((event: string, i: number) => (
                          <li key={i}>{event}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}; 