import { useState } from 'react';
import { Star } from 'lucide-react';

export function RatingDisplay({ value, count, size = 'sm' }) {
  if (!value) return null;
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-1 text-xs text-fg-muted" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <Star className={`${iconSize} fill-warning text-warning`} aria-hidden="true" />
      <span className="font-medium text-fg">{value.toFixed(1)}</span>
      {count ? <span className="text-fg-subtle">({count.toLocaleString()})</span> : null}
    </span>
  );
}

export default function RatingStars({ value = 0, onChange, disabled = false, size = 'md', label = 'Your rating' }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const iconSize = size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const onKeyDown = (e) => {
    if (!onChange || disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)} onKeyDown={onKeyDown}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= display;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={value ? (value === star ? 0 : -1) : star === 1 ? 0 : -1}
            disabled={disabled || !onChange}
            onMouseEnter={() => setHover(star)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange?.(star);
            }}
            className="rounded p-0.5 transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
          >
            <Star className={`${iconSize} ${filled ? 'fill-warning text-warning' : 'text-fg-subtle'}`} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
