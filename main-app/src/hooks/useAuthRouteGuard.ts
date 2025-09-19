import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Smart route guard that ensures auth users always have correct URLs
 * Automatically redirects to proper routes based on auth state and current URL
 */
export const useAuthRouteGuard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't run during loading or if no user
    if (loading || !user) return;

    const { pathname, search } = location;
    const searchParams = new URLSearchParams(search);

    // 🎯 Auth user URL validation and correction
    if (user) {
      // Case 1: Auth user on public routes → redirect to /therai
      const publicRoutes = ['/', '/pricing', '/about', '/contact', '/legal', '/blog', '/login', '/signup'];
      if (publicRoutes.includes(pathname)) {
        console.log('🔄 Auth user on public route, redirecting to /therai');
        navigate('/therai', { replace: true });
        return;
      }

      // Case 2: Auth user on /therai with user_id param → clean it up
      if (pathname === '/therai' && searchParams.has('user_id')) {
        console.log('🧹 Cleaning up user_id param from /therai');
        navigate('/therai', { replace: true });
        return;
      }

      // Case 3: Auth user on /c without thread_id → redirect to /therai
      if (pathname === '/c' && !pathname.includes('/c/')) {
        console.log('🔄 Auth user on /c base, redirecting to /therai');
        navigate('/therai', { replace: true });
        return;
      }

      // Case 4: Auth user on guest route /g/ → redirect to /therai
      if (pathname.startsWith('/g/')) {
        console.log('🔄 Auth user on guest route, redirecting to /therai');
        navigate('/therai', { replace: true });
        return;
      }

      // Case 5: Auth user on /c/{thread_id} with user_id param → clean it up
      if (pathname.startsWith('/c/') && searchParams.has('user_id')) {
        console.log('🧹 Cleaning up user_id param from /c/{thread_id}');
        const cleanUrl = pathname; // Keep the path, remove search params
        navigate(cleanUrl, { replace: true });
        return;
      }

      // Case 6: Auth user on any route with user_id param (except /therai and /c/) → clean it up
      if (searchParams.has('user_id') && pathname !== '/therai' && !pathname.startsWith('/c/')) {
        console.log('🧹 Cleaning up user_id param from', pathname);
        navigate(pathname, { replace: true });
        return;
      }
    }

    // 🎯 Guest user URL validation
    if (!user && !loading) {
      // Case 7: Guest user on auth routes → redirect to home
      if (pathname === '/therai' || pathname.startsWith('/c/')) {
        console.log('🔄 Guest user on auth route, redirecting to home');
        navigate('/', { replace: true });
        return;
      }
    }

  }, [user, loading, location, navigate]);

  // Return current auth state for components that need it
  return {
    isAuthenticated: !!user,
    isLoading: loading,
    currentPath: location.pathname,
    hasUserIdParam: new URLSearchParams(location.search).has('user_id')
  };
};
