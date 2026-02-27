import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, subValue, trend, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-2xl font-bold mt-1',
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500'
          )}
        >
          {value}
        </p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}
