'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { ArbEpisode } from '@/lib/types';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Ongoing';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const columns: ColumnDef<ArbEpisode>[] = [
  {
    accessorKey: 'title',
    header: 'Market',
    cell: ({ row }) => (
      <span className="text-sm font-medium truncate max-w-[200px] block" title={row.original.title}>
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: 'strategy',
    header: 'Strategy',
    cell: ({ row }) => (
      <Badge variant={row.original.strategy === 'A' ? 'default' : 'secondary'} className="text-xs">
        {row.original.strategy}
      </Badge>
    ),
  },
  {
    accessorKey: 'startedAt',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        Started <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{formatDateTime(row.original.startedAt)}</span>
    ),
  },
  {
    accessorKey: 'peakArbPct',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        Peak <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm font-semibold text-green-500 tabular-nums">
        {row.original.peakArbPct.toFixed(2)}%
      </span>
    ),
  },
  {
    accessorKey: 'durationSeconds',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        Duration <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {formatDuration(row.original.durationSeconds)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'OPEN' ? 'default' : 'outline'}
        className={row.original.status === 'OPEN' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'text-xs'}
      >
        {row.original.status}
      </Badge>
    ),
  },
];

interface ArbEpisodesTableProps {
  episodes: ArbEpisode[];
}

export function ArbEpisodesTable({ episodes }: ArbEpisodesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'startedAt', desc: true },
  ]);

  const data = useMemo(() => episodes, [episodes]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <Card className="p-4">
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
                  No episodes recorded yet.
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
