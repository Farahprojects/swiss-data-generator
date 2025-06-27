
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader } from "../ImageUploader";
import { X } from "lucide-react";

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
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
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
