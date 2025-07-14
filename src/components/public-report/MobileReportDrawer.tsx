import React from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportForm } from '@/components/shared/ReportForm';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileReportDrawer: React.FC<MobileReportDrawerProps> = ({ isOpen, onClose }) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose} dismissible={false}>
      <DrawerContent className="flex flex-col rounded-none h-screen max-h-screen">
        <div className="flex-1 overflow-hidden">
          <ReportForm 
            isMobileDrawer={true}
            onMobileClose={onClose}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;