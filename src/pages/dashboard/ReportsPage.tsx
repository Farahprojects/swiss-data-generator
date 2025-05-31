
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ReportsPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<string>('');
  const [reportData, setReportData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    location: '',
    reportLevel: 'standard'
  });

  const handleCreateReport = () => {
    // TODO: Implement report creation logic
    console.log('Creating report with data:', reportData, 'Type:', reportType);
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and manage your astrological reports
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>
                Generate a new astrological report by providing the required information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natal">Natal Chart</SelectItem>
                    <SelectItem value="transits">Current Transits</SelectItem>
                    <SelectItem value="progressions">Progressions</SelectItem>
                    <SelectItem value="return">Solar Return</SelectItem>
                    <SelectItem value="synastry">Synastry</SelectItem>
                    <SelectItem value="essence">Essence Report</SelectItem>
                    <SelectItem value="flow">Flow Report</SelectItem>
                    <SelectItem value="mindset">Mindset Report</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                    <SelectItem value="focus">Focus Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  value={reportData.name}
                  onChange={(e) => setReportData({...reportData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={reportData.birthDate}
                  onChange={(e) => setReportData({...reportData, birthDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthTime">Birth Time</Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={reportData.birthTime}
                  onChange={(e) => setReportData({...reportData, birthTime: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Birth Location</Label>
                <Input
                  id="location"
                  placeholder="City, State/Country"
                  value={reportData.location}
                  onChange={(e) => setReportData({...reportData, location: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportLevel">Report Level</Label>
                <Select 
                  value={reportData.reportLevel} 
                  onValueChange={(value) => setReportData({...reportData, reportLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Report</SelectItem>
                    <SelectItem value="premium">Premium Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateReport}
                disabled={!reportType || !reportData.name || !reportData.birthDate}
              >
                Generate Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        <div className="border rounded-lg p-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first astrological report to get started.
          </p>
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
