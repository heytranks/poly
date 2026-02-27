import { NextRequest, NextResponse } from 'next/server';
import { getPositions, getClosedPositions } from '@/lib/api/polymarket';
import { ApiClientError } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet is required' }, { status: 400 });
  }

  const type = request.nextUrl.searchParams.get('type') ?? 'open';

  try {
    if (type === 'closed') {
      const positions = await getClosedPositions(wallet);
      return NextResponse.json(positions);
    }
    const positions = await getPositions(wallet);
    return NextResponse.json(positions);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
