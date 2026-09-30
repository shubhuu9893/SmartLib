import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import RootRedirect from './routes/RootRedirect';
import FullPageLoader from './components/common/FullPageLoader';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Explore = lazy(() => import('./pages/Explore'));
const Search = lazy(() => import('./pages/Search'));
const Categories = lazy(() => import('./pages/Categories'));
const Category = lazy(() => import('./pages/Category'));
const Recommended = lazy(() => import('./pages/Recommended'));
const Library = lazy(() => import('./pages/Library'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Ratings = lazy(() => import('./pages/Ratings'));
const Interests = lazy(() => import('./pages/Interests'));
const BookDetails = lazy(() => import('./pages/BookDetails'));
const Authors = lazy(() => import('./pages/Authors'));
const AuthorDetails = lazy(() => import('./pages/AuthorDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category/:categoryId" element={<Category />} />
            <Route path="/recommended" element={<Recommended />} />
            <Route path="/library" element={<Library />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/interests" element={<Interests />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/authors" element={<Authors />} />
            <Route path="/author/:id" element={<AuthorDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
