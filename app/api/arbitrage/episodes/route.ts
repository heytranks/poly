import { NextRequest, NextResponse } from 'next/server';
import { getRecentEpisodes, getOpenEpisodes } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const open = request.nextUrl.searchParams.get('open');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    const episodes = open === 'true' ? getOpenEpisodes() : getRecentEpisodes(limit);
    return NextResponse.json(episodes);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get episodes' },
      { status: 500 }
    );
  }
}
