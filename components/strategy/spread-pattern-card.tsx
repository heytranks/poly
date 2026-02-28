'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/utils';
import type { SpreadPatternAnalysis } from '@/lib/types';

interface SpreadPatternCardProps {
  data: SpreadPatternAnalysis;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      backgroundColor: '#1a1528',
      border: '1px solid #2e2545',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#e2e8f0',
    }}>
      <p className="font-medium text-xs mb-1 max-w-[200px] truncate">{d.title}</p>
      <p>YES: {(d.yesPrice * 100).toFixed(1)}c</p>
      <p>NO: {(d.noPrice * 100).toFixed(1)}c</p>
      <p>Pair Cost: <span style={{ color: d.pairCost < 1 ? '#22c55e' : '#ef4444' }}>
        {d.pairCost.toFixed(4)}
      </span></p>
      <p>헤지: {d.hedgedSize.toFixed(0)} 쉐어</p>
    </div>
  );
}

export function SpreadPatternCard({ data }: SpreadPatternCardProps) {
  if (data.points.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          스프레드 패턴 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  const profitable = data.points.filter((p) => p.pairCost < 1);
  const unprofitable = data.points.filter((p) => p.pairCost >= 1);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">YES + NO 가격 스프레드</CardTitle>
          <p className="text-xs text-muted-foreground">양쪽 매수가의 합이 1 미만이면 확정 수익</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">평균 YES 가격</p>
              <p className="text-xl font-bold text-green-500">
                {(data.avgYesPrice * 100).toFixed(1)}c
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">평균 NO 가격</p>
              <p className="text-xl font-bold text-red-400">
                {(data.avgNoPrice * 100).toFixed(1)}c
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">평균 페어 코스트</p>
              <p className={`text-xl font-bold ${data.avgPairCost < 1 ? 'text-green-500' : 'text-red-500'}`}>
                {data.avgPairCost.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">수익 비율</p>
              <p className="text-xl font-bold text-green-500">
                {formatPercent(data.profitableRate)}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.profitablePairs} / {data.points.length} pairs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scatter Plot: YES price vs NO price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            YES vs NO 진입가 (대각선 아래 = 수익)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ bottom: 5, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="yesPrice"
                name="YES Price"
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}c`}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                label={{ value: 'YES Price', position: 'bottom', fill: 'hsl(220 10% 40%)', fontSize: 11 }}
              />
              <YAxis
                dataKey="noPrice"
                name="NO Price"
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}c`}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                label={{ value: 'NO Price', angle: -90, position: 'insideLeft', fill: 'hsl(220 10% 40%)', fontSize: 11 }}
              />
              <ZAxis dataKey="hedgedSize" range={[30, 300]} name="Size" />
              <Tooltip content={<CustomTooltip />} />
              {/* YES + NO = 1.00 line (break-even) */}
              <ReferenceLine
                segment={[{ x: 0, y: 1 }, { x: 1, y: 0 }]}
                stroke="#eab308"
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
              <Scatter name="Profitable" data={profitable} fill="#22c55e" fillOpacity={0.7} />
              <Scatter name="Unprofitable" data={unprofitable} fill="#ef4444" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            노란 점선 = 페어 코스트 $1.00 (손익분기). 아래쪽 초록점 = 확정 수익.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
