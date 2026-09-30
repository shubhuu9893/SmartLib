import client from './client';
import { normalizeBook } from '../utils/normalize';

function normalizeRating(item) {
  return {
    book: normalizeBook(item.book),
    rating: item.rating,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function getRatings() {
  const { data } = await client.get('/ratings');
  return (data.items || []).map(normalizeRating).filter((r) => r.book);
}

export async function rateBook(bookId, rating) {
  const { data } = await client.put(`/ratings/${encodeURIComponent(bookId)}`, { rating });
  return normalizeRating(data);
}

export async function deleteRating(bookId) {
  await client.delete(`/ratings/${encodeURIComponent(bookId)}`);
}
