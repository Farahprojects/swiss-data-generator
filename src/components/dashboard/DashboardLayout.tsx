
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordResetModal } from "@/components/auth/PasswordResetModal";

/**
 * DashboardLayout serves as the outer shell for all dashboard pages
 * It maintains consistent navigation, sidebar, and footer across all dashboard routes
 */
const DashboardLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  
  // Check if we should show the password reset modal
  useEffect(() => {
    console.log("DashboardLayout mounted or updated, user:", user?.email);
    
    // Check for password reset required flag in localStorage
    const resetFlag = localStorage.getItem('password_reset_required');
    
    // Check for token in URL (direct from password reset email)
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // Show modal if we have either reset flag or valid token parameters
    if (resetFlag === 'true' || (token && type === 'recovery')) {
      console.log("Password reset required, showing modal");
      setShowPasswordModal(true);
      
      if (token) {
        setPasswordResetToken(token);
      }
    }
  }, [user, location.pathname, searchParams]);

  const handlePasswordResetComplete = () => {
    console.log("Password reset completed, closing modal");
    setShowPasswordModal(false);
    localStorage.removeItem('password_reset_required');
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Fixed header at the top that spans full width */}
      <div className="sticky top-0 z-50 w-full">
        <UnifiedNavigation />
      </div>
      
      {/* Main content area - flexes below the header */}
      <div className="flex flex-grow bg-gray-50 mt-0 w-full">
        <div className="flex w-full">
          <DashboardSidebar />
          
          <SidebarInset className="p-4 md:p-6 w-full">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 w-full">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </div>
      
      {/* Password reset modal that appears when needed */}
      <PasswordResetModal
        open={showPasswordModal}
        token={passwordResetToken}
        onComplete={handlePasswordResetComplete}
      />
      
      <Footer />
    </div>
  );
};

export default DashboardLayout;
