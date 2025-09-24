import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/auth/LoginModal';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect if already authenticated
  if (user && !authLoading) {
    const from = (location.state as any)?.from?.pathname || '/chat';
    navigate(from, { replace: true });
    return null;
  }

  const handleSuccess = () => {
    const from = (location.state as any)?.from?.pathname || '/chat';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />
      <div className="pt-24">
        <LoginModal onSuccess={handleSuccess} showAsPage={true} />
      </div>
      <Footer />
    </div>
  );
}