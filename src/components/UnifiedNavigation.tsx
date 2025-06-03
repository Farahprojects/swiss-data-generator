
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

const UnifiedNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
      <div className="w-full h-full px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Burger menu trigger for dashboard pages */}
          {isDashboard && (
            <SidebarTrigger className="md:flex">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          )}
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Therai</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          {!isDashboard && (
            <>
              <Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link to="/documentation" className="text-gray-600 hover:text-gray-900 transition-colors">
                Documentation
              </Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                Contact
              </Link>
            </>
          )}
        </div>

        {/* Right side buttons */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-2">
              {!isDashboard && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Button>
              )}
              <SettingsButton />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default UnifiedNavigation;
