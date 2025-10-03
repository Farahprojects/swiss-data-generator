import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProfile: (name: string, birthData: any) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onCreateProfile,
}) => {
  const [step, setStep] = useState<'name' | 'birth'>('name');
  const [profileName, setProfileName] = useState('');
  const [birthData, setBirthData] = useState({
    birthDate: '',
    birthTime: '',
    birthLocation: '',
  });

  const handleNext = () => {
    if (step === 'name' && profileName.trim()) {
      setStep('birth');
    }
  };

  const handleBack = () => {
    setStep('name');
  };

  const handleCreate = () => {
    if (step === 'birth' && birthData.birthDate && birthData.birthTime && birthData.birthLocation) {
      onCreateProfile(profileName.trim(), birthData);
      // Reset form
      setStep('name');
      setProfileName('');
      setBirthData({ birthDate: '', birthTime: '', birthLocation: '' });
      onClose();
    }
  };

  const handleClose = () => {
    // Reset form
    setStep('name');
    setProfileName('');
    setBirthData({ birthDate: '', birthTime: '', birthLocation: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'name' ? 'Create Person Profile' : `Birth Details for ${profileName}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'name' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g., John Smith"
                className="rounded-xl"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} className="rounded-full">
                Cancel
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!profileName.trim()}
                className="rounded-full"
              >
                Next: Birth Data
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birth-date">Birth Date</Label>
              <Input
                id="birth-date"
                type="date"
                value={birthData.birthDate}
                onChange={(e) => setBirthData(prev => ({ ...prev, birthDate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birth-time">Birth Time</Label>
              <Input
                id="birth-time"
                type="time"
                value={birthData.birthTime}
                onChange={(e) => setBirthData(prev => ({ ...prev, birthTime: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birth-location">Birth Location</Label>
              <Input
                id="birth-location"
                value={birthData.birthLocation}
                onChange={(e) => setBirthData(prev => ({ ...prev, birthLocation: e.target.value }))}
                placeholder="City, State, Country"
                className="rounded-xl"
              />
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} className="rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!birthData.birthDate || !birthData.birthTime || !birthData.birthLocation}
                className="rounded-full"
              >
                Create Profile
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
