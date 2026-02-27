'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/analyze/${encodeURIComponent(trimmed)}`);
      setQuery('');
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>PolyAnalyzer</span>
        </Link>

        <form onSubmit={handleSubmit} className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="0x... or username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50"
          />
        </form>
      </div>
    </header>
  );
}
