
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, MapPin, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportResult {
  success: boolean;
  reportType: string;
  data: any;
  generatedAt: string;
}

const CreateReportPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [formData, setFormData] = useState({
    reportType: '',
    relationshipType: '',
    essenceType: '',
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
    progressionDate: '',
    returnDate: '',
    moonDate: '',
    // Planetary positions fields
    positionsLocation: '',
    positionsDate: '',
    positionsEndDate: '',
    // Today's date/time fields for body matrix and essence
    todayDate: '',
    todayTime: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Pre-select "Personal" when sync report is selected
  useEffect(() => {
    if (formData.reportType === 'sync' && !formData.relationshipType) {
      setFormData(prev => ({
        ...prev,
        relationshipType: 'personal'
      }));
    } else if (formData.reportType !== 'sync') {
      setFormData(prev => ({
        ...prev,
        relationshipType: ''
      }));
    }
  }, [formData.reportType]);

  // Clear essence type when report type changes away from essence
  useEffect(() => {
    if (formData.reportType !== 'essence') {
      setFormData(prev => ({
        ...prev,
        essenceType: ''
      }));
    }
  }, [formData.reportType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setReportResult(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "Authentication Error",
          description: "Please log in to generate reports",
          variant: "destructive"
        });
        return;
      }

      console.log('Submitting form data:', formData);

      const response = await supabase.functions.invoke('create-report', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Create report response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create report');
      }

      if (response.data.error) {
        throw new Error(response.data.details || response.data.error);
      }

      setReportResult(response.data);
      toast({
        title: "Report Generated Successfully",
        description: `Your ${formData.reportType} report has been created`,
      });

    } catch (error) {
      console.error('Error creating report:', error);
      toast({
        title: "Error Creating Report",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      reportType: '',
      relationshipType: '',
      essenceType: '',
      name: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      name2: '',
      birthDate2: '',
      birthTime2: '',
      birthLocation2: '',
      transitDate: '',
      progressionDate: '',
      returnDate: '',
      moonDate: '',
      positionsLocation: '',
      positionsDate: '',
      positionsEndDate: '',
      todayDate: '',
      todayTime: '',
      notes: ''
    });
    setReportResult(null);
  };

  // Check if report type requires two people
  const requiresTwoPeople = formData.reportType === 'compatibility' || formData.reportType === 'sync';
  
  // Check if report type requires specific date
  const requiresTransitDate = formData.reportType === 'transits';
  const requiresProgressionDate = formData.reportType === 'progressions';
  const requiresReturnDate = formData.reportType === 'return';
  const requiresMoonDate = formData.reportType === 'moonphases';
  const requiresPositionsFields = formData.reportType === 'positions';
  const isSyncReport = formData.reportType === 'sync';
  const isEssenceReport = formData.reportType === 'essence';
  const requiresTodayDateTime = formData.reportType === 'body_matrix' || formData.reportType === 'essence';

  // Show result if we have one
  if (reportResult) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Generated</h1>
        </div>

        <Card className="max-w-4xl border-2 border-green-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500/10 to-transparent p-1"></div>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {reportResult.reportType.charAt(0).toUpperCase() + reportResult.reportType.slice(1)} Report
                </h2>
                <p className="text-gray-600">Generated on {new Date(reportResult.generatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Report Data</h3>
              <pre className="text-sm overflow-auto max-h-96 bg-white p-3 rounded border">
                {JSON.stringify(reportResult.data, null, 2)}
              </pre>
            </div>

            <div className="flex gap-4">
              <Button onClick={resetForm} variant="outline">
                Create Another Report
              </Button>
              <Button onClick={() => window.print()} variant="outline">
                Print Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

            {/* Relationship Type - only show for sync reports */}
            {isSyncReport && (
              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <ToggleGroup 
                  type="single" 
                  value={formData.relationshipType}
                  onValueChange={(value) => handleInputChange('relationshipType', value || '')}
                  className="justify-start"
                >
                  <ToggleGroupItem 
                    value="personal" 
                    className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground/80"
                  >
                    Personal
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="professional" 
                    className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground/80"
                  >
                    Professional
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {/* Essence Type - only show for essence reports */}
            {isEssenceReport && (
              <div className="space-y-2">
                <Label>Essence Type</Label>
                <ToggleGroup 
                  type="single" 
                  value={formData.essenceType}
                  onValueChange={(value) => handleInputChange('essenceType', value || '')}
                  className="justify-start"
                >
                  <ToggleGroupItem 
                    value="personal-identity" 
                    className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground/80"
                  >
                    Personal
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="professional" 
                    className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground/80"
                  >
                    Professional
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="relational" 
                    className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground/80"
                  >
                    Relational
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {/* Moon Date - standalone field for moonphases */}
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

            {/* Planetary Positions Fields */}
            {requiresPositionsFields && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Location & Date</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="positionsLocation" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="positionsLocation"
                    placeholder="City, Country"
                    value={formData.positionsLocation}
                    onChange={(e) => handleInputChange('positionsLocation', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="positionsDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </Label>
                    <Input
                      id="positionsDate"
                      type="date"
                      value={formData.positionsDate}
                      onChange={(e) => handleInputChange('positionsDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="positionsEndDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      End Date (Optional)
                    </Label>
                    <Input
                      id="positionsEndDate"
                      type="date"
                      value={formData.positionsEndDate}
                      onChange={(e) => handleInputChange('positionsEndDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Person Details - only show if NOT moonphases and NOT positions */}
            {!requiresMoonDate && !requiresPositionsFields && (
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

                {/* Today's Date and Time - only for Body Matrix and Essence reports */}
                {requiresTodayDateTime && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Optional: Add today's date and time if you're not in the same location as birth
                      </Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="todayDate" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Today's Date
                        </Label>
                        <Input
                          id="todayDate"
                          type="date"
                          value={formData.todayDate}
                          onChange={(e) => handleInputChange('todayDate', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="todayTime" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Today's Time
                        </Label>
                        <Input
                          id="todayTime"
                          type="time"
                          value={formData.todayTime}
                          onChange={(e) => handleInputChange('todayTime', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Transit Date - appears after Birth Location for transits */}
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

                {/* Progression Date - appears after Birth Location for progressions */}
                {requiresProgressionDate && (
                  <div className="space-y-2">
                    <Label htmlFor="progressionDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Progression Date
                    </Label>
                    <Input
                      id="progressionDate"
                      type="date"
                      value={formData.progressionDate}
                      onChange={(e) => handleInputChange('progressionDate', e.target.value)}
                    />
                  </div>
                )}

                {/* Return Date - appears after Birth Location for return reports */}
                {requiresReturnDate && (
                  <div className="space-y-2">
                    <Label htmlFor="returnDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Return Date
                    </Label>
                    <Input
                      id="returnDate"
                      type="date"
                      value={formData.returnDate}
                      onChange={(e) => handleInputChange('returnDate', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

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

            <div className="pt-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateReportPage;
