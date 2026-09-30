import client from './client';
import { normalizeBook, normalizeBooks } from '../utils/normalize';

export async function getRecommendations({ limit = 24 } = {}) {
  const { data } = await client.get('/users/me/recommendations', { params: { limit } });
  return {
    items: normalizeBooks(data.items),
    because: (data.because || []).map((group) => ({
      seed: normalizeBook(group.seed),
      items: normalizeBooks(group.items),
    })),
    authors: (data.authors || []).map((a) => ({ id: a.id, name: a.name, photoUrl: a.photo_url })),
    hasSignals: Boolean(data.has_signals),
    algorithm: data.algorithm,
  };
}
