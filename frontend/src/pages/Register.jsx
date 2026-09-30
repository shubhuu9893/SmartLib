import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import GoogleButton from '../components/auth/GoogleButton';
import FirebaseNotice from '../components/auth/FirebaseNotice';
import { authErrorMessage, useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, loginWithGoogle, isConfigured } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Please enter a valid email address.';
    if (form.password.length < 6) return 'Password should be at least 6 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
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

  const field = (id, label, type, autoComplete) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type={type} autoComplete={autoComplete} required className="input py-3" value={form[id]} onChange={update(id)} />
    </div>
  );

  return (
    <AuthLayout title="Create your account" subtitle="Join SmartLib and get recommendations tailored to you.">
      {!isConfigured && <FirebaseNotice />}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {field('name', 'Name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('password', 'Password', 'password', 'new-password')}
        {field('confirm', 'Confirm Password', 'password', 'new-password')}
        {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-gradient w-full py-3" disabled={busy || !isConfigured}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Create account
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-fg-subtle">
        <span className="h-px flex-1 bg-ink-700" /> or <span className="h-px flex-1 bg-ink-700" />
      </div>
      <GoogleButton onClick={google} disabled={busy || !isConfigured} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="rounded font-semibold text-brand hover:text-brand-cyan">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
