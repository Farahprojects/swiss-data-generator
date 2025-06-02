
import React from 'react';
import { Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReportsFilterProps {
  reportType: string | null;
  search: string;
  onReportTypeChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
}

const ReportsFilter = ({ reportType, search, onReportTypeChange, onSearchChange }: ReportsFilterProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Report Type Dropdown */}
        <div className="flex-1 min-w-[200px]">
          <Select
            value={reportType || ""}
            onValueChange={(value) => onReportTypeChange(value === "all" ? null : value)}
          >
            <SelectTrigger>
              <FileText className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Report Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Report Types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="essence">Essence</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="mindset">Mindset</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="spiritual">Spiritual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Search Field */}
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by report name or ID..."
              className="pl-10"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsFilter;
