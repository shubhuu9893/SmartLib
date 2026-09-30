import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import Avatar from '../common/Avatar';

export default function AuthorsSection({ authors, loading, title = 'Authors You May Like' }) {
  if (!loading && !authors?.length) return null;
  return (
    <section aria-labelledby="authors-section">
      <SectionHeader id="authors-section" title={title} to="/authors" linkLabel="Find authors" />
      <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {loading && !authors?.length
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex w-28 shrink-0 flex-col items-center gap-2">
                <div className="skeleton h-20 w-20 rounded-full" />
                <div className="skeleton h-3 w-20" />
              </div>
            ))
          : authors.map((author) => (
              <Link
                key={author.id}
                to={`/author/${author.id}`}
                className="group flex w-28 shrink-0 flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-ink-900"
              >
                <Avatar src={author.photoUrl} name={author.name} size="xl" className="!h-20 !w-20 transition-transform group-hover:scale-105" />
                <span className="line-clamp-2 text-sm font-medium text-fg">{author.name}</span>
              </Link>
            ))}
      </div>
    </section>
  );
}
