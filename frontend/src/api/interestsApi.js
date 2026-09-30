import client from './client';

export async function getInterests() {
  const { data } = await client.get('/users/me/interests');
  return { interests: data.interests || [], available: data.available || [] };
}

export async function updateInterests(interests) {
  const { data } = await client.put('/users/me/interests', { interests });
  return data.interests || [];
}
