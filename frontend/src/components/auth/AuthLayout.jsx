import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Heart } from 'lucide-react';
import Logo from '../common/Logo';

const POINTS = [
  { icon: Sparkles, title: 'Personal recommendations', text: 'Suggestions shaped by your interests, ratings and reading.' },
  { icon: BookOpen, title: 'Millions of books', text: 'Search the Open Library catalog by title, author, subject or ISBN.' },
  { icon: Heart, title: 'Your library, organised', text: 'Track what you are reading, want to read and have finished.' },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-ink-950">
      <div className="relative hidden w-[46%] overflow-hidden border-r border-line bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-brand-violet/20 blur-3xl" aria-hidden="true" />
        <Logo to="/login" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Your personal digital library, <span className="bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] bg-clip-text text-transparent">built around you.</span>
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-800 text-brand-cyan">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-fg-subtle">Book data provided by Open Library.</p>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo to="/login" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>
    </div>
  );
}
