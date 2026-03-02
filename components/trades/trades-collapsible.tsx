'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TradesTable } from '@/components/trades/trades-table';
import type { Trade } from '@/lib/types';
import type { HedgePair } from '@/lib/utils/hedge-pairs';

interface TradesCollapsibleProps {
  trades: Trade[];
  hedgePairs?: HedgePair[];
}

export function TradesCollapsible({ trades, hedgePairs }: TradesCollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-0">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-lg">거래 내역</CardTitle>
          <span className="text-sm text-muted-foreground">
            {trades.length}건 {open ? '▲' : '▼'}
          </span>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-4">
          <TradesTable trades={trades} hedgePairs={hedgePairs} />
        </CardContent>
      )}
    </Card>
  );
}
