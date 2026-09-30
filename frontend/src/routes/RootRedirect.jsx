import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from '../components/common/FullPageLoader';

export default function RootRedirect() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}
