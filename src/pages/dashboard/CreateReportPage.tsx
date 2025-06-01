
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, Clock } from 'lucide-react';

const CreateReportPage = () => {
  const [formData, setFormData] = useState({
    reportType: '',
    name: '',
    birthDate: '',
    birthTime: '',
    birthLocation: '',
    // Second person fields for compatibility/sync reports
    name2: '',
    birthDate2: '',
    birthTime2: '',
    birthLocation2: '',
    // Specific date fields for certain report types
    transitDate: '',
    moonDate: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating report with data:', formData);
    // TODO: Implement report generation logic
  };

  // Check if report type requires two people
  const requiresTwoPeople = formData.reportType === 'compatibility' || formData.reportType === 'sync';
  
  // Check if report type requires specific date
  const requiresTransitDate = formData.reportType === 'transits';
  const requiresMoonDate = formData.reportType === 'moonphases';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Report</h1>
      </div>

      <Card className="max-w-2xl border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select onValueChange={(value) => handleInputChange('reportType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natal">Natal Chart Report</SelectItem>
                  <SelectItem value="transits">Transits Report</SelectItem>
                  <SelectItem value="progressions">Progressions Report</SelectItem>
                  <SelectItem value="return">Solar/Lunar Return Report</SelectItem>
                  <SelectItem value="compatibility">Compatibility Report</SelectItem>
                  <SelectItem value="positions">Planetary Positions</SelectItem>
                  <SelectItem value="moonphases">Moon Phases</SelectItem>
                  <SelectItem value="body_matrix">Body Matrix Report</SelectItem>
                  <SelectItem value="sync">Sync Report</SelectItem>
                  <SelectItem value="essence">Essence Report</SelectItem>
                  <SelectItem value="flow">Flow Report</SelectItem>
                  <SelectItem value="mindset">Mindset Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="focus">Focus Report</SelectItem>
                  <SelectItem value="reports">Reports (Tracking)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Date Fields */}
            {requiresTransitDate && (
              <div className="space-y-2">
                <Label htmlFor="transitDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Transit Date
                </Label>
                <Input
                  id="transitDate"
                  type="date"
                  value={formData.transitDate}
                  onChange={(e) => handleInputChange('transitDate', e.target.value)}
                />
              </div>
            )}

            {requiresMoonDate && (
              <div className="space-y-2">
                <Label htmlFor="moonDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Moon Date
                </Label>
                <Input
                  id="moonDate"
                  type="date"
                  value={formData.moonDate}
                  onChange={(e) => handleInputChange('moonDate', e.target.value)}
                />
              </div>
            )}

            {/* First Person */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {requiresTwoPeople ? 'First Person' : 'Person Details'}
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Birth Date
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Birth Time
                  </Label>
                  <Input
                    id="birthTime"
                    type="time"
                    value={formData.birthTime}
                    onChange={(e) => handleInputChange('birthTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthLocation" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Birth Location
                </Label>
                <Input
                  id="birthLocation"
                  placeholder="City, Country"
                  value={formData.birthLocation}
                  onChange={(e) => handleInputChange('birthLocation', e.target.value)}
                />
              </div>
            </div>

            {/* Second Person - only show for compatibility and sync reports */}
            {requiresTwoPeople && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900">Second Person</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name2">Full Name</Label>
                  <Input
                    id="name2"
                    placeholder="Enter full name"
                    value={formData.name2}
                    onChange={(e) => handleInputChange('name2', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate2" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Birth Date
                    </Label>
                    <Input
                      id="birthDate2"
                      type="date"
                      value={formData.birthDate2}
                      onChange={(e) => handleInputChange('birthDate2', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthTime2" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Birth Time
                    </Label>
                    <Input
                      id="birthTime2"
                      type="time"
                      value={formData.birthTime2}
                      onChange={(e) => handleInputChange('birthTime2', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthLocation2" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Birth Location
                  </Label>
                  <Input
                    id="birthLocation2"
                    placeholder="City, Country"
                    value={formData.birthLocation2}
                    onChange={(e) => handleInputChange('birthLocation2', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information or specific focus areas..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">
                Generate Report
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormData({
                reportType: '',
                name: '',
                birthDate: '',
                birthTime: '',
                birthLocation: '',
                name2: '',
                birthDate2: '',
                birthTime2: '',
                birthLocation2: '',
                transitDate: '',
                moonDate: '',
                notes: ''
              })}>
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateReportPage;
