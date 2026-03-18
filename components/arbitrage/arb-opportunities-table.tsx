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
import { ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArbOpportunity } from '@/lib/types';

const columns: ColumnDef<ArbOpportunity>[] = [
  {
    accessorKey: 'title',
    header: 'Market',
    cell: ({ row }) => (
      <span className="text-sm font-medium truncate max-w-[240px] block" title={row.original.title}>
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.category || 'other'}
      </Badge>
    ),
  },
  {
    id: 'polyPrice',
    header: 'Poly YES',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.prices.polyYes.toFixed(3)}
      </span>
    ),
  },
  {
    id: 'predictPrice',
    header: 'Predict YES',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.prices.predictYes.toFixed(3)}
      </span>
    ),
  },
  {
    accessorKey: 'spread',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        Spread <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {(row.original.spread * 100).toFixed(1)}%
      </span>
    ),
  },
  {
    accessorKey: 'bestStrategy',
    header: 'Strategy',
    cell: ({ row }) => {
      const s = row.original.bestStrategy;
      if (s === 'NONE') return <span className="text-muted-foreground text-xs">-</span>;
      return (
        <Badge variant={s === 'A' ? 'default' : 'secondary'} className="text-xs">
          {s === 'A' ? 'P.Yes+M.No' : 'M.Yes+P.No'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'bestArbPct',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        Net Arb <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const pct = row.original.bestArbPct;
      return (
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          pct > 0 ? 'text-green-500' : pct < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {pct.toFixed(2)}%
        </span>
      );
    },
  },
  {
    id: 'links',
    header: '',
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.polySlug && (
          <a
            href={`https://polymarket.com/event/${row.original.polySlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            title="Polymarket"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    ),
  },
];

interface ArbOpportunitiesTableProps {
  opportunities: ArbOpportunity[];
}

export function ArbOpportunitiesTable({ opportunities }: ArbOpportunitiesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'bestArbPct', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => opportunities, [opportunities]);

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
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Filter markets..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs h-9"
        />
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} markets
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No matched markets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
