import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookCheck, BookOpen, Calendar, Heart, Loader2, Mail, Pencil, Star, User } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getStats, updateMe } from '../api/userApi';
import { getCategories } from '../api/booksApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';

function StatCard({ icon: Icon, label, value, to }) {
  const content = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-brand">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        <p className="text-xs text-fg-muted">{label}</p>
      </div>
    </>
  );
  return to ? (
    <Link to={to} className="card flex items-center gap-4 p-4 transition-colors hover:border-brand/40">{content}</Link>
  ) : (
    <div className="card flex items-center gap-4 p-4">{content}</div>
  );
}

function EditProfile({ open, onClose, profile, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: profile?.name || '', bio: profile?.bio || '', avatar_url: profile?.avatar_url || '' });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMe({ name: form.name.trim(), bio: form.bio.trim(), avatar_url: form.avatar_url.trim() });
      onSaved(updated);
      toast('Profile updated');
      onClose();
    } catch (err) {
      toast(err.message || "Couldn't update your profile", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="profile-name" className="label">Name</label>
          <input id="profile-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={255} required />
        </div>
        <div>
          <label htmlFor="profile-avatar" className="label">Avatar image URL</label>
          <input id="profile-avatar" type="url" className="input" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
        </div>
        <div>
          <label htmlFor="profile-bio" className="label">About you</label>
          <textarea id="profile-bio" rows={3} className="input resize-none" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={1000} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Profile() {
  const { profile, firebaseUser, setProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const stats = useAsync(getStats, []);
  const categories = useAsync(getCategories, []);
  const name = profile?.name || firebaseUser?.displayName || '';
  const email = profile?.email || firebaseUser?.email || '';
  const interestNames = (profile?.interests || []).map((id) => categories.data?.find((c) => c.id === id)?.name || id);
  const s = stats.data;

  return (
    <div>
      <PageHeader
        title="Profile"
        icon={User}
        actions={
          profile && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile
            </button>
          )
        }
      />
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[#2563EB]/25 to-[#7C3AED]/25" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end">
          <Avatar src={profile?.avatar_url || firebaseUser?.photoURL} name={name} email={email} size="xl" className="ring-4 ring-ink-900" />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold">{name || 'Reader'}</h2>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" aria-hidden="true" />{email}</span>
              {profile?.created_at && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />Member since {formatDate(profile.created_at, { year: 'numeric', month: 'long' })}</span>
              )}
            </div>
            {profile?.bio && <p className="mt-3 max-w-2xl text-sm text-fg-muted">{profile.bio}</p>}
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="reading-stats">
        <h2 id="reading-stats" className="section-title mb-4">Reading statistics</h2>
        {stats.error ? (
          <ErrorState compact error={stats.error} onRetry={stats.reload} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[76px] rounded-2xl" />)
              : (
                <>
                  <StatCard icon={BookCheck} label="Books read" value={s?.books_read} to="/library" />
                  <StatCard icon={BookOpen} label="Currently reading" value={s?.currently_reading} to="/library" />
                  <StatCard icon={Heart} label="Favorites" value={s?.favorites} to="/favorites" />
                  <StatCard icon={Star} label={s?.average_rating ? `Ratings · avg ${s.average_rating}★` : 'Ratings'} value={s?.ratings} to="/ratings" />
                </>
              )}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="fav-categories">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="fav-categories" className="font-semibold">Favorite categories</h2>
            <Link to="/interests" className="text-sm font-medium text-brand hover:text-brand-cyan">Edit</Link>
          </div>
          {interestNames.length ? (
            <ul className="flex flex-wrap gap-2">
              {interestNames.map((n) => <li key={n} className="chip chip-active">{n}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">No interests selected yet.</p>
          )}
        </section>
        <section className="card p-5" aria-labelledby="top-categories">
          <h2 id="top-categories" className="mb-4 font-semibold">Most engaged categories</h2>
          {s?.top_categories?.length ? (
            <ul className="space-y-3">
              {s.top_categories.map((c) => {
                const max = s.top_categories[0].count;
                return (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><span className="text-fg-muted">{c.count}</span></div>
                    <div className="h-1.5 rounded-full bg-ink-800"><div className="h-full rounded-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6]" style={{ width: `${(c.count / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">{stats.loading ? 'Loading…' : 'Favorite, rate or shelve books to see your top categories.'}</p>
          )}
        </section>
      </div>

      {editing && <EditProfile open={editing} onClose={() => setEditing(false)} profile={profile} onSaved={setProfile} />}
    </div>
  );
}
