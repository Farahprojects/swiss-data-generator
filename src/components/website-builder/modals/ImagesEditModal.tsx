
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader } from "../ImageUploader";

interface ImagesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const ImagesEditModal: React.FC<ImagesEditModalProps> = ({
  isOpen,
  onClose,
  customizationData,
  onChange
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Images</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="space-y-6 pt-6">
            <ImageUploader
              value={customizationData.headerImageData}
              onChange={(data) => onChange('headerImageData', data)}
              label="Header Background Image"
              section="header"
            />
            
            <ImageUploader
              value={customizationData.aboutImageData}
              onChange={(data) => onChange('aboutImageData', data)}
              label="About Section Image"
              section="about"
            />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
