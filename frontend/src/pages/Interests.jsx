import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Tags } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import InterestPicker from '../components/common/InterestPicker';
import { ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getInterests, updateInterests } from '../api/interestsApi';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export default function Interests() {
  const { setProfile } = useAuth();
  const { invalidateRecommendations } = useApp();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(getInterests, []);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setSelected(data.interests);
  }, [data]);

  const original = data?.interests || [];
  const dirty = selected.length !== original.length || selected.some((s) => !original.includes(s));

  const toggle = (id) => {
    setSaved(false);
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };

  const save = async () => {
    setSaving(true);
    try {
      const interests = await updateInterests(selected);
      setData((d) => ({ ...d, interests }));
      setProfile((p) => (p ? { ...p, interests, needs_onboarding: false } : p));
      invalidateRecommendations();
      setSaved(true);
      toast('Interests saved — recommendations updated');
    } catch (err) {
      toast(err.message || "Couldn't save your interests", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Interests"
        subtitle="Choose the topics you care about. They shape your recommendations."
        icon={Tags}
        actions={
          <>
            {dirty && (
              <button type="button" className="btn-ghost" onClick={() => setSelected(original)} disabled={saving}>
                Reset
              </button>
            )}
            <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saving || loading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save interests
            </button>
          </>
        }
      />
      {saved && (
        <div role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>Your interests are saved and recommendations have been refreshed.</span>
          <Link to="/recommended" className="inline-flex items-center gap-1.5 font-semibold text-success">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> View recommendations
          </Link>
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="skeleton h-[52px] rounded-xl" />)}
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && !loading && (
        <>
          <p className="mb-4 text-sm text-fg-muted">{selected.length} selected</p>
          <InterestPicker options={data.available} selected={selected} onToggle={toggle} />
        </>
      )}
    </div>
  );
}
