import { NextResponse } from 'next/server';
import { collectArbitrage, getDashboardData } from '@/lib/arbitrage/collector';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ensure data is collected before returning dashboard
    await collectArbitrage();
    const data = getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get dashboard data' },
      { status: 500 }
    );
  }
}
