import { useState } from 'react';
import { initials } from '../../utils/format';

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };

export default function Avatar({ src, name, email, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZES[size] || SIZES.md;
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : 'User avatar'}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-ink-800 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden={name ? undefined : true}
      aria-label={name ? `${name}'s avatar` : undefined}
      role={name ? 'img' : undefined}
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] font-semibold text-white ring-2 ring-ink-800 ${className}`}
    >
      {initials(name, email)}
    </span>
  );
}
