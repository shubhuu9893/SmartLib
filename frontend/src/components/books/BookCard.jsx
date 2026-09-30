import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import BookCover from './BookCover';
import FavoriteButton from './FavoriteButton';
import { RatingDisplay } from './RatingStars';

const BADGE_STYLES = {
  Trending: 'bg-brand-cyan/90 text-ink-950',
  Popular: 'bg-warning/90 text-ink-950',
  New: 'bg-success/90 text-ink-950',
  Recommended: 'bg-brand-violet/90 text-white',
};

function BookCard({ book, badge, showReason = false, footer }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="group relative flex w-full flex-col"
    >
      <Link
        to={`/book/${encodeURIComponent(book.id)}`}
        className="relative block overflow-hidden rounded-xl shadow-card ring-1 ring-white/5 transition-shadow group-hover:ring-brand/40"
        aria-label={`${book.title} by ${book.author}`}
      >
        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="aspect-[2/3] w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {badge && (
          <span className={`badge absolute left-2 top-2 ${BADGE_STYLES[badge] || 'bg-ink-800 text-fg'}`}>{badge}</span>
        )}
      </Link>
      <FavoriteButton book={book} className="absolute right-2 top-2 opacity-100 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100 [&[aria-pressed=true]]:opacity-100" />
      <div className="mt-2.5 min-w-0 px-0.5">
        <Link to={`/book/${encodeURIComponent(book.id)}`} className="line-clamp-2 text-sm font-semibold leading-snug text-fg hover:text-brand-cyan" tabIndex={-1}>
          {book.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-fg-muted">{book.author}</p>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <RatingDisplay value={book.rating} />
          {book.category && <span className="truncate text-[11px] text-fg-subtle">{book.category}</span>}
        </div>
        {showReason && book.reason && <p className="mt-1.5 line-clamp-2 text-[11px] text-brand-cyan/80">{book.reason}</p>}
        {footer}
      </div>
    </motion.article>
  );
}

export default memo(BookCard);
