import { useState } from 'react';
import { BookMarked, Check, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { LIBRARY_STATUSES, removeFromLibrary, setLibraryStatus } from '../../api/libraryApi';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';

export default function LibraryStatusMenu({ book, status, onChange }) {
  const toast = useToast();
  const { invalidateRecommendations, refreshUnread } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = LIBRARY_STATUSES.find((s) => s.id === status);

  const choose = async (next) => {
    setOpen(false);
    if (next === status) return;
    setBusy(true);
    try {
      if (next) {
        await setLibraryStatus(book.id, next);
        toast(`Added to ${LIBRARY_STATUSES.find((s) => s.id === next).label}`);
      } else {
        await removeFromLibrary(book.id);
        toast('Removed from your library');
      }
      onChange?.(next);
      invalidateRecommendations();
      refreshUnread();
    } catch (error) {
      toast(error.message || "Couldn't update your library", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={current ? 'btn-secondary border-brand/40 text-fg' : 'btn-secondary'}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookMarked className={`h-4 w-4 ${current ? 'text-brand' : ''}`} aria-hidden="true" />}
        {current ? current.label : 'Add to Library'}
        <ChevronDown className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-ink-900 py-1 shadow-card">
          {LIBRARY_STATUSES.map((s) => (
            <button key={s.id} type="button" role="menuitemradio" aria-checked={s.id === status} onClick={() => choose(s.id)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-fg hover:bg-ink-800">
              {s.label}
              {s.id === status && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
            </button>
          ))}
          {status && (
            <button type="button" role="menuitem" onClick={() => choose(null)} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove from library
            </button>
          )}
        </div>
      )}
    </div>
  );
}
