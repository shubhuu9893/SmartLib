import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import FirebaseNotice from '../components/auth/FirebaseNotice';
import { authErrorMessage, useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { resetPassword, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new password.">
      {!isConfigured && <FirebaseNotice />}
      {sent ? (
        <div role="status" className="card flex gap-3 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <p>If an account exists for <strong>{email}</strong>, a password reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" required className="input py-3" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-gradient w-full py-3" disabled={busy || !isConfigured || !email}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Send reset link
          </button>
        </form>
      )}
      <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 rounded text-sm font-medium text-brand hover:text-brand-cyan">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
      </Link>
    </AuthLayout>
  );
}
