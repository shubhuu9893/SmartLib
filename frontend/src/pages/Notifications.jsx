import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookMarked, CheckCheck, Loader2, Sparkles, Trash2, UserPen } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { SkeletonList } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead, refreshNotifications } from '../api/notificationsApi';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../utils/format';

const KIND_ICONS = { recommendations: Sparkles, library: BookMarked, author: UserPen, system: Bell };

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { setUnreadCount } = useApp();
  const [checking, setChecking] = useState(false);
  const list = useAsync(getNotifications, []);
  const items = list.data?.items || [];

  useEffect(() => {
    if (list.data) setUnreadCount(list.data.items.filter((n) => !n.read).length);
  }, [list.data, setUnreadCount]);

  const update = (fn) => list.setData((d) => ({ ...d, items: fn(d.items) }));

  const open = async (n) => {
    if (!n.read) {
      update((all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const remove = async (n) => {
    try {
      await deleteNotification(n.id);
      update((all) => all.filter((x) => x.id !== n.id));
    } catch (err) {
      toast(err.message || "Couldn't delete notification", 'error');
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      update((all) => all.map((x) => ({ ...x, read: true })));
    } catch (err) {
      toast(err.message || "Couldn't update notifications", 'error');
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      const { created } = await refreshNotifications();
      await list.reload();
      toast(created ? `${created} new notification${created > 1 ? 's' : ''}` : "You're all caught up", 'info');
    } catch (err) {
      toast(err.message || "Couldn't check for updates", 'error');
    } finally {
      setChecking(false);
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'Updates about your library and recommendations'}
        icon={Bell}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={check} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              Check for updates
            </button>
            {unread > 0 && (
              <button type="button" className="btn-ghost" onClick={readAll}>
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
              </button>
            )}
          </>
        }
      />
      {list.loading && !list.data && <SkeletonList count={4} />}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && !items.length && (
        <EmptyState icon={Bell} title="No notifications yet." message="We'll let you know when new recommendations are ready or your library changes." />
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = KIND_ICONS[n.kind] || Bell;
            return (
              <li key={n.id} className={`card group flex items-start gap-3 p-4 transition-colors ${n.read ? '' : 'border-brand/30 bg-brand/[0.06]'}`}>
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${n.read ? 'bg-ink-800 text-fg-muted' : 'bg-brand/15 text-brand'}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 rounded text-left">
                  <p className={`text-sm ${n.read ? 'font-medium text-fg-muted' : 'font-semibold text-fg'}`}>
                    {!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" aria-label="Unread" />}
                    {n.title}
                  </p>
                  {n.message && <p className="mt-0.5 text-sm text-fg-muted">{n.message}</p>}
                  <p className="mt-1 text-xs text-fg-subtle">{timeAgo(n.created_at)}</p>
                </button>
                <button type="button" onClick={() => remove(n)} className="icon-btn h-8 w-8 shrink-0 hover:text-danger" aria-label={`Delete notification: ${n.title}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
