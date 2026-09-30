import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SyncBanner() {
  const { syncError, retrySync } = useAuth();
  if (!syncError) return null;
  return (
    <div role="alert" className="mx-auto mb-6 flex max-w-[1600px] flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <p className="flex-1 text-fg">
        <span className="font-semibold">We couldn&apos;t sync your account with SmartLib.</span>{' '}
        <span className="text-fg-muted">{syncError.message}</span>
      </p>
      <button type="button" onClick={retrySync} className="btn-secondary py-1.5">
        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
