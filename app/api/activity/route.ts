import { NextRequest, NextResponse } from 'next/server';
import { getActivity } from '@/lib/api/polymarket';
import { ApiClientError } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet is required' }, { status: 400 });
  }

  try {
    const activity = await getActivity(wallet);
    return NextResponse.json(activity);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
