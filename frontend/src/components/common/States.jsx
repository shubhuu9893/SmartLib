import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo, onAction, compact = false }) {
  return (
    <div className={`card flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-8' : 'px-6 py-14'}`}>
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-800 text-fg-muted">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-fg-muted">{message}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-5">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" onClick={onAction} className="btn-primary mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ error, title = 'Something went wrong.', message, onRetry, compact = false }) {
  const isNetwork = error?.code === 'network';
  const Icon = isNetwork ? WifiOff : AlertTriangle;
  return (
    <div
      role="alert"
      className={`card flex flex-col items-center justify-center border-danger/20 text-center ${compact ? 'px-6 py-8' : 'px-6 py-14'}`}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-fg-muted">{message || error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
      )}
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5', label = 'Loading' }) {
  return (
    <span role="status" className="inline-flex items-center">
      <svg className={`animate-spin text-brand ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
