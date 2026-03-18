import { NextResponse } from 'next/server';
import { collectArbitrage } from '@/lib/arbitrage/collector';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await collectArbitrage();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[collect] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Collection failed' },
      { status: 500 }
    );
  }
}
