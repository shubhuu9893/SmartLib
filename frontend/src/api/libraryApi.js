import client from './client';
import { normalizeBook } from '../utils/normalize';

function normalizeEntry(item) {
  return {
    book: normalizeBook(item.book),
    status: item.status,
    progress: item.progress ?? 0,
    addedAt: item.added_at,
    updatedAt: item.updated_at,
  };
}

export const LIBRARY_STATUSES = [
  { id: 'reading', label: 'Currently Reading' },
  { id: 'want_to_read', label: 'Want to Read' },
  { id: 'completed', label: 'Completed' },
];

export async function getLibrary(status) {
  const { data } = await client.get('/library', { params: status ? { status } : {} });
  return (data.items || []).map(normalizeEntry).filter((e) => e.book);
}

export async function setLibraryStatus(bookId, status, progress) {
  const payload = { status };
  if (progress !== undefined) payload.progress = progress;
  const { data } = await client.put(`/library/${encodeURIComponent(bookId)}`, payload);
  return normalizeEntry(data);
}

export async function removeFromLibrary(bookId) {
  await client.delete(`/library/${encodeURIComponent(bookId)}`);
}

export async function getHistory(limit = 50) {
  const { data } = await client.get('/library/history', { params: { limit } });
  return (data.items || [])
    .map((item) => ({ id: item.id, book: normalizeBook(item.book), action: item.action, createdAt: item.created_at }))
    .filter((i) => i.book);
}

export async function addHistory(bookId, action = 'viewed') {
  await client.post('/library/history', { book_id: bookId, action });
}

export async function clearHistory() {
  await client.delete('/library/history');
}
