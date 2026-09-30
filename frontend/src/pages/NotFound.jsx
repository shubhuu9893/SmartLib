import { Compass } from 'lucide-react';
import { EmptyState } from '../components/common/States';

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState icon={Compass} title="Page not found" message="The page you're looking for doesn't exist or has moved." actionLabel="Go to Dashboard" actionTo="/dashboard" />
    </div>
  );
}
