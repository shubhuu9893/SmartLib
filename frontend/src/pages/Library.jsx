import { useMemo, useState } from 'react';
import { BookMarked, History, Trash2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import BookListItem from '../components/books/BookListItem';
import { SkeletonList } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import Modal from '../components/common/Modal';
import useAsync from '../hooks/useAsync';
import { LIBRARY_STATUSES, clearHistory, getHistory, getLibrary, removeFromLibrary, setLibraryStatus } from '../api/libraryApi';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { formatDate, timeAgo } from '../utils/format';

const TABS = [...LIBRARY_STATUSES, { id: 'history', label: 'Reading History' }];

const HISTORY_LABELS = { viewed: 'Viewed', opened: 'Opened', started: 'Started reading', finished: 'Finished' };

function ProgressControl({ entry, onSave }) {
  const [value, setValue] = useState(entry.progress);
  return (
    <label className="flex items-center gap-3 text-xs text-fg-muted">
      <span className="shrink-0">Progress</span>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={() => value !== entry.progress && onSave(value)}
        onKeyUp={(e) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) && value !== entry.progress && onSave(value)}
        className="h-1.5 w-full max-w-[200px] cursor-pointer accent-brand"
        aria-label={`Reading progress for ${entry.book.title}`}
      />
      <span className="w-9 shrink-0 text-right font-medium text-fg">{value}%</span>
    </label>
  );
}

export default function Library() {
  const [tab, setTab] = useState('reading');
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();
  const { invalidateRecommendations } = useApp();
  const library = useAsync(() => getLibrary(), []);
  const history = useAsync(() => getHistory(100), [], { enabled: tab === 'history' });

  const counts = useMemo(() => {
    const c = { reading: 0, want_to_read: 0, completed: 0 };
    (library.data || []).forEach((e) => {
      c[e.status] = (c[e.status] || 0) + 1;
    });
    return c;
  }, [library.data]);

  const entries = (library.data || []).filter((e) => e.status === tab);

  const move = async (entry, status) => {
    try {
      const updated = await setLibraryStatus(entry.book.id, status);
      library.setData((list) => list.map((e) => (e.book.id === entry.book.id ? updated : e)));
      toast(`Moved to ${LIBRARY_STATUSES.find((s) => s.id === status).label}`);
      invalidateRecommendations();
    } catch (error) {
      toast(error.message || "Couldn't update your library", 'error');
    }
  };

  const saveProgress = async (entry, progress) => {
    try {
      const updated = await setLibraryStatus(entry.book.id, entry.status, progress);
      library.setData((list) => list.map((e) => (e.book.id === entry.book.id ? updated : e)));
      if (updated.status !== entry.status) toast('Marked as completed');
    } catch (error) {
      toast(error.message || "Couldn't save progress", 'error');
    }
  };

  const remove = async (entry) => {
    try {
      await removeFromLibrary(entry.book.id);
      library.setData((list) => list.filter((e) => e.book.id !== entry.book.id));
      toast('Removed from your library');
      invalidateRecommendations();
    } catch (error) {
      toast(error.message || "Couldn't remove this book", 'error');
    }
  };

  const onClearHistory = async () => {
    setConfirmClear(false);
    try {
      await clearHistory();
      history.setData([]);
      toast('Reading history cleared');
      invalidateRecommendations();
    } catch (error) {
      toast(error.message || "Couldn't clear history", 'error');
    }
  };

  const activeLabel = TABS.find((t) => t.id === tab).label;

  return (
    <div>
      <PageHeader title="My Library" subtitle="Track what you're reading, want to read and have finished" icon={BookMarked} />
      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Library sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`chip shrink-0 ${tab === t.id ? 'chip-active' : ''}`}>
            {t.label}
            {t.id !== 'history' && library.data && <span className="rounded-full bg-ink-800 px-1.5 text-xs text-fg-muted">{counts[t.id] || 0}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={activeLabel}>
        {tab !== 'history' && (
          <>
            {library.loading && <SkeletonList />}
            {library.error && <ErrorState error={library.error} message="We couldn't load your library." onRetry={library.reload} />}
            {!library.loading && !library.error && !entries.length && (
              <EmptyState
                icon={BookMarked}
                title={library.data?.length ? `No books in ${activeLabel}.` : 'Your library is empty.'}
                message={library.data?.length ? 'Move books here from another shelf or add new ones from any book page.' : 'Start exploring and add books to your library.'}
                actionLabel="Explore Books"
                actionTo="/explore"
              />
            )}
            {!library.loading && entries.length > 0 && (
              <div className="grid gap-3 xl:grid-cols-2">
                {entries.map((entry) => (
                  <BookListItem key={entry.book.id} book={entry.book} meta={`Updated ${timeAgo(entry.updatedAt)}`}>
                    <div className="space-y-3">
                      {entry.status === 'reading' && <ProgressControl entry={entry} onSave={(p) => saveProgress(entry, p)} />}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`status-${entry.book.id}`}>Shelf for {entry.book.title}</label>
                        <select id={`status-${entry.book.id}`} value={entry.status} onChange={(e) => move(entry, e.target.value)} className="input w-auto py-1.5 text-xs">
                          {LIBRARY_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => remove(entry)} className="btn-ghost px-2.5 py-1.5 text-xs hover:text-danger" aria-label={`Remove ${entry.book.title} from library`}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                        </button>
                      </div>
                    </div>
                  </BookListItem>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {history.data?.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button type="button" onClick={() => setConfirmClear(true)} className="btn-ghost text-sm hover:text-danger">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear history
                </button>
              </div>
            )}
            {history.loading && <SkeletonList />}
            {history.error && <ErrorState error={history.error} onRetry={history.reload} />}
            {!history.loading && !history.error && !history.data?.length && (
              <EmptyState icon={History} title="No reading history yet." message="Books you open will appear here." actionLabel="Explore Books" actionTo="/explore" />
            )}
            {!history.loading && history.data?.length > 0 && (
              <div className="grid gap-3 xl:grid-cols-2">
                {history.data.map((item) => (
                  <BookListItem key={item.id} book={item.book} meta={`${HISTORY_LABELS[item.action] || item.action} · ${formatDate(item.createdAt)} (${timeAgo(item.createdAt)})`} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear reading history?"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
            <button type="button" className="btn-danger" onClick={onClearHistory}>Clear history</button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">This removes every book from your reading history. Your library shelves, favorites and ratings are not affected.</p>
      </Modal>
    </div>
  );
}
