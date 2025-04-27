import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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

          {/* Call to Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login">
              <Button variant="outline" className="px-4">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button className="px-4">Sign Up</Button>
            </Link>
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
  );
};

export default Navbar;
