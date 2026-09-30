import SearchBar from '../search/SearchBar';
import { firstName, greeting } from '../../utils/format';

export default function Greeting({ name }) {
  const first = firstName(name);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-ink-900 px-5 py-7 sm:px-8 sm:py-9">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-brand-violet/15 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting()}
          {first ? `, ${first}` : ''}
        </h1>
        <p className="mt-1.5 text-fg-muted">What would you like to read today?</p>
        <div className="mt-5">
          <SearchBar size="lg" />
        </div>
      </div>
    </section>
  );
}
