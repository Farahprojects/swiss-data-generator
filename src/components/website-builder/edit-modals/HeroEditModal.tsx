
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface HeroEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HeroData) => void;
  initialData: HeroData;
}

interface HeroData {
  coachName: string;
  tagline: string;
  buttonText: string;
}

export const HeroEditModal: React.FC<HeroEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<HeroData>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleCancel = () => {
    setFormData(initialData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Hero Section</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="coachName">Coach Name</Label>
            <Input
              id="coachName"
              value={formData.coachName}
              onChange={(e) => setFormData(prev => ({ ...prev, coachName: e.target.value }))}
              placeholder="Your Name"
            />
          </div>
          
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Textarea
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="Personalized insights that illuminate your unique path forward"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              value={formData.buttonText}
              onChange={(e) => setFormData(prev => ({ ...prev, buttonText: e.target.value }))}
              placeholder="Get Your Insights"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
