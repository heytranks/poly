import { NextRequest, NextResponse } from 'next/server';
import { getAllTrades } from '@/lib/api/polymarket';
import { ApiClientError } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet is required' }, { status: 400 });
  }

  try {
    const trades = await getAllTrades(wallet);
    return NextResponse.json(trades);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
