import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { PublicReportForm } from './PublicReportForm';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  showReportGuide?: boolean;
  setShowReportGuide?: (show: boolean) => void;
}

const MobileReportDrawer = ({ isOpen, onClose, showReportGuide, setShowReportGuide }: MobileReportDrawerProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[95vh] flex flex-col">
        <DrawerHeader className="text-center border-b pb-4">
          <DrawerTitle className="text-xl font-bold">Get Your Report</DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            Fill out the form to receive your personalized astrology report
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <PublicReportForm 
              showReportGuide={showReportGuide}
              setShowReportGuide={setShowReportGuide}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;
