import { NextRequest, NextResponse } from 'next/server';
import { resolveToWallet, getProfile } from '@/lib/api/polymarket';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  try {
    const wallet = await resolveToWallet(query);
    if (!wallet) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = await getProfile(wallet).catch(() => null);
    return NextResponse.json({
      address: wallet,
      username: profile?.name ?? query,
      pfp: profile?.profileImage ?? '',
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
