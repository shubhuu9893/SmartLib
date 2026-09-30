import Logo from './Logo';
import { Spinner } from './States';

export default function FullPageLoader({ label = 'Loading SmartLib' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-950">
      <Logo />
      <Spinner className="h-6 w-6" label={label} />
    </div>
  );
}
