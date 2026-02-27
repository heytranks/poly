import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/api/polymarket';
import { ApiClientError } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const profile = await getProfile(address);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
