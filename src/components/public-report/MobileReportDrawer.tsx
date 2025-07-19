
import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ReportForm } from '@/components/shared/ReportForm';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeGuestId: string | null;
}

const MobileReportDrawer: React.FC<MobileReportDrawerProps> = ({ 
  isOpen, 
  onClose,
  activeGuestId 
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Get Your Report</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">
          <ReportForm guestId={activeGuestId} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;
