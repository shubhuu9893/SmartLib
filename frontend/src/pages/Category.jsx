import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import BookGrid from '../components/books/BookGrid';
import LoadMoreTrigger from '../components/common/LoadMoreTrigger';
import { SkeletonGrid } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useInfiniteList from '../hooks/useInfiniteList';
import useAsync from '../hooks/useAsync';
import { getCategories, getCategoryBooks } from '../api/booksApi';
import { categoryIcon } from '../utils/categoryIcons';

export default function Category() {
  const { categoryId } = useParams();
  const categories = useAsync(getCategories, []);
  const list = useInfiniteList((page) => getCategoryBooks(categoryId, { page, limit: 24 }), [categoryId]);
  const category = categories.data?.find((c) => c.id === categoryId);
  const name = category?.name || categoryId.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <div>
      <Link to="/categories" className="mb-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All categories
      </Link>
      <PageHeader title={name} subtitle={list.total ? `${list.total.toLocaleString()} books` : 'Books in this category'} icon={categoryIcon(categoryId)} />
      {list.loading && !list.items.length && <SkeletonGrid />}
      {list.error && !list.items.length && <ErrorState error={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && !list.items.length && (
        <EmptyState icon={BookOpen} title="No books found in this category." message="Try another category." actionLabel="Browse Categories" actionTo="/categories" />
      )}
      {list.items.length > 0 && (
        <>
          <BookGrid books={list.items} />
          <LoadMoreTrigger onLoadMore={list.loadMore} hasMore={list.hasMore} loading={list.loading} />
        </>
      )}
    </div>
  );
}
