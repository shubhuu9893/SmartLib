import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from '../components/common/FullPageLoader';

export default function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageLoader />;
  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    return <Navigate to={from && from !== '/login' && from !== '/register' ? from : '/dashboard'} replace />;
  }
  return <Outlet />;
}
