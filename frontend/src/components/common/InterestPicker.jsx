import { Check } from 'lucide-react';
import { categoryIcon } from '../../utils/categoryIcons';

export default function InterestPicker({ options, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label="Interests">
      {options.map((option) => {
        const active = selected.includes(option.id);
        const Icon = categoryIcon(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option.id)}
            className={`relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
              active ? 'border-brand/60 bg-brand/15 text-fg' : 'border-line bg-ink-900 text-fg-muted hover:border-brand/30 hover:text-fg'
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-brand' : ''}`} aria-hidden="true" />
            <span className="flex-1">{option.name}</span>
            {active && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                <Check className="h-3 w-3 text-white" aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
