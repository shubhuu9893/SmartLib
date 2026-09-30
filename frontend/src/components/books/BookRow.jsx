import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from './BookCard';
import SectionHeader from '../common/SectionHeader';
import { SkeletonBookRow } from '../common/Skeletons';
import { EmptyState, ErrorState } from '../common/States';

export default function BookRow({
  title,
  subtitle,
  books,
  loading,
  error,
  onRetry,
  to,
  badge,
  showReason,
  empty,
  renderFooter,
}) {
  const scroller = useRef(null);
  const headingId = `row-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const scroll = (dir) => {
    const node = scroller.current;
    if (node) node.scrollBy({ left: dir * node.clientWidth * 0.85, behavior: 'smooth' });
  };

  let body;
  if (loading && !books?.length) {
    body = <SkeletonBookRow withTitle={false} />;
  } else if (error) {
    body = <ErrorState compact error={error} message={error.message || "We couldn't load these books."} onRetry={onRetry} />;
  } else if (!books?.length) {
    body = empty ? <EmptyState compact {...empty} /> : null;
  } else {
    body = (
      <div className="group/row relative">
        <div ref={scroller} className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-0 sm:px-0">
          {books.map((book) => (
            <div key={book.id} className="w-36 shrink-0 snap-start sm:w-40 lg:w-44">
              <BookCard book={book} badge={typeof badge === 'function' ? badge(book) : badge} showReason={showReason} footer={renderFooter?.(book)} />
            </div>
          ))}
        </div>
        {books.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label={`Scroll ${title} left`}
              className="absolute -left-3 top-[30%] hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-ink-900/95 text-fg shadow-card opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100 md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label={`Scroll ${title} right`}
              className="absolute -right-3 top-[30%] hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-ink-900/95 text-fg shadow-card opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100 md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    );
  }

  if (!body) return null;

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <SectionHeader id={headingId} title={title} subtitle={subtitle} to={books?.length ? to : undefined} />
      {body}
    </section>
  );
}
