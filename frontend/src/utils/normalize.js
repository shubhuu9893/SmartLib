function pickList(payload, keys = ['items', 'results', 'books', 'data', 'works', 'docs']) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === 'object') {
      const nested = pickList(payload[key], keys);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function normalizeBook(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const book = raw.book && typeof raw.book === 'object' ? raw.book : raw;
  const id = book.id ?? book.ol_key ?? book.key?.split('/').pop();
  if (id === undefined || id === null) return null;

  const authors = Array.isArray(book.authors)
    ? book.authors.filter((a) => a && a.name)
    : book.author
      ? String(book.author)
          .split(',')
          .map((name) => ({ id: null, name: name.trim() }))
          .filter((a) => a.name)
      : [];

  return {
    id: String(id),
    title: book.title || 'Untitled',
    authors,
    author: book.author || authors.map((a) => a.name).join(', ') || 'Unknown author',
    coverUrl: book.cover_url || book.coverUrl || null,
    category: book.category || book.subjects?.[0] || null,
    subjects: [...new Set(book.subjects || [])],
    description: book.description || '',
    year: book.first_publish_year || null,
    rating: typeof book.rating === 'number' ? book.rating : null,
    ratingCount: book.rating_count || 0,
    isbn: book.isbn || null,
    publisher: book.publisher || null,
    language: book.language || null,
    pages: book.pages || null,
    ebookAccess: book.ebook_access || null,
    source: book.source || null,
    reason: book.reason || null,
    score: book.score ?? null,
    createdAt: book.created_at || null,
    availability: book.availability || null,
    userState: book.user_state || null,
  };
}

export function normalizeBooks(payload) {
  return pickList(payload).map(normalizeBook).filter(Boolean);
}

export function normalizePage(payload, page = 1) {
  const items = normalizeBooks(payload);
  return {
    items,
    total: payload?.total ?? payload?.numFound ?? items.length,
    page: payload?.page ?? page,
    hasMore: Boolean(payload?.has_more ?? payload?.hasMore ?? false),
  };
}

export function normalizeAuthor(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name || 'Unknown author',
    photoUrl: raw.photo_url || null,
    topWork: raw.top_work || null,
    workCount: raw.work_count ?? null,
    topSubjects: raw.top_subjects || [],
    birthDate: raw.birth_date || null,
    deathDate: raw.death_date || null,
    bio: raw.bio || null,
    links: raw.links || [],
    wikipedia: raw.wikipedia || null,
    alternateNames: raw.alternate_names || [],
  };
}

export function normalizeAuthors(payload) {
  return pickList(payload, ['items', 'results', 'authors', 'data', 'docs']).map(normalizeAuthor).filter(Boolean);
}
