'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setQuery('');
      router.push(`/analyze/${encodeURIComponent(trimmed)}`);
    }
  }

  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(query.trim());

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Wallet address (0x...) or username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-12 pr-4 text-base rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary font-mono"
          />
        </div>
        {query.trim() && (
          <p className="text-xs text-muted-foreground mt-2">
            {isAddress
              ? 'Wallet address detected - press Enter to analyze'
              : 'Username detected - will resolve from Polymarket profile'}
          </p>
        )}
      </form>
    </div>
  );
}
