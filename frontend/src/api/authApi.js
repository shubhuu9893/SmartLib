import client from './client';

export async function syncUser(name) {
  const { data } = await client.post('/auth/sync', name ? { name } : {});
  return data;
}
