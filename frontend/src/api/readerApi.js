import client from './client';

export async function getReaderInfo(bookId) {
  const { data } = await client.get(`/books/${encodeURIComponent(bookId)}/reader`);
  return data;
}

export async function saveReadingProgress(bookId, { progress, current_page, total_pages }) {
  const { data } = await client.post(`/books/${encodeURIComponent(bookId)}/reader/progress`, {
    progress,
    current_page,
    total_pages,
  });
  return data;
}

export async function getReaderContent(bookId) {
  const { data } = await client.get(`/books/${encodeURIComponent(bookId)}/reader/content`);
  return data;
}
