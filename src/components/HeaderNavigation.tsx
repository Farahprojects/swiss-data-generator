
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, MessageSquare } from "lucide-react";
import { UserAvatar } from "@/components/settings/UserAvatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const HeaderNavigation = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isLoggedIn = !!user;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleViewSettings = (section: string) => {
    navigate(`/dashboard/settings?panel=${section}`);
  };

  return (
    <nav className="sticky top-0 bg-white z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-black font-therai">Therai</span>
              <span className="text-2xl font-bold text-[#8B5CF6] ml-1 font-therai">api</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/api-products" className="text-gray-700 hover:text-primary text-sm font-medium">API Products</Link>
            <Link to="/pricing" className="text-gray-700 hover:text-primary text-sm font-medium">Pricing</Link>
            <Link to="/documentation" className="text-gray-700 hover:text-primary text-sm font-medium">Documentation</Link>
            <Link to="/about" className="text-gray-700 hover:text-primary text-sm font-medium">About</Link>
            <Link to="/contact" className="text-gray-700 hover:text-primary text-sm font-medium">Contact</Link>
          </div>

          {/* Call to Action Buttons or User Menu */}
          <div className="hidden md:flex items-center space-x-4">
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
                  <DropdownMenuItem onClick={() => handleViewSettings('account')}>
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleViewSettings('billing')}>
                    Billing & Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleViewSettings('apikeys')}>
                    API Keys
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleViewSettings('support')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
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

          {/* Mobile Menu Button */}
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
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t py-4">
          <div className="container mx-auto px-4 space-y-2">
            <Link to="/api-products" className="block text-gray-700 hover:text-primary py-2">API Products</Link>
            <Link to="/pricing" className="block text-gray-700 hover:text-primary py-2">Pricing</Link>
            <Link to="/documentation" className="block text-gray-700 hover:text-primary py-2">Documentation</Link>
            <Link to="/about" className="block text-gray-700 hover:text-primary py-2">About</Link>
            <Link to="/contact" className="block text-gray-700 hover:text-primary py-2">Contact</Link>
            
            {isLoggedIn ? (
              <div className="space-y-2 pt-4">
                <div className="flex items-center">
                  <UserAvatar size="sm" />
                  <span className="ml-2 font-medium">{user.email}</span>
                </div>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleViewSettings('account')}>
                  Account Settings
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleViewSettings('billing')}>
                  Billing & Subscription
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleViewSettings('apikeys')}>
                  API Keys
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleViewSettings('support')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default HeaderNavigation;
