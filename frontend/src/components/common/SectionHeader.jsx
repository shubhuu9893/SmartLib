import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function SectionHeader({ title, subtitle, to, linkLabel = 'See all', id }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="section-title truncate">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="flex shrink-0 items-center gap-0.5 rounded-md text-sm font-medium text-brand hover:text-brand-cyan">
          {linkLabel}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
