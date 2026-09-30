import { Link } from 'react-router-dom';

export default function Logo({ compact = false, to = '/dashboard' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg" aria-label="SmartLib home">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-card">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
          <path
            d="M7 8h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H7zM25 8h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-fg">
          Smart<span className="text-brand-cyan">Lib</span>
        </span>
      )}
    </Link>
  );
}
