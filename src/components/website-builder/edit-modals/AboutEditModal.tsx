
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AboutEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AboutData) => void;
  initialData: AboutData;
}

interface AboutData {
  introTitle: string;
  bio: string;
}

export const AboutEditModal: React.FC<AboutEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<AboutData>(initialData);

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
          <DialogTitle>Edit About Section</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="introTitle">Section Title</Label>
            <Input
              id="introTitle"
              value={formData.introTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, introTitle: e.target.value }))}
              placeholder="Designed for you."
            />
          </div>
          
          <div>
            <Label htmlFor="bio">About Text</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Every insight is crafted with precision, tailored to your unique story and timing..."
              rows={6}
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
