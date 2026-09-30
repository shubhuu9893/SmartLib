import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Logo from '../components/common/Logo';
import InterestPicker from '../components/common/InterestPicker';
import { ErrorState, Spinner } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getInterests, updateInterests } from '../api/interestsApi';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { firstName } from '../utils/format';

const ONBOARDING_IDS = [
  'technology', 'science', 'ai-ml', 'programming', 'business', 'finance', 'history', 'fiction',
  'fantasy', 'romance', 'mystery', 'biography', 'self-help', 'psychology', 'engineering', 'mathematics',
];

export default function Onboarding() {
  const { profile, setProfile } = useAuth();
  const { invalidateRecommendations } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useAsync(getInterests, []);

  const options = (data?.available || []).filter((c) => ONBOARDING_IDS.includes(c.id));

  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const save = async () => {
    setSaving(true);
    try {
      const interests = await updateInterests(selected);
      setProfile((p) => (p ? { ...p, interests, needs_onboarding: false } : p));
      invalidateRecommendations();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast(err.message || "Couldn't save your interests", 'error');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Logo />
        <div className="mt-10 sm:mt-14">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to SmartLib{profile?.name ? `, ${firstName(profile.name)}` : ''}
          </h1>
          <p className="mt-3 text-lg text-fg-muted">What are you interested in?</p>
          <p className="mt-1 text-sm text-fg-subtle">Pick as many as you like — we&apos;ll use them to personalise your recommendations.</p>
        </div>
        <div className="mt-8">
          {loading && (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7" />
            </div>
          )}
          {error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && <InterestPicker options={options} selected={selected} onToggle={toggle} />}
        </div>
        <div className="sticky bottom-0 mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-line bg-ink-950/95 py-5 backdrop-blur sm:flex-row">
          <p className="text-sm text-fg-muted">{selected.length ? `${selected.length} selected` : 'Select at least one interest'}</p>
          <button type="button" onClick={save} disabled={!selected.length || saving} className="btn-gradient w-full px-8 py-3 sm:w-auto">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
