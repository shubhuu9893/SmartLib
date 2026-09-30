import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, KeyRound, Loader2, LogOut, Search, Settings as SettingsIcon, SlidersHorizontal, Trash2, UserCog } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import useAsync from '../hooks/useAsync';
import { clearSearchHistory, getSearchHistory, updateMe } from '../api/userApi';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../utils/format';

const NOTIFICATION_PREFS = [
  { key: 'notify_recommendations', label: 'New recommendations', description: 'When your recommendations change after updating interests.' },
  { key: 'notify_library', label: 'Library updates', description: 'When books are added to or moved in your library.' },
  { key: 'notify_authors', label: 'Favorite authors', description: 'When authors of books you favorited publish new work.' },
];

const PROVIDERS = { password: 'Email & password', 'google.com': 'Google' };

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`settings-${title}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-brand">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 id={`settings-${title}`} className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-fg-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-ink-700'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { profile, setProfile, firebaseUser, logout, resetPassword } = useAuth();
  const { invalidateRecommendations } = useApp();
  const toast = useToast();
  const [name, setName] = useState(profile?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [savingPref, setSavingPref] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const history = useAsync(getSearchHistory, []);
  const prefs = profile?.preferences || {};
  const providers = (firebaseUser?.providerData || []).map((p) => p.providerId);

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      setProfile(await updateMe({ name: name.trim() }));
      toast('Name updated');
    } catch (err) {
      toast(err.message || "Couldn't update your name", 'error');
    } finally {
      setSavingName(false);
    }
  };

  const togglePref = async (key, value) => {
    setSavingPref(key);
    try {
      setProfile(await updateMe({ preferences: { [key]: value } }));
    } catch (err) {
      toast(err.message || "Couldn't save preference", 'error');
    } finally {
      setSavingPref(null);
    }
  };

  const onClearSearch = async () => {
    try {
      await clearSearchHistory();
      history.setData([]);
      invalidateRecommendations();
      toast('Search history cleared');
    } catch (err) {
      toast(err.message || "Couldn't clear search history", 'error');
    }
  };

  const sendReset = async () => {
    try {
      await resetPassword(firebaseUser.email);
      toast(`Password reset email sent to ${firebaseUser.email}`);
    } catch (err) {
      toast(authErrorMessage(err), 'error');
    }
  };

  const doLogout = async () => {
    setConfirmLogout(false);
    try {
      await logout();
    } catch {
      toast("Couldn't sign out. Please try again.", 'error');
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" icon={SettingsIcon} />
      <div className="space-y-6">
        <Section icon={UserCog} title="Account" description="Your SmartLib profile details.">
          <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="settings-name" className="label">Display name</label>
              <input id="settings-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
            </div>
            <button type="submit" className="btn-primary" disabled={savingName || !name.trim() || name.trim() === profile?.name}>
              {savingName && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save
            </button>
          </form>
          <div className="mt-4">
            <p className="label">Email</p>
            <p className="text-sm">{profile?.email || firebaseUser?.email}</p>
          </div>
          <Link to="/profile" className="mt-4 inline-block text-sm font-medium text-brand hover:text-brand-cyan">Edit full profile →</Link>
        </Section>

        <Section icon={SlidersHorizontal} title="Preferences" description="Signals SmartLib uses to personalise recommendations.">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Interests</p>
              <p className="text-xs text-fg-muted">{profile?.interests?.length ? `${profile.interests.length} selected` : 'None selected'}</p>
            </div>
            <Link to="/interests" className="btn-secondary">Manage interests</Link>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4 text-fg-subtle" aria-hidden="true" /> Recent searches</p>
              {history.data?.length > 0 && (
                <button type="button" onClick={onClearSearch} className="btn-ghost px-2.5 py-1.5 text-xs hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear
                </button>
              )}
            </div>
            {history.loading ? (
              <div className="skeleton mt-3 h-8 w-full" />
            ) : history.data?.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {history.data.slice(0, 15).map((h) => (
                  <li key={h.id}>
                    <Link to={`/search?q=${encodeURIComponent(h.query)}`} className="chip text-xs" title={timeAgo(h.created_at)}>{h.query}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-fg-muted">{history.error ? "Couldn't load search history." : 'No searches yet.'}</p>
            )}
          </div>
        </Section>

        <Section icon={Bell} title="Notifications" description="Choose which in-app notifications you receive.">
          <div className="divide-y divide-ink-800">
            {NOTIFICATION_PREFS.map((p) => (
              <Toggle key={p.key} label={p.label} description={p.description} checked={prefs[p.key] !== false} disabled={savingPref === p.key || !profile} onChange={(v) => togglePref(p.key, v)} />
            ))}
          </div>
        </Section>

        <Section icon={KeyRound} title="Authentication" description="Managed securely by Firebase Authentication.">
          <div className="space-y-4">
            <div>
              <p className="label">Sign-in methods</p>
              <ul className="flex flex-wrap gap-2">
                {providers.length ? providers.map((p) => <li key={p} className="chip">{PROVIDERS[p] || p}</li>) : <li className="text-sm text-fg-muted">Unknown</li>}
              </ul>
            </div>
            {providers.includes('password') && (
              <button type="button" onClick={sendReset} className="btn-secondary">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Send password reset email
              </button>
            )}
            <div className="border-t border-line pt-4">
              <button type="button" onClick={() => setConfirmLogout(true)} className="btn-danger">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
              </button>
            </div>
          </div>
        </Section>
      </div>

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Log out of SmartLib?"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmLogout(false)}>Cancel</button>
            <button type="button" className="btn-danger" onClick={doLogout}>Log out</button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">You&apos;ll need to sign in again to access your library.</p>
      </Modal>
    </div>
  );
}
