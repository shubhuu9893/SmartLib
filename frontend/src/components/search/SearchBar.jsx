import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import { searchBooks } from '../../api/booksApi';
import BookCover from '../books/BookCover';

export default function SearchBar({ autoFocus = false, size = 'md', onNavigate, placeholder = 'Search books, authors, subjects, ISBN…' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(query.trim(), 350);
  const wrapper = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    if (location.pathname === '/search') {
      setQuery(new URLSearchParams(location.search).get('q') || '');
    }
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (debounced.length < 2 || !open) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    searchBooks({ q: debounced, limit: 6, signal: controller.signal })
      .then((res) => {
        setResults(res.items);
        setActive(-1);
      })
      .catch(() => setResults([]))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debounced, open]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path) => {
    setOpen(false);
    input.current?.blur();
    navigate(path);
    onNavigate?.();
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) {
      go(`/book/${encodeURIComponent(results[active].id)}`);
      return;
    }
    const q = query.trim();
    if (q) go(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={wrapper} className="relative w-full">
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search books
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <input
          id={`${listId}-input`}
          ref={input}
          type="search"
          autoFocus={autoFocus}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          className={`input pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden ${size === 'lg' ? 'h-12 text-base' : 'h-10'}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              input.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:text-fg"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-ink-900 shadow-card">
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-96 overflow-y-auto py-1">
            {loading && !results.length && (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-fg-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching…
              </li>
            )}
            {!loading && !results.length && debounced === query.trim() && (
              <li className="px-4 py-3 text-sm text-fg-muted">No quick matches. Press Enter to search everything.</li>
            )}
            {results.map((book, i) => (
              <li key={book.id} id={`${listId}-opt-${i}`} role="option" aria-selected={active === i}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(`/book/${encodeURIComponent(book.id)}`)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ink-800 ${active === i ? 'bg-ink-800' : ''}`}
                >
                  <BookCover src={book.coverUrl} title={book.title} className="h-12 w-8 shrink-0 rounded" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{book.title}</span>
                    <span className="block truncate text-xs text-fg-muted">
                      {book.author}
                      {book.year ? ` · ${book.year}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {query.trim() && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm font-medium text-brand hover:bg-ink-800"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              See all results for “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
