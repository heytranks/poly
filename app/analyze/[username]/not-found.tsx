import Link from 'next/link';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 flex flex-col items-center text-center">
      <UserX className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold mb-2">User not found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        We couldn&apos;t find a Polymarket user matching that username. Try searching with a different name.
      </p>
      <Button asChild>
        <Link href="/">Back to search</Link>
      </Button>
    </div>
  );
}
