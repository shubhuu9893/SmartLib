import { AlertTriangle } from 'lucide-react';

export default function FirebaseNotice() {
  return (
    <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-semibold text-fg">Firebase Authentication is not configured.</p>
        <p className="mt-1 text-fg-muted">
          Add the <code className="rounded bg-ink-800 px-1 py-0.5 text-xs">VITE_FIREBASE_*</code> values to{' '}
          <code className="rounded bg-ink-800 px-1 py-0.5 text-xs">frontend/.env</code> (see <code className="rounded bg-ink-800 px-1 py-0.5 text-xs">.env.example</code>) and restart the dev server to enable sign-in.
        </p>
      </div>
    </div>
  );
}
