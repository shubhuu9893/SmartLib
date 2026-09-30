import client from './client';

export async function getMe() {
  const { data } = await client.get('/users/me');
  return data;
}

export async function updateMe(payload) {
  const { data } = await client.patch('/users/me', payload);
  return data;
}

export async function getStats() {
  const { data } = await client.get('/users/me/stats');
  return data;
}

export async function getSearchHistory() {
  const { data } = await client.get('/users/me/search-history');
  return data.items || [];
}

export async function clearSearchHistory() {
  await client.delete('/users/me/search-history');
}
