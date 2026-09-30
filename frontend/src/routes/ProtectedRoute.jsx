import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from '../components/common/FullPageLoader';

export default function ProtectedRoute() {
  const { isAuthenticated, initializing, profile } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (profile?.needs_onboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
