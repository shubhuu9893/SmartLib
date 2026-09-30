import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import ErrorBoundary from '../common/ErrorBoundary';
import { SkeletonPage } from '../common/Skeletons';
import SyncBanner from '../auth/SyncBanner';

export default function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-ink-950">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">
          <SyncBanner />
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<SkeletonPage />}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mx-auto w-full max-w-[1600px]"
              >
                <Outlet />
              </motion.div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
