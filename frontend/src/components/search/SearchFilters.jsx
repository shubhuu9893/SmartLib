export const SEARCH_FIELDS = [
  { id: 'all', label: 'All' },
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
  { id: 'subject', label: 'Subject / Category' },
  { id: 'isbn', label: 'ISBN' },
];

export const SEARCH_SORTS = [
  { id: 'relevance', label: 'Most relevant' },
  { id: 'rating', label: 'Top rated' },
  { id: 'new', label: 'Newest' },
  { id: 'old', label: 'Oldest' },
];

export default function SearchFilters({ field, sort, onFieldChange, onSortChange }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Search in">
        {SEARCH_FIELDS.map((f) => (
          <button key={f.id} type="button" aria-pressed={field === f.id} onClick={() => onFieldChange(f.id)} className={`chip shrink-0 ${field === f.id ? 'chip-active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <span className="shrink-0">Sort by</span>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} className="input w-auto py-2">
          {SEARCH_SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
