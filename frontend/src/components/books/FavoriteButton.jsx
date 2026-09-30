import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function FavoriteButton({ book, variant = 'icon', className = '' }) {
  const { isFavorite, toggleFavorite } = useApp();
  const [busy, setBusy] = useState(false);
  const active = isFavorite(book.id);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    await toggleFavorite(book);
    setBusy(false);
  };

  const label = active ? `Remove ${book.title} from favorites` : `Add ${book.title} to favorites`;

  if (variant === 'button') {
    return (
      <button type="button" onClick={onClick} disabled={busy} aria-pressed={active} className={`${active ? 'btn-secondary text-rose-300' : 'btn-secondary'} ${className}`}>
        <Heart className={`h-4 w-4 ${active ? 'fill-rose-400 text-rose-400' : ''}`} aria-hidden="true" />
        {active ? 'Favorited' : 'Add to Favorites'}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      aria-label={label}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/70 backdrop-blur transition-colors hover:bg-ink-950/90 ${className}`}
    >
      <Heart className={`h-4 w-4 ${active ? 'fill-rose-400 text-rose-400' : 'text-white'}`} aria-hidden="true" />
    </motion.button>
  );
}
