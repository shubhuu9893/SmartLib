import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SearchFilters from '../components/search/SearchFilters';
import SearchResults from '../components/search/SearchResults';
import useDebounce from '../hooks/useDebounce';
import useInfiniteList from '../hooks/useInfiniteList';
import { searchBooks } from '../api/booksApi';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const field = params.get('field') || 'all';
  const sort = params.get('sort') || 'relevance';
  const [input, setInput] = useState(q);
  const debounced = useDebounce(input.trim(), 450);

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (debounced !== q.trim() && (debounced.length >= 2 || debounced === '')) {
      const next = new URLSearchParams(params);
      if (debounced) next.set('q', debounced);
      else next.delete('q');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const list = useInfiniteList((page) => searchBooks({ q, field, sort, page, limit: 24 }), [q, field, sort], { enabled: Boolean(q) });

  const submit = (e) => {
    e.preventDefault();
    const value = input.trim();
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Search" subtitle="Title, author, subject, ISBN, category or keyword" icon={SearchIcon} />
      <form role="search" onSubmit={submit} className="relative mb-5">
        <label htmlFor="search-page-input" className="sr-only">Search books</label>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <input
          id="search-page-input"
          type="search"
          autoFocus={!q}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. machine learning, Tolkien, 9780262033848"
          className="input h-12 pl-12 pr-12 text-base [&::-webkit-search-cancel-button]:hidden"
        />
        {input && (
          <button type="button" onClick={() => setInput('')} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-subtle hover:text-fg" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      <div className="mb-6">
        <SearchFilters field={field} sort={sort} onFieldChange={(v) => setParam('field', v, 'all')} onSortChange={(v) => setParam('sort', v, 'relevance')} />
      </div>
      <SearchResults query={q} {...list} />
    </div>
  );
}
