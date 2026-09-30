import client from './client';
import { normalizeBooks } from '../utils/normalize';

export async function getFavorites() {
  const { data } = await client.get('/favorites');
  return normalizeBooks(data);
}

export async function getFavoriteIds() {
  const { data } = await client.get('/favorites/ids');
  return data.ids || [];
}

export async function addFavorite(bookId) {
  const { data } = await client.post('/favorites', { book_id: bookId });
  return data;
}

export async function removeFavorite(bookId) {
  await client.delete(`/favorites/${encodeURIComponent(bookId)}`);
}
