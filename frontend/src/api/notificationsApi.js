import client from './client';

export async function getNotifications() {
  const { data } = await client.get('/notifications');
  return { items: data.items || [], unread: data.unread || 0 };
}

export async function refreshNotifications() {
  const { data } = await client.post('/notifications/refresh');
  return data;
}

export async function markNotificationRead(id) {
  await client.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await client.post('/notifications/read-all');
}

export async function deleteNotification(id) {
  await client.delete(`/notifications/${id}`);
}
