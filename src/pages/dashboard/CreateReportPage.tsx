
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const CreateReportPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reportType: '',
    name: '',
    birthDate: '',
    birthTime: '',
    location: '',
    reportLevel: 'standard'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    try {
      // Here you would integrate with your API to generate the report
      // For now, we'll just show a success message
      toast({
        title: "Report Generation Started",
        description: `${formData.reportLevel} ${formData.reportType} report for ${formData.name} is being generated.`,
      });
      
      // Reset form
      setFormData({
        reportType: '',
        name: '',
        birthDate: '',
        birthTime: '',
        location: '',
        reportLevel: 'standard'
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Report</h1>
        <p className="text-gray-600">Generate a new astrological report</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            Enter the details below to generate your astrological report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select 
                  value={formData.reportType} 
                  onValueChange={(value) => handleInputChange('reportType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natal">Natal Chart</SelectItem>
                    <SelectItem value="transits">Transits</SelectItem>
                    <SelectItem value="progressions">Progressions</SelectItem>
                    <SelectItem value="synastry">Synastry</SelectItem>
                    <SelectItem value="return">Solar Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportLevel">Report Level</Label>
                <Select 
                  value={formData.reportLevel} 
                  onValueChange={(value) => handleInputChange('reportLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthTime">Birth Time</Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={formData.birthTime}
                  onChange={(e) => handleInputChange('birthTime', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Birth Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State, Country"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.reportType || !formData.name}
            >
              {loading ? 'Generating Report...' : 'Generate Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateReportPage;
