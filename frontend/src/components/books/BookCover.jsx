import { useState } from 'react';
import { BookOpen } from 'lucide-react';

export default function BookCover({ src, title, author, className = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = src && !failed;

  return (
    <div className={`relative overflow-hidden bg-ink-800 ${className}`}>
      {showImage ? (
        <>
          {!loaded && <div className="skeleton absolute inset-0 rounded-none" aria-hidden="true" />}
          <img
            src={src}
            alt={`Cover of ${title}`}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      ) : (
        <div
          role="img"
          aria-label={`No cover available for ${title}`}
          className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 p-3"
        >
          <BookOpen className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
          <div className="min-w-0">
            <p className="line-clamp-3 text-sm font-semibold leading-snug text-fg">{title}</p>
            {author && <p className="mt-1 truncate text-xs text-fg-muted">{author}</p>}
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">No Cover Available</p>
          </div>
        </div>
      )}
    </div>
  );
}
