
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Settings, User, Bell, LifeBuoy, LogOut, CreditCard, Eye, Globe } from 'lucide-react';
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
import { SimpleSidebarMenu } from '@/components/dashboard/DashboardSidebar';
import { Sheet, SheetContent, SheetPortal } from '@/components/ui/sheet';
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

// Add types for message nav
type MessageFilterType = "inbox" | "sent" | "starred" | "archive" | "trash";

// Add types for website builder nav
interface WebsiteBuilderMenuProps {
  isWebsiteBuilderPageMobile?: boolean;
  onOpenModal?: (section: string) => void;
  onChangeTemplate?: () => void;
  onPublish?: () => void;
  isPublishing?: boolean;
}

interface NavMessageMenuProps {
  isMessagesPageMobile?: boolean;
  activeFilter?: MessageFilterType;
  unreadCount?: number;
  onFilterChange?: (filter: MessageFilterType) => void;
}

interface UnifiedNavigationProps extends NavMessageMenuProps, WebsiteBuilderMenuProps {}

const UnifiedNavigation = ({
  isMessagesPageMobile,
  activeFilter,
  unreadCount,
  onFilterChange,
  isWebsiteBuilderPageMobile,
  onOpenModal,
  onChangeTemplate,
  onPublish,
  isPublishing,
}: UnifiedNavigationProps = {}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const { openSettings } = useSettingsModal();
  
  const isLoggedIn = !!user;
  const isMainDashboard = location.pathname === '/dashboard';
  const isDashboardClientsPage = location.pathname === '/dashboard/clients';
  const isDashboardReportsPage = location.pathname === '/dashboard/reports';
  // UPDATE burger menu pages to include create report
  const isDashboardPageWithBurgerMenu = (
    location.pathname === '/dashboard/website-builder' ||
    location.pathname === '/dashboard/messages' ||
    location.pathname === '/dashboard/clients' ||
    location.pathname === '/dashboard/reports' ||
    location.pathname === '/dashboard/reports/create' ||
    location.pathname === '/dashboard/calendar'
  );
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const isMessagesPage = location.pathname === '/dashboard/messages';
  const isWebsiteBuilderPage = location.pathname === '/dashboard/website-builder';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
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

  const handlePreview = () => {
    try {
      // Generate a unique preview ID
      const previewId = Date.now().toString();
      
      // Open preview in new tab
      const previewUrl = `/preview/${previewId}`;
      window.open(previewUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening preview:', error);
    }
  };

  const showHeaderSearch =
    isLoggedIn &&
    isMessagesPage &&
    isMobile;

  // For global header search: only on mobile, only for /dashboard/messages
  const headerSearch = searchParams.get('search') || '';
  const setHeaderSearch = (val: string) => {
    // Keep all other params, just update 'search'
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set('search', val);
    } else {
      next.delete('search');
    }
    setSearchParams(next, { replace: true });
  };

  // Determine if we are on a dashboard page where sidebar/burger is shown
  const showDashboardBurgerMenu =
    isLoggedIn &&
    (
      isDashboardClientsPage ||
      (isDashboardPageWithBurgerMenu && isMobile) ||
      (isMainDashboard && isMobile) ||
      (isDashboardPageWithBurgerMenu && !isMobile) // <-- add: show burger on desktop for these pages too
    );

  // Determine nav wrapper padding
  // - Remove horizontal px-4 padding for mobile burger-menu dashboard pages
  // - Keep px-4/etc for all other navs (public, desktop, etc)
  let navWrapperClass =
    "h-full max-w-none ";
  if (
    isDashboardPageWithBurgerMenu &&
    isMobile
  ) {
    navWrapperClass += "px-0";
  } else {
    navWrapperClass += "px-4 sm:px-6 lg:px-8";
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full h-16 bg-white z-50 shadow-sm border-b">
        <div className={navWrapperClass}>
          <div className="flex justify-between items-center h-full">
            {/* Left section */}
            <div className="flex items-center">
              {/* ---- DESKTOP & MOBILE BURGER BUTTON (controlled by showDashboardBurgerMenu) ---- */}
              {showDashboardBurgerMenu ? (
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
            
            {/* Centered logo or search bar */}
            <div className="absolute left-1/2 transform -translate-x-1/2 min-w-0 max-w-full flex items-center">
              {showHeaderSearch ? (
                <div className="relative flex-1 w-full max-w-[70vw] sm:max-w-xs mx-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={headerSearch}
                    onChange={e => setHeaderSearch(e.target.value)}
                    className="pl-10 h-9 rounded-full bg-gray-100 focus:bg-white text-sm outline-none w-full border border-gray-200"
                    placeholder="Search mail"
                    style={{ minWidth: 0 }}
                    aria-label="Search mail"
                  />
                </div>
              ) : (
                isLoggedIn && (
                  <Logo />
                )
              )}
            </div>
            
            {/* Desktop Navigation - only for not logged in users */}
            <div className="hidden md:flex items-center space-x-8">
              {!isLoggedIn && (
                <>
                  <Link to="/features" className="text-gray-700 hover:text-primary text-sm font-medium">Features</Link>
                  <Link to="/pricing" className="text-gray-700 hover:text-primary text-sm font-medium">Pricing</Link>
                  <Link to="/about" className="text-gray-700 hover:text-primary text-sm font-medium">About</Link>
                  <Link to="/contact" className="text-gray-700 hover:text-primary text-sm font-medium">Contact</Link>
                </>
              )}
            </div>

            {/* Call to Action Buttons or User Menu */}
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  {/* Website Builder Action Buttons */}
                  {isWebsiteBuilderPage && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={isMobile ? "ghost" : "outline"}
                        size="sm"
                        onClick={handlePreview}
                        className={`flex items-center gap-2 ${isMobile ? 'border-0 bg-transparent hover:bg-transparent p-2' : ''}`}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden md:inline">Preview</span>
                      </Button>
                      <Button
                        variant={isMobile ? "ghost" : "default"}
                        size="sm"
                        onClick={onPublish}
                        disabled={isPublishing}
                        className={`flex items-center gap-2 ${isMobile ? 'border-0 bg-transparent hover:bg-transparent p-2' : ''}`}
                      >
                        {isPublishing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span className="hidden md:inline">Publishing...</span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4" />
                            <span className="hidden md:inline">Publish</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
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
                </>
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
              <Link to="/features" className="block text-gray-700 hover:text-primary py-2">Features</Link>
              <Link to="/pricing" className="block text-gray-700 hover:text-primary py-2">Pricing</Link>
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

      {/* Sidebar Sheet for Dashboard Pages with Burger Menu - WITHOUT OVERLAY */}
      {isDashboardPage && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetPortal>
            <SheetPrimitive.Content
              className="fixed inset-y-0 left-0 z-50 h-full w-[240px] border-r bg-white p-0 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=closed]:duration-300 data-[state=open]:duration-500"
            >
              <div onClick={closeSidebar}>
                <SimpleSidebarMenu
                  isMessagesPageMobile={isMessagesPageMobile && location.pathname === '/dashboard/messages'}
                  activeFilter={activeFilter}
                  unreadCount={unreadCount}
                  onFilterChange={onFilterChange}
                  isWebsiteBuilderPageMobile={isWebsiteBuilderPageMobile && location.pathname === '/dashboard/website-builder'}
                  onOpenModal={onOpenModal}
                  onChangeTemplate={onChangeTemplate}
                  onPublish={onPublish}
                  isPublishing={isPublishing}
                />
              </div>
            </SheetPrimitive.Content>
          </SheetPortal>
        </Sheet>
      )}
    </>
  );
};

export default UnifiedNavigation;
