import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import GoogleButton from '../components/auth/GoogleButton';
import FirebaseNotice from '../components/auth/FirebaseNotice';
import { authErrorMessage, useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loginWithGoogle, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your SmartLib library.">
      {!isConfigured && <FirebaseNotice />}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input py-3" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link to="/forgot-password" className="mb-1.5 rounded text-sm font-medium text-brand hover:text-brand-cyan">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="input py-3 pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-subtle hover:text-fg" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-gradient w-full py-3" disabled={busy || !isConfigured || !email || !password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Sign in
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-fg-subtle">
        <span className="h-px flex-1 bg-ink-700" /> or <span className="h-px flex-1 bg-ink-700" />
      </div>
      <GoogleButton onClick={google} disabled={busy || !isConfigured} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        New to SmartLib?{' '}
        <Link to="/register" className="rounded font-semibold text-brand hover:text-brand-cyan">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
