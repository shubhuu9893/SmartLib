import { LayoutGrid } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { CategoryCard } from '../components/dashboard/CategorySection';
import { ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getCategories } from '../api/booksApi';

export default function Categories() {
  const { data, loading, error, reload } = useAsync(getCategories, []);
  return (
    <div>
      <PageHeader title="Categories" subtitle="Browse books by subject" icon={LayoutGrid} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-[104px] rounded-xl" />)
            : data.map((c, i) => <CategoryCard key={c.id} category={c} index={i} large />)}
        </div>
      )}
    </div>
  );
}
