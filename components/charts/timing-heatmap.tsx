'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TimingPattern } from '@/lib/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`
);

interface TimingHeatmapProps {
  data: TimingPattern;
}

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  const maxCount = Math.max(...data.grid.map((c) => c.count), 1);

  function getIntensity(count: number): string {
    if (count === 0) return 'bg-muted/30';
    const ratio = count / maxCount;
    if (ratio < 0.25) return 'bg-primary/20';
    if (ratio < 0.5) return 'bg-primary/40';
    if (ratio < 0.75) return 'bg-primary/60';
    return 'bg-primary/90';
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Trading Activity Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Most active: {data.mostActiveDay} at {data.mostActiveHour}:00 UTC
        </p>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex ml-10 mb-1">
                {HOUR_LABELS.map((h, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
                    {i % 3 === 0 ? h : ''}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {DAY_LABELS.map((day, dayIdx) => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <span className="w-9 text-xs text-muted-foreground text-right pr-1">{day}</span>
                  <div className="flex flex-1 gap-[2px]">
                    {Array.from({ length: 24 }, (_, hourIdx) => {
                      const cell = data.grid[dayIdx * 24 + hourIdx];
                      return (
                        <Tooltip key={hourIdx}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex-1 aspect-square rounded-sm cursor-default transition-colors',
                                getIntensity(cell.count)
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{day} {hourIdx}:00 UTC</p>
                            <p>{cell.count} trades</p>
                            {cell.avgPnl !== 0 && (
                              <p className={cell.avgPnl > 0 ? 'text-green-500' : 'text-red-500'}>
                                Avg PnL: ${cell.avgPnl.toFixed(2)}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 ml-10 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-[2px]">
                  <div className="w-3 h-3 rounded-sm bg-muted/30" />
                  <div className="w-3 h-3 rounded-sm bg-primary/20" />
                  <div className="w-3 h-3 rounded-sm bg-primary/40" />
                  <div className="w-3 h-3 rounded-sm bg-primary/60" />
                  <div className="w-3 h-3 rounded-sm bg-primary/90" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
