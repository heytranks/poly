'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import type { Trade } from '@/lib/types';
import type { HedgePair } from '@/lib/utils/hedge-pairs';

const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        날짜 <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{formatDateTime(row.getValue('timestamp'))}</span>
    ),
  },
  {
    accessorKey: 'title',
    header: '마켓',
    cell: ({ row }) => (
      <span className="text-sm font-medium truncate max-w-[200px] block" title={row.getValue('title')}>
        {row.getValue('title')}
      </span>
    ),
  },
  {
    accessorKey: 'side',
    header: '매수/매도',
    cell: ({ row }) => {
      const side = row.getValue('side') as string;
      return (
        <Badge variant={side === 'BUY' ? 'default' : 'secondary'} className="text-xs">
          {side}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'outcome',
    header: '방향',
    cell: ({ row }) => {
      const outcome = row.getValue('outcome') as string;
      return (
        <span className={outcome === 'Yes' ? 'text-green-500' : 'text-red-500'}>
          {outcome}
        </span>
      );
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        가격 <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span>{(row.getValue('price') as number).toFixed(2)}</span>,
  },
  {
    accessorKey: 'size',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        금액 <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span>{formatCurrency((row.getValue('size') as number) * (row.original.price))}</span>,
  },
];

interface TradesTableProps {
  trades: Trade[];
  hedgePairs?: HedgePair[];
}

export function TradesTable({ trades, hedgePairs }: TradesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => trades, [trades]);

  // Build hedge pair lookup: conditionId → { isProfitable, pairIndex }
  const hedgePairMap = useMemo(() => {
    const map = new Map<string, { isProfitable: boolean; colorIndex: number }>();
    if (!hedgePairs) return map;
    hedgePairs.forEach((pair, idx) => {
      map.set(pair.conditionId, { isProfitable: pair.isProfitable, colorIndex: idx % 10 });
    });
    return map;
  }, [hedgePairs]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: PAGINATION.tablePageSize },
    },
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="마켓 검색..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs h-9"
        />
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length}건
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const hedgeInfo = hedgePairMap.get(row.original.conditionId);
                const rowClass = hedgeInfo
                  ? hedgeInfo.isProfitable
                    ? 'bg-green-500/5 hover:bg-green-500/10 border-l-2 border-l-green-500/40'
                    : 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500/40'
                  : '';
                return (
                  <TableRow key={row.id} className={rowClass}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  거래 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-muted-foreground">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 페이지
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
