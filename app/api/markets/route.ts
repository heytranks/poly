import { NextRequest, NextResponse } from 'next/server';
import { getMarket } from '@/lib/api/polymarket';
import { ApiClientError } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  const conditionId = request.nextUrl.searchParams.get('conditionId');
  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId is required' }, { status: 400 });
  }

  try {
    const market = await getMarket(conditionId);
    return NextResponse.json(market);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
