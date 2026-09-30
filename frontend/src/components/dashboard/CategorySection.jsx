import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import { ErrorState } from '../common/States';
import { categoryIcon, categoryTint } from '../../utils/categoryIcons';

export function CategoryCard({ category, index, large = false }) {
  const Icon = categoryIcon(category.id);
  return (
    <Link
      to={`/category/${category.id}`}
      className={`group flex items-center gap-3 rounded-xl border border-line bg-gradient-to-br p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 ${categoryTint(index)} ${large ? 'min-h-[104px] flex-col items-start justify-between' : ''}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-lg bg-ink-950/40 ${large ? 'h-11 w-11' : 'h-9 w-9'}`}>
        <Icon className={large ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
      </span>
      <span className={`font-semibold text-fg ${large ? 'text-base' : 'text-sm'}`}>{category.name}</span>
    </Link>
  );
}

export default function CategorySection({ categories, loading, error, onRetry, limit = 12 }) {
  return (
    <section aria-labelledby="browse-categories">
      <SectionHeader id="browse-categories" title="Browse Categories" to="/categories" />
      {error ? (
        <ErrorState compact error={error} onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {loading && !categories?.length
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[68px] rounded-xl" />)
            : categories.slice(0, limit).map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}
        </div>
      )}
    </section>
  );
}
