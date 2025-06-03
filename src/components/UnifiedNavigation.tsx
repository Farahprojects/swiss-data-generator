
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Settings, User, Bell, LifeBuoy, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/settings/UserAvatar';
import Logo from '@/components/Logo';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSettingsModal } from '@/contexts/SettingsModalContext';
import { logToSupabase } from '@/utils/batchedLogManager';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const UnifiedNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const { openSettings } = useSettingsModal();
  
  const isLoggedIn = !!user;
  const isWebsiteBuilder = location.pathname.includes('/website-builder');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleOpenSettings = (panel: string) => {
    logToSupabase("Opening settings from navigation dropdown", {
      level: 'info',
      page: 'UnifiedNavigation',
      data: { panel }
    });
    
    openSettings(panel as "general" | "account" | "notifications" | "support" | "billing");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full h-16 bg-white z-50 shadow-sm border-b">
        <div className="h-full max-w-none px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-full">
            {/* Left section */}
            <div className="flex items-center">
              {isLoggedIn && isWebsiteBuilder ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleSidebar} 
                  className="mr-2"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              ) : !isLoggedIn ? (
                <Logo />
              ) : null}
            </div>
            
            {/* Centered logo - only for logged in users */}
            {isLoggedIn && (
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Logo />
              </div>
            )}
            
            {/* Desktop Navigation - only for not logged in users */}
            <div className="hidden md:flex items-center space-x-8">
              {!isLoggedIn && (
                <>
                  <Link to="/api-products" className="text-gray-700 hover:text-primary text-sm font-medium">API Products</Link>
                  <Link to="/pricing" className="text-gray-700 hover:text-primary text-sm font-medium">Pricing</Link>
                  <Link to="/documentation" className="text-gray-700 hover:text-primary text-sm font-medium">Documentation</Link>
                  <Link to="/about" className="text-gray-700 hover:text-primary text-sm font-medium">About</Link>
                  <Link to="/contact" className="text-gray-700 hover:text-primary text-sm font-medium">Contact</Link>
                </>
              )}
            </div>

            {/* Call to Action Buttons or User Menu */}
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-0 h-auto rounded-full">
                      <UserAvatar size="sm" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <div className="px-4 py-2 text-sm">
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => handleOpenSettings('general')}>
                      <Settings className="mr-2 h-4 w-4" />
                      General
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSettings('account')}>
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSettings('billing')}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSettings('notifications')}>
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSettings('support')}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      Support
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => navigate('/dashboard/api-keys')}>
                      API Keys
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" className="px-4">Log In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="px-4">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button - Only for non-logged in users */}
            {!isLoggedIn && (
              <div className="md:hidden">
                <button
                  onClick={toggleMenu}
                  className="text-gray-700 focus:outline-none"
                >
                  {isMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu - Only for non-logged in users */}
        {isMenuOpen && !isLoggedIn && (
          <div className="absolute top-full left-0 right-0 md:hidden bg-white border-t shadow-lg z-40">
            <div className="px-4 py-4 space-y-2">
              <Link to="/api-products" className="block text-gray-700 hover:text-primary py-2">API Products</Link>
              <Link to="/pricing" className="block text-gray-700 hover:text-primary py-2">Pricing</Link>
              <Link to="/documentation" className="block text-gray-700 hover:text-primary py-2">Documentation</Link>
              <Link to="/about" className="block text-gray-700 hover:text-primary py-2">About</Link>
              <Link to="/contact" className="block text-gray-700 hover:text-primary py-2">Contact</Link>
              
              <div className="flex flex-col space-y-2 pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Sheet for Website Builder */}
      {isWebsiteBuilder && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-[240px] p-0">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default UnifiedNavigation;
