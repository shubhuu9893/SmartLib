import client, { cachedGet } from './client';
import { normalizeAuthor, normalizeAuthors, normalizeBook, normalizeBooks, normalizePage } from '../utils/normalize';

export async function searchBooks({ q, field = 'all', page = 1, limit = 20, sort = 'relevance', signal }) {
  const { data } = await client.get('/catalog/search', { params: { q, field, page, limit, sort }, signal });
  return normalizePage(data, page);
}

export async function getTrending({ period = 'daily', page = 1, limit = 20 } = {}) {
  const data = await cachedGet('/catalog/trending', { params: { period, page, limit } });
  return normalizePage(data, page);
}

export async function getPopular({ page = 1, limit = 20 } = {}) {
  const data = await cachedGet('/catalog/popular', { params: { page, limit } });
  return normalizePage(data, page);
}

export async function getNewBooks({ page = 1, limit = 20 } = {}) {
  const data = await cachedGet('/catalog/new', { params: { page, limit } });
  return normalizePage(data, page);
}

export async function getRecentlyAdded({ limit = 20 } = {}) {
  const { data } = await client.get('/catalog/recent', { params: { limit } });
  return normalizeBooks(data);
}

export async function getCategories() {
  const data = await cachedGet('/catalog/categories', { ttl: 60 * 60 * 1000 });
  return data.items || [];
}

export async function getCategoryBooks(categoryId, { page = 1, limit = 24 } = {}) {
  const data = await cachedGet(`/catalog/subjects/${encodeURIComponent(categoryId)}`, { params: { page, limit } });
  return { category: data.category, ...normalizePage(data, page) };
}

export async function getBook(id) {
  const { data } = await client.get(`/catalog/books/${encodeURIComponent(id)}`);
  return normalizeBook(data);
}

export async function getSimilarBooks(id, { limit = 12 } = {}) {
  const data = await cachedGet(`/catalog/books/${encodeURIComponent(id)}/similar`, { params: { limit } });
  return normalizeBooks(data);
}

export async function searchAuthors({ q, page = 1, limit = 20, signal }) {
  const { data } = await client.get('/catalog/authors', { params: { q, page, limit }, signal });
  return { items: normalizeAuthors(data), total: data.total || 0, hasMore: Boolean(data.has_more) };
}

export async function getAuthor(id, { page = 1, limit = 24 } = {}) {
  const data = await cachedGet(`/catalog/authors/${encodeURIComponent(id)}`, { params: { page, limit } });
  return {
    author: { ...normalizeAuthor(data), topSubjects: data.top_subjects || [] },
    works: normalizePage(data.works, page),
  };
}
