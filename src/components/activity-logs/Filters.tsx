
import React from 'react';
import { Calendar, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityLogsFilterState } from './queryBuilder';

interface FiltersProps {
  filters: ActivityLogsFilterState;
  onChange: (key: keyof ActivityLogsFilterState, value: any) => void;
}

const Filters = ({ filters, onChange }: FiltersProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4">
        {/* Single row for all filters */}
        <div className="flex gap-3 items-center">
          {/* Report Type Dropdown */}
          <div className="w-28">
            <Select
              value={filters.reportType || ""}
              onValueChange={(value) => onChange('reportType', value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <FileText className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="return">Solar/Lunar Return Report</SelectItem>
                <SelectItem value="positions">Planetary Positions</SelectItem>
                <SelectItem value="sync">Sync Report</SelectItem>
                <SelectItem value="essence">Essence Report</SelectItem>
                <SelectItem value="flow">Flow Report</SelectItem>
                <SelectItem value="mindset">Mindset Report</SelectItem>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="focus">Focus Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Status Dropdown */}
          <div className="w-32">
            <Select
              value={filters.status || ""}
              onValueChange={(value) => onChange('status', value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="w-48">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-9 text-sm"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {filters.startDate ? (
                    filters.endDate ? (
                      <>
                        {format(filters.startDate, 'MMM d')} - {format(filters.endDate, 'MMM d')}
                      </>
                    ) : (
                      format(filters.startDate, 'MMM d')
                    )
                  ) : (
                    <span>Date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <ScrollArea className="h-[300px]">
                  <div className="p-3">
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Start Date</div>
                      <CalendarComponent
                        mode="single"
                        selected={filters.startDate}
                        onSelect={(date) => onChange('startDate', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">End Date</div>
                      <CalendarComponent
                        mode="single"
                        selected={filters.endDate}
                        onSelect={(date) => onChange('endDate', date)}
                        disabled={(date) => filters.startDate ? date < filters.startDate : false}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
